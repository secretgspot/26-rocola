import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

function extractVideoId(urlOrId) {
	if (!urlOrId) return null;
	// If it's already an ID (11+ chars), return it
	if (/^[A-Za-z0-9_-]{11,}$/.test(urlOrId)) return urlOrId;
	// Try to parse YouTube URLs
	const regex = /(?:v=|\/embed\/|\.be\/)([A-Za-z0-9_-]{11,})/;
	const m = urlOrId.match(regex);
	return m ? m[1] : null;
}

export async function POST({ request }) {
	const { url, videoId } = await request.json();
	const id = extractVideoId(videoId || url);
	if (!id) return json({ ok: false, error: 'Invalid YouTube id or url' }, { status: 400 });

	// If API key available, call YouTube Data API for validation and metadata
	if (env.YOUTUBE_API_KEY) {
		try {
			const res = await fetch(
				`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${env.YOUTUBE_API_KEY}`
			);
			if (!res.ok) {
				return json({ ok: false, error: 'YouTube API error' }, { status: res.status });
			}
			const data = await res.json();
			if (!data.items || data.items.length === 0) {
				return json({ ok: false, error: 'Video not found' }, { status: 404 });
			}
			const item = data.items[0];
			const metadata = {
				title: item.snippet.title,
				thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
				channelTitle: item.snippet.channelTitle,
				duration: item.contentDetails?.duration,
			};
			return json({ ok: true, videoId: id, metadata });
		} catch (err) {
			return json({ ok: false, error: 'YouTube fetch failed' }, { status: 500 });
		}
	}

	// Fallback: no API key, but ID format is valid
	return json({ ok: true, videoId: id });
}
