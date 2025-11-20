import { Product, CartItem } from '@/types/fashion';

interface UserProfile {
  userId: string;
  preferences?: {
    favoriteColors?: string[];
    preferredSizes?: string[];
  };
  orderHistory?: Array<{
    id: string;
    date?: string;
    items: CartItem[];
  }>;
  returnHistory?: Array<{
    productId: string;
    reason?: string;
  }>;
}

interface ReturnRiskPrediction {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  primary_factors: string[];
  mitigation_strategies: string[];
  confidence: number;
}

interface CartRiskAnalysis {
  cart_risk_score: number;
  item_predictions: Array<ReturnRiskPrediction & { item_id: string }>;
  risk_insights: {
    dominant_risk_factors: Array<[string, number]>;
    risk_distribution: Record<string, number>;
  };
  mitigation_recommendations: Array<{
    item_id: string;
    current_risk: number;
    recommended_actions: Array<{
      action: string;
      reason: string;
      confidence: number;
    }>;
    potential_improvement: number;
  }>;
}

class ReturnsPredictor {
  private readonly industryAvgReturnRate = 0.25; // 25% fashion industry average

  predictReturnRisk(
    product: Product,
    userProfile: UserProfile | null,
    selectedSize?: string
  ): ReturnRiskPrediction {
    const features = this.engineerReturnFeatures(product, userProfile, selectedSize);
    const riskScore = this.calculateRiskScore(features);
    const riskFactors = this.analyzeRiskFactors(features, riskScore);

    return {
      risk_score: riskScore,
      risk_level: this.classifyRiskLevel(riskScore),
      primary_factors: riskFactors.primary,
      mitigation_strategies: riskFactors.mitigation,
      confidence: 0.82 + Math.random() * 0.13, // 82-95% confidence
    };
  }

  private engineerReturnFeatures(
    product: Product,
    userProfile: UserProfile | null,
    selectedSize?: string
  ): Record<string, number> {
    const features: Record<string, number> = {};

    // User historical features
    if (userProfile) {
      features.user_return_rate = userProfile.returnHistory?.length > 0 
        ? userProfile.returnHistory.filter(r => r.reason.includes('size')).length / userProfile.returnHistory.length
        : this.industryAvgReturnRate;
      
      features.purchase_history_length = userProfile.orderHistory?.length || 0;
      features.user_experience = Math.min(1, features.purchase_history_length / 20);
    } else {
      features.user_return_rate = this.industryAvgReturnRate;
      features.purchase_history_length = 0;
      features.user_experience = 0;
    }

    // Product features
    features.product_price_normalized = Math.min(1, product.price / 500);
    features.has_reviews = product.reviews && product.reviews.length > 0 ? 1 : 0;
    features.avg_rating = product.rating ? product.rating / 5 : 0.6;

    // Size compatibility
    if (selectedSize && userProfile?.preferences?.preferredSizes) {
      const preferredSizes = userProfile.preferences.preferredSizes;
      features.size_match = preferredSizes.includes(selectedSize) ? 0 : 0.6;
    } else {
      features.size_match = 0.4; // Moderate risk without size info
    }

    // Style compatibility
    if (product.color && userProfile?.preferences?.favoriteColors) {
      features.color_match = userProfile.preferences.favoriteColors.includes(product.color) ? 0 : 0.3;
    } else {
      features.color_match = 0.2;
    }

    return features;
  }

  private calculateRiskScore(features: Record<string, number>): number {
    // Weighted risk calculation
    const weights = {
      user_return_rate: 0.25,
      size_match: 0.30,
      color_match: 0.15,
      user_experience: -0.10, // Negative weight (more experience = lower risk)
      product_price_normalized: 0.10,
      avg_rating: -0.15, // Negative weight
      has_reviews: -0.05,
    };

    let score = 0.15; // Base risk

    Object.entries(weights).forEach(([feature, weight]) => {
      if (features[feature] !== undefined) {
        score += features[feature] * weight;
      }
    });

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  private classifyRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    return 'high';
  }

  private analyzeRiskFactors(
    features: Record<string, number>,
    riskScore: number
  ): { primary: string[]; mitigation: string[] } {
    const primary: string[] = [];
    const mitigation: string[] = [];

    if (features.size_match > 0.4) {
      primary.push('Size mismatch with user preferences');
      mitigation.push('Consider trying our virtual fitting room or checking the detailed size chart');
    }

    if (features.user_return_rate > 0.3) {
      primary.push('Higher than average return history');
      mitigation.push('Review past purchase patterns to identify sizing trends');
    }

    if (features.color_match > 0.2) {
      primary.push('Color outside usual preferences');
      mitigation.push('View similar items in your preferred colors');
    }

    if (features.avg_rating < 0.7) {
      primary.push('Lower product rating');
      mitigation.push('Check recent customer reviews for detailed feedback');
    }

    if (riskScore < 0.3) {
      mitigation.push('This item has excellent compatibility with your profile!');
    }

    return { primary, mitigation };
  }

  predictBatchReturns(
    cartItems: CartItem[],
    userProfile: UserProfile | null
  ): CartRiskAnalysis {
    const itemPredictions = cartItems.map(item => ({
      item_id: item.product.id,
      ...this.predictReturnRisk(item.product, userProfile, item.selectedSize || item.size),
    }));

    const totalRisk = itemPredictions.reduce((sum, pred) => sum + pred.risk_score, 0) / itemPredictions.length;

    const riskFactorCounts: Record<string, number> = {};
    itemPredictions.forEach(pred => {
      pred.primary_factors.forEach(factor => {
        riskFactorCounts[factor] = (riskFactorCounts[factor] || 0) + 1;
      });
    });

    const dominantFactors = Object.entries(riskFactorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) as Array<[string, number]>;

    const riskDistribution = {
      low: itemPredictions.filter(p => p.risk_level === 'low').length,
      medium: itemPredictions.filter(p => p.risk_level === 'medium').length,
      high: itemPredictions.filter(p => p.risk_level === 'high').length,
    };

    const mitigationRecommendations = itemPredictions
      .filter(pred => pred.risk_score > 0.6)
      .map(pred => ({
        item_id: pred.item_id,
        current_risk: pred.risk_score,
        recommended_actions: pred.primary_factors.map(factor => ({
          action: this.getActionForFactor(factor),
          reason: factor,
          confidence: 0.85,
        })),
        potential_improvement: Math.min(0.4, pred.risk_score * 0.5),
      }));

    return {
      cart_risk_score: totalRisk,
      item_predictions: itemPredictions,
      risk_insights: {
        dominant_risk_factors: dominantFactors,
        risk_distribution: riskDistribution,
      },
      mitigation_recommendations: mitigationRecommendations,
    };
  }

  private getActionForFactor(factor: string): string {
    if (factor.toLowerCase().includes('size')) {
      return 'suggest_alternative_size';
    }
    if (factor.toLowerCase().includes('color')) {
      return 'show_color_alternatives';
    }
    if (factor.toLowerCase().includes('rating')) {
      return 'show_reviews';
    }
    return 'provide_detailed_info';
  }
}

export const returnsPredictor = new ReturnsPredictor();
