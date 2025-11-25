/**
 * Vultr Services Integration
 * 
 * Centralized export for all Vultr service integrations
 */

export { vultrPostgres, type VultrPostgresConfig, type ProductRecord, type UserProfileRecord, type OrderRecord, type ReturnRecord } from './postgres';
export { vultrValkey, type VultrValkeyConfig, type SessionData, type CacheEntry } from './valkey';

/**
 * Initialize all Vultr services
 * Call this once during app initialization
 */
export function initializeVultrServices() {
  // Services auto-initialize from environment variables
  // This function can be used for additional setup if needed
  console.log('Vultr services initialized');
}

