import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Grid3X3, ShoppingBag, Sparkles, Home, Heart, GitCompare, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '@/components/ProductCard';
import { VoiceInterface } from '@/components/VoiceInterface';
import { ShoppingCart } from '@/components/ShoppingCart';
import { ProductFilters, FilterOptions } from '@/components/ProductFilters';
import { ProductQuickView } from '@/components/ProductQuickView';
import { ImageLightbox } from '@/components/ImageLightbox';
import { SearchSuggestions } from '@/components/SearchSuggestions';
import { ProductComparison } from '@/components/ProductComparison';
import { Wishlist } from '@/components/Wishlist';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CartItem, Product, VoiceResponse } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';
import { mockProductService } from '@/services/mockProducts';
import { mockCartService } from '@/services/mockCart';
import { toast } from 'sonner';

const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [comparisonProducts, setComparisonProducts] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ product: Product; index: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    brands: [],
    sizes: [],
    minPrice: 0,
    maxPrice: 1000,
    sortBy: 'newest',
  });

  const { user } = useAuth();
  const userId = user?.id || 'guest';

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFiltersToProducts = useCallback((productsToFilter: Product[]) => {
    let filtered = [...productsToFilter];

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => filters.categories.includes(p.category));
    }

    // Apply brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(p => filters.brands.includes(p.brand));
    }

    // Apply size filter
    if (filters.sizes.length > 0) {
      filtered = filtered.filter(p => 
        p.sizes.some(size => filters.sizes.includes(size))
      );
    }

    // Apply price filter
    filtered = filtered.filter(p => 
      p.price >= filters.minPrice && p.price <= filters.maxPrice
    );

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'return-risk':
          const aRisk = a.returnRisk || (a.returnRiskScore ? a.returnRiskScore / 100 : 0);
          const bRisk = b.returnRisk || (b.returnRiskScore ? b.returnRiskScore / 100 : 0);
          return aRisk - bRisk;
        default:
          return 0;
      }
    });

    setProducts(filtered);
  }, [filters]);

  const searchProducts = useCallback(async () => {
    try {
      const results = await mockProductService.searchProducts({ query: searchQuery });
      applyFiltersToProducts(results);
      
      // Save to recent searches
      if (searchQuery.trim() && !recentSearches.includes(searchQuery.trim())) {
        const updated = [searchQuery.trim(), ...recentSearches].slice(0, 10);
        setRecentSearches(updated);
        localStorage.setItem(`recent_searches_${userId}`, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  }, [searchQuery, recentSearches, userId, applyFiltersToProducts]);

  useEffect(() => {
    searchProducts();
  }, [searchProducts]);

  useEffect(() => {
    applyFiltersToProducts(allProducts);
  }, [filters, allProducts, applyFiltersToProducts]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [productsData, recsData, cartData] = await Promise.all([
        mockProductService.searchProducts({}),
        userId !== 'guest' ? mockProductService.getRecommendations(userId) : Promise.resolve([]),
        userId !== 'guest' ? mockCartService.getCart(userId) : Promise.resolve([])
      ]);
      setAllProducts(productsData);
      setProducts(productsData);
      setRecommendations(recsData);
      setCartItems(cartData);
      
      // Load wishlist from localStorage
      const savedWishlist = localStorage.getItem(`wishlist_${userId}`);
      if (savedWishlist) {
        setWishlistItems(JSON.parse(savedWishlist));
      }
      
      // Load recent searches
      const savedSearches = localStorage.getItem(`recent_searches_${userId}`);
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
      
      // Calculate price range
      if (productsData.length > 0) {
        const prices = productsData.map(p => p.price);
        setFilters(prev => ({
          ...prev,
          minPrice: Math.floor(Math.min(...prices)),
          maxPrice: Math.ceil(Math.max(...prices)),
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleVoiceCommand = useCallback(async (response: VoiceResponse) => {
    if (response.products && response.products.length > 0) {
      setProducts(response.products);
    }
  }, []);

  const handleAddToCart = useCallback(async (product: Product) => {
    if (userId === 'guest') {
      // For guest users, just update state locally
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
      // For logged-in users, use the mock service
      const updatedCart = await mockCartService.addToCart(userId, {
        product,
        quantity: 1,
        size: product.recommendedSize || product.sizes[0]
      });
      setCartItems(updatedCart);
    }
  }, [userId]);

  const handleUpdateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (userId === 'guest') {
      if (quantity === 0) {
        setCartItems(prev => prev.filter(item => item.product.id !== productId));
      } else {
        setCartItems(prev => prev.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        ));
      }
    } else {
      // Find the item to get its size
      const item = cartItems.find(i => i.product.id === productId);
      const size = item?.size || item?.selectedSize || '';
      const updatedCart = await mockCartService.updateQuantity(userId, productId, size, quantity);
      setCartItems(updatedCart);
    }
  }, [userId, cartItems]);

  const handleRemoveItem = useCallback(async (productId: string) => {
    if (userId === 'guest') {
      setCartItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      const updatedCart = await mockCartService.removeFromCart(userId, productId);
      setCartItems(updatedCart);
    }
  }, [userId]);

  const handleCartClose = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const handleCartOpen = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const handleToggleWishlist = useCallback((product: Product) => {
    setWishlistItems(prev => {
      const isInWishlist = prev.some(p => p.id === product.id);
      let updated;
      if (isInWishlist) {
        updated = prev.filter(p => p.id !== product.id);
        toast.success('Removed from wishlist');
      } else {
        updated = [...prev, product];
        toast.success('Added to wishlist');
      }
      localStorage.setItem(`wishlist_${userId}`, JSON.stringify(updated));
      return updated;
    });
  }, [userId]);

  const handleRemoveFromWishlist = useCallback((productId: string) => {
    setWishlistItems(prev => {
      const updated = prev.filter(p => p.id !== productId);
      localStorage.setItem(`wishlist_${userId}`, JSON.stringify(updated));
      return updated;
    });
  }, [userId]);

  const handleAddToComparison = useCallback((product: Product) => {
    if (comparisonProducts.length >= 4) {
      toast.error('You can compare up to 4 products');
      return;
    }
    if (comparisonProducts.some(p => p.id === product.id)) {
      toast.info('Product already in comparison');
      return;
    }
    setComparisonProducts(prev => [...prev, product]);
    toast.success('Added to comparison');
  }, [comparisonProducts]);

  const handleRemoveFromComparison = useCallback((productId: string) => {
    setComparisonProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const handleQuickView = useCallback((product: Product) => {
    setQuickViewProduct(product);
  }, []);

  const handleImageZoom = useCallback((product: Product, imageIndex: number) => {
    setLightboxImage({ product, index: imageIndex });
  }, []);

  const handleSearchSelect = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setIsFiltersOpen(false);
  }, []);

  // Get available filter options
  const availableCategories = useMemo(() => {
    const categories = new Set(allProducts.map(p => p.category));
    return Array.from(categories).sort();
  }, [allProducts]);

  const availableBrands = useMemo(() => {
    const brands = new Set(allProducts.map(p => p.brand));
    return Array.from(brands).sort();
  }, [allProducts]);

  const availableSizes = useMemo(() => {
    const sizes = new Set(allProducts.flatMap(p => p.sizes));
    return Array.from(sizes).sort();
  }, [allProducts]);

  const priceRange: [number, number] = useMemo(() => {
    if (allProducts.length === 0) return [0, 1000];
    const prices = allProducts.map(p => p.price);
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
  }, [allProducts]);

  const popularSearches = useMemo(() => [
    'Summer Dresses',
    'Casual Jeans',
    'Formal Shirts',
    'Running Shoes',
    'Leather Jackets',
  ], []);

  // Memoize filtered recommendations
  const displayedRecommendations = useMemo(() => {
    return recommendations.slice(0, 4);
  }, [recommendations]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-30 backdrop-blur-sm bg-background/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Style Shepherd</h1>
                <p className="text-xs text-muted-foreground">AI Fashion Assistant</p>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block">
              <SearchSuggestions
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={handleSearchSelect}
                products={allProducts}
                recentSearches={recentSearches}
                popularSearches={popularSearches}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/">
                  <Home className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsWishlistOpen(true)}
                className="relative"
              >
                <Heart className="w-5 h-5" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {wishlistItems.length}
                  </span>
                )}
              </Button>
              {comparisonProducts.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsComparisonOpen(true)}
                  className="relative"
                >
                  <GitCompare className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {comparisonProducts.length}
                  </span>
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleCartOpen}
                className="relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="pb-4 md:hidden">
            <SearchSuggestions
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={handleSearchSelect}
              products={allProducts}
              recentSearches={recentSearches}
              popularSearches={popularSearches}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 mb-8 border border-primary/20 relative overflow-hidden"
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-start gap-4 flex-1">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  Your AI-Powered Fashion Assistant
                </h2>
                <p className="text-muted-foreground mb-3">
                  Discover personalized style recommendations with voice commands and intelligent suggestions
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-foreground">Voice Active</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">AI Recommendations</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Smart Sizing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">Personalized For You</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedRecommendations.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onImageZoom={handleImageZoom}
                    onToggleWishlist={handleToggleWishlist}
                    isInWishlist={wishlistItems.some(p => p.id === product.id)}
                    onCompare={handleAddToComparison}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* All Products Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              {searchQuery ? 'Search Results' : 'All Products'}
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 bg-muted border border-border rounded-lg p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-background">
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFiltersOpen(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {filters.categories.length + filters.brands.length + filters.sizes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.categories.length + filters.brands.length + filters.sizes.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            >
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickView}
                    onImageZoom={handleImageZoom}
                    onToggleWishlist={handleToggleWishlist}
                    isInWishlist={wishlistItems.some(p => p.id === product.id)}
                    onCompare={handleAddToComparison}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found. Try a different search.</p>
            </div>
          )}
        </section>
      </div>

      {/* Voice Interface */}
      <VoiceInterface
        userId={userId}
        onVoiceCommand={handleVoiceCommand}
      />

      {/* Shopping Cart */}
      <ShoppingCart
        isOpen={isCartOpen}
        onClose={handleCartClose}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          // Checkout is handled in ShoppingCart component
        }}
      />
    </div>
  );
};

export default Dashboard;
