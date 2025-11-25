import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

export interface FilterOptions {
  categories: string[];
  brands: string[];
  sizes: string[];
  minPrice: number;
  maxPrice: number;
  sortBy: 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'return-risk';
}

interface ProductFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableCategories: string[];
  availableBrands: string[];
  availableSizes: string[];
  priceRange: [number, number];
}

export const ProductFilters = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  availableCategories,
  availableBrands,
  availableSizes,
  priceRange,
}: ProductFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    brands: true,
    sizes: true,
    price: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryToggle = (category: string) => {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleBrandToggle = (brand: string) => {
    setLocalFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand],
    }));
  };

  const handleSizeToggle = (size: string) => {
    setLocalFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const handlePriceChange = (values: number[]) => {
    setLocalFilters(prev => ({
      ...prev,
      minPrice: values[0],
      maxPrice: values[1],
    }));
  };

  const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
    setLocalFilters(prev => ({ ...prev, sortBy }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearFilters = () => {
    const cleared: FilterOptions = {
      categories: [],
      brands: [],
      sizes: [],
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      sortBy: 'newest',
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const activeFilterCount = 
    localFilters.categories.length +
    localFilters.brands.length +
    localFilters.sizes.length +
    (localFilters.minPrice > priceRange[0] || localFilters.maxPrice < priceRange[1] ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full sm:w-96 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="mt-2">
                Refine your search results
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Sort By */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Sort By</Label>
              <div className="space-y-2">
                {[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'price-asc', label: 'Price: Low to High' },
                  { value: 'price-desc', label: 'Price: High to Low' },
                  { value: 'rating', label: 'Highest Rated' },
                  { value: 'return-risk', label: 'Lowest Return Risk' },
                ].map(option => (
                  <label
                    key={option.value}
                    className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <input
                      type="radio"
                      name="sortBy"
                      value={option.value}
                      checked={localFilters.sortBy === option.value}
                      onChange={() => handleSortChange(option.value as FilterOptions['sortBy'])}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Price Range */}
            <Collapsible
              open={openSections.price}
              onOpenChange={() => toggleSection('price')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-3">
                <Label className="text-base font-semibold">Price Range</Label>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    openSections.price ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4">
                  <Slider
                    value={[localFilters.minPrice, localFilters.maxPrice]}
                    onValueChange={handlePriceChange}
                    min={priceRange[0]}
                    max={priceRange[1]}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      ${localFilters.minPrice}
                    </span>
                    <span className="text-muted-foreground">to</span>
                    <span className="font-medium">
                      ${localFilters.maxPrice}
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Categories */}
            <Collapsible
              open={openSections.categories}
              onOpenChange={() => toggleSection('categories')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-3">
                <Label className="text-base font-semibold">Categories</Label>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    openSections.categories ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableCategories.map(category => (
                    <label
                      key={category}
                      className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={localFilters.categories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <span className="text-sm capitalize">{category}</span>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Brands */}
            <Collapsible
              open={openSections.brands}
              onOpenChange={() => toggleSection('brands')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-3">
                <Label className="text-base font-semibold">Brands</Label>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    openSections.brands ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableBrands.map(brand => (
                    <label
                      key={brand}
                      className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={localFilters.brands.includes(brand)}
                        onCheckedChange={() => handleBrandToggle(brand)}
                      />
                      <span className="text-sm">{brand}</span>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Sizes */}
            <Collapsible
              open={openSections.sizes}
              onOpenChange={() => toggleSection('sizes')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-3">
                <Label className="text-base font-semibold">Sizes</Label>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    openSections.sizes ? 'rotate-180' : ''
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map(size => (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        localFilters.sizes.includes(size)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t p-6 space-y-3">
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex-1"
            >
              Clear All
            </Button>
            <Button
              onClick={applyFilters}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

