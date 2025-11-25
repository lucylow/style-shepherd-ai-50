import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import { WORKOS_CLIENT_ID, WORKOS_API_HOSTNAME } from "@/lib/workos";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import VoiceShop from "./pages/VoiceShop";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import SubscriptionCheckout from "./pages/SubscriptionCheckout";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import NotFound from "./pages/NotFound";
import CompetitiveAnalysis from "./pages/CompetitiveAnalysis";
import MarketOpportunity from "./pages/MarketOpportunity";
import ProblemValidation from "./pages/ProblemValidation";
import InnovationScoring from "./pages/InnovationScoring";
import ImpactMeasurement from "./pages/ImpactMeasurement";
import CompetitiveMoats from "./pages/CompetitiveMoats";
import IdeaQualityAssessment from "./pages/IdeaQualityAssessment";
import IdeaQualityIndex from "./pages/IdeaQualityIndex";
import JudgingCriteriaAssessment from "./pages/JudgingCriteriaAssessment";
import JudgeDemoPage from "./pages/JudgeDemo";
import PilotKPIsPage from "./pages/PilotKPIs";
import UnitEconomicsPage from "./pages/UnitEconomics";
import SponsorMetricsPage from "./pages/SponsorMetrics";
import LovableDashboard from "./pages/LovableDashboard";
import LovableDeployment from "./pages/LovableDeployment";
import LovableMonitoring from "./pages/LovableMonitoring";
import LovableSettings from "./pages/LovableSettings";
import LovableAnalytics from "./pages/LovableAnalytics";
import LovableEnvironment from "./pages/LovableEnvironment";
import LovableLogs from "./pages/LovableLogs";
import LovableHealth from "./pages/LovableHealth";
import PageTransition from "./components/PageTransition";
import RouteLoadingIndicator from "./components/RouteLoadingIndicator";

// Create QueryClient outside component to prevent recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Skip to content link component
const SkipToContent = () => (
  <a
    href="#main"
    className="skip-to-content focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-lg"
  >
    Skip to main content
  </a>
);

// App Routes with transitions
const AppRoutes = () => {
  const location = useLocation();

  return (
    <>
      <SkipToContent />
      <RouteLoadingIndicator />
      <Routes>
        <Route path="/" element={<PageTransition keyProp={location.pathname}><Index /></PageTransition>} />
        <Route path="/products" element={<PageTransition keyProp={location.pathname}><Products /></PageTransition>} />
        <Route path="/voice-shop" element={<PageTransition keyProp={location.pathname}><VoiceShop /></PageTransition>} />
        <Route path="/login" element={<PageTransition keyProp={location.pathname}><Login /></PageTransition>} />
        <Route path="/signup" element={<PageTransition keyProp={location.pathname}><Signup /></PageTransition>} />
        <Route path="/auth/callback" element={<PageTransition keyProp={location.pathname}><AuthCallback /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition keyProp={location.pathname}><Dashboard /></PageTransition>} />
        <Route path="/checkout" element={<PageTransition keyProp={location.pathname}><Checkout /></PageTransition>} />
        <Route path="/order-success" element={<PageTransition keyProp={location.pathname}><OrderSuccess /></PageTransition>} />
        <Route path="/subscription-checkout" element={<PageTransition keyProp={location.pathname}><SubscriptionCheckout /></PageTransition>} />
        <Route path="/subscription-success" element={<PageTransition keyProp={location.pathname}><SubscriptionSuccess /></PageTransition>} />
        {/* Idea Quality Framework Routes */}
        <Route path="/idea-quality" element={<PageTransition keyProp={location.pathname}><IdeaQualityIndex /></PageTransition>} />
        <Route path="/competitive-analysis" element={<PageTransition keyProp={location.pathname}><CompetitiveAnalysis /></PageTransition>} />
        <Route path="/market-opportunity" element={<PageTransition keyProp={location.pathname}><MarketOpportunity /></PageTransition>} />
        <Route path="/problem-validation" element={<PageTransition keyProp={location.pathname}><ProblemValidation /></PageTransition>} />
        <Route path="/innovation-scoring" element={<PageTransition keyProp={location.pathname}><InnovationScoring /></PageTransition>} />
        <Route path="/impact-measurement" element={<PageTransition keyProp={location.pathname}><ImpactMeasurement /></PageTransition>} />
        <Route path="/competitive-moats" element={<PageTransition keyProp={location.pathname}><CompetitiveMoats /></PageTransition>} />
        <Route path="/idea-quality-assessment" element={<PageTransition keyProp={location.pathname}><IdeaQualityAssessment /></PageTransition>} />
        <Route path="/judging-criteria" element={<PageTransition keyProp={location.pathname}><JudgingCriteriaAssessment /></PageTransition>} />
        {/* Judge-Ready Demo Routes */}
        <Route path="/demo" element={<PageTransition keyProp={location.pathname}><JudgeDemoPage /></PageTransition>} />
        <Route path="/pilot-kpis" element={<PageTransition keyProp={location.pathname}><PilotKPIsPage /></PageTransition>} />
        <Route path="/unit-economics" element={<PageTransition keyProp={location.pathname}><UnitEconomicsPage /></PageTransition>} />
        <Route path="/sponsor-metrics" element={<PageTransition keyProp={location.pathname}><SponsorMetricsPage /></PageTransition>} />
        {/* Lovable Cloud Routes */}
        <Route path="/lovable" element={<PageTransition keyProp={location.pathname}><LovableDashboard /></PageTransition>} />
        <Route path="/lovable/deployment" element={<PageTransition keyProp={location.pathname}><LovableDeployment /></PageTransition>} />
        <Route path="/lovable/monitoring" element={<PageTransition keyProp={location.pathname}><LovableMonitoring /></PageTransition>} />
        <Route path="/lovable/settings" element={<PageTransition keyProp={location.pathname}><LovableSettings /></PageTransition>} />
        <Route path="/lovable/analytics" element={<PageTransition keyProp={location.pathname}><LovableAnalytics /></PageTransition>} />
        <Route path="/lovable/environment" element={<PageTransition keyProp={location.pathname}><LovableEnvironment /></PageTransition>} />
        <Route path="/lovable/logs" element={<PageTransition keyProp={location.pathname}><LovableLogs /></PageTransition>} />
        <Route path="/lovable/health" element={<PageTransition keyProp={location.pathname}><LovableHealth /></PageTransition>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition keyProp={location.pathname}><NotFound /></PageTransition>} />
      </Routes>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthKitProvider
        clientId={WORKOS_CLIENT_ID}
        apiHostname={WORKOS_API_HOSTNAME}
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthKitProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
