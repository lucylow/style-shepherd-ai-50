# Stripe & Lovable Integration Guide

Complete guide for integrating Stripe payment processing with Lovable Cloud deployment for Style Shepherd.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Payment Flow](#payment-flow)
5. [Webhook Configuration](#webhook-configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Production Checklist](#production-checklist)

---

## Overview

This integration implements a complete Stripe payment processing system that works seamlessly with Lovable Cloud deployment. The system includes:

- ✅ **Payment Intent Creation** - Secure server-side payment intent creation
- ✅ **Frontend Payment Processing** - Stripe Elements for secure card collection
- ✅ **Webhook Handling** - Reliable payment status updates via webhooks
- ✅ **Order Management** - Automatic order creation and status updates
- ✅ **Return Risk Prediction** - AI-powered return risk assessment before payment

---

## Architecture

### Payment Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │
       │ 1. Create Payment Intent
       ▼
┌─────────────┐
│   Backend   │
│  (Express)  │
└──────┬──────┘
       │
       │ 2. Create Stripe PaymentIntent
       ▼
┌─────────────┐
│   Stripe    │
│    API      │
└──────┬──────┘
       │
       │ 3. Return clientSecret
       ▼
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │
       │ 4. Confirm Payment
       ▼
┌─────────────┐
│   Stripe    │
│    API      │
└──────┬──────┘
       │
       │ 5. Payment Events
       ▼
┌─────────────┐
│  Webhook    │
│  Endpoint   │
└─────────────┘
```

### Key Components

1. **Frontend (`src/services/paymentService.ts`)**
   - Creates payment intents via backend API
   - Handles Stripe Elements integration
   - Confirms payments and creates orders

2. **Backend (`server/src/services/PaymentService.ts`)**
   - Creates Stripe PaymentIntents
   - Calculates return risk predictions
   - Handles webhook events
   - Manages order status updates

3. **Webhook Handler (`server/src/routes/api.ts`)**
   - Verifies Stripe webhook signatures
   - Updates order status based on payment events
   - Handles refunds and payment failures

---

## Setup Instructions

### 1. Stripe Account Setup

1. **Create a Stripe Account**
   - Go to [stripe.com](https://stripe.com) and sign up
   - Complete account verification

2. **Get API Keys**
   - Navigate to **Developers → API keys**
   - Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - ⚠️ **Never expose your secret key in frontend code!**

3. **Set Up Webhooks** (for production)
   - Go to **Developers → Webhooks**
   - Click **Add endpoint**
   - Endpoint URL: `https://your-domain.com/api/payments/webhook`
   - Events to listen to:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `charge.refunded`
   - Copy the **Webhook signing secret** (starts with `whsec_`)

### 2. Environment Variables

#### Frontend Variables (Lovable Project Settings)

Add these to your Lovable project's environment variables:

```bash
# Stripe Publishable Key (safe for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# API Base URL (for Lovable, use relative path)
VITE_API_BASE_URL=/api
```

#### Backend Variables (Lovable Backend Settings)

Add these to your Lovable backend environment:

```bash
# Stripe Secret Key (backend only!)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_...

# Other required backend variables
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
```

### 3. Lovable Cloud Deployment

#### Frontend Deployment

1. **Deploy Frontend**
   - Push your code to Lovable
   - Set frontend environment variables in Lovable dashboard
   - Deploy the frontend

2. **Verify API Configuration**
   - The frontend uses relative paths (`/api`) which automatically work with Lovable
   - No additional routing configuration needed

#### Backend Deployment

1. **Deploy Backend**
   - Deploy the `server/` directory to Lovable backend
   - Set backend environment variables
   - Ensure the backend is accessible at `/api/*` endpoints

2. **Configure Webhook URL**
   - In Stripe dashboard, set webhook URL to:
     - Production: `https://your-lovable-domain.com/api/payments/webhook`
     - Test: Use Stripe CLI for local testing (see Testing section)

---

## Payment Flow

### Step-by-Step Process

#### 1. User Initiates Checkout

```typescript
// Frontend: User clicks "Checkout"
const paymentIntent = await paymentService.createPaymentIntent(
  cartItems,
  userId,
  shippingInfo // Optional at this stage
);
```

#### 2. Backend Creates Payment Intent

```typescript
// Backend: Creates Stripe PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(totalAmount * 100), // Convert to cents
  currency: 'usd',
  metadata: {
    userId: order.userId,
    orderId: `order_${Date.now()}`,
    returnRiskScore: returnPrediction.score.toString(),
  },
});
```

#### 3. Frontend Confirms Payment

```typescript
// Frontend: User enters card details and confirms
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  clientSecret: paymentIntent.clientSecret,
  confirmParams: {
    return_url: `${window.location.origin}/order-success`,
  },
  redirect: 'if_required',
});
```

#### 4. Webhook Updates Order Status

```typescript
// Backend: Webhook receives payment_intent.succeeded event
// Automatically updates order status in database
await vultrPostgres.query(
  `UPDATE orders SET status = 'paid' WHERE order_id = $1`,
  [orderId]
);
```

---

## Webhook Configuration

### Local Development with Stripe CLI

For local testing, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: See https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/payments/webhook

# Copy the webhook signing secret (starts with whsec_)
# Add it to your .env file as STRIPE_WEBHOOK_SECRET
```

### Production Webhook Setup

1. **In Stripe Dashboard:**
   - Go to **Developers → Webhooks**
   - Click **Add endpoint**
   - URL: `https://your-domain.com/api/payments/webhook`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`
     - `charge.refunded`

2. **Copy Webhook Secret:**
   - After creating the endpoint, click on it
   - Copy the **Signing secret**
   - Add to backend environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

3. **Test Webhook:**
   - Use Stripe dashboard to send test events
   - Check backend logs to verify webhook processing

### Webhook Security

The webhook endpoint uses Stripe's signature verification:

```typescript
// Backend automatically verifies webhook signature
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  STRIPE_WEBHOOK_SECRET
);
```

This ensures only legitimate Stripe events are processed.

---

## Testing

### Test Cards

Stripe provides test cards for different scenarios:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | 3D Secure required |

**Use any:**
- Future expiry date (e.g., `12/34`)
- Any 3-digit CVC
- Any ZIP code

### Testing Checklist

- [ ] Payment intent creation succeeds
- [ ] Payment confirmation works
- [ ] Order is created after successful payment
- [ ] Webhook receives and processes events
- [ ] Order status updates correctly
- [ ] Failed payments are handled
- [ ] Refunds are processed correctly

### Testing Webhooks Locally

```bash
# Terminal 1: Start backend server
cd server
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3001/api/payments/webhook

# Terminal 3: Trigger test payment
stripe trigger payment_intent.succeeded
```

---

## Troubleshooting

### Common Issues

#### 1. "Failed to create payment intent"

**Possible causes:**
- Missing or invalid `STRIPE_SECRET_KEY`
- Invalid amount (must be positive, in cents)
- Network issues

**Solution:**
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check backend logs for detailed error messages
- Ensure amount is calculated correctly (multiply by 100 for cents)

#### 2. "Webhook signature verification failed"

**Possible causes:**
- Missing `STRIPE_WEBHOOK_SECRET`
- Incorrect webhook secret
- Request body not parsed as raw

**Solution:**
- Verify webhook secret matches Stripe dashboard
- Ensure webhook endpoint uses `express.raw()` middleware
- Check that webhook URL in Stripe matches your endpoint

#### 3. "Payment succeeded but order not created"

**Possible causes:**
- Webhook not configured
- Webhook endpoint not accessible
- Database connection issues

**Solution:**
- Check webhook configuration in Stripe dashboard
- Verify webhook endpoint is accessible
- Check backend logs for webhook processing errors
- Ensure database connection is working

#### 4. CORS Errors

**Possible causes:**
- Frontend and backend on different origins
- CORS not configured correctly

**Solution:**
- For Lovable: Use relative paths (`/api`) - no CORS issues
- For separate deployments: Configure `CORS_ORIGIN` in backend

### Debug Mode

Enable detailed logging:

```typescript
// Backend: Add to PaymentService.ts
console.log('Payment Intent Created:', {
  id: paymentIntent.id,
  amount: paymentIntent.amount,
  status: paymentIntent.status,
});
```

---

## Production Checklist

Before going live:

### Stripe Configuration

- [ ] Switch to **Live mode** in Stripe dashboard
- [ ] Update API keys to live keys (`pk_live_*`, `sk_live_*`)
- [ ] Set up production webhook endpoint
- [ ] Test webhook with real events
- [ ] Enable 3D Secure if required by your region

### Environment Variables

- [ ] All production keys are set
- [ ] Webhook secret is configured
- [ ] CORS is configured for production domain
- [ ] Database connections are production-ready

### Security

- [ ] Secret keys are never exposed in frontend
- [ ] Webhook signature verification is enabled
- [ ] HTTPS is enabled (required for webhooks)
- [ ] Rate limiting is configured

### Testing

- [ ] Test successful payment flow
- [ ] Test failed payment handling
- [ ] Test webhook processing
- [ ] Test refund processing
- [ ] Test order status updates

### Monitoring

- [ ] Set up error logging
- [ ] Monitor webhook delivery in Stripe dashboard
- [ ] Set up alerts for failed payments
- [ ] Monitor order creation success rate

---

## API Reference

### Frontend API

#### `createPaymentIntent(items, userId, shippingInfo?)`

Creates a payment intent for the given items.

**Parameters:**
- `items: CartItem[]` - Cart items to purchase
- `userId: string` - User ID
- `shippingInfo?: ShippingInfo` - Optional shipping information

**Returns:**
```typescript
{
  clientSecret: string;
  paymentIntentId: string;
  returnPrediction?: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    suggestions: string[];
  };
}
```

#### `confirmPayment(paymentIntentId, items, userId, shippingInfo)`

Confirms payment and creates order.

**Parameters:**
- `paymentIntentId: string` - Payment intent ID from Stripe
- `items: CartItem[]` - Cart items
- `userId: string` - User ID
- `shippingInfo: ShippingInfo` - Shipping information

**Returns:**
```typescript
{
  orderId: string;
  status: string;
}
```

### Backend API

#### `POST /api/payments/intent`

Creates a Stripe payment intent.

**Request Body:**
```json
{
  "userId": "user_123",
  "items": [
    {
      "productId": "prod_123",
      "quantity": 1,
      "price": 99.99,
      "size": "M"
    }
  ],
  "totalAmount": 99.99,
  "shippingInfo": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "returnPrediction": {
    "score": 0.25,
    "riskLevel": "low",
    "factors": ["Good size match"],
    "suggestions": ["Review size chart"]
  }
}
```

#### `POST /api/payments/webhook`

Stripe webhook endpoint (called by Stripe, not your frontend).

**Headers:**
- `stripe-signature: t=xxx,v1=xxx`

**Body:** Raw JSON from Stripe

---

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Lovable Cloud Documentation](https://docs.lovable.dev)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

---

## Support

For issues or questions:
1. Check Stripe dashboard for payment status
2. Review backend logs for errors
3. Test webhook delivery in Stripe dashboard
4. Verify environment variables are set correctly

---

**Last Updated:** 2024
**Version:** 1.0.0

