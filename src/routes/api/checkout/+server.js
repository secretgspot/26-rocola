import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { getTierConfig } from '$lib/config.js';
import { db } from '$lib/server/db/index.js';
import { orders } from '$lib/server/db/schema.js';
import { checkRate } from '$lib/server/security.js';

export async function POST(event) {
	const limited = checkRate(event, 'checkout-create', 12, 10 * 60 * 1000, 'ip+session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	try {
		const { request, url, getClientAddress } = event;
		const { tier, metadata: songMetadata } = await request.json();
		const config = getTierConfig(tier);

		if (!config || config.price <= 0) {
			return json({ ok: false, error: 'Invalid tier' }, { status: 400 });
		}

		// Create a Stripe Checkout Session
		const session = await stripe.checkout.sessions.create({
			ui_mode: 'embedded',
			line_items: [
				{
					price_data: {
						currency: 'usd',
						product_data: {
							name: `Rocola Priority: ${config.label}`,
							description: config.description,
						},
						unit_amount: config.price * 100, // to cents
					},
					quantity: 1,
				},
			],
			mode: 'payment',
			billing_address_collection: 'auto', 
			return_url: `${url.origin}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
			redirect_on_completion: 'if_required',
			metadata: {
				tier: config.id,
				videoId: songMetadata.videoId
			}
		});

		// Record the pending order with metadata for the song
		await db.insert(orders).values({
			id: crypto.randomUUID(),
			stripeSessionId: session.id,
			tier: config.id,
			amount: config.price * 100,
			status: 'pending',
			stripeCheckoutUrl: session.url,
			metadata: JSON.stringify(songMetadata),
			ipAddress: getClientAddress(),
			createdAt: Math.floor(Date.now() / 1000)
		});

		return json({ clientSecret: session.client_secret, sessionId: session.id });
	} catch (err) {
		console.error('[Stripe] Checkout Error:', err);
		return json({ ok: false, error: err.message }, { status: 500 });
	}
}
