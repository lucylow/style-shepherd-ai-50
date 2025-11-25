import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthKitProvider } from "@workos-inc/authkit-react";
import { WORKOS_CLIENT_ID, WORKOS_API_HOSTNAME } from "@/lib/workos";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import NotFound from "./pages/NotFound";
import CompetitiveAnalysis from "./pages/CompetitiveAnalysis";
import MarketOpportunity from "./pages/MarketOpportunity";
import ProblemValidation from "./pages/ProblemValidation";
import InnovationScoring from "./pages/InnovationScoring";
import ImpactMeasurement from "./pages/ImpactMeasurement";
import CompetitiveMoats from "./pages/CompetitiveMoats";
import IdeaQualityAssessment from "./pages/IdeaQualityAssessment";
import IdeaQualityIndex from "./pages/IdeaQualityIndex";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthKitProvider
      clientId={WORKOS_CLIENT_ID}
      apiHostname={WORKOS_API_HOSTNAME}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            {/* Idea Quality Framework Routes */}
            <Route path="/idea-quality" element={<IdeaQualityIndex />} />
            <Route path="/competitive-analysis" element={<CompetitiveAnalysis />} />
            <Route path="/market-opportunity" element={<MarketOpportunity />} />
            <Route path="/problem-validation" element={<ProblemValidation />} />
            <Route path="/innovation-scoring" element={<InnovationScoring />} />
            <Route path="/impact-measurement" element={<ImpactMeasurement />} />
            <Route path="/competitive-moats" element={<CompetitiveMoats />} />
            <Route path="/idea-quality-assessment" element={<IdeaQualityAssessment />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthKitProvider>
  </QueryClientProvider>
);

export default App;
