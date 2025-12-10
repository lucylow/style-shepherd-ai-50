import { Product } from '@/types/fashion';
import { mockProducts as initialProducts } from '@/types/fashion';

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  gender?: string;
  sortBy?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'rating-desc' | 'newest';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class MockProductService {
  private PRODUCTS_KEY = 'style_shepherd_products';
  private readonly DEFAULT_DELAY = 300;
  private readonly DEFAULT_PAGE_SIZE = 20;

  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialize localStorage with mock products if empty
   */
  private initializeStorage(): void {
    try {
      if (!localStorage.getItem(this.PRODUCTS_KEY)) {
        localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(initialProducts));
      }
    } catch (error) {
      console.error('Failed to initialize product storage:', error);
    }
  }

  /**
   * Search products with advanced filtering, sorting, and pagination
   */
  async searchProducts(filters: SearchFilters = {}): Promise<Product[]> {
    return this.searchProductsWithPagination(filters).then(result => result.products);
  }

  /**
   * Search products with pagination support
   */
  async searchProductsWithPagination(filters: SearchFilters = {}): Promise<SearchResult> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          let products = this.getProducts();
          const totalBeforePagination = products.length;

          // Apply filters
          products = this.applyFilters(products, filters);

          // Apply sorting
          products = this.applySorting(products, filters.sortBy);

          // Apply pagination
          const page = filters.page || 1;
          const limit = filters.limit || this.DEFAULT_PAGE_SIZE;
          const total = products.length;
          const totalPages = Math.ceil(total / limit);
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedProducts = products.slice(startIndex, endIndex);

          resolve({
            products: paginatedProducts,
            total,
            page,
            limit,
            totalPages,
          });
        } catch (error) {
          reject(new Error(`Failed to search products: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY);
    });
  }

  /**
   * Apply filters to products with fuzzy matching for query
   */
  private applyFilters(products: Product[], filters: SearchFilters): Product[] {
    let filtered = [...products];

    // Filter by query with fuzzy matching
    if (filters.query) {
      const query = filters.query.toLowerCase().trim();
      const queryTerms = query.split(/\s+/);
      
      filtered = filtered.filter(p => {
        const searchableText = [
          p.name,
          p.brand,
          p.category,
          p.description,
          p.color,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // Check if all query terms are found (fuzzy match)
        return queryTerms.every(term => searchableText.includes(term));
      });
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter(p => 
        p.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    // Filter by price range
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= filters.maxPrice!);
    }

    // Filter by brand
    if (filters.brand) {
      filtered = filtered.filter(p => 
        p.brand.toLowerCase() === filters.brand!.toLowerCase()
      );
    }

    return filtered;
  }

  /**
   * Apply sorting to products
   */
  private applySorting(products: Product[], sortBy?: string): Product[] {
    const sorted = [...products];

    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'rating-desc':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'newest':
        // Assuming products with higher IDs are newer (fallback)
        return sorted.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      default:
        return sorted;
    }
  }

  /**
   * Get product by ID with error handling
   */
  async getProductById(id: string): Promise<Product | null> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!id) {
            resolve(null);
            return;
          }

          const products = this.getProducts();
          const product = products.find(p => p.id === id) || null;
          resolve(product);
        } catch (error) {
          reject(new Error(`Failed to get product: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY / 2);
    });
  }

  /**
   * Get multiple products by IDs
   */
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const products = this.getProducts();
          const foundProducts = ids
            .map(id => products.find(p => p.id === id))
            .filter((p): p is Product => p !== undefined);
          resolve(foundProducts);
        } catch (error) {
          reject(new Error(`Failed to get products: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY);
    });
  }

  /**
   * Get AI-powered personalized recommendations
   */
  async getRecommendations(userId: string, limit: number = 12): Promise<Product[]> {
    try {
      await new Promise(resolve => setTimeout(resolve, this.DEFAULT_DELAY));
      
      const { personalizationEngine } = await import('./personalizationEngine');
      const { mockAuth } = await import('./mockAuth');
      
      const currentUser = mockAuth.getCurrentUser();
      const allProducts = this.getProducts();
      
      if (!currentUser) {
        // Return popular products for guests
        return this.getPopularProducts(limit);
      }
      
      const userProfile = mockAuth.getUserProfile(currentUser.id);
      
      if (!userProfile) {
        return this.getPopularProducts(limit);
      }
      
      // Transform mockAuth UserProfile to our local UserProfile
      const aiUserProfile = {
        userId: userProfile.userId,
        preferences: {
          favoriteColors: userProfile.stylePreferences?.favoriteColors || [],
          preferredBrands: userProfile.stylePreferences?.preferredBrands || [],
          preferredStyles: userProfile.stylePreferences?.styleType ? [userProfile.stylePreferences.styleType] : [],
          preferredSizes: [] as string[]
        },
        bodyMeasurements: {
          height: userProfile.measurements?.height,
          weight: userProfile.measurements?.weight,
        },
        orderHistory: [] as Array<{id: string; date?: string; items: any[]}>,
        returnHistory: userProfile.returnHistory || []
      };
      
      const recommendations = await personalizationEngine.generatePersonalizedRecommendations(
        allProducts,
        aiUserProfile,
        { session_type: 'browsing' }
      );
      
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      // Fallback to popular products
      return this.getPopularProducts(limit);
    }
  }

  /**
   * Get popular products (fallback for guests or when recommendations fail)
   */
  private getPopularProducts(limit: number): Product[] {
    const products = this.getProducts();
    // Sort by rating (if available) or return first N products
    return products
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  }

  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    const products = this.getProducts();
    const categories = new Set(products.map(p => p.category));
    return Array.from(categories).sort();
  }

  /**
   * Get all unique brands
   */
  getBrands(): string[] {
    const products = this.getProducts();
    const brands = new Set(products.map(p => p.brand));
    return Array.from(brands).sort();
  }

  /**
   * Get price range from all products
   */
  getPriceRange(): { min: number; max: number } {
    const products = this.getProducts();
    if (products.length === 0) {
      return { min: 0, max: 0 };
    }
    const prices = products.map(p => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  /**
   * Get products from storage with error handling
   */
  private getProducts(): Product[] {
    try {
      const productsStr = localStorage.getItem(this.PRODUCTS_KEY);
      if (!productsStr) {
        return initialProducts;
      }
      const products = JSON.parse(productsStr);
      return Array.isArray(products) ? products : initialProducts;
    } catch (error) {
      console.error('Failed to parse products from storage:', error);
      return initialProducts;
    }
  }

  /**
   * Get all products (synchronous)
   */
  getAllProducts(): Product[] {
    return this.getProducts();
  }
}

export const mockProductService = new MockProductService();
