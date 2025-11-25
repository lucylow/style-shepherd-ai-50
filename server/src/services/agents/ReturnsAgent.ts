/**
 * Returns Agent - Predicts and prevents returns
 * Analyzes purchase history, product info, and user profiles to predict return risk
 */

import { userMemory, orderSQL, styleInference } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import type { Product } from './SearchAgent.js';

export interface ReturnRiskPrediction {
  riskScore: number; // 0-1, where 1 is highest risk
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-1, model confidence
  factors: ReturnRiskFactor[];
  mitigationStrategies: string[];
  estimatedReturnCost?: number;
}

export interface ReturnRiskFactor {
  factor: string;
  impact: number; // 0-1, how much this factor contributes to risk
  description: string;
}

export interface UserReturnHistory {
  totalOrders: number;
  totalReturns: number;
  returnRate: number;
  commonReturnReasons: string[];
  sizeIssues: number;
  fitIssues: number;
  qualityIssues: number;
}

export class ReturnsAgent {
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly BASE_RETURN_RATE = 0.25; // Industry average 25%

  /**
   * Predict return risk for a product for a specific user
   */
  async predict(userId: string, product: Product, selectedSize?: string): Promise<ReturnRiskPrediction> {
    const cacheKey = `return-risk:${userId}:${product.id}:${selectedSize || 'none'}`;
    
    try {
      const cached = await vultrValkey.get<ReturnRiskPrediction>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Cache miss is fine
    }

    try {
      // Get user return history
      const userHistory = await this.getUserReturnHistory(userId);

      // Get product return data from SmartSQL
      const productReturnData = await this.getProductReturnData(product.id);

      // Calculate base risk
      let riskScore = this.BASE_RETURN_RATE;
      const factors: ReturnRiskFactor[] = [];

      // Factor 1: User's historical return rate
      if (userHistory.returnRate > this.BASE_RETURN_RATE) {
        const userRiskBoost = (userHistory.returnRate - this.BASE_RETURN_RATE) * 0.3;
        riskScore += userRiskBoost;
        factors.push({
          factor: 'User Return History',
          impact: userRiskBoost,
          description: `User has ${(userHistory.returnRate * 100).toFixed(1)}% return rate (above average)`,
        });
      } else if (userHistory.returnRate < this.BASE_RETURN_RATE) {
        const userRiskReduction = (this.BASE_RETURN_RATE - userHistory.returnRate) * 0.2;
        riskScore = Math.max(0.05, riskScore - userRiskReduction);
        factors.push({
          factor: 'User Return History',
          impact: -userRiskReduction,
          description: `User has ${(userHistory.returnRate * 100).toFixed(1)}% return rate (below average)`,
        });
      }

      // Factor 2: Size selection
      if (!selectedSize) {
        riskScore += 0.20;
        factors.push({
          factor: 'Size Uncertainty',
          impact: 0.20,
          description: 'No size selected - size issues are primary return driver',
        });
      } else {
        // Check if user has size preferences for this brand
        const userProfile = await userMemory.get(userId).catch(() => null);
        if (userProfile?.sizePreferences?.[product.brand]) {
          const preferredSize = userProfile.sizePreferences[product.brand];
          if (selectedSize !== preferredSize) {
            riskScore += 0.15;
            factors.push({
              factor: 'Size Mismatch',
              impact: 0.15,
              description: `Selected ${selectedSize} but user typically wears ${preferredSize} for ${product.brand}`,
            });
          } else {
            riskScore -= 0.10;
            factors.push({
              factor: 'Size Match',
              impact: -0.10,
              description: `Size matches user's preferred size for ${product.brand}`,
            });
          }
        }
      }

      // Factor 3: Product rating
      if (product.rating !== undefined) {
        if (product.rating < 3.5) {
          riskScore += 0.15;
          factors.push({
            factor: 'Low Product Rating',
            impact: 0.15,
            description: `Product rating is ${product.rating}/5.0 (below average)`,
          });
        } else if (product.rating > 4.5) {
          riskScore -= 0.08;
          factors.push({
            factor: 'High Product Rating',
            impact: -0.08,
            description: `Product rating is ${product.rating}/5.0 (excellent)`,
          });
        }
      }

      // Factor 4: Product return data from SmartSQL
      if (productReturnData) {
        if (productReturnData.returnRate > 0.3) {
          riskScore += 0.12;
          factors.push({
            factor: 'Product Return Rate',
            impact: 0.12,
            description: `This product has ${(productReturnData.returnRate * 100).toFixed(1)}% return rate`,
          });
        }
      }

      // Factor 5: Brand-specific risk
      const brandRisk = this.getBrandReturnRisk(product.brand);
      if (brandRisk > 0) {
        riskScore += brandRisk;
        factors.push({
          factor: 'Brand Return Rate',
          impact: brandRisk,
          description: `${product.brand} has higher than average return rate`,
        });
      }

      // Factor 6: Use SmartInference for ML-based prediction
      if (styleInference && styleInference.predict) {
        try {
          const mlPrediction = await styleInference.predict({
            userId,
            product: {
              id: product.id,
              name: product.name,
              brand: product.brand,
              category: product.category,
              price: product.price,
            },
            context: {
              returnPrediction: true,
              userHistory: userHistory,
            },
          });

          if (mlPrediction.returnRisk !== undefined) {
            // Blend ML prediction with rule-based score
            riskScore = riskScore * 0.6 + mlPrediction.returnRisk * 0.4;
            factors.push({
              factor: 'ML Prediction',
              impact: mlPrediction.returnRisk - this.BASE_RETURN_RATE,
              description: 'AI model prediction based on user-product compatibility',
            });
          }
        } catch (error) {
          console.warn('ML return prediction failed:', error);
        }
      }

      // Clamp risk score
      riskScore = Math.min(0.95, Math.max(0.05, riskScore));

      // Determine risk level
      const riskLevel: 'low' | 'medium' | 'high' = 
        riskScore < 0.3 ? 'low' : 
        riskScore < 0.6 ? 'medium' : 
        'high';

      // Generate mitigation strategies
      const mitigationStrategies = this.generateMitigationStrategies(riskLevel, factors, selectedSize);

      // Calculate estimated return cost
      const estimatedReturnCost = product.price * 0.30; // ~30% handling cost

      const prediction: ReturnRiskPrediction = {
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel,
        confidence: 0.85, // Model confidence
        factors,
        mitigationStrategies,
        estimatedReturnCost,
      };

      // Cache prediction
      try {
        await vultrValkey.set(cacheKey, prediction, this.CACHE_TTL);
      } catch (error) {
        // Non-critical
      }

      return prediction;
    } catch (error) {
      // Fallback to basic prediction
      return {
        riskScore: this.BASE_RETURN_RATE,
        riskLevel: 'medium',
        confidence: 0.5,
        factors: [{
          factor: 'Default',
          impact: 0,
          description: 'Unable to calculate detailed risk - using industry average',
        }],
        mitigationStrategies: ['Verify size recommendations before purchase'],
      };
    }
  }

  /**
   * Get user's return history from SmartSQL
   */
  private async getUserReturnHistory(userId: string): Promise<UserReturnHistory> {
    try {
      if (orderSQL && orderSQL.query) {
        const orders = await orderSQL.query(
          `SELECT * FROM orders WHERE user_id = $1`,
          [userId]
        );
        const returns = await orderSQL.query(
          `SELECT * FROM returns WHERE user_id = $1`,
          [userId]
        );

        const returnReasons = returns.map((r: any) => r.reason);
        const sizeIssues = returnReasons.filter((r: string) => 
          r.toLowerCase().includes('size') || r.toLowerCase().includes('fit')
        ).length;
        const fitIssues = returnReasons.filter((r: string) => 
          r.toLowerCase().includes('fit') || r.toLowerCase().includes('too')
        ).length;
        const qualityIssues = returnReasons.filter((r: string) => 
          r.toLowerCase().includes('quality') || r.toLowerCase().includes('defect')
        ).length;

        return {
          totalOrders: orders.length || 0,
          totalReturns: returns.length || 0,
          returnRate: orders.length > 0 ? returns.length / orders.length : 0,
          commonReturnReasons: returnReasons,
          sizeIssues,
          fitIssues,
          qualityIssues,
        };
      }
    } catch (error) {
      console.warn('Failed to get user return history from SmartSQL:', error);
    }

    // Fallback to default
    return {
      totalOrders: 0,
      totalReturns: 0,
      returnRate: this.BASE_RETURN_RATE,
      commonReturnReasons: [],
      sizeIssues: 0,
      fitIssues: 0,
      qualityIssues: 0,
    };
  }

  /**
   * Get product return data from SmartSQL
   */
  private async getProductReturnData(productId: string): Promise<{ returnRate: number } | null> {
    try {
      if (orderSQL && orderSQL.query) {
        const returns = await orderSQL.query(
          `SELECT * FROM returns WHERE product_id = $1`,
          [productId]
        );
        const orders = await orderSQL.query(
          `SELECT * FROM orders WHERE items::jsonb @> $1::jsonb`,
          [JSON.stringify([{ productId }])]
        );

        if (orders.length > 0) {
          return {
            returnRate: returns.length / orders.length,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to get product return data:', error);
    }

    return null;
  }

  /**
   * Get brand-specific return risk
   */
  private getBrandReturnRisk(brand: string): number {
    const brandRisks: Record<string, number> = {
      'Zara': 0.08,
      'H&M': 0.10,
      'ASOS': 0.15,
      'Forever 21': 0.12,
    };

    return brandRisks[brand] || 0;
  }

  /**
   * Generate mitigation strategies based on risk
   */
  private generateMitigationStrategies(
    riskLevel: 'low' | 'medium' | 'high',
    factors: ReturnRiskFactor[],
    selectedSize?: string
  ): string[] {
    const strategies: string[] = [];

    if (riskLevel === 'high') {
      strategies.push('⚠️ High return risk detected - consider reviewing size recommendations');
      if (!selectedSize) {
        strategies.push('Get size recommendation before purchase');
      }
      strategies.push('Review product details and customer reviews');
      strategies.push('Consider alternative products with lower return risk');
    } else if (riskLevel === 'medium') {
      strategies.push('Verify size recommendations for best fit');
      strategies.push('Review product measurements before purchase');
    } else {
      strategies.push('✅ Low return risk - good fit likelihood');
    }

    // Add specific strategies based on factors
    if (factors.some(f => f.factor.includes('Size'))) {
      strategies.push('Use our size recommendation tool for accurate sizing');
    }

    if (factors.some(f => f.factor.includes('Rating'))) {
      strategies.push('Read customer reviews to understand product quality');
    }

    return strategies;
  }
}

export const returnsAgent = new ReturnsAgent();

