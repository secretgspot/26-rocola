import { redirect } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { db } from '$lib/server/db/index.js';
import { orders } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { addToQueue } from '$lib/server/services/queue.js';

export async function GET({ url }) {
	const sessionId = url.searchParams.get('session_id');
	if (!sessionId) throw redirect(303, '/');

	const session = await stripe.checkout.sessions.retrieve(sessionId);

	if (session.status === 'complete') {
		const order = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId)).limit(1);
		
		if (order[0] && order[0].status === 'pending') {
			// Parse metadata stored during checkout initiation
			const songMetadata = JSON.parse(order[0].metadata);

			// Add to queue with the premium tier
			const result = await addToQueue(songMetadata, order[0].tier, order[0].ipAddress);

			// Update order with new queueId and completed status
			await db.update(orders)
				.set({ 
					status: 'completed', 
					queueId: result.id,
					completedAt: Math.floor(Date.now() / 1000) 
				})
				.where(eq(orders.stripeSessionId, sessionId));
		}
		
		throw redirect(303, '/?payment=success');
	}

	throw redirect(303, '/');
}
