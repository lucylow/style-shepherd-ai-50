import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Product } from '@/types/fashion';
import { ProductCard } from './ProductCard';
import { toast } from 'sonner';

interface WishlistProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistItems: Product[];
  onRemove: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
}

export const Wishlist = ({
  isOpen,
  onClose,
  wishlistItems,
  onRemove,
  onAddToCart,
  onToggleWishlist,
}: WishlistProps) => {
  const handleAddToCart = (product: Product) => {
    onAddToCart(product);
    toast.success('Added to cart!', {
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleRemove = (product: Product) => {
    onRemove(product.id);
    toast.success('Removed from wishlist', {
      description: `${product.name} has been removed.`,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <span>My Wishlist</span>
                {wishlistItems.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {wishlistItems.length}
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="mt-2">
                {wishlistItems.length > 0
                  ? `${wishlistItems.length} saved item${wishlistItems.length > 1 ? 's' : ''}`
                  : 'Your saved items will appear here'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
              >
                <Heart className="w-12 h-12 text-muted-foreground" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start saving your favorite items by clicking the heart icon
              </p>
              <Button onClick={onClose} variant="outline">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="p-6">
              <AnimatePresence>
                <div className="grid grid-cols-1 gap-4">
                  {wishlistItems.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-lg border border-border p-4"
                    >
                      <div className="flex space-x-4">
                        <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                            {product.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {product.brand}
                          </p>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-bold">${product.price}</span>
                            {product.originalPrice && (
                              <span className="text-xs text-muted-foreground line-through">
                                ${product.originalPrice}
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(product)}
                              className="flex-1"
                            >
                              <ShoppingBag className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(product)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {wishlistItems.length > 0 && (
          <div className="border-t p-6">
            <Button
              onClick={() => {
                wishlistItems.forEach(product => onAddToCart(product));
                toast.success('All items added to cart!');
              }}
              className="w-full"
              size="lg"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Add All to Cart
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

