import * as schema from '../src/lib/server/db/schema.js';

console.log('exports:', Object.keys(schema));
console.log('songs keys:', Object.keys(schema.songs));
console.log('sample column songs.id keys:', Object.keys(schema.songs.id || {}));
console.log('queue keys:', Object.keys(schema.queue));
console.log('queue.baseRank keys:', Object.keys(schema.queue.baseRank || {}));
