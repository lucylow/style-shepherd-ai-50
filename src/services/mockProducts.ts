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

        // Gender filter not implemented in mock data

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

  getRecommendations(userId: string): Promise<Product[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const products = this.getProducts();
        // Simple mock: return random products with high confidence
        const recommendations = products
          .sort(() => Math.random() - 0.5)
          .slice(0, 4)
          .map(p => ({
            ...p,
            confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95
            returnRisk: Math.random() * 0.3, // 0-0.3
          }));
        resolve(recommendations);
      }, 600);
    });
  }

  private getProducts(): Product[] {
    const productsStr = localStorage.getItem(this.PRODUCTS_KEY);
    return productsStr ? JSON.parse(productsStr) : initialProducts;
  }
}

export const mockProductService = new MockProductService();
