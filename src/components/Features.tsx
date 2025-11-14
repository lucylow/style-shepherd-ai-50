import { Bot, TrendingUp, Leaf, CheckCircle2 } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Bot,
      color: "bg-primary",
      title: "Voice Fashion Assistant",
      description: "Natural conversations about style, fit, and occasion wear with our AI stylist.",
      items: [
        "24/7 styling advice",
        "Multi-brand size mapping",
        "Personalized recommendations",
      ],
    },
    {
      icon: TrendingUp,
      color: "bg-fashion-gold",
      title: "Returns Prediction Engine",
      description: "Advanced ML algorithms predict return likelihood before you buy.",
      items: [
        "90% prediction accuracy",
        "Real-time risk scoring",
        "Size optimization",
      ],
    },
    {
      icon: Leaf,
      color: "bg-fashion-sage",
      title: "Sustainable Shopping",
      description: "Reduce fashion waste by getting it right the first time.",
      items: [
        "Carbon footprint tracking",
        "Waste reduction analytics",
        "Eco-friendly brand partners",
      ],
    },
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Revolutionary AI Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Powered by cutting-edge machine learning and voice AI technology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-muted rounded-2xl p-8 hover:shadow-xl transition-all duration-300 group"
            >
              <div
                className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">{feature.title}</h3>
              <p className="text-muted-foreground mb-4">{feature.description}</p>
              <ul className="space-y-2">
                {feature.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-center space-x-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
