import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

if (!env.STRIPE_SECRET_KEY) {
	console.warn('STRIPE_SECRET_KEY is not set. Payments will fail.');
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || '');
