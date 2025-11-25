import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd verify the session with your backend
    if (sessionId) {
      setIsLoading(false);
    } else {
      // Redirect if no session ID
      navigate('/subscription-checkout');
    }
  }, [sessionId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Style Concierge!</CardTitle>
          <CardDescription className="text-base mt-2">
            Your subscription has been activated successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold">What's Next?</span>
            </div>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Access unlimited voice styling sessions</li>
              <li>• Get premium fit reports</li>
              <li>• Receive personalized recommendations</li>
              <li>• Enjoy priority customer support</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link to="/dashboard">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/voice-shop">Try Voice Shopping</Link>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            You can manage your subscription anytime from your account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

