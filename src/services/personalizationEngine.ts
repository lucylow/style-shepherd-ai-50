import { Product, CartItem } from '@/types/fashion';
import { fashionAIEngine } from './fashionAIEngine';
import { returnsPredictor } from './returnsPredictor';
import { userMemoryService, UserProfile } from './raindrop/userMemoryService';
import { styleInferenceService } from './raindrop/styleInferenceService';

// UserProfile is now imported from raindrop/userMemoryService

interface PersonalizedRecommendation extends Product {
  engagement_score: number;
  engagement_breakdown: {
    style_match: number;
    price_fit: number;
    return_risk: number;
    novelty: number;
  };
  ai_explanation: string;
}

interface RecommendationContext {
  session_type?: 'browsing' | 'searching' | 'voice_shopping';
  recent_views?: string[];
  search_query?: string;
}

class PersonalizationEngine {
  private readonly explorationRate = 0.15; // 15% exploration vs 85% exploitation

  async generatePersonalizedRecommendations(
    products: Product[],
    userProfile: UserProfile | null,
    context: RecommendationContext = {}
  ): Promise<PersonalizedRecommendation[]> {
    if (!userProfile) {
      return this.getDefaultRecommendations(products);
    }

    // Use SmartInference for AI-powered recommendations
    try {
      const inferenceResults = await styleInferenceService.batchPredictRecommendations(
        userProfile.userId,
        products,
        userProfile
      );

      const recommendations = await Promise.all(products.map(async (product, index) => {
        const inference = inferenceResults[index];
        const returnRisk = await returnsPredictor.predictReturnRisk(product, userProfile);
        
        const breakdown = {
          style_match: inference.factors.styleMatch,
          price_fit: inference.factors.priceFit,
          return_risk: 1 - returnRisk.risk_score,
          novelty: inference.factors.novelty,
        };

        return {
          ...product,
          engagement_score: inference.score,
          engagement_breakdown: breakdown,
          ai_explanation: inference.explanation,
        };
      }));

      // Rank by engagement score with diversity
      return this.rankWithDiversity(recommendations);
    } catch (error) {
      console.error('SmartInference failed, falling back to local logic:', error);
      // Fallback to original logic
      return this.generatePersonalizedRecommendationsFallback(products, userProfile, context);
    }
  }

  private async generatePersonalizedRecommendationsFallback(
    products: Product[],
    userProfile: UserProfile | null,
    context: RecommendationContext
  ): Promise<PersonalizedRecommendation[]> {
    const styleEmbedding = fashionAIEngine.computeStyleEmbedding(userProfile!);
    const shouldExplore = Math.random() < this.explorationRate;

    const recommendations = await Promise.all(products.map(async (product) => {
      const engagementScore = await this.predictEngagementScore(product, userProfile!, styleEmbedding, context);
      const returnRisk = await returnsPredictor.predictReturnRisk(product, userProfile);
      
      const breakdown = {
        style_match: this.calculateStyleMatch(product, userProfile!, styleEmbedding),
        price_fit: this.calculatePriceFit(product, userProfile!),
        return_risk: 1 - returnRisk.risk_score,
        novelty: shouldExplore ? 0.8 : 0.2,
      };

      const finalScore = shouldExplore
        ? engagementScore * 0.7 + breakdown.novelty * 0.3
        : engagementScore;

      return {
        ...product,
        engagement_score: finalScore,
        engagement_breakdown: breakdown,
        ai_explanation: this.explainRecommendation(product, breakdown, returnRisk),
      };
    }));

    return this.rankWithDiversity(recommendations);
  }

  private async predictEngagementScore(
    product: Product,
    userProfile: UserProfile,
    styleEmbedding: number[],
    context: RecommendationContext
  ): Promise<number> {
    let score = 0;

    // Style matching (40%)
    const styleMatch = this.calculateStyleMatch(product, userProfile, styleEmbedding);
    score += styleMatch * 0.4;

    // Price fit (20%)
    const priceFit = this.calculatePriceFit(product, userProfile);
    score += priceFit * 0.2;

    // Return risk (25%) - Note: This is async now, but keeping sync for compatibility
    // In production, this should be awaited
    const returnRisk = await returnsPredictor.predictReturnRisk(product, userProfile);
    score += (1 - returnRisk.risk_score) * 0.25;

    // Recency and relevance (15%)
    if (context.recent_views?.includes(product.category)) {
      score += 0.15;
    } else {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  private calculateStyleMatch(
    product: Product,
    userProfile: UserProfile,
    styleEmbedding: number[]
  ): number {
    let match = 0.5; // Base match

    // Color preference
    if (product.color && userProfile.preferences?.favoriteColors?.includes(product.color)) {
      match += 0.3;
    }

    // Style preference
    const productStyles = this.inferProductStyles(product);
    const userStyles = userProfile.preferences?.preferredStyles || [];
    const styleOverlap = productStyles.filter(s => userStyles.includes(s)).length;
    match += (styleOverlap / Math.max(1, productStyles.length)) * 0.2;

    return Math.min(1, match);
  }

  private calculatePriceFit(product: Product, userProfile: UserProfile): number {
    const orderHistory = userProfile.orderHistory || [];
    if (orderHistory.length === 0) return 0.5;

    // Calculate user's typical price range
    const prices = orderHistory.flatMap(order => 
      order.items.map(item => item.product.price)
    );
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(
      prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length
    );

    // Calculate how well product price fits user's range
    const priceDiff = Math.abs(product.price - avgPrice);
    const fitScore = Math.max(0, 1 - priceDiff / (stdDev * 2 || avgPrice));

    return fitScore;
  }

  private inferProductStyles(product: Product): string[] {
    const styles: string[] = [];
    const name = product.name.toLowerCase();

    const styleKeywords = {
      casual: ['casual', 'everyday', 'relaxed'],
      formal: ['formal', 'dress', 'elegant', 'business'],
      sporty: ['sport', 'athletic', 'active', 'running'],
      elegant: ['elegant', 'chic', 'sophisticated'],
      vintage: ['vintage', 'retro', 'classic'],
      modern: ['modern', 'contemporary', 'trendy'],
    };

    Object.entries(styleKeywords).forEach(([style, keywords]) => {
      if (keywords.some(keyword => name.includes(keyword))) {
        styles.push(style);
      }
    });

    return styles.length > 0 ? styles : ['versatile'];
  }

  private rankWithDiversity(recommendations: PersonalizedRecommendation[]): PersonalizedRecommendation[] {
    const ranked: PersonalizedRecommendation[] = [];
    const remaining = [...recommendations].sort((a, b) => b.engagement_score - a.engagement_score);

    while (remaining.length > 0 && ranked.length < 20) {
      const next = remaining.shift()!;
      
      // Apply diversity penalty
      const diversityPenalty = this.calculateDiversityPenalty(next, ranked);
      next.engagement_score *= (1 - diversityPenalty);
      
      ranked.push(next);
      
      // Re-sort remaining items
      remaining.sort((a, b) => b.engagement_score - a.engagement_score);
    }

    return ranked;
  }

  private calculateDiversityPenalty(
    item: PersonalizedRecommendation,
    alreadyRanked: PersonalizedRecommendation[]
  ): number {
    if (alreadyRanked.length === 0) return 0;

    // Penalize if too many items from same category or brand
    const categoryCount = alreadyRanked.filter(r => r.category === item.category).length;
    const brandCount = alreadyRanked.filter(r => r.brand === item.brand).length;

    const categoryPenalty = Math.min(0.3, categoryCount * 0.1);
    const brandPenalty = Math.min(0.2, brandCount * 0.1);

    return categoryPenalty + brandPenalty;
  }

  private explainRecommendation(
    product: Product,
    breakdown: PersonalizedRecommendation['engagement_breakdown'],
    returnRisk: any
  ): string {
    const reasons: string[] = [];

    if (breakdown.style_match > 0.7) {
      reasons.push('matches your style preferences perfectly');
    }

    if (breakdown.return_risk > 0.7) {
      reasons.push(`${Math.round((1 - returnRisk.risk_score) * 100)}% likely to be a keeper`);
    }

    if (breakdown.price_fit > 0.7) {
      reasons.push('fits your typical price range');
    }

    if (reasons.length === 0) {
      reasons.push('explore something new based on trends');
    }

    return `Recommended because it ${reasons.join(', ')}.`;
  }

  private getDefaultRecommendations(products: Product[]): PersonalizedRecommendation[] {
    return products.slice(0, 20).map(product => ({
      ...product,
      engagement_score: 0.5 + Math.random() * 0.3,
      engagement_breakdown: {
        style_match: 0.5,
        price_fit: 0.5,
        return_risk: 0.7,
        novelty: 0.3,
      },
      ai_explanation: 'Popular choice among shoppers with great reviews.',
    }));
  }
}

export const personalizationEngine = new PersonalizationEngine();
