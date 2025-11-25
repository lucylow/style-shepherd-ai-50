# 🎯 Style Shepherd - Mock Data

This directory contains comprehensive mock data for the Style Shepherd demo application.

## 📁 File Structure

- **`users.json`** - User profiles with preferences, measurements, size history, and return history
- **`products.json`** - Product catalog with detailed sizing, return analytics, and inventory
- **`conversations.json`** - Voice conversation examples with user-assistant interactions
- **`predictions.json`** - AI return predictions and user analytics
- **`orders.json`** - Order history and payment intents
- **`business-metrics.json`** - Business intelligence dashboard data
- **`demo-scenarios.json`** - Predefined demo flows for presentations

## 🚀 Usage

### Import in TypeScript/JavaScript

```typescript
import users from './mocks/users.json';
import products from './mocks/products.json';
import conversations from './mocks/conversations.json';
// ... etc
```

### Use with Mock Service

The mock data can be integrated with the existing mock service infrastructure in this directory.

## 📊 Data Overview

### Users
- **2 sample users** with complete profiles
- Includes style preferences, body measurements, size history
- Return history and conversation logs

### Products
- **3 sample products** across different categories
- Detailed size charts and return analytics
- Inventory levels and sustainability metrics

### Conversations
- Voice interaction examples
- Size recommendations with confidence scores
- Product suggestions with risk assessments

### Predictions
- Return risk predictions for specific user-product-size combinations
- User analytics and style evolution tracking

### Orders
- Sample orders with return prediction accuracy
- Payment intents and sustainability impact tracking

### Business Metrics
- Overall platform performance
- Returns reduction statistics
- Environmental impact metrics
- AI model performance

### Demo Scenarios
- Predefined flows for demo presentations
- Step-by-step interaction sequences

## 🎬 Demo Use Cases

1. **Voice Shopping Experience** - Show how users interact via voice to find outfits
2. **Returns Prevention** - Demonstrate high-risk purchase intervention
3. **Size Recommendations** - Display AI-powered size suggestions
4. **Business Impact** - Showcase ROI and sustainability metrics

## 📝 Notes

- All data is fictional and designed for demonstration purposes
- Timestamps are in ISO 8601 format
- Prices are in USD
- Measurements are in centimeters
- Risk scores are probabilities (0.0 to 1.0)
