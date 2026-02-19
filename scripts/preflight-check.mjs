import fs from 'node:fs';
import path from 'node:path';

const required = [
	['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL'],
	['ABLY_SUPER_API_KEY'],
	['STRIPE_SECRET_KEY'],
	['STRIPE_WEBHOOK_SECRET']
];

const optional = ['YOUTUBE_API_KEY', 'ADMIN_CODE', 'PUBLIC_APP_URL', 'STATION_TICK_SECRET', 'CRON_SECRET'];

function hasValue(name) {
	return typeof process.env[name] === 'string' && process.env[name].trim().length > 0;
}

function loadDotEnv() {
	const file = path.resolve('.env');
	if (!fs.existsSync(file)) return;
	const text = fs.readFileSync(file, 'utf8');
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const idx = line.indexOf('=');
		if (idx <= 0) continue;
		const key = line.slice(0, idx).trim();
		let value = line.slice(idx + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (!process.env[key]) process.env[key] = value;
	}
}

function redact(value) {
	if (!value) return 'missing';
	if (value.length <= 8) return 'set';
	return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function reportLine(name, ok) {
	return `${ok ? 'OK' : 'MISSING'} ${name}`;
}

function assertRuntimeHints() {
	const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
	if (nodeMajor < 20) {
		console.warn(`WARN Node ${process.versions.node} detected. Recommended: >=20`);
	}
}

function main() {
	loadDotEnv();
	console.log('Rocola preflight check');
	assertRuntimeHints();

	let hasError = false;
	for (const group of required) {
		const found = group.find((key) => hasValue(key));
		const label = group.join(' | ');
		const ok = Boolean(found);
		console.log(reportLine(label, ok));
		if (found) {
			console.log(`    using ${found}`);
		}
		if (!ok) hasError = true;
	}

	for (const key of optional) {
		const ok = hasValue(key);
		console.log(`${ok ? 'OK' : 'WARN'} ${key}${ok ? ` (${redact(process.env[key])})` : ''}`);
	}

	if (hasError) {
		console.error('Preflight failed: missing required env vars.');
		process.exit(1);
	}
	console.log('Preflight passed.');
}

main();
