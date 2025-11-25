# Backend Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Vultr PostgreSQL instance set up
- Vultr Valkey instance set up
- API keys for: Raindrop, ElevenLabs, WorkOS, Stripe

## Setup Steps

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Vultr PostgreSQL
VULTR_POSTGRES_HOST=your-postgres-host.vultr.com
VULTR_POSTGRES_DATABASE=style_shepherd
VULTR_POSTGRES_USER=your_user
VULTR_POSTGRES_PASSWORD=your_password

# Vultr Valkey
VULTR_VALKEY_HOST=your-valkey-host.vultr.com
VULTR_VALKEY_PORT=6379
VULTR_VALKEY_PASSWORD=your_password

# API Keys
RAINDROP_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
WORKOS_API_KEY=your_key
STRIPE_SECRET_KEY=sk_test_your_key
```

### 3. Initialize Database

Connect to your Vultr PostgreSQL instance and run:

```bash
psql -h $VULTR_POSTGRES_HOST -U $VULTR_POSTGRES_USER -d $VULTR_POSTGRES_DATABASE -f src/db/init.sql
```

Or use a PostgreSQL client to execute `src/db/init.sql`.

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### 5. Test Health Endpoint

```bash
curl http://localhost:3001/health
```

You should see:
```json
{
  "status": "healthy",
  "services": {
    "postgres": { "status": "healthy", "latency": 5 },
    "valkey": { "status": "healthy", "latency": 2 }
  }
}
```

## Testing API Endpoints

### Test Product Recommendations

```bash
curl -X POST http://localhost:3001/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "userPreferences": {
      "favoriteColors": ["blue", "black"],
      "preferredStyles": ["casual", "modern"]
    },
    "context": {
      "budget": 500,
      "occasion": "casual"
    }
  }'
```

### Test Voice Conversation

```bash
curl -X POST http://localhost:3001/api/voice/conversation/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123"
  }'
```

### Test Vultr PostgreSQL

```bash
curl http://localhost:3001/api/vultr/postgres/health
```

### Test Vultr Valkey

```bash
curl http://localhost:3001/api/vultr/valkey/health
```

## Frontend Integration

Update your frontend Vultr service files to point to the backend:

**Development:**
```typescript
const API_ENDPOINT = 'http://localhost:3001/api/vultr';
```

**Production:**
```typescript
const API_ENDPOINT = 'https://your-backend-domain.com/api/vultr';
```

## Common Issues

### Database Connection Error

- Verify PostgreSQL credentials in `.env`
- Check if Vultr PostgreSQL allows connections from your IP
- Ensure SSL is configured correctly

### Valkey Connection Error

- Verify Valkey credentials in `.env`
- Check if TLS is required (set `VULTR_VALKEY_TLS=true`)
- Ensure network connectivity to Valkey instance

### Missing Environment Variables

The server will fail to start if required environment variables are missing. Check the error message for which variable is missing.

## Next Steps

1. **Deploy to Production**: Deploy to Raindrop Platform or Vultr Kubernetes
2. **Add Monitoring**: Set up application monitoring
3. **Add Logging**: Configure structured logging
4. **Add Tests**: Write unit and integration tests
5. **Add API Documentation**: Generate OpenAPI/Swagger docs

## Support

For issues or questions, refer to:
- `BACKEND_IMPROVEMENTS.md` - Detailed implementation guide
- `README.md` - Full documentation
- Technical plan document

