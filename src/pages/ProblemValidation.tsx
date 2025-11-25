import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ProblemSeverityDashboard } from '@/components/idea-quality/ProblemSeverityDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProblemAnalysisFramework } from '@/services/problem-validation-service';
import { useEffect, useState } from 'react';
import type { ProblemStatement, ConsumerInsight, RetailerInsight } from '@/lib/idea-quality/types';
import { AlertCircle, Users, Building2 } from 'lucide-react';

export default function ProblemValidation() {
  const [problem, setProblem] = useState<ProblemStatement | null>(null);
  const [consumerInsights, setConsumerInsights] = useState<ConsumerInsight[]>([]);
  const [retailerInsights, setRetailerInsights] = useState<RetailerInsight[]>([]);

  useEffect(() => {
    const framework = new ProblemAnalysisFramework();
    setProblem(framework.validateReturnsProblem());
    setConsumerInsights(framework.generateConsumerValidation());
    setRetailerInsights(framework.generateRetailerValidation());
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-bold mb-2">Problem Validation</h1>
        <p className="text-gray-600 mb-8">
          Real-world evidence of the returns crisis and consumer pain points
        </p>

        {/* Problem Severity */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Problem Severity</h2>
          <ProblemSeverityDashboard />
        </div>

        {/* Consumer Problem */}
        {problem && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Consumer Problem: Fit Anxiety</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-red-600 mb-4">
                52% of shoppers won't buy clothes online due to fit uncertainty
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consumerInsights.map((insight, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-semibold mb-2">{insight.insight}</div>
                    <div className="text-sm text-gray-600 mb-1">Source: {insight.source}</div>
                    <div className="text-sm text-green-600 font-medium">
                      {insight.valueProposition}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retailer Problem */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Retailer Problem: Returns Crisis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-yellow-600 mb-4">
              $550B annually lost to returns management worldwide
            </p>
            <div className="space-y-4">
              {retailerInsights.map((insight, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold mb-2">{insight.insight}</div>
                  <div className="text-sm text-gray-600 mb-1">Source: {insight.source}</div>
                  <div className="text-sm text-blue-600 font-medium">
                    Style Shepherd Benefit: {insight.styleShepherdBenefit}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Solution Gaps */}
        {problem && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>How Style Shepherd Solves This</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {problem.solutionGaps.map((gap, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-lg">
                    <div className="font-semibold text-red-600 mb-1">Problem: {gap.gap}</div>
                    <div className="text-sm text-gray-600 mb-2">Impact: {gap.impact}</div>
                    <div className="font-semibold text-green-600">
                      Solution: {gap.styleShepherdSolution}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}

