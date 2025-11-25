import { UnitEconomicsCalculator } from '@/components/UnitEconomicsCalculator';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';

export default function UnitEconomicsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNav />
      <main id="main" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UnitEconomicsCalculator />
      </main>
      <Footer />
    </div>
  );
}

