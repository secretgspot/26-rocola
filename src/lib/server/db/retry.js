function isTransientDbError(err) {
	const msg = String(err?.message || err || '').toLowerCase();
	return (
		msg.includes('connection terminated unexpectedly') ||
		msg.includes('terminating connection') ||
		msg.includes('connection reset') ||
		msg.includes('econnreset') ||
		msg.includes('socket hang up') ||
		msg.includes('fetch failed') ||
		msg.includes('network error')
	);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry read-only DB operations on transient connection errors.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ attempts?: number, delaysMs?: number[] }} [opts]
 * @returns {Promise<T>}
 */
export async function withReadRetry(fn, opts = {}) {
	const attempts = Math.max(1, opts.attempts ?? 3);
	const delays = opts.delaysMs ?? [60, 180];
	/** @type {any} */
	let lastErr;

	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			const retryable = isTransientDbError(err);
			const hasMore = i < attempts - 1;
			if (!retryable || !hasMore) break;
			const delay = delays[i] ?? delays[delays.length - 1] ?? 120;
			await sleep(delay);
		}
	}

	throw lastErr;
}

