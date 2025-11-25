/**
 * Multi-Agent Orchestrator
 * Coordinates the four specialized AI agents: Size Oracle, Returns Prophet, Personal Stylist, and Voice Concierge
 * Implements parallel processing, result aggregation, and intelligent routing
 */

import { voiceAssistant } from './VoiceAssistant.js';
import { fashionEngine } from './FashionEngine.js';
import { productRecommendationAPI } from './ProductRecommendationAPI.js';
import { userMemory } from '../lib/raindrop-config.js';
import { vultrValkey } from '../lib/vultr-valkey.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import {
  AppError,
  ExternalServiceError,
  ValidationError,
  toAppError,
  isAppError,
} from '../lib/errors.js';

export interface AgentQuery {
  userId: string;
  intent: string;
  entities: {
    color?: string;
    size?: string;
    brand?: string;
    category?: string;
    occasion?: string;
    productIds?: string[];
    budget?: number;
  };
  conversationHistory?: any[];
  userProfile?: any;
}

export interface SizeOracleResult {
  recommendedSize: string;
  confidence: number;
  alternativeSizes?: string[];
  reasoning: string;
  brandVariance?: number;
}

export interface ReturnsProphetResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  primaryFactors: string[];
  mitigationStrategies: string[];
  co2Saved?: number;
  costSaved?: number;
  confidence: number;
}

export interface PersonalStylistResult {
  recommendations: Array<{
    productId: string;
    score: number;
    confidence: number;
    styleMatch: number;
    reasoning: string;
  }>;
  styleConfidence: number;
  occasionMatch?: number;
}

export interface OrchestratedResponse {
  query: AgentQuery;
  sizeOracle: SizeOracleResult | null;
  returnsProphet: ReturnsProphetResult | null;
  personalStylist: PersonalStylistResult | null;
  aggregatedRecommendations: Array<{
    productId: string;
    finalScore: number;
    sizeRecommendation?: string;
    returnRisk?: number;
    styleMatch?: number;
    reasoning: string;
  }>;
  naturalLanguageResponse: string;
  metadata: {
    processingTime: number;
    agentsUsed: string[];
    confidence: number;
  };
}

export class MultiAgentOrchestrator {
  private readonly MAX_PARALLEL_AGENTS = 3;
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Process a fashion query through all relevant agents
   */
  async processQuery(query: AgentQuery): Promise<OrchestratedResponse> {
    const startTime = Date.now();

    try {
      // Validate query
      this.validateQuery(query);

      // Get user profile if not provided
      if (!query.userProfile) {
        query.userProfile = await this.getUserProfile(query.userId);
      }

      // Determine which agents to invoke based on intent
      const agentsToInvoke = this.determineAgents(query.intent, query.entities);

      // Invoke agents in parallel (with intelligent batching)
      const agentResults = await this.invokeAgentsInParallel(query, agentsToInvoke);

      // Aggregate results from all agents
      const aggregated = await this.aggregateResults(query, agentResults);

      // Generate natural language response
      const naturalResponse = await this.generateNaturalResponse(query, agentResults, aggregated);

      const processingTime = Date.now() - startTime;

      return {
        query,
        sizeOracle: agentResults.sizeOracle,
        returnsProphet: agentResults.returnsProphet,
        personalStylist: agentResults.personalStylist,
        aggregatedRecommendations: aggregated,
        naturalLanguageResponse: naturalResponse,
        metadata: {
          processingTime,
          agentsUsed: agentsToInvoke,
          confidence: this.calculateOverallConfidence(agentResults),
        },
      };
    } catch (error) {
      const appError = isAppError(error) ? error : toAppError(error);
      throw new ExternalServiceError(
        'MultiAgentOrchestrator',
        `Failed to process query: ${appError.message}`,
        error as Error,
        {
          userId: query.userId,
          intent: query.intent,
          operation: 'process-query',
        }
      );
    }
  }

  /**
   * Invoke Size Oracle Agent
   */
  async invokeSizeOracle(
    userId: string,
    productBrand?: string,
    productCategory?: string,
    requestedSize?: string
  ): Promise<SizeOracleResult> {
    try {
      // Get user measurements
      const userProfile = await this.getUserProfile(userId);
      const measurements = userProfile?.bodyMeasurements || userProfile?.preferences?.bodyMeasurements;

      if (!measurements) {
        // Fallback: use size preferences if available
        const sizePrefs = userProfile?.preferences?.preferredSizes || userProfile?.sizePreferences;
        if (sizePrefs && productBrand && sizePrefs[productBrand]) {
          return {
            recommendedSize: sizePrefs[productBrand],
            confidence: 0.65,
            reasoning: `Based on your previous size preference for ${productBrand}`,
          };
        }

        return {
          recommendedSize: requestedSize || 'M',
          confidence: 0.5,
          reasoning: 'Default size recommendation (measurements not available)',
        };
      }

      // Use FashionEngine for size prediction
      const returnsHistory = await this.getReturnsHistory(userId);
      const recommendedSize = await fashionEngine.predictOptimalSize(measurements, returnsHistory);

      // Calculate brand variance if brand is provided
      let brandVariance = 0;
      if (productBrand) {
        brandVariance = await this.getBrandSizeVariance(productBrand, productCategory);
      }

      // Calculate confidence based on data quality
      const confidence = this.calculateSizeConfidence(measurements, returnsHistory, brandVariance);

      // Get alternative sizes
      const alternativeSizes = this.getAlternativeSizes(recommendedSize);

      return {
        recommendedSize,
        confidence,
        alternativeSizes,
        reasoning: this.generateSizeReasoning(measurements, recommendedSize, brandVariance),
        brandVariance,
      };
    } catch (error) {
      const appError = toAppError(error);
      console.error('Size Oracle error:', appError.message);
      
      // Fallback
      return {
        recommendedSize: requestedSize || 'M',
        confidence: 0.4,
        reasoning: 'Size prediction unavailable, using default',
      };
    }
  }

  /**
   * Invoke Returns Prophet Agent
   */
  async invokeReturnsProphet(
    userId: string,
    productIds: string[],
    sizeRecommendations?: Map<string, string>
  ): Promise<ReturnsProphetResult> {
    try {
      // Get user return history
      const returnHistory = await this.getReturnsHistory(userId);
      const userReturnRate = returnHistory.length / Math.max(1, returnHistory.length + 10);

      // Get product details
      const products = await this.getProductsByIds(productIds);

      // Calculate risk for each product
      const riskScores = await Promise.all(
        products.map(async (product) => {
          const sizeRec = sizeRecommendations?.get(product.id);
          return await this.calculateProductReturnRisk(
            userId,
            product,
            returnHistory,
            sizeRec
          );
        })
      );

      // Aggregate risk scores
      const avgRiskScore = riskScores.reduce((sum, r) => sum + r.riskScore, 0) / riskScores.length;
      const riskLevel = avgRiskScore < 0.3 ? 'low' : avgRiskScore < 0.6 ? 'medium' : 'high';

      // Identify primary factors
      const primaryFactors = this.identifyRiskFactors(riskScores, userReturnRate);

      // Generate mitigation strategies
      const mitigationStrategies = this.generateMitigationStrategies(riskLevel, primaryFactors);

      // Calculate impact
      const co2Saved = avgRiskScore < 0.3 ? 24 * (1 - avgRiskScore) : 0; // 24kg CO₂ per prevented return
      const costSaved = avgRiskScore < 0.3 ? 45 * (1 - avgRiskScore) : 0; // $45 per prevented return

      return {
        riskScore: avgRiskScore,
        riskLevel,
        primaryFactors,
        mitigationStrategies,
        co2Saved,
        costSaved,
        confidence: this.calculateRiskConfidence(returnHistory, products),
      };
    } catch (error) {
      const appError = toAppError(error);
      console.error('Returns Prophet error:', appError.message);
      
      // Fallback
      return {
        riskScore: 0.25,
        riskLevel: 'medium',
        primaryFactors: ['Insufficient data'],
        mitigationStrategies: ['Review product details carefully'],
        confidence: 0.5,
      };
    }
  }

  /**
   * Invoke Personal Stylist Agent
   */
  async invokePersonalStylist(
    userId: string,
    entities: AgentQuery['entities'],
    occasion?: string
  ): Promise<PersonalStylistResult> {
    try {
      const userProfile = await this.getUserProfile(userId);
      const preferences = userProfile?.preferences || {};

      // Build recommendation context
      const context = {
        occasion,
        budget: entities.budget,
        sessionType: 'voice_shopping' as const,
      };

      // Get recommendations from ProductRecommendationAPI
      const recommendations = await productRecommendationAPI.getRecommendations(
        {
          favoriteColors: preferences.favoriteColors || entities.color ? [entities.color!] : undefined,
          preferredBrands: preferences.preferredBrands || entities.brand ? [entities.brand!] : undefined,
          preferredStyles: preferences.preferredStyles,
          preferredSizes: preferences.preferredSizes,
        },
        context
      );

      // Enhance with style matching scores
      const enhancedRecommendations = recommendations.map((rec) => {
        const styleMatch = this.calculateStyleMatch(rec, preferences, occasion);
        return {
          productId: rec.productId,
          score: rec.score * 0.7 + styleMatch * 0.3, // Weighted combination
          confidence: rec.confidence,
          styleMatch,
          reasoning: this.generateStyleReasoning(rec, preferences, occasion),
        };
      });

      // Calculate overall style confidence
      const styleConfidence = this.calculateStyleConfidence(userProfile, recommendations);

      // Calculate occasion match if occasion provided
      const occasionMatch = occasion
        ? this.calculateOccasionMatch(recommendations, occasion)
        : undefined;

      return {
        recommendations: enhancedRecommendations,
        styleConfidence,
        occasionMatch,
      };
    } catch (error) {
      const appError = toAppError(error);
      console.error('Personal Stylist error:', appError.message);
      
      // Fallback
      return {
        recommendations: [],
        styleConfidence: 0.5,
      };
    }
  }

  /**
   * Invoke agents in parallel with intelligent batching
   */
  private async invokeAgentsInParallel(
    query: AgentQuery,
    agents: string[]
  ): Promise<{
    sizeOracle: SizeOracleResult | null;
    returnsProphet: ReturnsProphetResult | null;
    personalStylist: PersonalStylistResult | null;
  }> {
    const results: {
      sizeOracle: SizeOracleResult | null;
      returnsProphet: ReturnsProphetResult | null;
      personalStylist: PersonalStylistResult | null;
    } = {
      sizeOracle: null,
      returnsProphet: null,
      personalStylist: null,
    };

    const promises: Promise<void>[] = [];

    // Size Oracle
    if (agents.includes('sizeOracle') && (query.entities.brand || query.entities.category)) {
      promises.push(
        this.invokeSizeOracle(
          query.userId,
          query.entities.brand,
          query.entities.category
        ).then((result) => {
          results.sizeOracle = result;
        }).catch((error) => {
          console.error('Size Oracle invocation failed:', error);
        })
      );
    }

    // Personal Stylist
    if (agents.includes('personalStylist')) {
      promises.push(
        this.invokePersonalStylist(
          query.userId,
          query.entities,
          query.entities.occasion
        ).then((result) => {
          results.personalStylist = result;
        }).catch((error) => {
          console.error('Personal Stylist invocation failed:', error);
        })
      );
    }

    // Returns Prophet (depends on product recommendations)
    if (agents.includes('returnsProphet') && query.entities.productIds?.length) {
      const sizeMap = results.sizeOracle
        ? new Map(query.entities.productIds.map((id) => [id, results.sizeOracle!.recommendedSize]))
        : undefined;

      promises.push(
        this.invokeReturnsProphet(
          query.userId,
          query.entities.productIds,
          sizeMap
        ).then((result) => {
          results.returnsProphet = result;
        }).catch((error) => {
          console.error('Returns Prophet invocation failed:', error);
        })
      );
    }

    await Promise.allSettled(promises);

    return results;
  }

  /**
   * Determine which agents to invoke based on intent and entities
   */
  private determineAgents(intent: string, entities: AgentQuery['entities']): string[] {
    const agents: string[] = [];

    // Size-related queries
    if (intent.includes('size') || intent.includes('fit') || entities.size) {
      agents.push('sizeOracle');
    }

    // Product search/recommendation queries
    if (
      intent.includes('search') ||
      intent.includes('recommend') ||
      intent.includes('find') ||
      entities.category ||
      entities.color ||
      entities.brand
    ) {
      agents.push('personalStylist');
    }

    // Return risk queries or when products are identified
    if (intent.includes('return') || intent.includes('risk') || entities.productIds?.length) {
      agents.push('returnsProphet');
    }

    // Default: always include personal stylist for product queries
    if (agents.length === 0) {
      agents.push('personalStylist');
    }

    return agents;
  }

  /**
   * Aggregate results from all agents into unified recommendations
   */
  private async aggregateResults(
    query: AgentQuery,
    agentResults: {
      sizeOracle: SizeOracleResult | null;
      returnsProphet: ReturnsProphetResult | null;
      personalStylist: PersonalStylistResult | null;
    }
  ): Promise<Array<{
    productId: string;
    finalScore: number;
    sizeRecommendation?: string;
    returnRisk?: number;
    styleMatch?: number;
    reasoning: string;
  }>> {
    if (!agentResults.personalStylist?.recommendations.length) {
      return [];
    }

    const aggregated = agentResults.personalStylist.recommendations.map((rec) => {
      // Get size recommendation if available
      const sizeRec = agentResults.sizeOracle?.recommendedSize;

      // Get return risk if available
      const returnRisk = agentResults.returnsProphet?.riskScore;

      // Calculate final score (weighted combination)
      let finalScore = rec.score;
      
      // Adjust score based on return risk (lower risk = higher score)
      if (returnRisk !== undefined) {
        finalScore = finalScore * 0.7 + (1 - returnRisk) * 0.3;
      }

      // Adjust score based on size confidence
      if (agentResults.sizeOracle && sizeRec) {
        finalScore = finalScore * 0.8 + agentResults.sizeOracle.confidence * 0.2;
      }

      // Generate reasoning
      const reasoningParts: string[] = [];
      if (rec.reasoning) reasoningParts.push(rec.reasoning);
      if (sizeRec) {
        reasoningParts.push(`Recommended size: ${sizeRec} (${Math.round(agentResults.sizeOracle!.confidence * 100)}% confidence)`);
      }
      if (returnRisk !== undefined) {
        reasoningParts.push(`Return risk: ${Math.round(returnRisk * 100)}%`);
      }

      return {
        productId: rec.productId,
        finalScore,
        sizeRecommendation: sizeRec,
        returnRisk,
        styleMatch: rec.styleMatch,
        reasoning: reasoningParts.join('. ') || 'Recommended product',
      };
    });

    // Sort by final score
    return aggregated.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Generate natural language response from agent results
   */
  private async generateNaturalResponse(
    query: AgentQuery,
    agentResults: {
      sizeOracle: SizeOracleResult | null;
      returnsProphet: ReturnsProphetResult | null;
      personalStylist: PersonalStylistResult | null;
    },
    aggregated: Array<{
      productId: string;
      finalScore: number;
      sizeRecommendation?: string;
      returnRisk?: number;
      styleMatch?: number;
      reasoning: string;
    }>
  ): Promise<string> {
    const parts: string[] = [];

    // Product recommendations
    if (aggregated.length > 0) {
      const topProducts = aggregated.slice(0, 3);
      parts.push(`I found ${aggregated.length} products that match your preferences.`);
      
      topProducts.forEach((product, index) => {
        parts.push(`${index + 1}. ${product.reasoning}`);
        if (product.sizeRecommendation) {
          parts.push(`   Recommended size: ${product.sizeRecommendation}`);
        }
        if (product.returnRisk !== undefined && product.returnRisk < 0.3) {
          parts.push(`   Low return risk (${Math.round(product.returnRisk * 100)}%)`);
        }
      });
    }

    // Size recommendation
    if (agentResults.sizeOracle) {
      parts.push(`Size recommendation: ${agentResults.sizeOracle.recommendedSize} (${Math.round(agentResults.sizeOracle.confidence * 100)}% confidence). ${agentResults.sizeOracle.reasoning}`);
    }

    // Return risk insights
    if (agentResults.returnsProphet) {
      if (agentResults.returnsProphet.riskLevel === 'low') {
        parts.push(`Great news! These recommendations have a low return risk (${Math.round(agentResults.returnsProphet.riskScore * 100)}%).`);
      } else if (agentResults.returnsProphet.riskLevel === 'high') {
        parts.push(`Note: These items have a higher return risk. ${agentResults.returnsProphet.mitigationStrategies.join('. ')}`);
      }
    }

    return parts.join(' ') || 'I can help you find the perfect fashion items. What are you looking for?';
  }

  // Helper methods

  private validateQuery(query: AgentQuery): void {
    if (!query.userId || typeof query.userId !== 'string') {
      throw new ValidationError('Invalid userId', { field: 'userId' });
    }
    if (!query.intent || typeof query.intent !== 'string') {
      throw new ValidationError('Invalid intent', { field: 'intent' });
    }
  }

  private async getUserProfile(userId: string): Promise<any> {
    try {
      return await userMemory.get(userId);
    } catch (error) {
      console.warn('Failed to get user profile:', error);
      return null;
    }
  }

  private async getReturnsHistory(userId: string): Promise<any[]> {
    try {
      const result = await vultrPostgres.query(
        'SELECT * FROM returns WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      return result || [];
    } catch (error) {
      console.warn('Failed to get returns history:', error);
      return [];
    }
  }

  private async getProductsByIds(productIds: string[]): Promise<any[]> {
    try {
      const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await vultrPostgres.query(
        `SELECT * FROM products WHERE id IN (${placeholders})`,
        productIds
      );
      return result || [];
    } catch (error) {
      console.warn('Failed to get products:', error);
      return [];
    }
  }

  private async getBrandSizeVariance(brand: string, category?: string): Promise<number> {
    // This would query a brand sizing variance database
    // For now, return a default variance
    return 0.03; // 3% variance
  }

  private calculateSizeConfidence(
    measurements: any,
    returnsHistory: any[],
    brandVariance: number
  ): number {
    let confidence = 0.7; // Base confidence

    // More measurements = higher confidence
    const measurementCount = Object.keys(measurements || {}).length;
    confidence += Math.min(0.15, measurementCount * 0.03);

    // Fewer size-related returns = higher confidence
    const sizeReturns = returnsHistory.filter((r) =>
      r.reason?.toLowerCase().includes('size')
    ).length;
    if (returnsHistory.length > 0) {
      const sizeReturnRate = sizeReturns / returnsHistory.length;
      confidence += (1 - sizeReturnRate) * 0.1;
    }

    // Lower brand variance = higher confidence
    confidence += (1 - brandVariance * 10) * 0.05;

    return Math.min(0.95, Math.max(0.4, confidence));
  }

  private getAlternativeSizes(recommendedSize: string): string[] {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const index = sizeOrder.indexOf(recommendedSize);
    if (index === -1) return [];

    const alternatives: string[] = [];
    if (index > 0) alternatives.push(sizeOrder[index - 1]);
    if (index < sizeOrder.length - 1) alternatives.push(sizeOrder[index + 1]);
    return alternatives;
  }

  private generateSizeReasoning(
    measurements: any,
    recommendedSize: string,
    brandVariance: number
  ): string {
    const parts: string[] = [];
    if (measurements.waist) {
      parts.push(`Based on your waist measurement (${measurements.waist}")`);
    }
    if (measurements.chest) {
      parts.push(`chest measurement (${measurements.chest}")`);
    }
    if (brandVariance > 0) {
      parts.push(`accounting for ${Math.round(brandVariance * 100)}% brand sizing variance`);
    }
    return parts.length > 0 ? parts.join(' and ') + `.` : `Recommended size: ${recommendedSize}`;
  }

  private async calculateProductReturnRisk(
    userId: string,
    product: any,
    returnHistory: any[],
    sizeRecommendation?: string
  ): Promise<{ riskScore: number; factors: string[] }> {
    let riskScore = 0.25; // Base risk
    const factors: string[] = [];

    // User return history
    const userReturnRate = returnHistory.length / Math.max(1, returnHistory.length + 10);
    if (userReturnRate > 0.3) {
      riskScore += 0.15;
      factors.push('Higher than average return history');
    }

    // Product return rate (if available)
    if (product.returnRate) {
      riskScore += product.returnRate * 0.3;
      factors.push(`Product return rate: ${Math.round(product.returnRate * 100)}%`);
    }

    // Size uncertainty
    if (!sizeRecommendation) {
      riskScore += 0.1;
      factors.push('Size recommendation unavailable');
    }

    // Price sensitivity
    if (product.price > 200) {
      riskScore += 0.05;
      factors.push('Higher price point');
    }

    return {
      riskScore: Math.min(0.9, Math.max(0.05, riskScore)),
      factors,
    };
  }

  private identifyRiskFactors(
    riskScores: Array<{ riskScore: number; factors: string[] }>,
    userReturnRate: number
  ): string[] {
    const factorCounts = new Map<string, number>();
    
    riskScores.forEach((rs) => {
      rs.factors.forEach((factor) => {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      });
    });

    if (userReturnRate > 0.3) {
      factorCounts.set('User return history', riskScores.length);
    }

    // Return top 3 factors
    return Array.from(factorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor]) => factor);
  }

  private generateMitigationStrategies(
    riskLevel: string,
    factors: string[]
  ): string[] {
    const strategies: string[] = [];

    if (riskLevel === 'high') {
      strategies.push('Review size chart carefully');
      strategies.push('Check customer reviews for fit feedback');
      strategies.push('Consider ordering multiple sizes');
    } else if (riskLevel === 'medium') {
      strategies.push('Verify size recommendations');
      strategies.push('Check product measurements');
    } else {
      strategies.push('These items have good compatibility with your profile');
    }

    return strategies;
  }

  private calculateRiskConfidence(returnHistory: any[], products: any[]): number {
    let confidence = 0.6; // Base confidence

    // More return history = higher confidence
    if (returnHistory.length > 10) {
      confidence += 0.2;
    } else if (returnHistory.length > 5) {
      confidence += 0.1;
    }

    // More product data = higher confidence
    if (products.length > 5) {
      confidence += 0.1;
    }

    return Math.min(0.95, confidence);
  }

  private calculateStyleMatch(
    recommendation: any,
    preferences: any,
    occasion?: string
  ): number {
    let match = 0.5; // Base match

    // Color match
    if (preferences.favoriteColors && recommendation.color) {
      if (preferences.favoriteColors.includes(recommendation.color)) {
        match += 0.2;
      }
    }

    // Brand match
    if (preferences.preferredBrands && recommendation.brand) {
      if (preferences.preferredBrands.includes(recommendation.brand)) {
        match += 0.2;
      }
    }

    // Style match
    if (preferences.preferredStyles && recommendation.style) {
      const styleMatch = preferences.preferredStyles.some((style: string) =>
        recommendation.style?.toLowerCase().includes(style.toLowerCase())
      );
      if (styleMatch) {
        match += 0.1;
      }
    }

    return Math.min(1.0, match);
  }

  private generateStyleReasoning(
    recommendation: any,
    preferences: any,
    occasion?: string
  ): string {
    const parts: string[] = [];

    if (preferences.favoriteColors && recommendation.color) {
      if (preferences.favoriteColors.includes(recommendation.color)) {
        parts.push(`Matches your preferred color: ${recommendation.color}`);
      }
    }

    if (occasion) {
      parts.push(`Perfect for ${occasion}`);
    }

    return parts.join('. ') || 'Style-matched recommendation';
  }

  private calculateStyleConfidence(userProfile: any, recommendations: any[]): number {
    if (!userProfile?.preferences) return 0.5;

    const hasPreferences =
      userProfile.preferences.favoriteColors?.length > 0 ||
      userProfile.preferences.preferredBrands?.length > 0 ||
      userProfile.preferences.preferredStyles?.length > 0;

    if (!hasPreferences) return 0.5;

    // More recommendations with good scores = higher confidence
    const avgScore = recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length;
    return Math.min(0.95, 0.5 + avgScore * 0.45);
  }

  private calculateOccasionMatch(recommendations: any[], occasion: string): number {
    // This would use ML to match occasion styles
    // For now, return a default match score
    return 0.7;
  }

  private calculateOverallConfidence(agentResults: {
    sizeOracle: SizeOracleResult | null;
    returnsProphet: ReturnsProphetResult | null;
    personalStylist: PersonalStylistResult | null;
  }): number {
    const confidences: number[] = [];

    if (agentResults.sizeOracle) {
      confidences.push(agentResults.sizeOracle.confidence);
    }
    if (agentResults.returnsProphet) {
      confidences.push(agentResults.returnsProphet.confidence);
    }
    if (agentResults.personalStylist) {
      confidences.push(agentResults.personalStylist.styleConfidence);
    }

    if (confidences.length === 0) return 0.5;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
}

export const multiAgentOrchestrator = new MultiAgentOrchestrator();

