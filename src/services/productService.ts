/**
 * Product Service
 * 
 * Fetches products from the backend API and transforms them to the frontend model.
 * Falls back to mock service if API is unavailable.
 */

import api from '@/lib/api';
import { Product } from '@/types/fashion';
import { transformProduct, safeTransformProduct } from '@/lib/transform';
import { mockProductService } from './mockProducts';

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  gender?: string;
  limit?: number;
}

class ProductService {
  private useMockFallback = false;

  /**
   * Search products with filters
   */
  async searchProducts(filters: SearchFilters = {}): Promise<Product[]> {
    try {
      // Try API first
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await api.get(`/vultr/postgres/products?${params.toString()}`);
      
      // Transform backend products to frontend model
      let products: Product[] = [];
      
      if (Array.isArray(response.data)) {
        products = response.data.map(safeTransformProduct);
      } else if (response.data.items && Array.isArray(response.data.items)) {
        products = response.data.items.map(safeTransformProduct);
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products.map(safeTransformProduct);
      } else {
        console.warn('[ProductService] Unexpected response shape:', response.data);
        products = [];
      }

      // Apply client-side filtering for query (if backend doesn't support it)
      if (filters.query) {
        const query = filters.query.toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
        );
      }

      this.useMockFallback = false;
      return products;
    } catch (error: any) {
      console.error('[ProductService] API error, falling back to mocks:', error);
      this.useMockFallback = true;
      
      // Fallback to mock service
      return mockProductService.searchProducts(filters);
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await api.get(`/vultr/postgres/products?id=${id}`);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        return transformProduct(response.data[0]);
      }
      
      if (response.data.id) {
        return transformProduct(response.data);
      }
      
      return null;
    } catch (error: any) {
      console.error('[ProductService] Error fetching product:', error);
      
      // Fallback to mock service
      return mockProductService.getProductById(id);
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId: string): Promise<Product[]> {
    try {
      // Try the recommendations API endpoint
      const response = await api.post('/recommendations', {
        userPreferences: {
          // You can enhance this with actual user preferences from context
        },
        context: {
          sessionType: 'browsing',
        },
      });

      if (response.data.recommendations && Array.isArray(response.data.recommendations)) {
        // Recommendations API returns recommendation results, not full products
        // We need to fetch the actual products
        const productIds = response.data.recommendations
          .map((rec: any) => rec.productId)
          .filter(Boolean);
        
        if (productIds.length > 0) {
          // Fetch products by IDs (if endpoint supports it)
          // For now, return empty and let it fall back
          // In production, you'd have a batch fetch endpoint
        }
      }

      // If recommendations API doesn't return full products, fall back to search
      return this.searchProducts({ limit: 12 });
    } catch (error: any) {
      console.error('[ProductService] Error fetching recommendations:', error);
      
      // Fallback to mock service
      return mockProductService.getRecommendations(userId);
    }
  }

  /**
   * Get all products (no filters)
   */
  async getAllProducts(): Promise<Product[]> {
    return this.searchProducts({});
  }

  /**
   * Check if service is using mock fallback
   */
  isUsingMockFallback(): boolean {
    return this.useMockFallback;
  }
}

export const productService = new ProductService();

