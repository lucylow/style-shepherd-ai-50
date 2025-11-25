import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ImpactMeasurementDashboard } from '@/components/idea-quality/ImpactMeasurementDashboard';

export default function ImpactMeasurement() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-bold mb-2">Impact Measurement</h1>
        <p className="text-gray-600 mb-8">
          Multi-dimensional impact across consumers, retailers, environment, and society
        </p>
        <ImpactMeasurementDashboard />
      </div>
      <Footer />
    </div>
  );
}

