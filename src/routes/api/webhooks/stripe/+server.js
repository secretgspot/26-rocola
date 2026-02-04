import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { orders } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { addToQueue } from '$lib/server/services/queue.js';

export async function POST({ request }) {
	const signature = request.headers.get('stripe-signature');
	const body = await request.text();

	let event;

	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			env.STRIPE_WEBHOOK_SECRET
		);
	} catch (err) {
		console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
		return json({ error: 'Webhook Error' }, { status: 400 });
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;
		const sessionId = session.id;

		// 1. Fetch Order
		const order = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId)).limit(1);
		
		if (order[0] && order[0].status === 'pending') {
			// 2. Parse metadata and add to queue
			const songMetadata = JSON.parse(order[0].metadata);
			const result = await addToQueue(songMetadata, order[0].tier, order[0].ipAddress);

			// 3. Complete order
			await db.update(orders)
				.set({ 
					status: 'completed', 
					queueId: result.id,
					completedAt: Math.floor(Date.now() / 1000) 
				})
				.where(eq(orders.stripeSessionId, sessionId));

			console.log(`[Stripe Webhook] Order ${sessionId} completed. Song ${result.id} added with tier ${order[0].tier}.`);
		}
	}

	return json({ received: true });
}
