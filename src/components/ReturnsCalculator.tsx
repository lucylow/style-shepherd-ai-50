import { useState } from "react";
import { Slider } from "@/components/ui/slider";

const ReturnsCalculator = () => {
  const [spending, setSpending] = useState(1000);
  const [returnRate, setReturnRate] = useState(25);

  const currentCost = Math.round(spending * (returnRate / 100));
  const newCost = Math.round(currentCost * 0.3);
  const savings = currentCost - newCost;
  const annualSavings = savings * 12;

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How Style Shepherd Works
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Three simple steps to perfect fashion choices
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              num: 1,
              color: "bg-primary",
              title: "Tell Us About Yourself",
              desc: "Share your measurements, style preferences, and fashion goals with our AI assistant.",
            },
            {
              num: 2,
              color: "bg-fashion-gold",
              title: "Get AI Recommendations",
              desc: "Receive personalized size predictions and style suggestions with low return risk.",
            },
            {
              num: 3,
              color: "bg-fashion-sage",
              title: "Shop With Confidence",
              desc: "Enjoy perfect fits, reduced returns, and continuous style evolution.",
            },
          ].map((step) => (
            <div key={step.num} className="text-center">
              <div className="relative mb-6">
                <div
                  className={`w-20 h-20 ${step.color} rounded-full flex items-center justify-center mx-auto text-white text-2xl font-bold`}
                >
                  {step.num}
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">{step.title}</h3>
              <p className="text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-background rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-center text-foreground mb-8">
            Try Our Returns Calculator
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div>
                <label className="block text-foreground mb-2 font-medium">
                  Monthly Fashion Spending
                </label>
                <Slider
                  value={[spending]}
                  onValueChange={(value) => setSpending(value[0])}
                  min={100}
                  max={5000}
                  step={100}
                  className="mb-2"
                />
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>$100</span>
                  <span className="font-bold text-foreground">
                    ${spending.toLocaleString()}
                  </span>
                  <span>$5,000</span>
                </div>
              </div>

              <div>
                <label className="block text-foreground mb-2 font-medium">
                  Current Return Rate
                </label>
                <Slider
                  value={[returnRate]}
                  onValueChange={(value) => setReturnRate(value[0])}
                  min={10}
                  max={50}
                  step={5}
                  className="mb-2"
                />
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>10%</span>
                  <span className="font-bold text-foreground">{returnRate}%</span>
                  <span>50%</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-2xl p-8 text-white">
              <h4 className="text-xl font-bold mb-4">Your Potential Savings</h4>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Current Return Costs:</span>
                  <span className="text-2xl font-bold">${currentCost}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>With Style Shepherd:</span>
                  <span className="text-2xl font-bold">${newCost}</span>
                </div>

                <div className="border-t border-white/30 pt-4">
                  <div className="flex justify-between items-center text-lg">
                    <span>Monthly Savings:</span>
                    <span className="text-2xl font-bold">${savings}</span>
                  </div>
                </div>

                <div className="text-center pt-4">
                  <div className="text-sm opacity-90">
                    Annual Savings:{" "}
                    <span className="font-bold">${annualSavings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReturnsCalculator;
