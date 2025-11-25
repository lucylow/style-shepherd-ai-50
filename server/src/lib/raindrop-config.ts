/**
 * Raindrop Platform Configuration
 * Initializes Raindrop SDK and Smart Components
 * 
 * Note: These are optional if not using Raindrop Smart Components directly in the backend
 */

import env from '../config/env.js';

// Lazy initialization function for Raindrop SDK
let raindropInstance: any = null;
let userMemoryInstance: any = null;
let productBucketsInstance: any = null;
let orderSQLInstance: any = null;
let styleInferenceInstance: any = null;

function initializeRaindrop() {
  if (raindropInstance) return; // Already initialized
  
  if (!env.RAINDROP_API_KEY || !env.RAINDROP_PROJECT_ID) {
    console.log('Raindrop SDK: API key or project ID not provided, skipping initialization');
    return;
  }

  try {
    // Try to use the SDK if available
    // Note: This may not be available in all environments
    const { RaindropSDK } = require('@raindrop-platform/sdk');
    raindropInstance = new RaindropSDK({
      apiKey: env.RAINDROP_API_KEY,
      projectId: env.RAINDROP_PROJECT_ID,
      baseUrl: env.RAINDROP_BASE_URL || 'https://api.raindrop.io',
    });

    // Initialize Smart Components
    userMemoryInstance = raindropInstance.smartMemory('user-profiles');
    productBucketsInstance = raindropInstance.smartBuckets('product-images');
    orderSQLInstance = raindropInstance.smartSQL('orders');
    styleInferenceInstance = raindropInstance.smartInference('style-recommendations');
  } catch (error) {
    console.warn('Raindrop SDK not available or not configured:', error);
    // Gracefully handle missing SDK
  }
}

// Export getters that lazy-initialize
export const raindrop = new Proxy({} as any, {
  get(target, prop) {
    initializeRaindrop();
    return raindropInstance?.[prop];
  }
});

export const userMemory = new Proxy({} as any, {
  get(target, prop) {
    initializeRaindrop();
    return userMemoryInstance?.[prop];
  }
});

export const productBuckets = new Proxy({} as any, {
  get(target, prop) {
    initializeRaindrop();
    return productBucketsInstance?.[prop];
  }
});

export const orderSQL = new Proxy({} as any, {
  get(target, prop) {
    initializeRaindrop();
    return orderSQLInstance?.[prop];
  }
});

export const styleInference = new Proxy({} as any, {
  get(target, prop) {
    initializeRaindrop();
    return styleInferenceInstance?.[prop];
  }
});

