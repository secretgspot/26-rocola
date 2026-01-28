import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/lib/server/db/schema.js';

const db = drizzle(new Database('local.db'), { schema });
const qRows = await db.select().from(schema.queue).orderBy(schema.queue.baseRank).limit(100);
const sRows = await db.select().from(schema.songs);
console.log('qRows count', qRows.length);
console.log('sRows count', sRows.length);
const sMap = new Map(sRows.map((s) => [s.id, s]));
let rows = qRows.map((q) => ({ left: q, right: sMap.get(q.songId) || null }));
console.log('combined length', rows.length);
rows = rows.filter((r) => {
	console.log('item', r.left.id, 'playsRemainingToday', r.left.playsRemainingToday, typeof r.left.playsRemainingToday, 'isAvailable', r.right?.isAvailable, typeof r.right?.isAvailable);
	return r.left.playsRemainingToday > 0 && r.right && r.right.isAvailable === 1;
});
console.log('after filter length', rows.length);
console.log(rows);
