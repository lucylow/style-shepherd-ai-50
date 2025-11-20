export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  sizes: string[];
  recommendedSize?: string;
  returnRisk?: number;
  confidence?: number;
  description?: string;
  color?: string;
  rating?: number;
  reviews?: Array<{ rating: number; comment: string; }>;
}

export interface UserProfile {
  userId: string;
  preferences?: {
    favoriteColors?: string[];
    preferredBrands?: string[];
    preferredStyles?: string[];
    preferredSizes?: string[];
  };
  bodyMeasurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
  orderHistory?: Array<{
    id: string;
    date: string;
    items: CartItem[];
  }>;
  returnHistory?: Array<{
    productId: string;
    reason: string;
    date: string;
  }>;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  selectedSize?: string;
}

export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  products?: Product[];
  confidence: number;
}

export interface ConversationTurn {
  type: 'user' | 'assistant';
  content: string;
  data?: any;
}

// Mock data for development
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Classic Cotton Button-Down Shirt',
    brand: 'Urban Essentials',
    price: 89.99,
    originalPrice: 129.99,
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400'],
    category: 'Shirts',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    recommendedSize: 'M',
    returnRisk: 0.15,
    confidence: 0.92,
    description: 'Premium cotton shirt with modern fit'
  },
  {
    id: '2',
    name: 'Tailored Wool Blazer',
    brand: 'Refined Style',
    price: 249.99,
    images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400'],
    category: 'Blazers',
    sizes: ['S', 'M', 'L', 'XL'],
    recommendedSize: 'L',
    returnRisk: 0.45,
    confidence: 0.78,
    description: 'Sophisticated blazer for any occasion'
  },
  {
    id: '3',
    name: 'Slim Fit Dark Denim Jeans',
    brand: 'Denim & Co',
    price: 129.99,
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=400'],
    category: 'Jeans',
    sizes: ['28', '30', '32', '34', '36'],
    recommendedSize: '32',
    returnRisk: 0.25,
    confidence: 0.88,
    description: 'Classic slim fit with stretch comfort'
  },
  {
    id: '4',
    name: 'Knit Cashmere Sweater',
    brand: 'Luxury Knits',
    price: 189.99,
    originalPrice: 249.99,
    images: ['https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=400'],
    category: 'Sweaters',
    sizes: ['S', 'M', 'L', 'XL'],
    recommendedSize: 'M',
    returnRisk: 0.18,
    confidence: 0.95,
    description: 'Luxurious cashmere blend'
  },
  {
    id: '5',
    name: 'Leather Ankle Boots',
    brand: 'Urban Steps',
    price: 159.99,
    images: ['https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400'],
    category: 'Shoes',
    sizes: ['7', '8', '9', '10', '11'],
    recommendedSize: '9',
    returnRisk: 0.52,
    confidence: 0.72,
    description: 'Premium leather with cushioned sole'
  },
  {
    id: '6',
    name: 'Silk Floral Midi Dress',
    brand: 'Elegant Affairs',
    price: 199.99,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400'],
    category: 'Dresses',
    sizes: ['XS', 'S', 'M', 'L'],
    recommendedSize: 'S',
    returnRisk: 0.22,
    confidence: 0.89,
    description: 'Flowing silk with floral print'
  },
  {
    id: '7',
    name: 'Performance Running Shoes',
    brand: 'Active Fit',
    price: 139.99,
    originalPrice: 179.99,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
    category: 'Athletic',
    sizes: ['7', '8', '9', '10', '11', '12'],
    recommendedSize: '10',
    returnRisk: 0.12,
    confidence: 0.96,
    description: 'Lightweight with superior cushioning'
  },
  {
    id: '8',
    name: 'Leather Tote Bag',
    brand: 'Sophisticated Carry',
    price: 279.99,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400'],
    category: 'Accessories',
    sizes: ['One Size'],
    returnRisk: 0.08,
    confidence: 0.98,
    description: 'Spacious genuine leather tote'
  }
];
