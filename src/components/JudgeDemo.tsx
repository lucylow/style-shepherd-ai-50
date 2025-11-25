/**
 * Judge-Ready Demo Component
 * Scripted 60-90s demo flow showcasing Style Shepherd's key features
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, CheckCircle2, TrendingDown, Leaf, Target } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';

interface DemoStep {
  id: number;
  duration: number; // seconds
  title: string;
  subtitle: string;
  userMessage?: string;
  assistantResponse: string;
  metrics?: {
    label: string;
    value: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down';
  }[];
  highlight?: string;
}

const DEMO_SCRIPT: DemoStep[] = [
  {
    id: 1,
    duration: 10,
    title: 'Voice-First Fashion Discovery',
    subtitle: 'User asks for beach wedding outfit',
    userMessage: 'I need something for a beach wedding that matches my skin tone',
    assistantResponse: "I'll help you find the perfect beach wedding outfit! Based on your style profile, I recommend a light, flowy maxi dress. Would you like me to show you options in your preferred colors?",
    metrics: [
      { label: 'Response Time', value: '<250ms', icon: <Mic className="w-4 h-4" /> },
      { label: 'Intent Accuracy', value: '94%', icon: <Target className="w-4 h-4" /> },
    ],
  },
  {
    id: 2,
    duration: 15,
    title: 'Multi-Agent Intelligence',
    subtitle: 'Size Oracle Agent predicts perfect fit',
    assistantResponse: "I've analyzed your measurements and past purchases. For this brand, I recommend size Medium. My Fit Confidence is 92% based on your chest measurement (38\") matching this brand's sizing matrix.",
    metrics: [
      { label: 'Fit Confidence', value: '92%', icon: <CheckCircle2 className="w-4 h-4" />, trend: 'up' },
      { label: 'Size Prediction', value: 'Medium', icon: <Sparkles className="w-4 h-4" /> },
      { label: 'Cross-Brand Accuracy', value: '89%', icon: <Target className="w-4 h-4" /> },
    ],
    highlight: 'Why? - Chest fit + 3% sizing variance in this brand',
  },
  {
    id: 3,
    duration: 20,
    title: 'Returns Prophet Engine',
    subtitle: 'Proactive returns prevention',
    assistantResponse: "Great choice! I've analyzed this item and your purchase history. Return Risk: 12% (low). This is excellent - your past successful purchases in similar styles suggest a 88% fit likelihood. Estimated savings: $45 in return costs and 5.8kg CO₂ prevented.",
    metrics: [
      { label: 'Return Risk', value: '12%', icon: <TrendingDown className="w-4 h-4 text-green-500" />, trend: 'down' },
      { label: 'Fit Likelihood', value: '88%', icon: <CheckCircle2 className="w-4 h-4" />, trend: 'up' },
      { label: 'CO₂ Saved', value: '5.8kg', icon: <Leaf className="w-4 h-4 text-green-500" /> },
    ],
    highlight: 'Why? - Style compatibility + brand fit history + measurement match',
  },
  {
    id: 4,
    duration: 15,
    title: 'Intelligent Recommendations',
    subtitle: 'Contextual styling suggestions',
    assistantResponse: "Based on your beach wedding context and style preferences, here are 3 additional options that would work well. All have Return Risk below 15% and match your color palette.",
    metrics: [
      { label: 'Items Recommended', value: '3', icon: <Sparkles className="w-4 h-4" /> },
      { label: 'Avg Return Risk', value: '13%', icon: <TrendingDown className="w-4 h-4" />, trend: 'down' },
      { label: 'Style Match', value: '95%', icon: <Target className="w-4 h-4" /> },
    ],
  },
];

export const JudgeDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentStepData = DEMO_SCRIPT[currentStep];

  useEffect(() => {
    if (!isPlaying || isComplete) return;

    setTimeRemaining(currentStepData.duration);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (currentStep < DEMO_SCRIPT.length - 1) {
            setCurrentStep((step) => step + 1);
            return DEMO_SCRIPT[currentStep + 1].duration;
          } else {
            setIsComplete(true);
            setIsPlaying(false);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentStep, isComplete, currentStepData.duration]);

  const startDemo = () => {
    setCurrentStep(0);
    setIsComplete(false);
    setIsPlaying(true);
    setTimeRemaining(DEMO_SCRIPT[0].duration);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setIsComplete(false);
    setTimeRemaining(0);
  };

  const progress = ((currentStep + 1) / DEMO_SCRIPT.length) * 100;
  const stepProgress = currentStepData ? ((currentStepData.duration - timeRemaining) / currentStepData.duration) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Style Shepherd Demo</h2>
            <p className="text-muted-foreground">
              60-second scripted demo showcasing voice-first fashion intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={isPlaying ? () => setIsPlaying(false) : startDemo}
              disabled={isComplete}
              variant={isPlaying ? 'destructive' : 'default'}
              size="lg"
            >
              {isComplete ? 'Demo Complete' : isPlaying ? 'Pause' : 'Start Demo'}
            </Button>
            {isComplete && (
              <Button onClick={resetDemo} variant="outline" size="lg">
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {DEMO_SCRIPT.length}</span>
            <span>{timeRemaining}s remaining</span>
          </div>
          <Progress value={progress} className="h-2" />
          <Progress value={stepProgress} className="h-1" />
        </div>

        {/* Demo Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-2xl font-semibold mb-2">{currentStepData.title}</h3>
              <p className="text-muted-foreground mb-4">{currentStepData.subtitle}</p>
            </div>

            {/* User Message */}
            {currentStepData.userMessage && (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">User</p>
                    <p className="text-foreground">"{currentStepData.userMessage}"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Assistant Response */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Style Shepherd</p>
                  <p className="text-foreground">{currentStepData.assistantResponse}</p>
                </div>
              </div>
            </div>

            {/* Highlight */}
            {currentStepData.highlight && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  <strong>Why?</strong> — {currentStepData.highlight}
                </p>
              </div>
            )}

            {/* Metrics */}
            {currentStepData.metrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentStepData.metrics.map((metric, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {metric.icon}
                      <span className="text-sm text-muted-foreground">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{metric.value}</span>
                      {metric.trend === 'up' && (
                        <TrendingDown className="w-4 h-4 text-green-500 rotate-180" />
                      )}
                      {metric.trend === 'down' && (
                        <TrendingDown className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Key Features Showcase */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Demo Highlights</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Voice-first conversational interface
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Multi-agent architecture (Size Oracle + Returns Prophet)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Proactive returns prevention (12% vs 25% industry avg)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Interpretable confidence scores & reasoning
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Environmental impact tracking (5.8kg CO₂ saved)
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Key Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Response Latency</span>
                <span className="font-semibold">&lt;250ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Fit Confidence</span>
                <span className="font-semibold">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Return Risk Reduction</span>
                <span className="font-semibold text-green-500">52% lower</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Environmental Impact</span>
                <span className="font-semibold text-green-500">5.8kg CO₂ saved</span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

