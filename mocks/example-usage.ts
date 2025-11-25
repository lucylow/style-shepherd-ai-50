/**
 * Example Usage of Mock Data
 * 
 * This file demonstrates how to use the mock data in different scenarios
 */

import { mockPaymentService, mockWebhookEvents } from './mockService';

// Example 1: Create a payment intent
export async function exampleCreatePaymentIntent() {
  const order = {
    userId: 'user_123',
    items: [
      {
        productId: 'fit-report-pro',
        quantity: 1,
        price: 19.99,
        size: 'M',
      },
    ],
    totalAmount: 19.99,
    shippingInfo: {
      name: 'Alice Smith',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'US',
    },
  };

  const result = await mockPaymentService.createPaymentIntent(order);
  console.log('Payment Intent Created:', result);
  // {
  //   clientSecret: 'pi_mock_..._secret_mock',
  //   paymentIntentId: 'pi_mock_...',
  //   returnPrediction: { ... }
  // }
}

// Example 2: Simulate payment success
export async function exampleSimulatePayment() {
  const paymentIntentId = 'pi_mock_123456';
  
  // First create the intent
  const order = {
    userId: 'user_123',
    items: [{ productId: 'prod_001', quantity: 1, price: 29.99, size: 'M' }],
    totalAmount: 29.99,
    shippingInfo: {
      name: 'Test User',
      address: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zip: '12345',
      country: 'US',
    },
  };
  
  const { paymentIntentId: createdId } = await mockPaymentService.createPaymentIntent(order);
  
  // Then simulate success
  await mockPaymentService.simulatePaymentSuccess(createdId);
  
  // Verify
  const intent = mockPaymentService.getPaymentIntent(createdId);
  console.log('Payment Status:', intent?.status); // 'succeeded'
}

// Example 3: Compute performance commission
export function exampleComputeCommission() {
  const commission = mockPaymentService.computeCommission({
    order_value_cents: 25000, // $250.00
    predicted_return_before: 0.30, // 30%
    predicted_return_after: 0.12, // 12%
    commission_rate: 0.15, // 15%
  });

  console.log('Commission Calculation:', commission);
  // {
  //   prevented_prob: 0.18,
  //   prevented_value_cents: 4500,
  //   commission_amount_cents: 675
  // }
}

// Example 4: Create invoice for performance billing
export async function exampleCreateInvoice() {
  const commission = mockPaymentService.computeCommission({
    order_value_cents: 25000,
    predicted_return_before: 0.30,
    predicted_return_after: 0.12,
  });

  const invoice = await mockPaymentService.createInvoice({
    customer: 'cus_retailer_001',
    amount: commission.commission_amount_cents,
    description: 'Prevented-returns commission — order ord_1002',
    metadata: {
      pilot_id: 'pilot_summer_01',
      calculation_order: 'ord_1002',
    },
  });

  console.log('Invoice Created:', invoice);
  // {
  //   id: 'in_mock_...',
  //   customer: 'cus_retailer_001',
  //   amount_due: 675,
  //   status: 'open',
  //   ...
  // }
}

// Example 5: Generate webhook events
export function exampleWebhookEvents() {
  // Payment succeeded
  const paymentSucceeded = mockWebhookEvents.paymentIntentSucceeded(
    'pi_1JqYx2ABCxyz',
    'ord_0001'
  );
  console.log('Payment Succeeded Event:', paymentSucceeded);

  // Invoice payment succeeded
  const invoicePaid = mockWebhookEvents.invoicePaymentSucceeded(
    'in_001',
    'sub_001'
  );
  console.log('Invoice Paid Event:', invoicePaid);

  // Invoice payment failed
  const invoiceFailed = mockWebhookEvents.invoicePaymentFailed('in_999');
  console.log('Invoice Failed Event:', invoiceFailed);

  // Refund
  const refunded = mockWebhookEvents.chargeRefunded('ch_1JqYx2CH');
  console.log('Refund Event:', refunded);

  // Dispute
  const dispute = mockWebhookEvents.disputeCreated('dp_001', 'ch_1JqYx2CH');
  console.log('Dispute Event:', dispute);
}

// Example 6: Full purchase flow
export async function exampleFullPurchaseFlow() {
  // Step 1: Create order
  const order = {
    userId: 'user_123',
    items: [
      {
        productId: 'fit-report-pro',
        quantity: 1,
        price: 19.99,
        size: 'M',
      },
    ],
    totalAmount: 19.99,
    shippingInfo: {
      name: 'Alice Smith',
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'US',
    },
  };

  // Step 2: Create payment intent
  const { paymentIntentId, clientSecret } = await mockPaymentService.createPaymentIntent(order);
  console.log('Step 2: Payment Intent Created', { paymentIntentId, clientSecret });

  // Step 3: Simulate payment confirmation (in real app, this happens via Stripe SDK)
  await mockPaymentService.simulatePaymentSuccess(paymentIntentId);
  console.log('Step 3: Payment Confirmed');

  // Step 4: Generate webhook event
  const webhookEvent = mockWebhookEvents.paymentIntentSucceeded(
    paymentIntentId,
    'ord_0001'
  );
  console.log('Step 4: Webhook Event Generated', webhookEvent);

  // Step 5: Verify payment status
  const intent = mockPaymentService.getPaymentIntent(paymentIntentId);
  console.log('Step 5: Final Payment Status', intent?.status); // 'succeeded'
}

// Example 7: Subscription flow
export async function exampleSubscriptionFlow() {
  // Step 1: Create checkout session
  const session = await mockPaymentService.createCheckoutSession({
    priceId: 'price_ProMonthly_001',
    mode: 'subscription',
    successUrl: 'https://app.example.com/subscription/success',
    cancelUrl: 'https://app.example.com/subscription/cancel',
    customerEmail: 'bob@example.com',
  });
  console.log('Step 1: Checkout Session Created', session);

  // Step 2: Simulate webhook (invoice.payment_succeeded)
  const invoicePaidEvent = mockWebhookEvents.invoicePaymentSucceeded(
    'in_001',
    'sub_001'
  );
  console.log('Step 2: Invoice Paid Event', invoicePaidEvent);

  // In your app, you would:
  // - Update subscription status to 'active'
  // - Grant access to premium features
  // - Send confirmation email
}

// Example 8: Performance billing flow
export async function examplePerformanceBillingFlow() {
  // Step 1: Order completed with predictions
  const orderData = {
    order_id: 'ord_1002',
    order_value_cents: 25000, // $250.00
    predicted_return_before: 0.30, // 30%
    predicted_return_after: 0.12, // 12%
  };

  // Step 2: Calculate commission
  const commission = mockPaymentService.computeCommission({
    order_value_cents: orderData.order_value_cents,
    predicted_return_before: orderData.predicted_return_before,
    predicted_return_after: orderData.predicted_return_after,
  });
  console.log('Step 2: Commission Calculated', commission);

  // Step 3: Create invoice
  const invoice = await mockPaymentService.createInvoice({
    customer: 'cus_retailer_001',
    amount: commission.commission_amount_cents,
    description: `Prevented-returns commission — order ${orderData.order_id}`,
    metadata: {
      pilot_id: 'pilot_summer_01',
      calculation_order: orderData.order_id,
    },
  });
  console.log('Step 3: Invoice Created', invoice);

  // Step 4: Simulate invoice payment (webhook)
  const invoicePaidEvent = mockWebhookEvents.invoicePaymentSucceeded(
    invoice.id,
    'sub_retailer_001'
  );
  console.log('Step 4: Invoice Paid', invoicePaidEvent);
}

// Run examples (uncomment to test)
// exampleCreatePaymentIntent();
// exampleSimulatePayment();
// exampleComputeCommission();
// exampleCreateInvoice();
// exampleWebhookEvents();
// exampleFullPurchaseFlow();
// exampleSubscriptionFlow();
// examplePerformanceBillingFlow();

