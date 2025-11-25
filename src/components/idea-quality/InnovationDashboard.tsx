'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InnovationScoringService } from '@/services/innovation-scoring-service';
import type { InnovationScore } from '@/lib/idea-quality/types';
import { Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';

export function InnovationDashboard() {
  const [score, setScore] = useState<InnovationScore | null>(null);

  useEffect(() => {
    const service = new InnovationScoringService();
    setScore(service.calculateInnovationScore());
  }, []);

  if (!score) {
    return <div className="text-center p-8">Loading innovation score...</div>;
  }

  const dimensions = [
    {
      title: 'Technical Novelty',
      score: score.technicalNovelty,
      icon: Sparkles,
      description: 'Returns prediction engine is genuinely novel - no competitor focuses here',
      highlights: [
        'Proprietary ML model (9/10)',
        'Multi-agent architecture (8/10)',
        'Voice + Fashion integration (8/10)',
      ],
    },
    {
      title: 'Business Model Novelty',
      score: score.businessModelNovelty,
      icon: TrendingUp,
      description: 'First company to monetize returns prevention',
      highlights: [
        'Returns prevention focus (9/10)',
        'Revenue aligned with success (8/10)',
        'Network effects (9/10)',
      ],
    },
    {
      title: 'Market Timing',
      score: score.marketTiming,
      icon: Zap,
      description: 'Perfect timing for voice commerce + sustainability',
      highlights: [
        'Voice commerce $40B market (9/10)',
        'Sustainability trend (9/10)',
        'Returns volume increasing (8/10)',
      ],
    },
    {
      title: 'Defensibility',
      score: score.defensibility,
      icon: Shield,
      description: 'Multiple competitive moats protect the business',
      highlights: [
        'Data moat - 36mo replication (9/10)',
        'Network effects (8/10)',
        'Brand moat (7/10)',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overall Innovation Score */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardHeader>
          <CardTitle className="text-3xl">Innovation Score</CardTitle>
          <CardDescription className="text-white/80">
            How novel, defensible, and impactful is this idea?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-6xl font-bold mb-2">{score.overallScore}/100</div>
          <div className="text-lg">Championship-Level Innovation</div>
        </CardContent>
      </Card>

      {/* Dimension Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dimensions.map((dim, idx) => {
          const Icon = dim.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icon className="w-5 h-5" />
                    <span>{dim.title}</span>
                  </CardTitle>
                  <CardDescription>{dim.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-4">{dim.score.toFixed(1)}/10</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(dim.score / 10) * 100}%` }}
                    />
                  </div>
                  <ul className="space-y-1 text-sm">
                    {dim.highlights.map((highlight, hIdx) => (
                      <li key={hIdx} className="flex items-start space-x-2">
                        <span className="text-green-600">✓</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Scalability Score */}
      <Card>
        <CardHeader>
          <CardTitle>Scalability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold mb-2">{score.scalability.toFixed(1)}/10</div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-green-600 h-3 rounded-full"
              style={{ width: `${(score.scalability / 10) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">
            SaaS business model scales with minimal marginal cost. International expansion
            possible through voice interface. Network effects improve predictions with scale.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

