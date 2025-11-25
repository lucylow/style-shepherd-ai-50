/**
 * SmartBuckets Service - Product Images and Visual Search
 * 
 * Handles product images, visual search, and media storage
 * using Raindrop SmartBuckets.
 */

import { productBuckets } from '@/integrations/raindrop/config';

export interface ProductImageMetadata {
  productId: string;
  color?: string;
  pattern?: string;
  category?: string;
  style?: string;
  tags?: string[];
}

export interface SimilarProduct {
  productId: string;
  similarity: number;
  url: string;
  metadata?: ProductImageMetadata;
}

class ProductBucketsService {
  /**
   * Upload product image
   */
  async uploadProductImage(
    productId: string,
    imageFile: Blob | File | ArrayBuffer,
    metadata: ProductImageMetadata
  ): Promise<string> {
    const path = `products/${productId}/${metadata.color || 'default'}-${Date.now()}.jpg`;
    const blob = imageFile instanceof Blob ? imageFile : new Blob([imageFile]);
    
    const url = await productBuckets.upload(path, blob, {
      ...metadata,
      uploadedAt: new Date().toISOString(),
    });
    
    return url;
  }

  /**
   * Find similar products using visual search
   */
  async findSimilarProducts(
    imageUrl: string,
    options?: {
      limit?: number;
      category?: string;
      color?: string;
    }
  ): Promise<SimilarProduct[]> {
    try {
      const results = await productBuckets.findSimilar(imageUrl, {
        limit: options?.limit || 5,
        category: options?.category,
      });
      
      return results.map((result: any) => ({
        productId: result.productId || result.id,
        similarity: result.similarity || result.score || 0,
        url: result.url || result.imageUrl,
        metadata: result.metadata,
      }));
    } catch (error) {
      console.error('Failed to find similar products:', error);
      return [];
    }
  }

  /**
   * Get product image URL
   */
  async getProductImageUrl(productId: string, variant?: string): Promise<string> {
    const path = variant 
      ? `products/${productId}/${variant}.jpg`
      : `products/${productId}/default.jpg`;
    return productBuckets.getUrl(path);
  }

  /**
   * Upload multiple product images
   */
  async uploadProductImages(
    productId: string,
    images: Array<{ file: Blob | File | ArrayBuffer; metadata: ProductImageMetadata }>
  ): Promise<string[]> {
    const uploads = images.map(({ file, metadata }) =>
      this.uploadProductImage(productId, file, { ...metadata, productId })
    );
    return Promise.all(uploads);
  }

  /**
   * Delete product image
   */
  async deleteProductImage(productId: string, imagePath: string): Promise<void> {
    await productBuckets.delete(`products/${productId}/${imagePath}`);
  }
}

export const productBucketsService = new ProductBucketsService();

