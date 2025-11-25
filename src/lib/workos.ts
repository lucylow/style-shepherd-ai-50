// WorkOS configuration
// Note: In production, these should be environment variables
export const WORKOS_CLIENT_ID = import.meta.env.VITE_WORKOS_CLIENT_ID || '';
export const WORKOS_API_HOSTNAME = import.meta.env.VITE_WORKOS_API_HOSTNAME || 'api.workos.com';
export const WORKOS_REDIRECT_URI = import.meta.env.VITE_WORKOS_REDIRECT_URI || `${window.location.origin}/auth/callback`;

