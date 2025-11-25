'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoatAnalysisService } from '@/services/moat-analysis-service';
import type { CompetitiveMoat, MoatScore } from '@/lib/idea-quality/types';
import { Shield, TrendingUp, Clock } from 'lucide-react';

function formatCurrency(value: number): string {
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(0)}M+`;
  }
  return `$${value.toFixed(0)}`;
}

export function CompetitiveMoatsPanel() {
  const [moats, setMoats] = useState<CompetitiveMoat[]>([]);
  const [moatScore, setMoatScore] = useState<MoatScore | null>(null);

  useEffect(() => {
    const service = new MoatAnalysisService();
    setMoats(service.analyzeStyleShepherdMoats());
    setMoatScore(service.calculateMoatStrength());
  }, []);

  if (!moatScore || moats.length === 0) {
    return <div className="text-center p-8">Loading moat analysis...</div>;
  }

  const strengthColors = {
    strong: 'bg-green-100 border-green-300 text-green-900',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    weak: 'bg-red-100 border-red-300 text-red-900',
  };

  return (
    <div className="space-y-8">
      {/* Moat Strength Overview */}
      <Card className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <CardHeader>
          <CardTitle className="text-3xl">Defensibility Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm opacity-80">Overall Moat Score</div>
              <div className="text-3xl font-bold">{moatScore.overallMoatScore.toFixed(1)}/10</div>
            </div>
            <div>
              <div className="text-sm opacity-80">Moat Ranking</div>
              <div className="text-3xl font-bold">{moatScore.moatRanking}</div>
            </div>
            <div>
              <div className="text-sm opacity-80">Time to Competition</div>
              <div className="text-2xl font-bold">{moatScore.timeBeforeCompetition}</div>
            </div>
            <div>
              <div className="text-sm opacity-80">Defense Rating</div>
              <div className="text-2xl font-bold">{moatScore.defenseRating}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Moats */}
      <div className="space-y-4">
        {moats.map((moat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2 mb-2">
                      <Shield className="w-5 h-5" />
                      <span>{moat.moat}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={strengthColors[moat.strength]}>
                        {moat.strength}
                      </Badge>
                      {moat.networkEffects && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Network Effects</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{moat.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>Time to Replication: {moat.timeToReplication}</span>
                    </div>
                    <div className="font-semibold">
                      Investment Required: {formatCurrency(moat.investmentRequired)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Why Competitors Can't Catch Up */}
      <Card className="bg-blue-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl text-blue-900">
            Why Competition Takes 36+ Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded border border-blue-200">
              <div className="font-semibold mb-1">Proprietary Returns Data</div>
              <div className="text-sm text-gray-600">
                Requires 3+ years of transaction data from retailers | $50M+ infrastructure | 36-48 months
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-blue-200">
              <div className="font-semibold mb-1">Cross-Brand Database</div>
              <div className="text-sm text-gray-600">
                Need partnerships with 50+ major fashion brands | $30M+ in partnerships | 24-36 months
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-blue-200">
              <div className="font-semibold mb-1">Voice Fashion AI Training</div>
              <div className="text-sm text-gray-600">
                Specialized NLP training on fashion conversations | $10M+ in ML research | 12-18 months
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-blue-200">
              <div className="font-semibold mb-1">Retailer Integrations</div>
              <div className="text-sm text-gray-600">
                Deep API integrations for returns tracking | $20M+ in integrations | 24-36 months
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

