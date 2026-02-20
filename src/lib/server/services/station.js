import { db } from '$lib/server/db/index.js';
import { stationRuntime, queue, songs } from '$lib/server/db/schema.js';
import { eq, and, gt, sql } from 'drizzle-orm';
import { getPlaybackState, setPlaybackState } from '$lib/server/services/playback.js';
import { getQueue, advanceQueue, getGlobalTurn } from '$lib/server/services/queue.js';
import { broadcast } from '$lib/server/realtime.js';
import { reconcilePlaybackState } from '$lib/server/services/playback-reconcile.js';

const RUNTIME_ID = 'global';
const TICK_LOCK_ID = 912736;
const ELAPSED_THRESHOLD_MS = 120;

function nowMs() {
	return Date.now();
}

async function ensureRuntimeRow(dbClient = null) {
	const client = dbClient || db;
	const ts = nowMs();
	await client
		.insert(stationRuntime)
		.values({
			id: RUNTIME_ID,
			lastTickAtMs: 0,
			lastRunStartedAtMs: null,
			lastRunFinishedAtMs: null,
			lastAdvanceCount: 0,
			lastError: null,
			updatedAtMs: ts
		})
		.onConflictDoNothing();
}

export async function getStationRuntime(dbClient = null) {
	const client = dbClient || db;
	await ensureRuntimeRow(client);
	const rows = await client
		.select()
		.from(stationRuntime)
		.where(eq(stationRuntime.id, RUNTIME_ID))
		.limit(1);
	const row = rows[0];
	const tick = Number(row?.lastTickAtMs || 0);
	return {
		lastTickAtMs: tick,
		lastRunStartedAtMs: Number(row?.lastRunStartedAtMs || 0) || null,
		lastRunFinishedAtMs: Number(row?.lastRunFinishedAtMs || 0) || null,
		lastAdvanceCount: Number(row?.lastAdvanceCount || 0),
		lastError: row?.lastError || null,
		lagMs: tick > 0 ? Math.max(0, nowMs() - tick) : null
	};
}

async function writeRuntimePatch(patch, dbClient = null) {
	const client = dbClient || db;
	await ensureRuntimeRow(client);
	await client
		.update(stationRuntime)
		.set({
			...patch,
			updatedAtMs: nowMs()
		})
		.where(eq(stationRuntime.id, RUNTIME_ID));
}

async function fetchCurrentPlayable(playbackQueueId, dbClient = null) {
	const client = dbClient || db;
	if (!playbackQueueId) return null;
	const rows = await client
		.select({ q: queue, s: songs })
		.from(queue)
		.innerJoin(songs, eq(queue.songId, songs.id))
		.where(
			and(eq(queue.id, playbackQueueId), eq(songs.isAvailable, 1), gt(queue.playsRemainingToday, 0))
		)
		.limit(1);
	return rows[0] || null;
}

/**
 * Autonomous station tick. Designed to be idempotent and lock-safe.
 * @param {{ source?: string, maxAdvances?: number }} [opts]
 */
export async function stationTick(opts = {}) {
	const source = opts.source || 'internal';
	const maxAdvances = Math.max(1, Math.min(100, Number(opts.maxAdvances || 24)));
	const runStartedAtMs = nowMs();

	const run = await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_lock(${TICK_LOCK_ID})`);
		try {
			await writeRuntimePatch(
				{
					lastRunStartedAtMs: runStartedAtMs,
					lastError: null
				},
				tx
			);

			let advances = 0;
			let startedFromIdle = false;
			let reason = 'noop';
			let needsReconcile = false;

			for (let i = 0; i < maxAdvances; i += 1) {
				const playback = await getPlaybackState();
				let current = await fetchCurrentPlayable(playback.currentQueueId, tx);

				if (!playback.currentQueueId) {
					const { queue: ordered } = await getQueue({ pinCurrent: false, dbClient: tx });
					if (!ordered.length) {
						reason = startedFromIdle ? 'started' : 'idle';
						break;
					}

					const next = ordered[0];
					const startedAtMs = nowMs();
					await setPlaybackState({
						currentQueueId: next.id,
						songId: next.song?.id || next.songId,
						startedAtMs,
						song: {
							...next.song,
							...next,
							queueId: next.id,
							songId: next.song?.id || next.songId,
							startedAt: Math.floor(startedAtMs / 1000),
							startedAtMs
						}
					});
					await broadcast('queue_changed', { currentTurn: await getGlobalTurn(tx) });
					startedFromIdle = true;
					reason = 'started';
					break;
				}

				if (!current) {
					const advanced = await advanceQueue(playback.currentQueueId);
					if (!advanced?.ok || advanced?.message === 'Already advanced') {
						reason = 'stale_pointer';
						needsReconcile = true;
						break;
					}
					advances += 1;
					reason = 'advance';
					continue;
				}

				const durationSec = Number(current.s?.duration || 0);
				if (!durationSec || !playback.startedAtMs) {
					reason = 'duration_unknown';
					break;
				}

				const elapsedMs = nowMs() - playback.startedAtMs;
				if (elapsedMs < durationSec * 1000 + ELAPSED_THRESHOLD_MS) {
					reason = 'in_progress';
					break;
				}

				const advanced = await advanceQueue(playback.currentQueueId);
				if (!advanced?.ok) {
					reason = 'advance_error';
					break;
				}
				if (advanced?.message === 'Already advanced') {
					reason = 'already_advanced';
					needsReconcile = false;
					break;
				}
				advances += 1;
				reason = 'advance';
			}

			const finished = nowMs();
			await writeRuntimePatch(
				{
					lastTickAtMs: finished,
					lastRunFinishedAtMs: finished,
					lastAdvanceCount: advances
				},
				tx
			);

			return {
				ok: true,
				source,
				reason,
				advances,
				needsReconcile,
				startedFromIdle,
				runStartedAtMs,
				runFinishedAtMs: finished
			};
		} catch (err) {
			const finished = nowMs();
			await writeRuntimePatch(
				{
					lastTickAtMs: finished,
					lastRunFinishedAtMs: finished,
					lastAdvanceCount: 0,
					lastError: err?.message || String(err)
				},
				tx
			);
			throw err;
		} finally {
			await tx.execute(sql`select pg_advisory_unlock(${TICK_LOCK_ID})`);
		}
	});

	if (run.needsReconcile) {
		const reconciled = await reconcilePlaybackState({ reason: `station_${run.reason}` });
		return { ...run, reconciled };
	}

	return run;
}
