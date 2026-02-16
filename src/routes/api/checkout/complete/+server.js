import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { db } from '$lib/server/db/index.js';
import { orders } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { addToQueue } from '$lib/server/services/queue.js';

export async function POST({ request }) {
	try {
		const { sessionId } = await request.json();
		if (!sessionId) {
			return json({ ok: false, error: 'Missing sessionId' }, { status: 400 });
		}

		const session = await stripe.checkout.sessions.retrieve(sessionId);
		const paid =
			session.payment_status === 'paid' ||
			session.status === 'complete';
		if (!paid) {
			return json({ ok: false, error: 'Payment not completed' }, { status: 400 });
		}

		const order = await db
			.select()
			.from(orders)
			.where(eq(orders.stripeSessionId, sessionId))
			.limit(1);
		if (!order[0]) {
			return json({ ok: false, error: 'Order not found' }, { status: 404 });
		}

		// Idempotent finalize: if already completed, return success.
		if (order[0].status === 'completed') {
			return json({ ok: true, alreadyCompleted: true, queueId: order[0].queueId ?? null });
		}

		const songMetadata = JSON.parse(order[0].metadata || '{}');
		const result = await addToQueue(songMetadata, order[0].tier, order[0].ipAddress);

		await db
			.update(orders)
			.set({
				status: 'completed',
				queueId: result.id,
				completedAt: Math.floor(Date.now() / 1000)
			})
			.where(eq(orders.stripeSessionId, sessionId));

		return json({ ok: true, queueId: result.id });
	} catch (err) {
		console.error('[Stripe] Checkout complete error:', err);
		return json({ ok: false, error: err?.message || 'Checkout finalization failed' }, { status: 500 });
	}
}

