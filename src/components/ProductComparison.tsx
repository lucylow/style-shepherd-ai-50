import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Product } from '@/types/fashion';

interface ProductComparisonProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (productId: string) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductComparison = ({
  products,
  isOpen,
  onClose,
  onRemove,
  onAddToCart,
}: ProductComparisonProps) => {
  if (products.length === 0) return null;

  const getReturnRiskLabel = (product: Product) => {
    const risk = product.returnRisk || (product.returnRiskScore ? product.returnRiskScore / 100 : 0);
    if (risk < 0.2) return { label: 'Low', color: 'bg-green-500' };
    if (risk < 0.5) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'High', color: 'bg-red-500' };
  };

  const getConfidenceLabel = (product: Product) => {
    const conf = product.confidence || (product.sizeConfidence ? product.sizeConfidence / 100 : 0);
    if (conf > 0.8) return { label: 'Excellent', color: 'text-green-600' };
    if (conf > 0.6) return { label: 'Good', color: 'text-yellow-600' };
    return { label: 'Fair', color: 'text-red-600' };
  };

  const comparisonFields = [
    { key: 'price', label: 'Price', format: (p: Product) => `$${p.price}` },
    { key: 'brand', label: 'Brand', format: (p: Product) => p.brand },
    { key: 'category', label: 'Category', format: (p: Product) => p.category },
    { key: 'returnRisk', label: 'Return Risk', format: (p: Product) => {
      const risk = getReturnRiskLabel(p);
      return (
        <Badge variant="secondary" className={risk.color + ' text-white'}>
          {risk.label}
        </Badge>
      );
    }},
    { key: 'confidence', label: 'Fit Confidence', format: (p: Product) => {
      const conf = getConfidenceLabel(p);
      return <span className={conf.color}>{conf.label}</span>;
    }},
    { key: 'sizes', label: 'Available Sizes', format: (p: Product) => p.sizes.join(', ') },
    { key: 'rating', label: 'Rating', format: (p: Product) => p.rating ? `${p.rating}/5` : 'N/A' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[90vw] lg:w-[80vw] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Compare Products</SheetTitle>
              <SheetDescription>
                Side-by-side comparison of {products.length} product{products.length > 1 ? 's' : ''}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold sticky left-0 bg-background z-10 min-w-[200px]">
                      Features
                    </th>
                    {products.map((product) => (
                      <th key={product.id} className="text-center p-4 min-w-[250px] relative">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="relative w-32 h-40 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => onRemove(product.id)}
                              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-center">
                            <h3 className="font-semibold text-sm">{product.name}</h3>
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFields.map((field, index) => (
                    <tr key={field.key} className="border-b">
                      <td className="p-4 font-medium sticky left-0 bg-background z-10">
                        {field.label}
                      </td>
                      {products.map((product) => (
                        <td key={product.id} className="p-4 text-center">
                          {field.format(product)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className="p-4 font-medium sticky left-0 bg-background z-10">
                      Actions
                    </td>
                    {products.map((product) => (
                      <td key={product.id} className="p-4 text-center">
                        <Button
                          onClick={() => onAddToCart(product)}
                          size="sm"
                          className="w-full"
                        >
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {products.length} of 4 products compared
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={onClose}>
                Add All to Cart
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

