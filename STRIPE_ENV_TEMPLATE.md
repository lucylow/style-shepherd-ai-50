# Stripe Environment Variables Template

Copy these variables to your Lovable project settings.

## Frontend Environment Variables (VITE_*)

Add these in **Lovable → Project Settings → Environment Variables**:

```bash
# Stripe Publishable Key (safe for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API Base URL (use relative path for Lovable)
VITE_API_BASE_URL=/api

# Optional: WorkOS (if using authentication)
VITE_WORKOS_CLIENT_ID=client_xxxxxxxxxxxxxxxxxxxxxxxx
```

## Backend Environment Variables

Add these in **Lovable → Backend Settings → Environment Variables**:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*

# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database (Vultr PostgreSQL - if using)
VULTR_POSTGRES_HOST=your-postgres-host.vultr.com
VULTR_POSTGRES_PORT=5432
VULTR_POSTGRES_DATABASE=style_shepherd
VULTR_POSTGRES_USER=your_username
VULTR_POSTGRES_PASSWORD=your_password
VULTR_POSTGRES_SSL=true

# Cache (Vultr Valkey - if using)
VULTR_VALKEY_HOST=your-valkey-host.vultr.com
VULTR_VALKEY_PORT=6379
VULTR_VALKEY_PASSWORD=your_password
VULTR_VALKEY_TLS=true

# Optional: WorkOS (if using authentication)
WORKOS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxx
WORKOS_CLIENT_ID=client_xxxxxxxxxxxxxxxxxxxxxxxx

# Optional: ElevenLabs (if using voice features)
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

## Getting Your Stripe Keys

### 1. Publishable Key (Frontend)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers → API keys**
3. Copy the **Publishable key** (starts with `pk_test_` for test mode)
4. Add to frontend environment variables

### 2. Secret Key (Backend)

1. In the same Stripe Dashboard page
2. Click **Reveal test key** (or use live key for production)
3. Copy the **Secret key** (starts with `sk_test_` for test mode)
4. ⚠️ **Keep this secret!** Only add to backend environment variables

### 3. Webhook Secret (Backend)

1. Go to **Developers → Webhooks**
2. Click **Add endpoint** (or use existing)
3. Set endpoint URL: `https://your-domain.com/api/payments/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. After creating, click on the endpoint
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to backend environment variables

## Test Mode vs Live Mode

### Test Mode (Development)
- Use keys starting with `pk_test_` and `sk_test_`
- No real money is charged
- Use test cards: `4242 4242 4242 4242`
- Perfect for development and testing

### Live Mode (Production)
- Use keys starting with `pk_live_` and `sk_live_`
- Real money is charged
- Requires verified Stripe account
- Switch only when ready for production

## Security Notes

⚠️ **IMPORTANT:**
- Never commit secret keys to version control
- Never expose secret keys in frontend code
- Use environment variables for all sensitive data
- Rotate keys if accidentally exposed
- Use test mode during development

## Quick Setup Checklist

- [ ] Stripe account created and verified
- [ ] Test mode publishable key added to frontend
- [ ] Test mode secret key added to backend
- [ ] Webhook endpoint created in Stripe
- [ ] Webhook secret added to backend
- [ ] Test payment successful
- [ ] Webhook events received and processed
- [ ] Ready for production (switch to live keys)

