import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-fashion-gold rounded-lg"></div>
            <span className="text-xl font-bold text-gray-900">Style Shepherd</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              How It Works
            </a>
            <a
              href="#testimonials"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              Testimonials
            </a>
            <a
              href="#pricing"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              Pricing
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="hidden md:block">
              Sign In
            </Button>
            <Button>Get Started Free</Button>
          </div>

          <button className="md:hidden text-gray-700" onClick={() => setIsOpen(!isOpen)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
