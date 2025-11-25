import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Heart, ZoomIn, Minus, Plus, AlertTriangle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Product } from '@/types/fashion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ProductQuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  onAddToWishlist?: (product: Product) => void;
}

export const ProductQuickView = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onAddToWishlist,
}: ProductQuickViewProps) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!product) return null;

  const handleAddToCart = () => {
    const size = selectedSize || product.recommendedSize || product.sizes[0];
    onAddToCart(product, size, quantity);
    onClose();
  };

  const handleWishlist = () => {
    setIsLiked(!isLiked);
    onAddToWishlist?.(product);
  };

  const returnRisk = product.returnRisk || product.returnRiskScore ? (product.returnRiskScore || 0) / 100 : 0;
  const confidence = product.confidence || product.sizeConfidence ? (product.sizeConfidence || 0) / 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="relative bg-muted">
            <Carousel className="w-full">
              <CarouselContent>
                {product.images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-square">
                      <img
                        src={image}
                        alt={`${product.name} - View ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {product.images.length > 1 && (
                <>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </>
              )}
            </Carousel>

            {/* Image Thumbnails */}
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary scale-110'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col space-y-2">
              {returnRisk > 0.3 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Return Risk: {Math.round(returnRisk * 100)}%
                </Badge>
              )}
              {product.originalPrice && (
                <Badge className="bg-red-500 text-white">
                  Sale
                </Badge>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              onClick={handleWishlist}
              className="absolute top-4 right-4 p-2 bg-background rounded-full shadow-md hover:shadow-lg transition-all"
            >
              <Heart
                className={`w-5 h-5 ${
                  isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                }`}
              />
            </button>
          </div>

          {/* Product Info Section */}
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl">{product.name}</DialogTitle>
              <DialogDescription className="text-base">
                {product.brand}
              </DialogDescription>
            </DialogHeader>

            <Separator />

            {/* Price */}
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold">${product.price}</span>
              {product.originalPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    ${product.originalPrice}
                  </span>
                  <Badge variant="destructive">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </Badge>
                </>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}

            {/* Fit Confidence */}
            {confidence > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Fit Confidence</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>AI-predicted fit accuracy based on your profile</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-sm font-semibold">{Math.round(confidence * 100)}%</span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-2 rounded-full ${
                      confidence > 0.8 ? 'bg-green-500' :
                      confidence > 0.6 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Size</Label>
                {product.recommendedSize && (
                  <Badge variant="outline" className="text-xs">
                    Recommended: {product.recommendedSize}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      selectedSize === size
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quantity */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Quantity</Label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                className="w-full"
                size="lg"
                disabled={!selectedSize && !product.recommendedSize}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>

            {/* Additional Info */}
            <div className="pt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Category:</span>
                <span className="font-medium capitalize">{product.category}</span>
              </div>
              {product.rating && (
                <div className="flex items-center justify-between">
                  <span>Rating:</span>
                  <span className="font-medium">{product.rating}/5</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add missing Label import
import { Label } from './ui/label';

