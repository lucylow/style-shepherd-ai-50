/**
 * TypeScript types for AI mock data
 * Comprehensive structure for retail voice shopping assistant
 */

export interface UserMeasurement {
  height_cm: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  shoe_size_us?: number;
  inseam_cm?: number;
}

export interface StylePreferences {
  colors?: string[];
  patterns?: string[];
  occasion?: string[];
  brands?: string[];
}

export interface SizeHistoryEntry {
  brand: string;
  size: string;
  fit: 'perfect' | 'tight' | 'loose' | 'too_small' | 'too_large';
  productId?: string;
  date?: string;
}

export interface ReturnHistoryEntry {
  productId: string;
  reason: string;
  date: string;
}

export interface EnhancedUserProfile {
  userId: string;
  name: string;
  email: string;
  measurements: UserMeasurement;
  stylePreferences: StylePreferences;
  sizeHistory: SizeHistoryEntry[];
  returnHistory: ReturnHistoryEntry[];
  voicePreference?: string;
}

export interface ProductAttributes {
  colors: string[];
  patterns: string[];
  sizes: string[];
  material: string;
}

export interface SizeChartEntry {
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  inseam_cm?: number;
  [key: string]: number | undefined;
}

export interface ProductReviewStats {
  count: number;
  averageRating: number;
}

export interface EnhancedProduct {
  productId: string;
  name: string;
  brand: string;
  price_usd: number;
  category: string;
  attributes: ProductAttributes;
  images: string[];
  avgReturnRate: number;
  reviews: ProductReviewStats;
  sizeChart: Record<string, SizeChartEntry>;
}

export interface ConversationMessage {
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface ConversationHistory {
  userId: string;
  sessionId: string;
  messages: ConversationMessage[];
}

export interface ProductRecommendation {
  productId: string;
  recommendedSize: string;
  confidenceScore: number;
  returnRisk: number;
  reasoning: string;
}

export interface AIRecommendationOutput {
  userId: string;
  timestamp: string;
  recommendations: ProductRecommendation[];
}

export interface OrderItem {
  productId: string;
  size: string;
  price: number;
  quantity: number;
  returnRiskScore: number;
}

export interface EnhancedOrder {
  orderId: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  placedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface RiskFactorItem {
  productId: string;
  size: string;
  riskFactors: string[];
  mitigationAdvice?: string;
}

export interface ReturnRiskAnalysis {
  overallRiskScore: number;
  highRiskItems: RiskFactorItem[];
  lowRiskItems: RiskFactorItem[];
}

export interface OrderReturnRiskAnalysis {
  orderId: string;
  returnRiskAnalysis: ReturnRiskAnalysis;
}

export interface AIMockData {
  userProfiles: EnhancedUserProfile[];
  products: EnhancedProduct[];
  conversations: ConversationHistory[];
  recommendations: AIRecommendationOutput[];
  orders: EnhancedOrder[];
  returnRiskAnalyses: OrderReturnRiskAnalysis[];
}

