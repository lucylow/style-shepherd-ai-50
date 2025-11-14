import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#f093fb] to-[#f5576c] text-white">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          Ready to Transform Your Shopping Experience?
        </h2>
        <p className="text-lg sm:text-xl mb-8 opacity-90">
          Join thousands of smart shoppers who never worry about returns again.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:space-x-6">
          <Button
            size="lg"
            className="bg-white text-gray-900 hover:bg-gray-100 font-bold shadow-2xl w-full sm:w-auto"
          >
            Start Free Trial
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="border-2 border-white text-gray-900 bg-white hover:bg-gray-100 w-full sm:w-auto"
          >
            Schedule Demo
          </Button>
        </div>

        <div className="mt-8 text-sm opacity-80">
          <p>No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
