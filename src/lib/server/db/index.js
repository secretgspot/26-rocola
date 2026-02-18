import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const databaseUrl =
	env.DATABASE_URL ||
	(env.NEON_DB_HOST &&
		env.NEON_DB_USER &&
		env.NEON_DB_PASSWORD &&
		env.NEON_DB_NAME &&
		`postgresql://${env.NEON_DB_USER}:${env.NEON_DB_PASSWORD}@${env.NEON_DB_HOST}/${env.NEON_DB_NAME}?${env.NEON_DB_OPTIONS || 'sslmode=require'}`);

if (!databaseUrl) {
	throw new Error('DATABASE_URL or NEON_DB_* env vars are not set');
}

neonConfig.webSocketConstructor = ws;

/** @type {Pool | undefined} */
let pool = globalThis.__rocolaNeonPool;

if (!pool) {
	pool = new Pool({ connectionString: databaseUrl });
	// Neon/pg can emit idle-client socket errors during dev HMR reconnects.
	// If unhandled, Node treats them as fatal and exits the dev server.
	pool.on('error', (err) => {
		console.warn('[db] pool idle client error:', err?.message || err);
	});

	globalThis.__rocolaNeonPool = pool;
}

export const db = drizzle(pool, { schema });
