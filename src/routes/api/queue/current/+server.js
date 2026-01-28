import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';

/**
 * Determine tier priority for ordering: platinum > gold > silver > free
 * @param {string} t
 * @returns {number}
 */
function tierPriority(t) {
	if (t === 'platinum') return 3;
	if (t === 'gold') return 2;
	if (t === 'silver') return 1;
	return 0;
}

export async function GET() {
	try {
		// Fetch queue and songs and combine in JS (workaround for missing column methods)
		const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
		const sRows = await db.select().from(songs);
		const sMap = new Map(sRows.map((s) => [s.id, s]));
		let rows = qRows.map((q) => ({ left: q, right: sMap.get(q.songId) || null }));
		rows = rows.filter((r) => r.left.playsRemainingToday > 0 && r.right && r.right.isAvailable === 1);
		if (!rows || rows.length === 0) return json({ ok: true, current: null });

	// Use the same selection logic as /api/queue/next: priority desc, then baseRank asc
	rows.sort((a, b) => {
		const priority = (t) => (t === 'platinum' ? 3 : t === 'gold' ? 2 : t === 'silver' ? 1 : 0);
		const pa = priority(a.left.tier), pb = priority(b.left.tier);
		if (pa !== pb) return pb - pa; // higher priority first
		return a.left.baseRank - b.left.baseRank; // older baseRank first
	});

	const top = rows[0];
	const current = { ...top.left, ...top.right };
		return json({ ok: true, current });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
