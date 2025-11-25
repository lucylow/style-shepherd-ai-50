/**
 * Example usage of AI mock data service
 * Demonstrates how to use the comprehensive mock data for testing and development
 */

import { aiMockDataService, initializeAIMockData } from './ai-mock-data-service';

// Example 1: Basic usage (synchronous - works in Node.js/server)
function example1_basicUsage() {
  // Get user profile
  const profile = aiMockDataService.getUserProfile('user_00345');
  if (profile) {
    console.log(`User: ${profile.name}`);
    console.log(`Email: ${profile.email}`);
    console.log(`Measurements: ${JSON.stringify(profile.measurements)}`);
    console.log(`Style Preferences: ${JSON.stringify(profile.stylePreferences)}`);
  }

  // Get product information
  const product = aiMockDataService.getProduct('prod-3421');
  if (product) {
    console.log(`Product: ${product.name}`);
    console.log(`Price: $${product.price_usd}`);
    console.log(`Return Rate: ${(product.avgReturnRate * 100).toFixed(1)}%`);
  }

  // Get conversation history
  const conversations = aiMockDataService.getConversationHistory('user_00345');
  conversations.forEach(conv => {
    console.log(`\nSession: ${conv.sessionId}`);
    conv.messages.forEach(msg => {
      console.log(`  [${msg.role}]: ${msg.text}`);
    });
  });
}

// Example 2: Get size recommendation
function example2_getSizeRecommendation() {
  const userId = 'user_00345';
  const productId = 'prod-3421';

  const recommendation = aiMockDataService.findRecommendedSize(userId, productId);
  
  if (recommendation) {
    console.log(`\nSize Recommendation for Product ${productId}:`);
    console.log(`  Size: ${recommendation.size}`);
    console.log(`  Confidence: ${(recommendation.confidenceScore * 100).toFixed(1)}%`);
    console.log(`  Return Risk: ${(recommendation.returnRisk * 100).toFixed(1)}%`);
    console.log(`  Reasoning: ${recommendation.reasoning}`);
  }
}

// Example 3: Calculate size match score
function example3_calculateSizeMatch() {
  const userId = 'user_00345';
  const productId = 'prod-3421';
  const size = 'M';

  const matchScore = aiMockDataService.calculateSizeMatch(userId, productId, size);
  console.log(`\nSize Match Score: ${(matchScore * 100).toFixed(1)}%`);
  console.log(`This score is based on how well the size chart measurements align with user measurements.`);
}

// Example 4: Get products matching user preferences
function example4_matchingProducts() {
  const userId = 'user_00345';
  const matchingProducts = aiMockDataService.getProductsMatchingPreferences(userId);

  console.log(`\nProducts matching ${userId}'s preferences:`);
  matchingProducts.forEach(product => {
    console.log(`  - ${product.name} (${product.brand}) - $${product.price_usd}`);
  });
}

// Example 5: Get return risk analysis for an order
function example5_returnRiskAnalysis() {
  const orderId = 'order_79045';
  const analysis = aiMockDataService.getReturnRiskAnalysis(orderId);

  if (analysis) {
    console.log(`\nReturn Risk Analysis for Order ${orderId}:`);
    console.log(`  Overall Risk Score: ${(analysis.returnRiskAnalysis.overallRiskScore * 100).toFixed(1)}%`);
    
    if (analysis.returnRiskAnalysis.highRiskItems.length > 0) {
      console.log(`\n  High Risk Items:`);
      analysis.returnRiskAnalysis.highRiskItems.forEach(item => {
        console.log(`    - Product ${item.productId} (Size ${item.size})`);
        console.log(`      Risk Factors: ${item.riskFactors.join(', ')}`);
        if (item.mitigationAdvice) {
          console.log(`      Advice: ${item.mitigationAdvice}`);
        }
      });
    }
  }
}

// Example 6: Build a complete recommendation response
function example6_buildRecommendationResponse() {
  const userId = 'user_00345';
  const recommendations = aiMockDataService.getLatestRecommendations(userId);

  if (recommendations) {
    console.log(`\nLatest Recommendations for ${userId}:`);
    recommendations.recommendations.forEach(rec => {
      const product = aiMockDataService.getProduct(rec.productId);
      if (product) {
        console.log(`\n  Product: ${product.name}`);
        console.log(`    Brand: ${product.brand}`);
        console.log(`    Price: $${product.price_usd}`);
        console.log(`    Recommended Size: ${rec.recommendedSize}`);
        console.log(`    Confidence: ${(rec.confidenceScore * 100).toFixed(1)}%`);
        console.log(`    Return Risk: ${(rec.returnRisk * 100).toFixed(1)}%`);
        console.log(`    Reasoning: ${rec.reasoning}`);
      }
    });
  }
}

// Example 7: Async initialization (for browser/async environments)
async function example7_asyncUsage() {
  // Ensure data is loaded (useful in browser environments)
  await initializeAIMockData();

  // Now you can use the service
  const profile = aiMockDataService.getUserProfile('user_00345');
  console.log('Profile loaded:', profile?.name);
}

// Example 8: Get user's size history for a specific brand
function example8_brandSizeHistory() {
  const userId = 'user_00345';
  const brand = 'BrandA';

  const sizeHistory = aiMockDataService.getSizeHistoryByBrand(userId, brand);
  
  console.log(`\nSize History for ${userId} with ${brand}:`);
  sizeHistory.forEach(entry => {
    console.log(`  Size ${entry.size}: ${entry.fit}${entry.date ? ` (${entry.date})` : ''}`);
  });
}

// Example 9: Get user's return history
function example9_returnHistory() {
  const userId = 'user_00345';
  const returnHistory = aiMockDataService.getUserReturnHistory(userId);

  console.log(`\nReturn History for ${userId}:`);
  returnHistory.forEach(returnItem => {
    console.log(`  Product ${returnItem.productId}: ${returnItem.reason} (${returnItem.date})`);
  });
}

// Example 10: Get orders with risk scores
function example10_ordersWithRisk() {
  const userId = 'user_00345';
  const orders = aiMockDataService.getOrdersByUser(userId);

  console.log(`\nOrders for ${userId}:`);
  orders.forEach(order => {
    console.log(`\n  Order ${order.orderId}:`);
    console.log(`    Status: ${order.status}`);
    console.log(`    Total: $${order.totalAmount}`);
    console.log(`    Items:`);
    order.items.forEach(item => {
      const product = aiMockDataService.getProduct(item.productId);
      console.log(`      - ${product?.name || item.productId} (Size ${item.size})`);
      console.log(`        Price: $${item.price}, Risk: ${(item.returnRiskScore * 100).toFixed(1)}%`);
    });
  });
}

// Run examples
if (require.main === module) {
  console.log('=== AI Mock Data Service Examples ===\n');

  try {
    example1_basicUsage();
    example2_getSizeRecommendation();
    example3_calculateSizeMatch();
    example4_matchingProducts();
    example5_returnRiskAnalysis();
    example6_buildRecommendationResponse();
    example8_brandSizeHistory();
    example9_returnHistory();
    example10_ordersWithRisk();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

export {
  example1_basicUsage,
  example2_getSizeRecommendation,
  example3_calculateSizeMatch,
  example4_matchingProducts,
  example5_returnRiskAnalysis,
  example6_buildRecommendationResponse,
  example7_asyncUsage,
  example8_brandSizeHistory,
  example9_returnHistory,
  example10_ordersWithRisk,
};

