import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { InnovationDashboard } from '@/components/idea-quality/InnovationDashboard';

export default function InnovationScoring() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-bold mb-2">Innovation & Uniqueness Score</h1>
        <p className="text-gray-600 mb-8">
          Systematic evaluation of novelty, defensibility, and market timing
        </p>
        <InnovationDashboard />
      </div>
      <Footer />
    </div>
  );
}

