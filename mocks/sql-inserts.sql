-- SQL INSERT Examples for Mock Data
-- Use these to populate your database with test data

-- Users
INSERT INTO user_profiles (user_id, email, first_name, last_name, preferences, body_measurements) VALUES
('user_123', 'alice@example.com', 'Alice', 'Smith', 
 '{"favoriteColors": ["blue", "black"], "preferredBrands": ["Nike", "Adidas"]}'::jsonb,
 '{"height": 165, "weight": 60, "chest": 90, "waist": 70, "hips": 95}'::jsonb),
('user_456', 'bob@example.com', 'Bob', 'Johnson', 
 '{"favoriteColors": ["red", "gray"], "preferredStyles": ["casual", "athletic"]}'::jsonb,
 '{"height": 180, "weight": 75, "chest": 100, "waist": 85, "hips": 100}'::jsonb),
('retailer_user', 'merchant@boutique.example', 'Merchant', 'User', 
 '{}'::jsonb, '{}'::jsonb);

-- Orders
INSERT INTO orders (order_id, user_id, items, total_amount, status, shipping_info, predicted_return_rate, payment_intent_id) VALUES
('ord_0001', 'user_123', 
 '[{"sku": "fit-report-pro", "title": "Premium Fit Report", "qty": 1, "unit_price_cents": 1999}]'::jsonb,
 19.99, 'paid',
 '{"name": "Alice Smith", "address": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94102", "country": "US"}'::jsonb,
 0.08, 'pi_1JqYx2ABCxyz'),
('ord_1002', 'retailer_user',
 '[{"sku": "premium-subscription", "title": "Premium Subscription", "qty": 1, "unit_price_cents": 25000}]'::jsonb,
 250.00, 'fulfilled',
 '{"name": "Boutique Test Co", "address": "456 Commerce Ave", "city": "New York", "state": "NY", "zip": "10001", "country": "US"}'::jsonb,
 0.12, 'pi_1XYZ'),
('ord_0003', 'user_456',
 '[{"sku": "basic-report", "title": "Basic Fit Report", "qty": 1, "unit_price_cents": 999}]'::jsonb,
 9.99, 'pending_payment',
 '{"name": "Bob Johnson", "address": "789 Oak St", "city": "Los Angeles", "state": "CA", "zip": "90001", "country": "US"}'::jsonb,
 NULL, NULL);

-- Return Predictions
INSERT INTO return_predictions (order_id, user_id, prediction_score, risk_factors) VALUES
('ord_0001', 'user_123', 0.08,
 '["Good size match", "Style alignment", "Low return history"]'::jsonb),
('ord_1002', 'retailer_user', 0.12,
 '["Size compatibility concerns", "Style preference variance"]'::jsonb);

-- Returns (for testing return history)
INSERT INTO returns (return_id, order_id, product_id, user_id, reason, status) VALUES
('ret_001', 'ord_0001', 'fit-report-pro', 'user_123', 'Size too small', 'completed'),
('ret_002', 'ord_0001', 'fit-report-pro', 'user_123', 'Color mismatch', 'completed');

-- Recommendation Feedback (for ML learning)
INSERT INTO recommendation_feedback (user_id, product_id, feedback_type, recommendation_id) VALUES
('user_123', 'prod_001', 'view', 'rec_001'),
('user_123', 'prod_001', 'click', 'rec_001'),
('user_123', 'prod_002', 'purchase', 'rec_002'),
('user_456', 'prod_003', 'view', 'rec_003'),
('user_456', 'prod_003', 'skip', 'rec_003');

-- Products (if you have a products table)
-- Note: Adjust table name and columns based on your schema
INSERT INTO catalog (id, name, description, price, category, brand, color, style, sizes, stock, image_url, rating, reviews_count) VALUES
('fit-report-pro', 'Premium Fit Report', 'Comprehensive fit analysis with AI-powered recommendations', 19.99, 'service', 'Style Shepherd', NULL, NULL, '[]'::jsonb, 999, NULL, 4.8, 150),
('basic-report', 'Basic Fit Report', 'Basic fit analysis', 9.99, 'service', 'Style Shepherd', NULL, NULL, '[]'::jsonb, 999, NULL, 4.5, 75),
('prod_001', 'Classic White T-Shirt', 'Premium cotton t-shirt', 29.99, 'tops', 'Nike', 'white', 'casual', '["S", "M", "L", "XL"]'::jsonb, 50, 'https://example.com/tshirt.jpg', 4.6, 234),
('prod_002', 'Blue Jeans', 'Classic fit denim jeans', 79.99, 'bottoms', 'Levi''s', 'blue', 'casual', '["28", "30", "32", "34", "36"]'::jsonb, 30, 'https://example.com/jeans.jpg', 4.4, 189),
('prod_003', 'Running Shoes', 'Lightweight running shoes', 129.99, 'shoes', 'Adidas', 'black', 'athletic', '["7", "8", "9", "10", "11"]'::jsonb, 25, 'https://example.com/shoes.jpg', 4.7, 312);

-- Webhook Events (if you have a webhook_events table)
-- Note: Adjust table name and columns based on your schema
-- CREATE TABLE IF NOT EXISTS webhook_events (
--   id VARCHAR(255) PRIMARY KEY,
--   stripe_event_id VARCHAR(255) UNIQUE,
--   type VARCHAR(100) NOT NULL,
--   payload JSONB NOT NULL,
--   processed BOOLEAN DEFAULT false,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

INSERT INTO webhook_events (id, stripe_event_id, type, payload, processed) VALUES
('we_001', 'evt_1JqYx2_EVT', 'payment_intent.succeeded',
 '{"id": "evt_1JqYx2_EVT", "type": "payment_intent.succeeded", "data": {"object": {"id": "pi_1JqYx2ABCxyz", "status": "succeeded"}}}'::jsonb,
 true),
('we_002', 'evt_invoice_paid_01', 'invoice.payment_succeeded',
 '{"id": "evt_invoice_paid_01", "type": "invoice.payment_succeeded", "data": {"object": {"id": "in_001", "amount_paid": 1999}}}'::jsonb,
 true),
('we_003', 'evt_invoice_failed_01', 'invoice.payment_failed',
 '{"id": "evt_invoice_failed_01", "type": "invoice.payment_failed", "data": {"object": {"id": "in_999", "status": "open"}}}'::jsonb,
 false);

