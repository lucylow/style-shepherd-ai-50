import { useState, useEffect } from "react";
import { Mic, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Hero = () => {
  const [stats, setStats] = useState({ returns: 0, timeSaved: 0, rating: 0 });

  useEffect(() => {
    const targets = { returns: 90, timeSaved: 50, rating: 4.9 };
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        clearInterval(timer);
        setStats(targets);
      } else {
        setStats({
          returns: Math.floor((targets.returns / steps) * currentStep),
          timeSaved: Math.floor((targets.timeSaved / steps) * currentStep),
          rating: parseFloat(((targets.rating / steps) * currentStep).toFixed(1)),
        });
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, []);

  const [conversation, setConversation] = useState([
    { role: "user", text: "What should I wear to a beach wedding?" },
    {
      role: "assistant",
      text: "For a beach wedding, I recommend a lightweight linen suit or a flowy maxi dress. Would you like to see some options?",
    },
  ]);
  const [input, setInput] = useState("");

  const quickActions = [
    "What's my size in Levi's?",
    "Find summer dresses under $50",
  ];

  const handleQuickAction = (question: string) => {
    setInput(question);
    addMessage(question);
  };

  const addMessage = (text: string) => {
    setConversation([...conversation, { role: "user", text }]);
    setInput("");

    setTimeout(() => {
      const responses: Record<string, string> = {
        "What's my size in Levi's?":
          "Based on your profile, you're a size 31 in Levi's 511 jeans. Your usual size 32 runs a bit large in this brand.",
        "Find summer dresses under $50":
          "I found 15 summer dresses under $50 that match your style! Showing options from H&M, Old Navy, and ASOS with low return risk.",
      };
      const response =
        responses[text] ||
        "I'd be happy to help with that! Could you provide a bit more detail about what you're looking for?";
      setConversation((prev) => [...prev, { role: "assistant", text: response }]);
    }, 1000);
  };

  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
                <Mic className="w-4 h-4 text-fashion-gold" />
                <span className="text-xs sm:text-sm font-medium">AI-Powered Fashion Assistant</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
                Your Personal
                <span className="text-fashion-gold block">Fashion</span>
                AI Stylist
              </h1>

              <p className="text-lg sm:text-xl text-blue-100 max-w-2xl">
                Stop guessing sizes and dealing with returns. Style Shepherd uses advanced AI to predict your perfect fit and reduce returns by up to 90%.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
              <Button
                size="lg"
                className="bg-fashion-gold text-gray-900 hover:bg-fashion-gold/90 font-bold shadow-2xl"
              >
                <Mic className="mr-2 h-5 w-5" />
                Try Voice Assistant
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-gray-900 bg-white hover:bg-gray-100"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-8">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{stats.returns}%</div>
                <div className="text-blue-200 text-xs sm:text-sm">Returns Reduced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{stats.timeSaved}%</div>
                <div className="text-blue-200 text-xs sm:text-sm">Time Saved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold">{stats.rating}</div>
                <div className="text-blue-200 text-xs sm:text-sm">User Rating</div>
              </div>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 relative z-10">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-voice-pulse">
                  <Mic className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Ask Me Anything</h3>
                <p className="text-gray-600">About fashion, sizing, or styling</p>
              </div>

              <div className="space-y-4 mb-6 h-48 overflow-y-auto">
                {conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-xs ${
                        msg.role === "user"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-primary text-white"
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-4">
                <Input
                  type="text"
                  placeholder="Type your fashion question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && input && addMessage(input)}
                  className="flex-1"
                />
                <Button onClick={() => input && addMessage(input)}>
                  <span>→</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {quickActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleQuickAction(action)}
                    className="text-xs"
                  >
                    "{action}"
                  </Button>
                ))}
              </div>
            </div>

            <div className="absolute -top-4 -right-4 w-24 h-24 bg-fashion-gold rounded-full opacity-20 animate-float"></div>
            <div
              className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary rounded-full opacity-20 animate-float"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
