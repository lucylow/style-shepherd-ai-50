import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Sparkles, ShoppingBag } from 'lucide-react';
import { VoiceInterface } from '@/components/VoiceInterface';
import { ProductCard } from '@/components/ProductCard';
import { ShoppingCart } from '@/components/ShoppingCart';
import { Button } from '@/components/ui/button';
import { CartItem, Product, VoiceResponse } from '@/types/fashion';
import { useAuth } from '@/contexts/AuthContext';
import { mockProductService } from '@/services/mockProducts';
import { mockCartService } from '@/services/mockCart';
import Breadcrumbs from '@/components/Breadcrumbs';
import HeaderNav from '@/components/HeaderNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import RouteLoadingIndicator from '@/components/RouteLoadingIndicator';
import useScrollRestoration from '@/hooks/useScrollRestoration';

const VoiceShop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');

  const { user } = useAuth();
  const userId = user?.id || 'guest';

  useScrollRestoration();

  useEffect(() => {
    loadInitialProducts();
    if (userId !== 'guest') {
      loadCart();
    }
  }, [userId]);

  const loadInitialProducts = async () => {
    setIsLoading(true);
    try {
      const results = await mockProductService.searchProducts({});
      setProducts(results.slice(0, 8)); // Show initial products
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

  const handleVoiceCommand = async (response: VoiceResponse) => {
    setIsListening(false);
    setLastCommand(response.text || 'Command processed');

    // If products are directly provided in response
    if (response.products && response.products.length > 0) {
      setProducts(response.products);
    } else if (response.text) {
      // Try to search based on voice command text and intent
      try {
        // Extract search terms from the response text
        const searchQuery = response.text;
        const results = await mockProductService.searchProducts({ query: searchQuery });
        setProducts(results);
      } catch (error) {
        console.error('Error searching products:', error);
      }
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <HeaderNav />
      <RouteLoadingIndicator />
      
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs />
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 mb-8 border border-primary/20"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Voice Shop</h1>
              </div>
              <p className="text-muted-foreground text-lg mb-4">
                Shop hands-free with voice commands. Say what you're looking for and we'll find it for you.
              </p>
              {lastCommand && (
                <div className="bg-card border border-border rounded-lg p-3 mt-4">
                  <p className="text-sm text-muted-foreground">Last command:</p>
                  <p className="text-foreground font-medium">"{lastCommand}"</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                  isListening ? 'bg-red-500 animate-pulse' : 'bg-muted'
                }`}>
                  {isListening ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-foreground" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {isListening ? 'Listening...' : 'Tap to start'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Voice Commands Help */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-6 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Try These Commands
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Show me blue dresses',
              'Find casual shirts',
              'I need size medium',
              'Show me low return risk items',
              'What do you recommend?',
              'Find something for a wedding',
            ].map((command, index) => (
              <div
                key={index}
                className="bg-muted rounded-lg p-3 text-sm text-muted-foreground"
              >
                "{command}"
              </div>
            ))}
          </div>
        </motion.div>

        {/* Products Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">
              {products.length > 0 ? 'Voice Search Results' : 'Start by saying what you need'}
            </h2>
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
          ) : products.length > 0 ? (
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
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <Mic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                No products yet
              </p>
              <p className="text-sm text-muted-foreground">
                Use the voice interface below to search for products
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Voice Interface */}
      <VoiceInterface
        userId={userId}
        onVoiceCommand={handleVoiceCommand}
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
          // Checkout handled in ShoppingCart
        }}
      />

      <MobileBottomNav />
    </div>
  );
};

export default VoiceShop;

