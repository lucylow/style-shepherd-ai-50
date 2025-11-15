import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, AlertTriangle, CheckCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { CartItem } from '@/types/fashion';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export const ShoppingCart = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: ShoppingCartProps) => {
  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalReturnRisk = cartItems.length > 0
    ? cartItems.reduce((sum, item) => sum + (item.product.returnRisk || 0), 0) / cartItems.length
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          
          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-background z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-semibold">Your Cart</h2>
                <Badge variant="secondary">
                  {cartItems.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Return Risk Alert */}
            {totalReturnRisk > 0.3 && (
              <div className="mx-6 mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <div className="flex items-start space-x-2 text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium block">High Return Risk Detected</span>
                    <p className="text-sm mt-1 text-yellow-700 dark:text-yellow-300">
                      Some items may not fit perfectly. Consider using our virtual fit assistant.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cart Items */}
            <ScrollArea className="flex-1 p-6">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={onClose}
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {cartItems.map((item) => (
                      <motion.div
                        key={item.product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, height: 0 }}
                        className="flex space-x-4 bg-muted/50 rounded-lg p-4"
                      >
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-20 h-24 object-cover rounded-md"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Size: {item.size} • ${item.product.price}
                          </p>
                          
                          {/* Return Risk Indicator */}
                          {item.product.returnRisk && item.product.returnRisk > 0.2 && (
                            <div className="flex items-center space-x-1 mt-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  item.product.returnRisk > 0.5 
                                    ? 'bg-red-500' 
                                    : 'bg-yellow-500'
                                }`}
                              />
                              <span className="text-xs text-muted-foreground">
                                {item.product.returnRisk > 0.5 ? 'High' : 'Medium'} return risk
                              </span>
                            </div>
                          )}
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveItem(item.product.id)}
                              className="text-destructive hover:text-destructive h-7"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-border p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${total.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                
                {/* Return Risk Summary */}
                <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Overall Return Risk</span>
                  <span className={`font-medium ${
                    totalReturnRisk > 0.3 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {Math.round(totalReturnRisk * 100)}%
                  </span>
                </div>

                <Button
                  onClick={onCheckout}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
