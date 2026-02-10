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

async function fetchWithTimeout(url, timeoutMs = 3000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { signal: controller.signal });
		return res;
	} finally {
		clearTimeout(timer);
	}
}

async function fetchMetadata(id) {
	// 1. Try YouTube Data API
	if (env.YOUTUBE_API_KEY) {
		try {
			const res = await fetchWithTimeout(
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
		const oembedRes = await fetchWithTimeout(
			`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
		);
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

async function runWithConcurrency(items, limit, worker) {
	const results = [];
	let index = 0;

	const runners = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
		while (index < items.length) {
			const current = items[index++];
			results.push(await worker(current));
		}
	});

	await Promise.all(runners);
	return results;
}

export async function POST({ locals, request }) {
	if (env.NODE_ENV !== 'development' && !locals?.isAdmin) {
		return json({ ok: false, error: 'Not allowed in production' }, { status: 403 });
	}

	try {
		let fast = false;
		try {
			const body = await request.json();
			fast = !!body?.fast;
		} catch (e) {
			// ignore empty body
		}
		const filePath = path.join(process.cwd(), 'docs', 'queue.txt');
		if (!fs.existsSync(filePath)) {
			return json({ ok: false, error: 'docs/queue.txt not found' }, { status: 404 });
		}

		const fileContent = fs.readFileSync(filePath, 'utf-8');
		const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

		const added = [];
		const tasks = lines
			.map((line) => extractVideoId(line))
			.filter((videoId) => !!videoId);

		await runWithConcurrency(tasks, fast ? 50 : 20, async (videoId) => {
			const metadata = fast
				? { title: `Video ${videoId}`, thumbnail: null, channelTitle: 'Unknown', duration: null }
				: await fetchMetadata(videoId);

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

			await addToQueue(songData, tier, 'seed-script');
			added.push({ videoId, title: metadata.title, tier });
		});

		return json({ ok: true, message: `Seeded ${added.length} songs`, added });

	} catch (err) {
		console.error('Seed error', err);
		return json({ ok: false, error: err.message }, { status: 500 });
	}
}
