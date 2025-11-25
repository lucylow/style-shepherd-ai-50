/**
 * Raindrop Smart Components - Centralized Exports
 * 
 * This module exports all Raindrop Smart Component services:
 * - SmartMemory: User profiles and context
 * - SmartBuckets: Product images and visual search
 * - SmartSQL: Structured data (orders, catalog, returns)
 * - SmartInference: AI recommendations and intent analysis
 */

export { raindrop, userMemory, productBuckets, orderSQL, styleInference } from '@/integrations/raindrop/config';
export { userMemoryService, type UserProfile, type ConversationEntry } from './userMemoryService';
export { productBucketsService, type ProductImageMetadata, type SimilarProduct } from './productBucketsService';
export { orderSQLService, type Order, type ReturnRecord, type ProductCatalog } from './orderSQLService';
export { styleInferenceService, type RecommendationInput, type RecommendationResult, type IntentAnalysisResult, type StyleAdviceResult } from './styleInferenceService';

