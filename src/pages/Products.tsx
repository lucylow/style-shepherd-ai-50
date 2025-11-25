import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Grid3X3, ShoppingBag } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { ShoppingCart } from '@/components/ShoppingCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CartItem, Product } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';
import { productService } from '@/services/productService';
import { mockCartService } from '@/services/mockCart';
import Breadcrumbs from '@/components/Breadcrumbs';
import HeaderNav from '@/components/HeaderNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import { usePrefetch } from '@/hooks/usePrefetch';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  // Initialize state from URL params
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Get filter/search values from URL
  const searchQuery = searchParams.get('q') || '';
  const riskFilter = searchParams.get('risk') || '';
  const sizeFilter = searchParams.get('size') || '';
  const categoryFilter = searchParams.get('category') || '';

  // Use scroll restoration
  useScrollRestoration();
  const { prefetchOnHover } = usePrefetch();

  // Load products based on URL params
  useEffect(() => {
    loadProducts();
  }, [searchQuery, riskFilter, sizeFilter, categoryFilter]);

  useEffect(() => {
    if (userId !== 'guest') {
      loadCart();
    }
  }, [userId]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (searchQuery) filters.query = searchQuery;
      if (riskFilter) filters.risk = riskFilter;
      if (sizeFilter) filters.size = sizeFilter;
      if (categoryFilter) filters.category = categoryFilter;

      const results = await productService.searchProducts(filters);
      setProducts(results);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const cartData = await mockCartService.getCart(userId);
      setCartItems(cartData);
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  // Update URL params (shallow routing)
  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    // Update URL without page reload
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSearchChange = (value: string) => {
    updateFilters({ q: value || null });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const currentValue = searchParams.get(filterType);
    if (currentValue === value) {
      updateFilters({ [filterType]: null });
    } else {
      updateFilters({ [filterType]: value });
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (userId === 'guest') {
      setCartItems(prev => {
        const existingItem = prev.find(item => item.product.id === product.id);
        if (existingItem) {
          return prev.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, { 
          product, 
          quantity: 1, 
          size: product.recommendedSize || product.sizes[0] 
        }];
      });
    } else {
      const updatedCart = await mockCartService.addToCart(userId, {
        product,
        quantity: 1,
        size: product.recommendedSize || product.sizes[0]
      });
      setCartItems(updatedCart);
    }
  };

  const activeFiltersCount = [riskFilter, sizeFilter, categoryFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <HeaderNav />
      <RouteLoadingIndicator />
      
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-[#2D8CFF] text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border rounded-lg p-4 space-y-4"
            >
              <div>
                <h4 className="text-sm font-semibold mb-2">Return Risk</h4>
                <div className="flex flex-wrap gap-2">
                  {['low', 'medium', 'high'].map(risk => (
                    <Button
                      key={risk}
                      variant={riskFilter === risk ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('risk', risk)}
                      data-cy={`filter-risk-${risk}`}
                    >
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Size</h4>
                <div className="flex flex-wrap gap-2">
                  {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                    <Button
                      key={size}
                      variant={sizeFilter === size ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('size', size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Category</h4>
                <div className="flex flex-wrap gap-2">
                  {['dress', 'top', 'pants', 'shoes', 'jacket'].map(category => (
                    <Button
                      key={category}
                      variant={categoryFilter === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('category', category)}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {riskFilter && (
                <Badge variant="secondary" className="gap-1">
                  Risk: {riskFilter}
                  <button
                    onClick={() => handleFilterChange('risk', '')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove risk filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {sizeFilter && (
                <Badge variant="secondary" className="gap-1">
                  Size: {sizeFilter}
                  <button
                    onClick={() => handleFilterChange('size', '')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove size filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {categoryFilter && (
                <Badge variant="secondary" className="gap-1">
                  Category: {categoryFilter}
                  <button
                    onClick={() => handleFilterChange('category', '')}
                    className="ml-1 hover:text-destructive"
                    aria-label="Remove category filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Products Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              {searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
            </h2>
            <div className="flex items-center space-x-1 bg-muted border border-border rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-background">
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-cy="product-list">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card rounded-xl shadow-sm border border-border animate-pulse">
                  <div className="aspect-[3/4] bg-muted rounded-t-xl" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              data-cy="product-list"
            >
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  data-cy="product-card"
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
            </div>
          )}
        </section>
      </main>

      {/* Shopping Cart */}
      <ShoppingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={(productId, quantity) => {
          if (quantity === 0) {
            setCartItems(prev => prev.filter(item => item.product.id !== productId));
          } else {
            setCartItems(prev => prev.map(item =>
              item.product.id === productId ? { ...item, quantity } : item
            ));
          }
        }}
        onRemoveItem={(productId) => {
          setCartItems(prev => prev.filter(item => item.product.id !== productId));
        }}
        onCheckout={() => {
          navigate('/checkout');
        }}
      />

      <MobileBottomNav />
    </div>
  );
};

export default Products;

