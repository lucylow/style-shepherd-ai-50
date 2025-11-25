# Vultr Environment Variables Template

Copy these variables to your `.env` file or environment configuration:

```bash
# Vultr Managed PostgreSQL Configuration
# Get these values from your Vultr Managed Database dashboard
VITE_VULTR_POSTGRES_HOST=your-vultr-postgres-host.vultr.com
VITE_VULTR_POSTGRES_PORT=5432
VITE_VULTR_POSTGRES_DATABASE=style_shepherd
VITE_VULTR_POSTGRES_USER=your_username
VITE_VULTR_POSTGRES_PASSWORD=your_password
VITE_VULTR_POSTGRES_SSL=true

# Backend API endpoint for PostgreSQL (required for frontend)
# This should point to your backend API that connects to Vultr PostgreSQL
VITE_VULTR_POSTGRES_API_ENDPOINT=http://localhost:3000/api/vultr/postgres

# Vultr Valkey (Redis-compatible) Configuration
# Get these values from your Vultr Valkey dashboard
VITE_VULTR_VALKEY_HOST=your-vultr-valkey-host.vultr.com
VITE_VULTR_VALKEY_PORT=6379
VITE_VULTR_VALKEY_PASSWORD=your_password
VITE_VULTR_VALKEY_TLS=true

# Backend API endpoint for Valkey (required for frontend)
# This should point to your backend API that connects to Vultr Valkey
VITE_VULTR_VALKEY_API_ENDPOINT=http://localhost:3000/api/vultr/valkey
```

## Setup Instructions

1. **Create Vultr Managed PostgreSQL Instance**:
   - Log into Vultr dashboard
   - Navigate to Databases → PostgreSQL
   - Create a new instance
   - Note the connection details (host, port, database, user, password)

2. **Create Vultr Valkey Instance**:
   - Navigate to Databases → Valkey
   - Create a new instance
   - Note the connection details (host, port, password)

3. **Set Up Backend API**:
   - Your backend API (deployed on Raindrop) should connect to these Vultr services
   - The frontend will call your backend API endpoints
   - Backend API endpoints should be set in `VITE_VULTR_POSTGRES_API_ENDPOINT` and `VITE_VULTR_VALKEY_API_ENDPOINT`

4. **Update Environment Variables**:
   - Copy the template above to your `.env` file
   - Replace placeholder values with your actual Vultr service credentials
   - Never commit `.env` file to version control

