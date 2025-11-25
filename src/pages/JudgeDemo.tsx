import { JudgeDemo } from '@/components/JudgeDemo';
import HeaderNav from '@/components/HeaderNav';
import Footer from '@/components/Footer';

export default function JudgeDemoPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNav />
      <main id="main" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JudgeDemo />
      </main>
      <Footer />
    </div>
  );
}

