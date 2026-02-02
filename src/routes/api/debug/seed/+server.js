import { json } from '@sveltejs/kit';
import { addToQueue } from '$lib/server/services/queue.js';
import { env } from '$env/dynamic/private';
import fs from 'node:fs';
import path from 'node:path';

function extractVideoId(urlOrId) {
	if (!urlOrId) return null;
	if (/^[A-Za-z0-9_-]{11,}$/.test(urlOrId)) return urlOrId;
	const regex = /(?:v=|\/embed\/|\.be\/)([A-Za-z0-9_-]{11,})/;
	const m = urlOrId.match(regex);
	return m ? m[1] : null;
}

async function fetchMetadata(id) {
	// 1. Try YouTube Data API
	if (env.YOUTUBE_API_KEY) {
		try {
			const res = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${env.YOUTUBE_API_KEY}`
			);
			if (res.ok) {
				const data = await res.json();
				if (data.items && data.items.length > 0) {
					const item = data.items[0];
					return {
						title: item.snippet.title,
						thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
						channelTitle: item.snippet.channelTitle,
						duration: item.contentDetails?.duration
					};
				}
			}
		} catch (err) {
			console.error('YouTube API fetch failed for seed', err);
		}
	}

	// 2. Fallback: oEmbed
	try {
		const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
		if (oembedRes.ok) {
			const oembedData = await oembedRes.json();
			return {
				title: oembedData.title,
				thumbnail: oembedData.thumbnail_url,
				channelTitle: oembedData.author_name,
				duration: null
			};
		}
	} catch (e) {
		console.warn('oEmbed fetch failed for seed', e);
	}

	return {
		title: `Video ${id}`,
		thumbnail: null,
		channelTitle: 'Unknown',
		duration: null
	};
}

export async function POST() {
	if (env.NODE_ENV !== 'development') {
		return json({ ok: false, error: 'Not allowed in production' }, { status: 403 });
	}

	try {
		const filePath = path.join(process.cwd(), 'docs', 'queue.txt');
		if (!fs.existsSync(filePath)) {
			return json({ ok: false, error: 'docs/queue.txt not found' }, { status: 404 });
		}

		const fileContent = fs.readFileSync(filePath, 'utf-8');
		const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

		const added = [];

		for (const line of lines) {
			const videoId = extractVideoId(line);
			if (!videoId) continue;

			// Check if already processed in this batch to avoid dupes (optional, but good)
			// But addToQueue handles existing song logic.

			const metadata = await fetchMetadata(videoId);
			
			// 90% Free, 10% Premium
			const isPremium = Math.random() > 0.9;
			let tier = 'free';
			if (isPremium) {
				const r = Math.random();
				if (r < 0.33) tier = 'silver';
				else if (r < 0.66) tier = 'gold';
				else tier = 'platinum';
			}

			const songData = {
				videoId,
				title: metadata.title,
				thumbnail: metadata.thumbnail,
				channelTitle: metadata.channelTitle,
				duration: metadata.duration,
				metadata
			};

			const result = await addToQueue(songData, tier, 'seed-script');
			added.push({ videoId, title: metadata.title, tier });
		}

		return json({ ok: true, message: `Seeded ${added.length} songs`, added });

	} catch (err) {
		console.error('Seed error', err);
		return json({ ok: false, error: err.message }, { status: 500 });
	}
}