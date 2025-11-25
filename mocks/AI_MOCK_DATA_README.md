# AI Mock Data for Style Shepherd

This directory contains comprehensive mock data designed for AI features in a retail voice shopping assistant like Style Shepherd. The data covers key entity types such as user profiles, products, conversations, recommendations, return risk, and orders.

## Files

- **`ai-mock-data.json`** - Main JSON file containing all mock data
- **`ai-mock-data-types.ts`** - TypeScript type definitions for the mock data
- **`ai-mock-data-service.ts`** - Service class for accessing and querying mock data
- **`example-usage-ai-mock-data.ts`** - Example usage patterns

## Data Structure

### 1. User Profiles (`userProfiles`)

Complete user profiles with measurements, style preferences, size history, and return history.

```typescript
{
  userId: "user_00345",
  name: "Alice Baker",
  email: "alice.baker@example.com",
  measurements: {
    height_cm: 165,
    chest_cm: 90,
    waist_cm: 70,
    hips_cm: 95,
    shoe_size_us: 7
  },
  stylePreferences: {
    colors: ["navy", "cream", "blush"],
    patterns: ["floral", "plaid"],
    occasion: ["casual", "office"],
    brands: ["BrandA", "BrandC"]
  },
  sizeHistory: [
    { brand: "BrandA", size: "M", fit: "perfect" }
  ],
  returnHistory: [
    { productId: "prod-3421", reason: "Too Large", date: "2024-09-15T10:25:00Z" }
  ],
  voicePreference: "rachel"
}
```

### 2. Product Data (`products`)

Detailed product information with size charts, return rates, and reviews.

```typescript
{
  productId: "prod-3421",
  name: "Floral Midi Dress",
  brand: "BrandA",
  price_usd: 89.99,
  category: "Dresses",
  attributes: {
    colors: ["navy", "red"],
    patterns: ["floral"],
    sizes: ["XS", "S", "M", "L"],
    material: "cotton"
  },
  images: ["https://cdn.example.com/prod-3421/front.jpg"],
  avgReturnRate: 0.22,
  reviews: {
    count: 142,
    averageRating: 4.3
  },
  sizeChart: {
    "M": { chest_cm: 90, waist_cm: 70, hips_cm: 96 }
  }
}
```

### 3. Conversation History (`conversations`)

Voice interaction examples showing user-agent conversations.

```typescript
{
  userId: "user_00345",
  sessionId: "sess_001_2025_11_01",
  messages: [
    {
      role: "user",
      text: "I'm looking for a navy floral dress for office wear.",
      timestamp: "2025-11-01T12:00:00Z"
    },
    {
      role: "agent",
      text: "I found several navy floral dresses that match your style...",
      timestamp: "2025-11-01T12:00:02Z"
    }
  ]
}
```

### 4. AI Recommendations (`recommendations`)

AI recommendation outputs with confidence scores and return risk analysis.

```typescript
{
  userId: "user_00345",
  timestamp: "2025-11-01T12:00:06Z",
  recommendations: [
    {
      productId: "prod-3421",
      recommendedSize: "M",
      confidenceScore: 0.85,
      returnRisk: 0.18,
      reasoning: "Based on your measurement history and past returns, size M matches your waist and chest size best."
    }
  ]
}
```

### 5. Orders (`orders`)

Order examples with return risk scores for each item.

```typescript
{
  orderId: "order_79045",
  userId: "user_00345",
  items: [
    {
      productId: "prod-3421",
      size: "M",
      price: 89.99,
      quantity: 1,
      returnRiskScore: 0.18
    }
  ],
  totalAmount: 209.99,
  status: "Pending",
  placedAt: "2025-11-10T15:25:00Z"
}
```

### 6. Return Risk Analyses (`returnRiskAnalyses`)

Detailed return risk analysis with risk factors and mitigation advice.

```typescript
{
  orderId: "order_79045",
  returnRiskAnalysis: {
    overallRiskScore: 0.21,
    highRiskItems: [
      {
        productId: "prod-4512",
        size: "L",
        riskFactors: [
          "User past returns indicate size-related fit issues",
          "High average return rate for this product model"
        ],
        mitigationAdvice: "Consider trying size XL or consult the detailed size chart."
      }
    ],
    lowRiskItems: [...]
  }
}
```

## Usage

### Import the Service

```typescript
import { aiMockDataService } from './mocks/ai-mock-data-service';
```

### Server-Side Usage (Node.js/TypeScript)

For server-side code, ensure `resolveJsonModule: true` in your `tsconfig.json`:

```typescript
// Direct synchronous access
const profile = aiMockDataService.getUserProfile('user_00345');
const product = aiMockDataService.getProduct('prod-3421');
```

### Browser/Frontend Usage

For browser environments, initialize asynchronously first:

```typescript
import { aiMockDataService, initializeAIMockData } from './mocks/ai-mock-data-service';

// Initialize before using
await initializeAIMockData();

// Now you can use the service
const profile = aiMockDataService.getUserProfile('user_00345');
```

### Get User Profile

```typescript
const profile = aiMockDataService.getUserProfile('user_00345');
console.log(profile?.name); // "Alice Baker"
```

### Get Product Information

```typescript
const product = aiMockDataService.getProduct('prod-3421');
console.log(product?.name); // "Floral Midi Dress"
```

### Find Recommended Size

```typescript
const recommendation = aiMockDataService.findRecommendedSize('user_00345', 'prod-3421');
console.log(recommendation?.size); // "M"
console.log(recommendation?.confidenceScore); // 0.85
console.log(recommendation?.returnRisk); // 0.18
```

### Get Conversation History

```typescript
const conversations = aiMockDataService.getConversationHistory('user_00345');
conversations.forEach(conv => {
  console.log(`Session: ${conv.sessionId}`);
  conv.messages.forEach(msg => {
    console.log(`${msg.role}: ${msg.text}`);
  });
});
```

### Get Products Matching User Preferences

```typescript
const matchingProducts = aiMockDataService.getProductsMatchingPreferences('user_00345');
// Returns products that match user's color, pattern, brand, and occasion preferences
```

### Calculate Size Match Score

```typescript
const matchScore = aiMockDataService.calculateSizeMatch('user_00345', 'prod-3421', 'M');
// Returns a score between 0 and 1 based on measurement alignment
```

### Get Return Risk Analysis

```typescript
const riskAnalysis = aiMockDataService.getReturnRiskAnalysis('order_79045');
console.log(riskAnalysis?.returnRiskAnalysis.overallRiskScore); // 0.21
console.log(riskAnalysis?.returnRiskAnalysis.highRiskItems);
```

## Integration with Existing Services

This mock data can be used to:

1. **Seed development environment** - Populate databases or in-memory stores
2. **Create API fixtures** - Use in API route handlers for testing
3. **Test UI flows** - Render product cards, recommendation components, etc.
4. **Train/simulate AI behavior** - Provide context for LLM prompts
5. **Validate recommendation logic** - Test size matching, risk calculations

## Examples

See `example-usage-ai-mock-data.ts` for comprehensive usage examples including:

- Basic data access
- Size recommendations
- Size match calculations
- Preference matching
- Return risk analysis
- Order processing
- Conversation history

## Data Relationships

- **User Profiles** → **Conversations** (by `userId`)
- **User Profiles** → **Recommendations** (by `userId`)
- **User Profiles** → **Orders** (by `userId`)
- **Products** → **Orders** (by `productId` in order items)
- **Orders** → **Return Risk Analyses** (by `orderId`)
- **Products** → **Size Charts** (embedded in product)
- **User Profiles** → **Size History** (embedded in profile)

## Extending the Data

To add more mock data:

1. Edit `ai-mock-data.json` following the existing structure
2. TypeScript types are automatically validated (ensure JSON matches `AIMockData` interface)
3. The service class provides methods to access new data patterns

## References

This mock data structure is inspired by real-world AI agent examples in retail:

- [AI Agent Examples - Real-World Use Cases](https://www.leanware.co/insights/ai-agent-examples-real-world-use-cases-and-types)
- [AI Agents in Retail - Top Use Cases](https://blog.workday.com/en-ca/ai-agents-in-retail-top-use-cases-and-examples.html)
- [Agentic AI Examples](https://www.warmly.ai/p/blog/agentic-ai-examples)

## Notes

- All timestamps use ISO 8601 format (UTC)
- Measurement units are in centimeters (cm) for consistency
- Return risk scores are between 0.0 and 1.0 (0% to 100%)
- Confidence scores are between 0.0 and 1.0 (0% to 100%)
- Size history fit values: `"perfect"`, `"tight"`, `"loose"`, `"too_small"`, `"too_large"`
