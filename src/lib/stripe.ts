import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

export type StripeInstance = Stripe | null;

