import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Clock, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Product } from '@/types/fashion';

interface SearchSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (query: string) => void;
  products: Product[];
  recentSearches?: string[];
  popularSearches?: string[];
}

export const SearchSuggestions = ({
  value,
  onChange,
  onSelect,
  products,
  recentSearches = [],
  popularSearches = [],
}: SearchSuggestionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredSearches, setFilteredSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim()) {
      // Filter products
      const productMatches = products
        .filter(p =>
          p.name.toLowerCase().includes(value.toLowerCase()) ||
          p.brand.toLowerCase().includes(value.toLowerCase()) ||
          p.category.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5);

      // Filter recent searches
      const searchMatches = recentSearches
        .filter(s => s.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 3);

      setFilteredProducts(productMatches);
      setFilteredSearches(searchMatches);
      setIsOpen(true);
    } else {
      setFilteredProducts([]);
      setFilteredSearches([]);
      setIsOpen(false);
    }
  }, [value, products, recentSearches]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (query: string) => {
    onSelect(query);
    setIsOpen(false);
  };

  const showSuggestions = isOpen && (filteredProducts.length > 0 || filteredSearches.length > 0 || !value.trim());

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for outfits, brands, or styles..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* Recent Searches */}
            {!value.trim() && recentSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mb-2">
                  <Clock className="w-3 h-3" />
                  <span>Recent Searches</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelect(search)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {!value.trim() && popularSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mb-2">
                  <TrendingUp className="w-3 h-3" />
                  <span>Popular Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.slice(0, 8).map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelect(search)}
                      className="px-3 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {value.trim() && filteredSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mb-2">
                  <Clock className="w-3 h-3" />
                  <span>Recent</span>
                </div>
                <div className="space-y-1">
                  {filteredSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelect(search)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Suggestions */}
            {value.trim() && filteredProducts.length > 0 && (
              <div className="p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                  Products
                </div>
                <div className="space-y-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelect(product.name)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center space-x-3"
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.brand}</div>
                      </div>
                      <div className="text-sm font-semibold">${product.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {value.trim() && filteredProducts.length === 0 && filteredSearches.length === 0 && (
              <div className="p-6 text-center text-muted-foreground">
                <p className="text-sm">No results found for "{value}"</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

