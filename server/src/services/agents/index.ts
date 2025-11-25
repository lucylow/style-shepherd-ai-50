/**
 * Agent Services - Multi-Agent Retail System
 * Exports all specialist agents for the agentic retail experience
 */

export { searchAgent, SearchAgent, type Product, type SearchParams, type SearchResult } from './SearchAgent.js';
export { returnsAgent, ReturnsAgent, type ReturnRiskPrediction, type ReturnRiskFactor } from './ReturnsAgent.js';
export { cartAgent, CartAgent, type CartItem, type CartBundle, type CartOptimizationParams } from './CartAgent.js';
export { promotionsAgent, PromotionsAgent, type Promotion, type NegotiationResult } from './PromotionsAgent.js';

