/**
 * MSW (Mock Service Worker) Handlers
 * Use these handlers in your frontend tests to mock Stripe API responses
 * 
 * Setup:
 * 1. Install: npm install -D msw
 * 2. Create src/mocks/handlers.ts (copy this file)
 * 3. Create src/mocks/browser.ts with setupWorker
 * 4. Import in your test setup or main.tsx for development
 */

import { http, HttpResponse } from 'msw';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const handlers = [
  // Create Payment Intent
  http.post(`${API_BASE}/payments/intent`, async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      clientSecret: 'pi_1JqYx2ABCxyz_secret_123456',
      paymentIntentId: 'pi_1JqYx2ABCxyz',
      amount_cents: body.totalAmount * 100 || 1999,
      currency: 'usd',
      returnPrediction: {
        score: 0.25,
        riskLevel: 'low' as const,
        factors: ['Good size match', 'Style alignment'],
        suggestions: ['This order has good compatibility with your profile']
      }
    });
  }),

  // Create Checkout Session
  http.post(`${API_BASE}/create-checkout-session`, async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      url: 'https://checkout.stripe.com/pay/cs_test_a1b2c3d4',
      sessionId: 'cs_test_a1b2c3d4'
    });
  }),

  // Get Order Details
  http.get(`${API_BASE}/order/:orderId`, ({ params }) => {
    const { orderId } = params;
    
    if (orderId === 'ord_0001') {
      return HttpResponse.json({
        order: {
          id: 'ord_0001',
          status: 'paid',
          amount_cents: 1999,
          currency: 'usd',
          items: [
            { sku: 'fit-report-pro', title: 'Premium Fit Report', qty: 1 }
          ],
          payment: {
            payment_intent: 'pi_1JqYx2ABCxyz',
            status: 'succeeded',
            method: { brand: 'visa', last4: '4242' }
          },
          download_url: '/downloads/fit-report-ord_0001.pdf',
          created_at: '2025-11-25T18:00:00Z'
        },
        reference_slide_url: '/mnt/data/A_presentation_slide_titled_"The_Challenge_in_Fash.png'
      });
    }
    
    return HttpResponse.json({ error: 'Order not found' }, { status: 404 });
  }),

  // Get Merchant Dashboard
  http.get(`${API_BASE}/dashboard/merchant/:merchantId`, ({ params }) => {
    const { merchantId } = params;
    
    if (merchantId === 'cus_retailer_001') {
      return HttpResponse.json({
        merchant: {
          id: 'cus_retailer_001',
          name: 'Boutique Test Co',
          connected_account_id: 'acct_conn_001',
          balance_cents: 154320,
          pending_invoices: [
            { id: 'in_2048', amount_cents: 675, due_in_days: 30 }
          ],
          recent_payouts: [
            { id: 'po_789', amount_cents: 150000, status: 'in_transit' }
          ]
        }
      });
    }
    
    return HttpResponse.json({ error: 'Merchant not found' }, { status: 404 });
  }),

  // Compute Commission (Performance Billing)
  http.post(`${API_BASE}/compute-commission`, async ({ request }) => {
    const body = await request.json() as any;
    
    // Mock commission calculation
    const orderValueCents = body.order_value_cents || 25000;
    const predictedReturnBefore = body.predicted_return_before || 0.30;
    const predictedReturnAfter = body.predicted_return_after || 0.12;
    const preventedProb = predictedReturnBefore - predictedReturnAfter;
    const preventedValueCents = Math.round(orderValueCents * preventedProb);
    const commissionRate = 0.15;
    const commissionAmountCents = Math.round(preventedValueCents * commissionRate);
    
    return HttpResponse.json({
      order_id: body.order_id || 'ord_1002',
      order_value_cents: orderValueCents,
      predicted_return_before: predictedReturnBefore,
      predicted_return_after: predictedReturnAfter,
      prevented_prob: preventedProb,
      prevented_value_cents: preventedValueCents,
      commission_rate: commissionRate,
      commission_amount_cents: commissionAmountCents
    });
  }),

  // Stripe Webhook (for testing webhook handlers)
  http.post(`${API_BASE}/payments/webhook`, async ({ request }) => {
    // In real scenario, this would verify the signature
    // For testing, we'll just return success
    return HttpResponse.json({ received: true });
  }),

  // Create Invoice Item (Performance Billing)
  http.post(`${API_BASE}/create-invoice-item`, async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      invoice: {
        id: 'in_2048',
        customer: body.customer || 'cus_retailer_001',
        amount_due: body.amount || 675,
        currency: 'usd',
        status: 'open',
        created_at: new Date().toISOString(),
        metadata: body.metadata || { pilot_id: 'pilot_summer_01' }
      }
    });
  }),

  // Get Subscription
  http.get(`${API_BASE}/subscription/:subscriptionId`, ({ params }) => {
    const { subscriptionId } = params;
    
    if (subscriptionId === 'sub_001') {
      return HttpResponse.json({
        id: 'sub_001',
        customer_id: 'cus_bob_001',
        customer_email: 'bob@example.com',
        status: 'active',
        price_id: 'price_ProMonthly_001',
        amount_cents: 1999,
        currency: 'usd',
        current_period_start: '2025-11-25T20:00:00Z',
        current_period_end: '2025-12-25T20:00:00Z'
      });
    }
    
    return HttpResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }),

  // Create Connected Account
  http.post(`${API_BASE}/connect/accounts`, async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      connected_account: {
        id: 'acct_conn_001',
        object: 'account',
        type: 'express',
        country: body.country || 'US',
        capabilities: { card_payments: 'active', transfers: 'active' },
        email: body.email || 'merchant@boutique.example',
        business_profile: {
          mcc: '5699',
          url: body.url || 'https://boutique.example'
        }
      }
    });
  }),

  // Create Account Link (Onboarding)
  http.post(`${API_BASE}/connect/account-links`, async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      account_link: {
        url: 'https://connect.stripe.com/setup/s/some-onboarding-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
  }),

  // Create Refund
  http.post(`${API_BASE}/refunds`, async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      refund: {
        id: 're_001',
        charge: body.charge || 'ch_1JqYx2CH',
        amount: body.amount || 1999,
        currency: 'usd',
        status: 'succeeded',
        reason: body.reason || 'customer_request',
        created_at: new Date().toISOString()
      }
    });
  }),

  // Get Payouts
  http.get(`${API_BASE}/payouts`, () => {
    return HttpResponse.json({
      payouts: [
        {
          id: 'po_789',
          amount_cents: 150000,
          currency: 'usd',
          arrival_date: '2025-11-30',
          status: 'in_transit',
          destination: 'ba_001'
        }
      ]
    });
  })
];

