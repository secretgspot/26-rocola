const MAX_LOGS = 1500;
const LOG_FILE_PATH = 'docs/debug/playback-log.ndjson';
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** @type {Array<any>} */
const buffer = globalThis.__rocolaPlaybackDebugLog || [];
globalThis.__rocolaPlaybackDebugLog = buffer;
let fileWriteChain = globalThis.__rocolaPlaybackFileWriteChain || Promise.resolve();
globalThis.__rocolaPlaybackFileWriteChain = fileWriteChain;

function nextId() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @param {any} entry
 */
export function addPlaybackLog(entry) {
	const normalized = {
		id: entry?.id || nextId(),
		ts: typeof entry?.ts === 'number' ? entry.ts : Date.now(),
		source: String(entry?.source || 'unknown'),
		event: String(entry?.event || 'unknown'),
		reason: entry?.reason ? String(entry.reason) : null,
		queueId: entry?.queueId ?? null,
		videoId: entry?.videoId ?? null,
		durationSec: Number.isFinite(entry?.durationSec) ? Number(entry.durationSec) : null,
		elapsedSec: Number.isFinite(entry?.elapsedSec) ? Number(entry.elapsedSec) : null,
		expectedSec: Number.isFinite(entry?.expectedSec) ? Number(entry.expectedSec) : null,
		progressPct: Number.isFinite(entry?.progressPct) ? Number(entry.progressPct) : null,
		manual: entry?.manual === true,
		errorCode: Number.isFinite(entry?.errorCode) ? Number(entry.errorCode) : null,
		sessionId: entry?.sessionId ?? null,
		clientIp: entry?.clientIp ?? null,
		controller: entry?.controller === true,
		data: entry?.data && typeof entry.data === 'object' ? entry.data : null
	};
	buffer.push(normalized);
	if (buffer.length > MAX_LOGS) {
		buffer.splice(0, buffer.length - MAX_LOGS);
	}
	queueFileWrite(normalized);
	return normalized.id;
}

/**
 * @param {number} [limit]
 */
export function getPlaybackLogs(limit = 400) {
	const size = Math.max(1, Math.min(2000, Number(limit) || 400));
	return buffer.slice(-size);
}

export function clearPlaybackLogs() {
	buffer.splice(0, buffer.length);
	queueFileClear();
}

function queueFileWrite(entry) {
	fileWriteChain = fileWriteChain
		.then(async () => {
			try {
				const [{ appendFile, mkdir, stat, truncate }, pathMod] = await Promise.all([
					import('node:fs/promises'),
					import('node:path')
				]);
				const path = pathMod.default || pathMod;
				const absPath = path.resolve(process.cwd(), LOG_FILE_PATH);
				const dir = path.dirname(absPath);
				await mkdir(dir, { recursive: true });
				try {
					const s = await stat(absPath);
					if (s.size > MAX_FILE_BYTES) {
						await truncate(absPath, 0);
					}
				} catch {
					// file may not exist yet
				}
				await appendFile(absPath, JSON.stringify(entry) + '\n', 'utf8');
			} catch (err) {
				console.warn('[debug-log] file write failed', err?.message || err);
			}
		})
		.catch(() => {
			// keep chain alive
		});
	globalThis.__rocolaPlaybackFileWriteChain = fileWriteChain;
}

function queueFileClear() {
	fileWriteChain = fileWriteChain
		.then(async () => {
			try {
				const [{ mkdir, writeFile }, pathMod] = await Promise.all([
					import('node:fs/promises'),
					import('node:path')
				]);
				const path = pathMod.default || pathMod;
				const absPath = path.resolve(process.cwd(), LOG_FILE_PATH);
				const dir = path.dirname(absPath);
				await mkdir(dir, { recursive: true });
				await writeFile(absPath, '', 'utf8');
			} catch (err) {
				console.warn('[debug-log] file clear failed', err?.message || err);
			}
		})
		.catch(() => {
			// keep chain alive
		});
	globalThis.__rocolaPlaybackFileWriteChain = fileWriteChain;
}
