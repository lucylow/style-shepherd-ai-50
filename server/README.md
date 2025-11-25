# Style Shepherd Backend API

Backend API server for the Style Shepherd voice commerce platform, built according to the technical plan.

## Features

- ✅ **Vultr PostgreSQL Integration** - Managed database for products, users, orders
- ✅ **Vultr Valkey Integration** - Redis-compatible caching for sessions and recommendations
- ✅ **Raindrop Smart Components** - SmartMemory, SmartBuckets, SmartSQL, SmartInference
- ✅ **ElevenLabs Voice Integration** - Voice conversation handling
- ✅ **WorkOS Authentication** - Enterprise-ready authentication
- ✅ **Stripe Payments** - Payment processing with return prediction
- ✅ **Product Recommendation API** - ML-powered recommendations using Vultr GPU
- ✅ **Fashion Engine** - Size prediction and style matching

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Initialize database:**
   ```bash
   # Run the SQL schema on your Vultr PostgreSQL instance
   psql -h $VULTR_POSTGRES_HOST -U $VULTR_POSTGRES_USER -d $VULTR_POSTGRES_DATABASE -f src/db/init.sql
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Vultr Services
- `GET /api/vultr/postgres/health` - PostgreSQL health
- `GET /api/vultr/postgres/products` - Get products
- `GET /api/vultr/postgres/users/:userId/profile` - Get user profile
- `POST /api/vultr/postgres/users/:userId/profile` - Save user profile
- `GET /api/vultr/valkey/health` - Valkey health
- `POST /api/vultr/valkey/session/:sessionId` - Set session
- `GET /api/vultr/valkey/session/:sessionId` - Get session

### Product Recommendations
- `POST /api/recommendations` - Get personalized recommendations
- `POST /api/visual-search` - Visual similarity search
- `POST /api/size-prediction` - Predict optimal size

### Voice Assistant
- `POST /api/voice/conversation/start` - Start conversation
- `POST /api/voice/conversation/process` - Process voice input
- `GET /api/voice/conversation/history/:userId` - Get conversation history

### Fashion Engine
- `POST /api/fashion/recommendation` - Get fashion recommendation

### Payments
- `POST /api/payments/intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `POST /api/payments/webhook` - Stripe webhook handler
- `POST /api/payments/return-prediction` - Predict return risk

### Authentication
- `GET /api/auth/authorize` - Get authorization URL
- `POST /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/profile/:userId` - Get user profile

## Architecture

The backend follows the technical plan structure:

- **Services Layer**: Business logic (ProductRecommendationAPI, VoiceAssistant, FashionEngine, PaymentService, AuthService)
- **Lib Layer**: Infrastructure (Raindrop config, Vultr PostgreSQL, Vultr Valkey)
- **Routes Layer**: API endpoints
- **Config Layer**: Environment configuration

## Integration with Frontend

The frontend Vite app expects these API endpoints. Update the frontend's Vultr service files to point to:
- Development: `http://localhost:3001/api/vultr`
- Production: `https://your-backend-domain.com/api/vultr`

## Deployment

This backend can be deployed to:
- Raindrop Platform (recommended)
- Vultr Kubernetes Engine
- Any Node.js hosting platform

Ensure all environment variables are set in your deployment environment.

