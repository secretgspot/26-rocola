import { defineConfig } from 'drizzle-kit';

const databaseUrl =
	process.env.DATABASE_URL ||
	(process.env.NEON_DB_HOST &&
		process.env.NEON_DB_USER &&
		process.env.NEON_DB_PASSWORD &&
		process.env.NEON_DB_NAME &&
		`postgresql://${process.env.NEON_DB_USER}:${process.env.NEON_DB_PASSWORD}@${process.env.NEON_DB_HOST}/${process.env.NEON_DB_NAME}?${process.env.NEON_DB_OPTIONS || 'sslmode=require'}`);

if (!databaseUrl) throw new Error('DATABASE_URL or NEON_DB_* env vars are not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.js',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: false
});
