# Mock Data for Stripe Flows & Style Shepherd Billing

This directory contains comprehensive mock data for testing all Stripe payment flows and Style Shepherd billing scenarios.

## Files Overview

- **`db.json`** - Complete JSON database for json-server with all mock data
- **`handlers.ts`** - MSW (Mock Service Worker) handlers for frontend testing
- **`browser.ts`** - MSW browser setup for development
- **`server.ts`** - MSW Node setup for Jest/Vitest tests
- **`mockService.ts`** - Mock payment service for backend development
- **`sql-inserts.sql`** - SQL INSERT statements for database seeding

## Quick Start

### Option A: json-server (Fastest for API Mocking)

1. Install json-server:
```bash
npm install -D json-server
```

2. Start the mock server:
```bash
npx json-server --watch mocks/db.json --port 4000
```

3. Update your API base URL in development:
```typescript
// src/lib/api-config.ts
export const getApiBaseUrl = () => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    return 'http://localhost:4000';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
};
```

4. Use the mock API:
```bash
VITE_USE_MOCK_API=true npm run dev
```

### Option B: MSW (Recommended for UI Testing)

1. Install MSW:
```bash
npm install -D msw
```

2. For browser (development):
```typescript
// src/main.tsx or src/mocks/browser.ts
import { worker } from './mocks/browser';

if (import.meta.env.DEV) {
  worker.start();
}
```

3. For tests (Jest/Vitest):
```typescript
// src/setupTests.ts or vitest.setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Option C: Backend Mock Service

1. Use the mock service in your PaymentService:
```typescript
// server/src/services/PaymentService.ts
import { mockPaymentService } from '../../mocks/mockService';

export class PaymentService {
  async createPaymentIntent(order: Order) {
    // Use mock in development
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_STRIPE === 'true') {
      return mockPaymentService.createPaymentIntent(order);
    }
    
    // Real Stripe implementation
    // ...
  }
}
```

2. Enable mock mode:
```bash
USE_MOCK_STRIPE=true npm run dev
```

## Mock Data Scenarios

### 1. One-time Purchase Flow

**Order**: `ord_0001`
- User: `user_123` (alice@example.com)
- Amount: $19.99
- Status: `paid`
- Payment Intent: `pi_1JqYx2ABCxyz`

**API Flow**:
1. `POST /api/payments/intent` → Returns `clientSecret`
2. Frontend confirms payment with Stripe SDK
3. Webhook: `payment_intent.succeeded` → Updates order to `paid`

### 2. Subscription Flow

**Subscription**: `sub_001`
- Customer: `bob@example.com`
- Price: `price_ProMonthly_001` ($19.99/month)
- Status: `active`

**API Flow**:
1. `POST /api/create-checkout-session` → Returns checkout URL
2. User completes checkout
3. Webhook: `invoice.payment_succeeded` → Activates subscription

### 3. Performance/Outcome Billing

**Order**: `ord_1002`
- Order Value: $250.00
- Predicted Return Before: 30%
- Predicted Return After: 12%
- Prevented Return: 18%
- Commission Rate: 15%
- Commission Amount: $6.75

**Calculation**:
```typescript
prevented_value = 250 * 0.18 = $45.00
commission = 45 * 0.15 = $6.75
```

**Invoice**: `in_2048` (status: `open`)

### 4. Stripe Connect (Merchant Onboarding)

**Connected Account**: `acct_conn_001`
- Type: Express
- Merchant: Boutique Test Co
- Status: Active

**API Flow**:
1. `POST /api/connect/accounts` → Creates connected account
2. `POST /api/connect/account-links` → Returns onboarding URL
3. Merchant completes onboarding
4. Payouts flow to connected account

### 5. Refunds & Disputes

**Refund**: `re_001`
- Charge: `ch_1JqYx2CH`
- Amount: $19.99
- Reason: `customer_request`

**Dispute**: `dp_001`
- Charge: `ch_1JqYx2CH`
- Amount: $19.99
- Status: `needs_response`
- Reason: `fraudulent`

## Webhook Events

All webhook events are stored in `db.json` under `webhook_events`. Use these to test your webhook handlers:

- `payment_intent.succeeded` - Payment completed
- `invoice.payment_succeeded` - Subscription payment succeeded
- `invoice.payment_failed` - Subscription payment failed
- `charge.refunded` - Refund processed
- `charge.dispute.created` - Dispute created

## Testing Scenarios

### Happy Path Purchase
```typescript
// 1. Create payment intent
const { clientSecret } = await paymentService.createPaymentIntent(items, userId);

// 2. Confirm payment (mock)
await mockPaymentService.simulatePaymentSuccess(paymentIntentId);

// 3. Verify order status
const order = await getOrder('ord_0001');
expect(order.status).toBe('paid');
```

### Subscription Start
```typescript
// 1. Create checkout session
const { url } = await createCheckoutSession({
  priceId: 'price_ProMonthly_001',
  mode: 'subscription',
  // ...
});

// 2. Simulate webhook
const event = mockWebhookEvents.invoicePaymentSucceeded('in_001', 'sub_001');
await handleWebhook(event);
```

### Performance Billing
```typescript
// 1. Calculate commission
const commission = mockPaymentService.computeCommission({
  order_value_cents: 25000,
  predicted_return_before: 0.30,
  predicted_return_after: 0.12,
});

// 2. Create invoice
const invoice = await mockPaymentService.createInvoice({
  customer: 'cus_retailer_001',
  amount: commission.commission_amount_cents,
  description: 'Prevented-returns commission',
});
```

## Database Seeding

Use `sql-inserts.sql` to seed your PostgreSQL database:

```bash
psql -U your_user -d your_database -f mocks/sql-inserts.sql
```

Or use it in your migration/seeding scripts.

## API Endpoints Reference

### Payment Endpoints
- `POST /api/payments/intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/webhook` - Stripe webhook handler
- `GET /api/order/:orderId` - Get order details

### Subscription Endpoints
- `POST /api/create-checkout-session` - Create checkout session
- `GET /api/subscription/:subscriptionId` - Get subscription

### Merchant/Connect Endpoints
- `POST /api/connect/accounts` - Create connected account
- `POST /api/connect/account-links` - Create onboarding link
- `GET /api/dashboard/merchant/:merchantId` - Merchant dashboard
- `GET /api/payouts` - List payouts

### Performance Billing
- `POST /api/compute-commission` - Calculate commission
- `POST /api/create-invoice-item` - Create invoice item

## Environment Variables

```bash
# Use mock API (json-server)
VITE_USE_MOCK_API=true

# Use mock Stripe in backend
USE_MOCK_STRIPE=true

# MSW in development
VITE_USE_MSW=true
```

## Reference Slide

The reference slide path is included in the mock data:
```
/mnt/data/A_presentation_slide_titled_"The_Challenge_in_Fash.png
```

This can be used in demo responses or UI components.

## Troubleshooting

### json-server CORS issues
Add CORS middleware or use the `--host` flag:
```bash
npx json-server --watch mocks/db.json --port 4000 --host 0.0.0.0
```

### MSW not intercepting requests
Make sure MSW is started before your app loads:
```typescript
// In main.tsx, before ReactDOM.render
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  await worker.start();
}
```

### Webhook signature verification
In development, webhook signature verification is skipped. For testing, you can:
1. Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/payments/webhook`
2. Or disable verification in development mode (already handled in PaymentService)

## Next Steps

1. **Choose your mocking approach** (json-server, MSW, or mock service)
2. **Update your API config** to use mocks in development
3. **Test your flows** using the provided scenarios
4. **Extend the mocks** as needed for your specific use cases

For questions or issues, refer to the main README or check the implementation in `server/src/services/PaymentService.ts`.

