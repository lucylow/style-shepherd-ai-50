import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, AlertTriangle, Info, Leaf, ZoomIn, Eye } from 'lucide-react';
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
  onQuickView?: (product: Product) => void;
  onImageZoom?: (product: Product, imageIndex: number) => void;
  onToggleWishlist?: (product: Product) => void;
  isInWishlist?: boolean;
  onCompare?: (product: Product) => void;
}

export const ProductCard = memo(({
  product,
  onAddToCart,
  onQuickView,
  onImageZoom,
  onToggleWishlist,
  isInWishlist = false,
  onCompare,
}: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get return risk score (prefer new field, fallback to legacy)
  const returnRiskScore = product.returnRiskScore ?? (product.returnRisk ? Math.round(product.returnRisk * 100) : undefined);
  const returnRiskLabel = product.returnRiskLabel ?? 
    (returnRiskScore !== undefined 
      ? (returnRiskScore >= 67 ? 'high' : returnRiskScore >= 34 ? 'medium' : 'low')
      : 'unknown');
  
  // Get size confidence (prefer new field, fallback to legacy)
  const sizeConfidence = product.sizeConfidence ?? (product.confidence ? Math.round(product.confidence * 100) : undefined);

  // Color mapping for return risk
  const getReturnRiskColor = (score?: number, label?: string) => {
    if (score !== undefined) {
      if (score >= 67) return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', pill: 'bg-red-500' };
      if (score >= 34) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', pill: 'bg-amber-500' };
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', pill: 'bg-green-500' };
    }
    if (label === 'high') return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', pill: 'bg-red-500' };
    if (label === 'medium') return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', pill: 'bg-amber-500' };
    if (label === 'low') return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', pill: 'bg-green-500' };
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', pill: 'bg-gray-500' };
  };

  const riskColors = getReturnRiskColor(returnRiskScore, returnRiskLabel);

  // Circular progress component for size confidence
  const CircularProgress = ({ value, size = 32 }: { value: number; size?: number }) => {
    const radius = (size - 4) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    
    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-800 ${
            value >= 80 ? 'text-green-500' :
            value >= 60 ? 'text-yellow-500' :
            'text-red-500'
          }`}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[8px] font-semibold fill-foreground"
        >
          {value}%
        </text>
      </svg>
    );
  };

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
        
        {/* Return Risk Indicator - Updated to use new metrics */}
        {returnRiskScore !== undefined && returnRiskScore > 0 && (
          <div className="absolute top-2 left-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant="secondary" 
                    className={`${riskColors.bg} ${riskColors.text} ${riskColors.border} border`}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {returnRiskScore}% Risk
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Return risk: {returnRiskScore}% ({returnRiskLabel})
                    {returnRiskScore >= 67 && ' - High return probability'}
                    {returnRiskScore >= 34 && returnRiskScore < 67 && ' - Medium return probability'}
                    {returnRiskScore < 34 && ' - Low return probability'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Sustainability Badge */}
        {product.sustainability && (
          <div className="absolute top-2 left-2" style={{ marginTop: returnRiskScore !== undefined ? '32px' : '0' }}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                    <Leaf className="w-3 h-3 mr-1" />
                    {product.sustainability}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Eco-friendly product</p>
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
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-2 z-10">
          {onToggleWishlist && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(product);
                    }}
                    className="p-2 bg-background rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
                  >
                    <Heart
                      className={`w-4 h-4 transition-all ${
                        isInWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onImageZoom && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageZoom(product, 0);
                    }}
                    className="p-2 bg-background rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
                  >
                    <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Quick View Button */}
        {onQuickView && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickView(product);
                    }}
                    className="p-2 bg-background rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quick view</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
          {onQuickView && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              variant="secondary"
              className="w-full"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              Quick View
            </Button>
          )}
          {onCompare && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onCompare(product);
              }}
              variant="outline"
              className="w-full bg-background/90 hover:bg-background"
              size="sm"
            >
              Compare
            </Button>
          )}
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
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          {/* Size Confidence Circular Indicator */}
          {sizeConfidence !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center">
                    <CircularProgress value={sizeConfidence} size={32} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Size confidence: {sizeConfidence}% - AI-predicted fit accuracy</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Size Recommendation (fallback if no confidence indicator) */}
          {!sizeConfidence && product.recommendedSize && (
            <Badge variant="outline" className="text-xs">
              Size: {product.recommendedSize}
            </Badge>
          )}
        </div>

        {/* Return Risk Score Bar (if not shown as badge) */}
        {returnRiskScore !== undefined && returnRiskScore > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <div className="flex items-center space-x-1">
                <span>Return Risk</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Predicted return probability based on product and user data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${riskColors.text} ${riskColors.border}`}
                >
                  {returnRiskLabel}
                </Badge>
                <span className="font-medium">{returnRiskScore}%</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${returnRiskScore}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-1.5 rounded-full ${riskColors.pill}`}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';
