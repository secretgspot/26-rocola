import Database from 'better-sqlite3';

const dbFile = 'local.db';
console.log('Opening DB:', dbFile);
const db = new Database(dbFile);

console.log('Tables present:');
console.log(db.prepare("select name from sqlite_master where type='table'").all());

try {
	console.log('Queue sample:');
	console.log(db.prepare('select * from queue limit 5').all());
	console.log('Queue count:', db.prepare('select count(*) as c from queue').get());
} catch (err) {
	console.error('Error querying queue table:', err.message);
}

try {
	console.log('Songs sample:');
	console.log(db.prepare('select * from songs limit 5').all());
	console.log('Songs count:', db.prepare('select count(*) as c from songs').get());
} catch (err) {
	console.error('Error querying songs table:', err.message);
}
