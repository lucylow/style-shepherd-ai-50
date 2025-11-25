# Quick Start Guide - Mock Data

Get started with mock data in 5 minutes!

## 🚀 Fastest Setup (json-server)

### 1. Install json-server
```bash
npm install -D json-server
```

### 2. Start mock server
```bash
npm run mock:server
```

The mock API will be available at `http://localhost:4000`

### 3. Test it
```bash
# Get an order
curl http://localhost:4000/orders/ord_0001

# Get all payment intents
curl http://localhost:4000/payment_intents

# Get merchant dashboard data
curl http://localhost:4000/merchants/cus_retailer_001
```

## 🎯 Use in Your App

### Option 1: Update API Base URL
```typescript
// src/lib/api-config.ts
export const getApiBaseUrl = () => {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
    return 'http://localhost:4000';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
};
```

Then run:
```bash
VITE_USE_MOCK_API=true npm run dev
```

### Option 2: Use MSW (Better for Testing)

1. Install MSW:
```bash
npm install -D msw
```

2. Initialize in your app:
```typescript
// src/main.tsx
if (import.meta.env.DEV) {
  import('./mocks/browser').then(({ worker }) => {
    worker.start();
  });
}
```

3. MSW will automatically intercept API calls!

## 📋 Available Mock Data

### Orders
- `ord_0001` - Paid order ($19.99)
- `ord_1002` - Fulfilled order with performance billing ($250.00)
- `ord_0003` - Pending payment order ($9.99)

### Payment Intents
- `pi_1JqYx2ABCxyz` - Succeeded payment
- `pi_1XYZ` - Another succeeded payment

### Subscriptions
- `sub_001` - Active subscription ($19.99/month)

### Invoices
- `in_001` - Paid subscription invoice
- `in_2048` - Open performance billing invoice ($6.75)
- `in_999` - Failed payment invoice

### Merchants
- `cus_retailer_001` - Boutique Test Co with Connect account

## 🧪 Test Scenarios

### 1. One-time Purchase
```bash
# Create payment intent
curl -X POST http://localhost:4000/payment_intents \
  -H "Content-Type: application/json" \
  -d '{"amount_cents": 1999, "currency": "usd"}'

# Get order details
curl http://localhost:4000/orders/ord_0001
```

### 2. Subscription
```bash
# Create checkout session
curl -X POST http://localhost:4000/checkout_sessions \
  -H "Content-Type: application/json" \
  -d '{"price_id": "price_ProMonthly_001", "mode": "subscription"}'

# Get subscription
curl http://localhost:4000/subscriptions/sub_001
```

### 3. Performance Billing
```bash
# Get commission calculation
curl http://localhost:4000/performance_commissions

# Get invoice
curl http://localhost:4000/invoices/in_2048
```

## 🔧 Customization

### Add Custom Routes (json-server)
Create `mocks/routes.json`:
```json
{
  "/api/order/:orderId": "/orders/:orderId",
  "/api/payments/intent": "/payment_intents"
}
```

Then run:
```bash
json-server --watch mocks/db.json --routes mocks/routes.json
```

### Modify Mock Data
Edit `mocks/db.json` directly - json-server will watch for changes!

## 📚 Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [example-usage.ts](./example-usage.ts) for code examples
- Review [sql-inserts.sql](./sql-inserts.sql) for database seeding

## 💡 Pro Tips

1. **Use MSW for tests** - It's better for unit/integration tests
2. **Use json-server for demos** - Great for quick API mocking
3. **Use mockService for backend** - Perfect for server-side development
4. **Combine approaches** - Use different mocks for different scenarios

Happy testing! 🎉

