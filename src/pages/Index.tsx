import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import { ResearchStats } from "@/components/ResearchStats";
import ReturnsCalculator from "@/components/ReturnsCalculator";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      <ResearchStats />
      <ReturnsCalculator />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
