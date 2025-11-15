import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Grid3X3, ShoppingBag, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { VoiceInterface } from '@/components/VoiceInterface';
import { ShoppingCart } from '@/components/ShoppingCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartItem, mockProducts } from '@/types/fashion';

const Index = () => {
  const [products] = useState(mockProducts);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddToCart = (product: typeof mockProducts[0]) => {
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
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recommendedProducts = products.filter(p => p.confidence && p.confidence > 0.85);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-30 backdrop-blur-sm bg-background/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Style Shepherd</h1>
                <p className="text-xs text-muted-foreground">AI Fashion Assistant</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search for outfits, brands, or styles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Cart Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsCartOpen(true)}
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

          {/* Mobile Search */}
          <div className="pb-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 mb-8 border border-primary/20"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Your AI-Powered Fashion Assistant
              </h2>
              <p className="text-muted-foreground">
                Discover personalized style recommendations with voice commands
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Voice Assistant Active</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recommendations Section */}
        {recommendedProducts.length > 0 && (
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
              {recommendedProducts.slice(0, 4).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard
                    product={product}
                    onAddToCart={handleAddToCart}
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
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              </motion.div>
            ))}
          </motion.div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found. Try a different search.</p>
            </div>
          )}
        </section>
      </div>

      {/* Voice Interface */}
      <VoiceInterface
        onVoiceCommand={(command) => {
          console.log('Voice command:', command);
          // Backend integration will happen here
        }}
      />

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
          console.log('Proceeding to checkout', cartItems);
        }}
      />
    </div>
  );
};

export default Index;
