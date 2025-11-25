import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api-config';
import { toast } from 'sonner';
import { Check, CreditCard, Sparkles } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'style-concierge-monthly',
    name: 'Style Concierge',
    priceId: process.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_monthly', // Set in Stripe dashboard
    price: 19.99,
    interval: 'month',
    features: [
      'Unlimited voice styling sessions',
      'Premium fit reports',
      'Personalized style recommendations',
      'Priority customer support',
      'Early access to new features',
    ],
    popular: true,
  },
  {
    id: 'style-concierge-yearly',
    name: 'Style Concierge (Yearly)',
    priceId: process.env.VITE_STRIPE_PRICE_ID_YEARLY || 'price_yearly',
    price: 199.99,
    interval: 'year',
    features: [
      'Everything in Monthly',
      'Save 17% with annual billing',
      'Exclusive yearly subscriber perks',
      'Annual style consultation',
    ],
  },
];

export default function SubscriptionCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const planId = searchParams.get('plan');

  useEffect(() => {
    if (planId) {
      const plan = PLANS.find((p) => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
      }
    } else {
      setSelectedPlan(PLANS[0]); // Default to first plan
    }
  }, [planId]);

  const handleSubscribe = async () => {
    if (!user || !selectedPlan) {
      toast.error('Please sign in to subscribe');
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/payments/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          mode: 'subscription',
          priceId: selectedPlan.priceId,
          successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/subscription-checkout`,
          customerEmail: user.email,
          metadata: {
            planId: selectedPlan.id,
            planName: selectedPlan.name,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start subscription. Please try again.');
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to subscribe to Style Concierge</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Unlock premium styling features with Style Concierge
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? 'border-primary border-2' : ''} ${
                selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
              } cursor-pointer transition-all hover:shadow-lg`}
              onClick={() => setSelectedPlan(plan)}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  <Sparkles className="w-5 h-5 text-primary" />
                </CardTitle>
                <CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.interval}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubscribe}
            disabled={!selectedPlan || isLoading}
            className="min-w-[200px]"
          >
            {isLoading ? (
              'Processing...'
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Subscribe to {selectedPlan?.name}
              </>
            )}
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Secure payment powered by Stripe</p>
          <p className="mt-2">
            Cancel anytime. No hidden fees. 30-day money-back guarantee.
          </p>
        </div>
      </div>
    </div>
  );
}

