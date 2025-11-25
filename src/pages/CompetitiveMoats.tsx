import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { CompetitiveMoatsPanel } from '@/components/idea-quality/CompetitiveMoatsPanel';

export default function CompetitiveMoats() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-bold mb-2">Competitive Moats & Defensibility</h1>
        <p className="text-gray-600 mb-8">
          Why Style Shepherd is protected from competition for 36+ months
        </p>
        <CompetitiveMoatsPanel />
      </div>
      <Footer />
    </div>
  );
}

