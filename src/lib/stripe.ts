import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe
// Note: In production, this should be an environment variable
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

export type StripeInstance = Stripe | null;

