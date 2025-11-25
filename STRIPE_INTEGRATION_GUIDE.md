# Stripe Integration Guide - Style Shepherd

This document outlines the comprehensive Stripe integration improvements implemented for Style Shepherd, including subscriptions, checkout sessions, webhooks, and performance-based billing.

## 🎯 Overview

The Stripe integration has been significantly enhanced to support:
- ✅ One-time payments with Payment Intents
- ✅ Subscription billing (monthly/yearly plans)
- ✅ Stripe Checkout Sessions
- ✅ Performance-based billing (prevented returns commission)
- ✅ Comprehensive webhook handling
- ✅ Customer management
- ✅ Refunds and dispute handling
- ✅ Idempotency keys for payment safety

## 📁 File Structure

### Backend Files

**Payment Service** (`server/src/services/PaymentService.ts`)
- Enhanced with subscriptions, checkout sessions, customer management
- Performance billing for prevented returns
- Comprehensive webhook event handling
- Refund and dispute management

**API Routes** (`server/src/routes/api.ts`)
- `/api/payments/intent` - Create payment intent
- `/api/payments/checkout-session` - Create checkout session
- `/api/payments/subscriptions` - Create subscription
- `/api/payments/subscriptions/:id/cancel` - Cancel subscription
- `/api/payments/performance-invoice` - Create performance invoice
- `/api/payments/intent-idempotent` - Create payment intent with idempotency
- `/api/payments/refund` - Process refunds
- `/api/payments/webhook` - Stripe webhook handler

**Database Schema** (`server/src/db/init.sql`)
- `users` - User accounts with Stripe customer IDs
- `subscriptions` - Subscription records
- `invoices` - Invoice tracking
- `payments` - Payment records
- `webhook_events` - Webhook event log

### Frontend Files

**Subscription Pages**
- `src/pages/SubscriptionCheckout.tsx` - Subscription plan selection
- `src/pages/SubscriptionSuccess.tsx` - Post-subscription success page

**Payment Service** (`src/services/paymentService.ts`)
- Frontend service for payment operations

## 🚀 Key Features

### 1. Subscription Management

**Create Subscription:**
```typescript
POST /api/payments/subscriptions
{
  "userId": "user_123",
  "priceId": "price_xxx", // From Stripe dashboard
  "customerEmail": "user@example.com"
}
```

**Cancel Subscription:**
```typescript
POST /api/payments/subscriptions/:subscriptionId/cancel
{
  "immediately": false // Cancel at period end
}
```

### 2. Checkout Sessions

**Create Checkout Session:**
```typescript
POST /api/payments/checkout-session
{
  "userId": "user_123",
  "mode": "subscription", // or "payment" or "setup"
  "priceId": "price_xxx",
  "successUrl": "https://yourapp.com/success",
  "cancelUrl": "https://yourapp.com/cancel",
  "customerEmail": "user@example.com"
}
```

### 3. Performance-Based Billing

Bill retailers based on prevented returns:

```typescript
POST /api/payments/performance-invoice
{
  "retailerCustomerId": "cus_xxx",
  "orderId": "order_123",
  "preventedValue": 150.00, // Dollar value of prevented returns
  "commissionRate": 0.15, // 15% commission
  "description": "Prevented returns commission — order order_123"
}
```

### 4. Idempotency Keys

Prevent duplicate charges:

```typescript
POST /api/payments/intent-idempotent
{
  "userId": "user_123",
  "items": [...],
  "totalAmount": 99.99,
  "shippingInfo": {...},
  "idempotencyKey": "unique-key-123" // Generate client-side
}
```

### 5. Webhook Events

The webhook handler processes these events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`

## 🔧 Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Subscription Price IDs (create in Stripe dashboard)
VITE_STRIPE_PRICE_ID_MONTHLY=price_xxx
VITE_STRIPE_PRICE_ID_YEARLY=price_xxx
```

### 2. Create Stripe Products & Prices

1. Go to Stripe Dashboard → Products
2. Create product: "Style Concierge"
3. Create prices:
   - Monthly: $19.99/month
   - Yearly: $199.99/year
4. Copy Price IDs to environment variables

### 3. Configure Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payments/webhook`
3. Select events to listen to (or select "All events")
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Database Migration

Run the database schema:

```bash
psql -h your-postgres-host -U your-user -d your-db -f server/src/db/init.sql
```

## 🧪 Testing

### Stripe CLI (Local Development)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/payments/webhook

# Test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.payment_succeeded
```

### Test Cards

- **Success**: `4242 4242 4242 4242`
- **3D Secure Required**: `4000 0027 6000 3184`
- **Insufficient Funds**: `4000 0000 0000 9995`
- **Decline**: `4000 0000 0000 0002`

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  user_id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  stripe_customer_id VARCHAR(255) UNIQUE,
  plan VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  subscription_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Invoices Table
```sql
CREATE TABLE invoices (
  invoice_id VARCHAR(255) PRIMARY KEY,
  retailer_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  order_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Webhook Events Table
```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Frontend Usage

### Subscription Checkout

Navigate to `/subscription-checkout` to see available plans:

```tsx
import { Link } from 'react-router-dom';

<Link to="/subscription-checkout">Subscribe Now</Link>
```

### Using Payment Service

```typescript
import { paymentService } from '@/services/paymentService';

// Create payment intent
const paymentIntent = await paymentService.createPaymentIntent(items, userId);

// Create checkout session
const session = await paymentService.createCheckoutSession({
  items,
  userId,
  successUrl: 'https://yourapp.com/success',
  cancelUrl: 'https://yourapp.com/cancel',
});
```

## 🔒 Security Best Practices

1. **Never expose secret keys** - Only use publishable keys in frontend
2. **Verify webhook signatures** - Always verify Stripe webhook signatures
3. **Use idempotency keys** - Prevent duplicate charges
4. **Store minimal data** - Only store necessary payment data
5. **HTTPS only** - Always use HTTPS in production
6. **PCI Compliance** - Using Stripe Elements/Checkout keeps you out of PCI scope

## 📈 Metrics & Analytics

Track these metrics for judges:

- **MRR/ARR**: Monthly/Annual Recurring Revenue from subscriptions
- **Payment Success Rate**: % of successful payments
- **Refund Rate**: Should decrease with your model
- **Subscription Churn**: % of canceled subscriptions
- **GMV**: Gross Merchandise Value processed through Stripe
- **Prevented Return Revenue**: Revenue from performance billing

## 🚦 Pilot Roadmap (2-Week Plan)

### Week 1
- ✅ Implement payment intent endpoint
- ✅ Add webhook endpoint with event logging
- ✅ Create subscription checkout flow
- ✅ Test with Stripe CLI

### Week 2
- ✅ Implement performance billing demo
- ✅ Add subscription management UI
- ✅ Test end-to-end flows
- ✅ Prepare demo video and documentation

## 📝 Next Steps

1. **Create Stripe Products** in dashboard
2. **Set up webhook endpoint** in production
3. **Test subscription flow** end-to-end
4. **Implement analytics dashboard** for metrics
5. **Add email notifications** for subscription events
6. **Set up automated reconciliation** for performance billing

## 🆘 Troubleshooting

### Webhook Signature Verification Failed
- Ensure webhook secret is correct
- Check that raw body is used (not JSON parsed)
- Verify webhook endpoint URL matches Stripe dashboard

### Payment Intent Creation Fails
- Verify Stripe secret key is correct
- Check amount is in cents (not dollars)
- Ensure customer exists or can be created

### Subscription Not Activating
- Check webhook events are being received
- Verify subscription status in Stripe dashboard
- Check database for subscription records

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

---

**Last Updated**: 2024
**Version**: 1.0.0

