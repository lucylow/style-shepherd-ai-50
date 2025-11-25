/**
 * Product Transform Utilities
 * 
 * Maps backend API contract to frontend Product model with backward compatibility.
 * Handles both old and new field names gracefully.
 */

import { Product } from '@/types/fashion';

/**
 * Backend product response shape (what we receive from API)
 */
export interface BackendProduct {
  id: string;
  name?: string;
  title?: string;
  brand: string;
  price?: number;
  price_cents?: number; // New: price in cents
  original_price?: number;
  originalPrice?: number;
  image_url?: string; // Old field
  media?: {
    images?: Array<{ url: string }>;
  }; // New field structure
  images?: string[]; // Fallback
  category: string;
  sizes?: string[] | any; // Can be JSONB array or string
  recommended_size?: string;
  recommendedSize?: string;
  // Legacy return risk fields
  return_risk?: number | string; // Old: 0-1 number or 'high'/'medium'/'low'
  returnRisk?: number;
  // New return risk fields
  return_risk_score?: number; // 0-100 numeric
  return_risk_label?: 'low' | 'medium' | 'high' | 'unknown';
  // Size confidence
  size_confidence?: number; // 0-100
  sizeConfidence?: number;
  // Sustainability
  sustainability_score?: number;
  eco_badge?: string;
  sustainability?: string;
  // Other fields
  description?: string;
  color?: string;
  rating?: number;
  reviews_count?: number;
  reviews?: Array<{ rating: number; comment: string }>;
}

/**
 * Transform backend product to frontend Product model
 * Handles both old and new API contract formats
 */
export function transformProduct(backendProduct: BackendProduct): Product {
  // Helper to normalize sizes (can be JSONB array, string array, or string)
  const normalizeSizes = (sizes: any): string[] => {
    if (!sizes) return [];
    if (typeof sizes === 'string') {
      try {
        const parsed = JSON.parse(sizes);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [sizes];
      }
    }
    return Array.isArray(sizes) ? sizes : [];
  };

  // Extract image URL (new format: media.images[0].url, fallback to image_url or images[0])
  const getImageUrl = (): string => {
    if (backendProduct.media?.images?.[0]?.url) {
      return backendProduct.media.images[0].url;
    }
    if (backendProduct.image_url) {
      return backendProduct.image_url;
    }
    if (backendProduct.images?.[0]) {
      return backendProduct.images[0];
    }
    return '/placeholder.svg'; // Fallback placeholder
  };

  // Extract images array
  const getImages = (): string[] => {
    if (backendProduct.media?.images?.length) {
      return backendProduct.media.images.map(img => img.url);
    }
    if (backendProduct.images?.length) {
      return backendProduct.images;
    }
    if (backendProduct.image_url) {
      return [backendProduct.image_url];
    }
    return ['/placeholder.svg'];
  };

  // Calculate price (new: price_cents, fallback: price)
  const getPrice = (): number => {
    if (backendProduct.price_cents !== undefined) {
      return backendProduct.price_cents / 100;
    }
    return backendProduct.price ?? 0;
  };

  // Calculate return risk score (new: return_risk_score, fallback: derive from return_risk)
  const getReturnRiskScore = (): number | undefined => {
    if (backendProduct.return_risk_score !== undefined) {
      return backendProduct.return_risk_score;
    }
    if (backendProduct.returnRiskScore !== undefined) {
      return backendProduct.returnRiskScore;
    }
    // Legacy: convert old return_risk (0-1) to score (0-100)
    if (typeof backendProduct.return_risk === 'number') {
      return Math.round(backendProduct.return_risk * 100);
    }
    if (typeof backendProduct.returnRisk === 'number') {
      return Math.round(backendProduct.returnRisk * 100);
    }
    // Legacy: convert string labels to scores
    if (typeof backendProduct.return_risk === 'string') {
      const label = backendProduct.return_risk.toLowerCase();
      if (label === 'high') return 90;
      if (label === 'medium') return 60;
      if (label === 'low') return 20;
    }
    return undefined;
  };

  // Get return risk label (new: return_risk_label, fallback: derive from score)
  const getReturnRiskLabel = (score?: number): 'low' | 'medium' | 'high' | 'unknown' => {
    if (backendProduct.return_risk_label) {
      return backendProduct.return_risk_label;
    }
    if (score !== undefined) {
      if (score >= 67) return 'high';
      if (score >= 34) return 'medium';
      return 'low';
    }
    // Legacy: check old return_risk string
    if (typeof backendProduct.return_risk === 'string') {
      const label = backendProduct.return_risk.toLowerCase();
      if (['low', 'medium', 'high'].includes(label)) {
        return label as 'low' | 'medium' | 'high';
      }
    }
    return 'unknown';
  };

  // Get size confidence (new: size_confidence, fallback: confidence * 100)
  const getSizeConfidence = (): number | undefined => {
    if (backendProduct.size_confidence !== undefined) {
      return backendProduct.size_confidence;
    }
    if (backendProduct.sizeConfidence !== undefined) {
      return backendProduct.sizeConfidence;
    }
    // Legacy: convert confidence (0-1) to sizeConfidence (0-100)
    if (backendProduct.confidence !== undefined) {
      return Math.round(backendProduct.confidence * 100);
    }
    return undefined;
  };

  // Get sustainability
  const getSustainability = (): string | null => {
    return backendProduct.eco_badge ?? 
           backendProduct.sustainability ?? 
           (backendProduct.sustainability_score ? `${backendProduct.sustainability_score}%` : null);
  };

  const returnRiskScore = getReturnRiskScore();
  const returnRiskLabel = getReturnRiskLabel(returnRiskScore);

  const product: Product = {
    id: backendProduct.id,
    name: backendProduct.name ?? backendProduct.title ?? 'Unknown Product',
    brand: backendProduct.brand,
    price: getPrice(),
    originalPrice: backendProduct.original_price ?? backendProduct.originalPrice,
    images: getImages(),
    category: backendProduct.category,
    sizes: normalizeSizes(backendProduct.sizes),
    recommendedSize: backendProduct.recommended_size ?? backendProduct.recommendedSize,
    // New fields
    returnRiskScore,
    returnRiskLabel,
    sizeConfidence: getSizeConfidence(),
    sustainability: getSustainability(),
    // Legacy fields (for backward compatibility)
    returnRisk: returnRiskScore ? returnRiskScore / 100 : undefined,
    confidence: getSizeConfidence() ? getSizeConfidence()! / 100 : undefined,
    // Other fields
    description: backendProduct.description,
    color: backendProduct.color,
    rating: backendProduct.rating,
    reviews: backendProduct.reviews,
  };

  // Log warnings in dev mode for unexpected shapes
  if (import.meta.env.DEV) {
    if (!backendProduct.id) {
      console.warn('[Transform] Product missing id:', backendProduct);
    }
    if (!backendProduct.name && !backendProduct.title) {
      console.warn('[Transform] Product missing name/title:', backendProduct.id);
    }
  }

  return product;
}

/**
 * Safe transform with error handling
 * Returns a minimal valid product even if transformation fails
 */
export function safeTransformProduct(backendProduct: any): Product {
  try {
    return transformProduct(backendProduct);
  } catch (error) {
    console.error('[Transform] Error transforming product:', error, backendProduct);
    // Return minimal valid product
    return {
      id: backendProduct?.id || `error_${Date.now()}`,
      name: backendProduct?.name || backendProduct?.title || 'Unknown Product',
      brand: backendProduct?.brand || 'Unknown Brand',
      price: backendProduct?.price || backendProduct?.price_cents ? backendProduct.price_cents / 100 : 0,
      images: backendProduct?.image_url ? [backendProduct.image_url] : ['/placeholder.svg'],
      category: backendProduct?.category || 'Uncategorized',
      sizes: [],
    };
  }
}

