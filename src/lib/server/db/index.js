import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
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

const client = neon(databaseUrl);
export const db = drizzle({ client, schema });
