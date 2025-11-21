import { TrendingUp, DollarSign, Target, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    icon: TrendingUp,
    value: "24-40%",
    label: "Average Online Apparel Return Rate",
    description: "vs 8-10% in brick-and-mortar retail. Pants can reach 65% returns.",
    color: "text-orange-500"
  },
  {
    icon: DollarSign,
    value: "$218B",
    label: "Annual Returns Cost",
    description: "Processing costs 15-30% of item price. Returns are a massive industry challenge.",
    color: "text-red-500"
  },
  {
    icon: Target,
    value: "35-60%",
    label: "Returns Reduction with AI",
    description: "AI virtual try-on and size recommendations dramatically reduce returns.",
    color: "text-green-500"
  },
  {
    icon: ShieldCheck,
    value: "$101B",
    label: "Return Fraud Prevented",
    description: "AI fraud detection combats suspicious patterns and behaviors.",
    color: "text-blue-500"
  }
];

const insights = [
  {
    title: "ML-Powered Predictions",
    stat: "+13%",
    description: "ML models improve returns forecasting by 13%, boosting profits by 8.3%"
  },
  {
    title: "Customer Satisfaction",
    stat: "2-3x",
    description: "Higher repurchase rates for users with personalized AI sizing"
  },
  {
    title: "ROI Timeline",
    stat: "12 months",
    description: "End-to-end AI implementations achieve ROI within one year"
  }
];

export const ResearchStats = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Research-Backed AI Innovation</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Data-driven insights support our advanced AI features in fashion e-commerce, 
            with proven impact on returns prediction, sizing accuracy, and personalization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <Icon className={`w-12 h-12 ${stat.color} mb-4`} />
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <div className="font-semibold mb-2">{stat.label}</div>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {insights.map((insight, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">{insight.stat}</div>
              <div className="text-lg font-semibold mb-2">{insight.title}</div>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
            </div>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-bold mb-4">Industry-Leading Technology</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Virtual Try-On & Sizing</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Computer vision with diverse model imagery (XXS-4XL)</li>
                  <li>• 82M+ shopper dataset from industry leaders</li>
                  <li>• Customer measurements + order/return history</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">ML/DL Techniques</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Ensemble models (Random Forest, Gradient Boosting)</li>
                  <li>• Neural networks for image feature extraction</li>
                  <li>• Behavioral pattern analysis & fraud detection</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Data sources: MIT Sloan, AI2Easy, Fitezapp, Reelmind, Research Nester, and leading fashion e-commerce platforms</p>
        </div>
      </div>
    </section>
  );
};
