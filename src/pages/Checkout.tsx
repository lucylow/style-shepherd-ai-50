import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { CartItem } from '@/types/fashion';
import { paymentService } from '@/services/paymentService';
import { mockOrderService } from '@/services/mockOrders';
import { mockCartService } from '@/services/mockCart';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CheckoutProps {
  cartItems: CartItem[];
  onOrderComplete: () => void;
}

const CheckoutForm = ({ cartItems, onOrderComplete }: CheckoutProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
  });

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = 10.0; // Fixed shipping cost
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      toast.error('Please sign in to continue');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const paymentIntent = await paymentService.createPaymentIntent(
        cartItems,
        user.id
      );

      // Confirm payment with PaymentElement
      const { error: stripeError, paymentIntent: confirmedPayment } = await stripe.confirmPayment({
        elements,
        clientSecret: paymentIntent.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
          payment_method_data: {
            billing_details: {
              name: shippingInfo.name,
              address: {
                line1: shippingInfo.address,
                city: shippingInfo.city,
                state: shippingInfo.state,
                postal_code: shippingInfo.zipCode,
                country: shippingInfo.country,
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        toast.error(stripeError.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      if (confirmedPayment?.status === 'succeeded') {
        // Create order
        const order = await mockOrderService.createOrder(
          user.id,
          cartItems,
          {
            address: shippingInfo.address,
            city: shippingInfo.city,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country,
          }
        );

        // Clear cart
        await mockCartService.clearCart(user.id);

        toast.success('Payment successful! Order confirmed.');
        onOrderComplete();
        navigate(`/order-success?orderId=${order.id}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('An error occurred during checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
          <CardDescription>Enter your delivery details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={shippingInfo.name}
              onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={shippingInfo.address}
              onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={shippingInfo.city}
                onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={shippingInfo.state}
                onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={shippingInfo.zipCode}
                onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={shippingInfo.country}
                onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Information</span>
          </CardTitle>
          <CardDescription>Secure payment powered by Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <PaymentElement />
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Your payment information is encrypted and secure</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span>
                  {item.product.name} × {item.quantity}
                </span>
                <span>${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/login');
      return;
    }

    // Load cart items from localStorage or API
    const loadCart = async () => {
      try {
        const cart = await mockCartService.getCart(user.id);
        setCartItems(cart);
        if (cart.length === 0) {
          toast.error('Your cart is empty');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        toast.error('Failed to load cart');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Create payment intent options for Elements
  const [paymentIntentOptions, setPaymentIntentOptions] = useState<{ clientSecret?: string }>({});

  useEffect(() => {
    const setupPayment = async () => {
      if (!user || cartItems.length === 0) return;

      try {
        const paymentIntent = await paymentService.createPaymentIntent(cartItems, user.id);
        setPaymentIntentOptions({ clientSecret: paymentIntent.clientSecret });
      } catch (error) {
        console.error('Error setting up payment:', error);
        toast.error('Failed to initialize payment. Please try again.');
      }
    };

    setupPayment();
  }, [user, cartItems]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/dashboard" className="text-primary hover:underline flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {paymentIntentOptions.clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: paymentIntentOptions.clientSecret,
                  appearance: {
                    theme: 'stripe',
                  },
                }}
              >
                <CheckoutForm cartItems={cartItems} onOrderComplete={() => {}} />
              </Elements>
            ) : (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Setting up payment...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

