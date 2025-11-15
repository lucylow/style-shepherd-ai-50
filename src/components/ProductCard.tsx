import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, AlertTriangle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Product } from '@/types/fashion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-card rounded-xl shadow-sm border border-border overflow-hidden group"
    >
      {/* Product Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <img
          src={product.images[0]}
          alt={product.name}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Return Risk Indicator */}
        {product.returnRisk && product.returnRisk > 0.3 && (
          <div className="absolute top-2 left-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Return Risk
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This item has a {Math.round((product.returnRisk || 0) * 100)}% return probability</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Sale Badge */}
        {product.originalPrice && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-red-500 text-white">
              Sale
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="p-2 bg-background rounded-full shadow-md hover:shadow-lg transition-shadow mb-2"
          >
            <Heart
              className={`w-4 h-4 ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
              }`}
            />
          </button>
        </div>

        {/* Quick Actions Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={() => onAddToCart(product)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
          {product.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
          {product.brand}
        </p>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-foreground">
              ${product.price}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                ${product.originalPrice}
              </span>
            )}
          </div>
          
          {/* Size Recommendation */}
          {product.recommendedSize && (
            <Badge variant="outline" className="text-xs">
              Size: {product.recommendedSize}
            </Badge>
          )}
        </div>

        {/* Confidence Score */}
        {product.confidence && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <div className="flex items-center space-x-1">
                <span>Fit Confidence</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI-predicted fit accuracy based on your profile</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-medium">{Math.round(product.confidence * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${product.confidence * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-1.5 rounded-full ${
                  product.confidence > 0.8 ? 'bg-green-500' :
                  product.confidence > 0.6 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
