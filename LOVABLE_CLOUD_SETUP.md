# Lovable Cloud Backend Configuration Guide

This guide explains how to configure Style Shepherd to work with Lovable Cloud backend.

## Overview

The application has been configured to work seamlessly with Lovable Cloud backend deployment. All API endpoints now use a centralized configuration system that automatically detects the correct backend URL.

## Key Changes Made

### 1. Centralized API Configuration (`src/lib/api-config.ts`)

A new helper module provides consistent API endpoint configuration:
- `getApiBaseUrl()` - Returns the base URL for backend API calls
- `getVultrPostgresApiEndpoint()` - Returns Vultr PostgreSQL API endpoint
- `getVultrValkeyApiEndpoint()` - Returns Vultr Valkey API endpoint
- `getRaindropBaseUrl()` - Returns Raindrop API base URL
- `isLovableEnvironment()` - Detects if running in Lovable environment

### 2. Updated Services

All frontend services now use the centralized API configuration:
- `paymentService.ts` - Updated to use `getApiBaseUrl()`
- `vultr/postgres.ts` - Updated to use `getVultrPostgresApiEndpoint()`
- `vultr/valkey.ts` - Updated to use `getVultrValkeyApiEndpoint()`
- `raindrop/config.ts` - Updated to use `getRaindropBaseUrl()`

### 3. Backend Server Configuration

The backend server (`server/`) has been updated to:
- Make Raindrop environment variables optional
- Support flexible CORS configuration for Lovable deployment
- Gracefully handle missing optional dependencies

## Environment Variables

### Frontend Variables (VITE_*)

These variables are used by the frontend and should be set in your Lovable project settings:

```bash
# API Configuration
VITE_API_BASE_URL=/api  # Relative path works with Lovable backend

# Raindrop/Lovable Configuration (optional)
VITE_RAINDROP_API_KEY=your_raindrop_api_key
VITE_RAINDROP_PROJECT_ID=your_raindrop_project_id
VITE_RAINDROP_BASE_URL=https://api.raindrop.io

# Vultr Service Endpoints (optional, if using backend proxy)
VITE_VULTR_POSTGRES_API_ENDPOINT=/api/vultr/postgres
VITE_VULTR_VALKEY_API_ENDPOINT=/api/vultr/valkey

# Third-party Services
VITE_WORKOS_CLIENT_ID=your_workos_client_id
VITE_WORKOS_API_HOSTNAME=api.workos.com
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Backend Variables (Server)

These variables are used by the backend server and should be set in your Lovable backend environment:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001  # Usually auto-configured by Lovable

# Raindrop Platform (optional)
RAINDROP_API_KEY=your_raindrop_api_key
RAINDROP_PROJECT_ID=your_raindrop_project_id
RAINDROP_BASE_URL=https://api.raindrop.io

# Vultr Services (if using)
VULTR_POSTGRES_HOST=your-postgres-host.vultr.com
VULTR_POSTGRES_PORT=5432
VULTR_POSTGRES_DATABASE=style_shepherd
VULTR_POSTGRES_USER=your_username
VULTR_POSTGRES_PASSWORD=your_password
VULTR_POSTGRES_SSL=true

VULTR_VALKEY_HOST=your-valkey-host.vultr.com
VULTR_VALKEY_PORT=6379
VULTR_VALKEY_PASSWORD=your_password
VULTR_VALKEY_TLS=true

# Third-party Services
ELEVENLABS_API_KEY=your_elevenlabs_api_key
WORKOS_API_KEY=your_workos_api_key
WORKOS_CLIENT_ID=your_workos_client_id
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# CORS Configuration
CORS_ORIGIN=*  # Or specific origins separated by commas
```

## Deployment on Lovable Cloud

### 1. Frontend Deployment

The frontend automatically detects the Lovable environment and uses relative API paths (`/api`), which work seamlessly when deployed on Lovable Cloud.

### 2. Backend Deployment

If you're deploying a separate backend server:

1. **Deploy the backend** (`server/` directory) to Lovable Cloud
2. **Configure environment variables** in Lovable project settings
3. **Ensure the backend is accessible** at `/api` path (configured in Lovable routing)

### 3. API Routing

When deployed on Lovable:
- Frontend: Serves from the root path
- Backend API: Accessible at `/api/*` endpoints
- All API calls use relative paths, automatically working with the deployed URL

## How It Works

1. **Development**: 
   - Frontend runs on `http://localhost:8080`
   - Backend can run on `http://localhost:3001`
   - Set `VITE_API_BASE_URL=http://localhost:3001/api` for local development

2. **Production (Lovable)**:
   - Frontend and backend deployed together
   - API calls use relative paths (`/api/*`)
   - Automatically works with Lovable's routing

## Testing

To verify everything works:

1. **Check API endpoints**:
   - Visit `/health` endpoint to verify backend is running
   - Test API calls from the frontend console

2. **Verify environment**:
   - Check browser console for API call errors
   - Verify environment variables are loaded correctly

3. **Test services**:
   - Try creating a payment intent
   - Test Vultr service connections (if configured)
   - Verify Raindrop Smart Components (if configured)

## Troubleshooting

### API calls failing

1. Check that `VITE_API_BASE_URL` is correctly set
2. Verify backend is deployed and accessible
3. Check CORS configuration in backend
4. Verify API endpoints match between frontend and backend

### Raindrop/Smart Components not working

1. Verify `VITE_RAINDROP_API_KEY` and `VITE_RAINDROP_PROJECT_ID` are set
2. Check that Raindrop API credentials are valid
3. Verify network requests to Raindrop API in browser console

### Backend not accessible

1. Check backend deployment status in Lovable dashboard
2. Verify `/health` endpoint responds
3. Check backend logs for errors
4. Verify environment variables are set correctly

## Additional Resources

- [Lovable Cloud Documentation](https://docs.lovable.dev)
- [Raindrop Platform Documentation](https://raindrop.io/docs)
- Backend API routes: See `server/src/routes/` directory
- Frontend services: See `src/services/` directory

