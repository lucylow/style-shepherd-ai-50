import { Product } from '@/types/fashion';
import { mockProducts as initialProducts } from '@/types/fashion';

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  gender?: string;
}

class MockProductService {
  private PRODUCTS_KEY = 'style_shepherd_products';

  constructor() {
    // Initialize with mock products if empty
    if (!localStorage.getItem(this.PRODUCTS_KEY)) {
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(initialProducts));
    }
  }

  searchProducts(filters: SearchFilters = {}): Promise<Product[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let products = this.getProducts();

        // Filter by query
        if (filters.query) {
          const query = filters.query.toLowerCase();
          products = products.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
          );
        }

        // Filter by category
        if (filters.category) {
          products = products.filter(p => p.category === filters.category);
        }

        // Filter by price range
        if (filters.minPrice !== undefined) {
          products = products.filter(p => p.price >= filters.minPrice!);
        }
        if (filters.maxPrice !== undefined) {
          products = products.filter(p => p.price <= filters.maxPrice!);
        }

        // Filter by brand
        if (filters.brand) {
          products = products.filter(p => p.brand === filters.brand);
        }

        resolve(products);
      }, 400);
    });
  }

  getProductById(id: string): Promise<Product | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = this.getProducts();
        const product = products.find(p => p.id === id) || null;
        resolve(product);
      }, 200);
    });
  }

  async getRecommendations(userId: string): Promise<Product[]> {
    // AI-powered personalized recommendations
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { personalizationEngine } = await import('./personalizationEngine');
    const { mockAuth } = await import('./mockAuth');
    
    const currentUser = mockAuth.getCurrentUser();
    const allProducts = this.getProducts();
    
    if (!currentUser) {
      return allProducts.slice(0, 8);
    }
    
    const userProfile = mockAuth.getUserProfile(currentUser.id);
    
    if (!userProfile) {
      return allProducts.slice(0, 8);
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
    
    const recommendations = personalizationEngine.generatePersonalizedRecommendations(
      allProducts,
      aiUserProfile,
      { session_type: 'browsing' }
    );
    
    return recommendations.slice(0, 12);
  }

  private getProducts(): Product[] {
    const productsStr = localStorage.getItem(this.PRODUCTS_KEY);
    return productsStr ? JSON.parse(productsStr) : initialProducts;
  }

  getAllProducts(): Product[] {
    return this.getProducts();
  }
}

export const mockProductService = new MockProductService();
