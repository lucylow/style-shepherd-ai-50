import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Target,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Shield,
  BarChart3,
  Trophy,
} from 'lucide-react';
import { IdeaQualitySummary } from '@/components/idea-quality/IdeaQualitySummary';

const dashboardLinks = [
  {
    title: 'Competitive Analysis',
    description: 'How Style Shepherd compares to existing solutions',
    icon: Target,
    path: '/competitive-analysis',
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Market Opportunity',
    description: 'Quantifying the $550B+ returns management opportunity',
    icon: DollarSign,
    path: '/market-opportunity',
    color: 'from-green-500 to-green-600',
  },
  {
    title: 'Problem Validation',
    description: 'Real-world evidence of the returns crisis',
    icon: AlertTriangle,
    path: '/problem-validation',
    color: 'from-red-500 to-red-600',
  },
  {
    title: 'Innovation Scoring',
    description: 'Systematic evaluation of novelty and uniqueness',
    icon: Sparkles,
    path: '/innovation-scoring',
    color: 'from-purple-500 to-purple-600',
  },
  {
    title: 'Impact Measurement',
    description: 'Multi-dimensional impact across all stakeholders',
    icon: BarChart3,
    path: '/impact-measurement',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    title: 'Competitive Moats',
    description: 'Why Style Shepherd is protected from competition',
    icon: Shield,
    path: '/competitive-moats',
    color: 'from-amber-500 to-amber-600',
  },
  {
    title: 'Overall Assessment',
    description: 'Comprehensive scoring across all judging criteria',
    icon: TrendingUp,
    path: '/idea-quality-assessment',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    title: 'Judge-Facing Metrics',
    description: 'Systematic assessment against hackathon judging criteria',
    icon: Trophy,
    path: '/judging-criteria',
    color: 'from-yellow-500 to-orange-600',
  },
];

export default function IdeaQualityIndex() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Idea Quality Framework
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive analysis demonstrating championship-level idea quality for Style Shepherd.
            Explore each dimension to understand our competitive advantages, market opportunity, and impact.
          </p>
        </div>

        {/* Overall Summary */}
        <div className="mb-12">
          <IdeaQualitySummary />
        </div>

        {/* Dashboard Links */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Explore the Framework</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardLinks.map((dashboard, idx) => {
              const Icon = dashboard.icon;
              return (
                <Link key={idx} to={dashboard.path}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${dashboard.color} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle>{dashboard.title}</CardTitle>
                      <CardDescription>{dashboard.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        View Dashboard →
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle>Key Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">95/100</div>
                <div className="text-sm text-gray-600">Quality Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">$550B</div>
                <div className="text-sm text-gray-600">Market Opportunity</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">36+ mo</div>
                <div className="text-sm text-gray-600">Competitive Moat</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">15M tons</div>
                <div className="text-sm text-gray-600">CO₂ Prevented</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

