/**
 * API Configuration Helper
 * 
 * Centralized configuration for API endpoints that works with Lovable Cloud backend.
 * This automatically detects the correct backend URL based on the environment.
 */

/**
 * Get the base API URL for backend calls
 * 
 * Priority:
 * 1. VITE_API_BASE_URL environment variable (explicit configuration)
 * 2. Relative path /api (for same-origin requests when deployed on Lovable)
 * 3. Fallback to localhost for development
 */
export function getApiBaseUrl(): string {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // For Lovable Cloud, backend is typically on the same origin
  // Use relative path which works both locally and in production
  if (typeof window !== 'undefined') {
    // In browser: use relative path (works with Lovable backend)
    return '/api';
  }

  // Server-side fallback
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
}

/**
 * Get Vultr PostgreSQL API endpoint
 * Falls back to main API base + /vultr/postgres
 */
export function getVultrPostgresApiEndpoint(): string {
  return import.meta.env.VITE_VULTR_POSTGRES_API_ENDPOINT || `${getApiBaseUrl()}/vultr/postgres`;
}

/**
 * Get Vultr Valkey API endpoint
 * Falls back to main API base + /vultr/valkey
 */
export function getVultrValkeyApiEndpoint(): string {
  return import.meta.env.VITE_VULTR_VALKEY_API_ENDPOINT || `${getApiBaseUrl()}/vultr/valkey`;
}

/**
 * Get Raindrop API base URL
 * Uses environment variable or default Lovable/Raindrop API URL
 */
export function getRaindropBaseUrl(): string {
  return import.meta.env.VITE_RAINDROP_BASE_URL || 'https://api.raindrop.io';
}

/**
 * Check if running in Lovable/Raindrop environment
 */
export function isLovableEnvironment(): boolean {
  return !!(
    import.meta.env.VITE_RAINDROP_API_KEY ||
    import.meta.env.VITE_RAINDROP_PROJECT_ID ||
    window.location.hostname.includes('lovable') ||
    window.location.hostname.includes('raindrop')
  );
}

