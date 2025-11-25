'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompetitiveAnalysisService } from '@/services/competitive-analysis-service';
import type { ComparisonMatrix } from '@/lib/idea-quality/types';
import { CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

export function CompetitiveAnalysisDashboard() {
  const [comparison, setComparison] = useState<ComparisonMatrix | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const service = new CompetitiveAnalysisService();
      const data = await service.compareAgainstCompetitors(
        ['Pinterest', 'True Fit', 'Google Shopping'],
        [
          'Returns Prevention Engine',
          'Voice-First Fashion AI',
          'Cross-Brand Personalization',
          'Environmental Impact Tracking',
        ]
      );
      setComparison(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading || !comparison) {
    return <div className="text-center p-8">Loading competitive analysis...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Positioning Statement */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-2xl">Market Positioning</CardTitle>
          <CardDescription>{comparison.marketPositioning.headline}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold mb-2">{comparison.marketPositioning.subheading}</p>
          <p className="text-gray-700 mb-4">{comparison.marketPositioning.keyMessage}</p>
          <div className="space-y-2">
            <p className="font-medium">Differentiation:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {comparison.marketPositioning.differentiation.map((diff, idx) => (
                <li key={idx}>{diff}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Competitive Landscape</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comparison.competitors.map((competitor) => (
            <Card key={competitor.id}>
              <CardHeader>
                <CardTitle className="text-lg">{competitor.name}</CardTitle>
                <CardDescription>{competitor.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Key Features:</p>
                  <ul className="space-y-1 text-xs">
                    {competitor.keyFeatures.slice(0, 2).map((feature, idx) => (
                      <li key={idx}>• {feature.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 text-red-600">Limitations:</p>
                  <ul className="space-y-1 text-xs">
                    {competitor.limitations.map((lim, idx) => (
                      <li key={idx} className="text-red-700">
                        • {lim.area}: {lim.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Competitive Advantages */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span>Style Shepherd Advantages</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {comparison.styleShepherd.competitiveAdvantages.map((advantage, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-white rounded-lg border border-green-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-green-900">{advantage.advantage}</h4>
                  <Badge
                    variant={
                      advantage.defensibility === 'high'
                        ? 'default'
                        : advantage.defensibility === 'medium'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {advantage.defensibility}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Time to Replication: {advantage.timeToReplication}</p>
                  <p>Resources Required: {advantage.resourcesRequired}</p>
                  {advantage.networkEffects && (
                    <p className="text-green-600 font-medium">✓ Network Effects</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unique Points */}
      <Card>
        <CardHeader>
          <CardTitle>Unique Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comparison.styleShepherd.uniquePoints.map((point, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{point}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

