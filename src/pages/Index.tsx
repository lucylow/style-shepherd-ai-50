import HeaderNav from "@/components/HeaderNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import { ResearchStats } from "@/components/ResearchStats";
import ReturnsCalculator from "@/components/ReturnsCalculator";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <HeaderNav />
      <main id="main">
        <Hero />
        <Features />
        <ResearchStats />
        <ReturnsCalculator />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Index;
