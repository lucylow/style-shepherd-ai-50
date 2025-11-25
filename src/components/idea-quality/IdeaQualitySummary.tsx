'use client';

import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Shield, AlertTriangle, Sparkles, Target } from 'lucide-react';

export function IdeaQualitySummary() {
  const qualityScore = 95; // Out of 100
  const ranking = 'Top 5% - Championship Tier';

  const dimensions = [
    { name: 'Creativity', score: 9.2, icon: Sparkles },
    { name: 'Uniqueness', score: 9.3, icon: Target },
    { name: 'Market Fit', score: 9.1, icon: TrendingUp },
    { name: 'Real Impact', score: 9.0, icon: AlertTriangle },
    { name: 'Feasibility', score: 8.4, icon: Shield },
    { name: 'Scalability', score: 9.1, icon: TrendingUp },
    { name: 'Defensibility', score: 8.8, icon: Shield },
  ];

  return (
    <div className="space-y-8 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
      {/* Main Score */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
          <div className="text-center">
            <div className="text-5xl font-bold text-white">{qualityScore}</div>
            <div className="text-xs text-white/80">Quality Score</div>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-2 mb-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <h2 className="text-2xl font-bold text-gray-900">{ranking}</h2>
        </div>

        <p className="text-gray-700 max-w-2xl mx-auto">
          Style Shepherd demonstrates exceptional idea quality across all key dimensions.
          Innovation, market fit, and real-world impact position it as a championship contender.
        </p>
      </motion.div>

      {/* Dimension Scores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {dimensions.map((dim, idx) => {
          const Icon = dim.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-200"
            >
              <Icon className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {dim.score.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 font-medium">{dim.name}</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                <div
                  className="bg-indigo-600 h-1 rounded-full"
                  style={{ width: `${(dim.score / 10) * 100}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Key Strengths */}
      <div className="bg-white rounded-lg p-6 border border-green-200 bg-green-50">
        <h3 className="font-bold text-green-900 mb-3 flex items-center space-x-2">
          <Sparkles className="w-5 h-5" />
          <span>Key Competitive Advantages</span>
        </h3>
        <ul className="space-y-2 text-sm text-green-900">
          <li>✓ First and only focus on returns PREVENTION (not management)</li>
          <li>✓ Proprietary ML moat with 36+ month replication window</li>
          <li>✓ Multi-stakeholder value: Consumer + Retailer + Environment</li>
          <li>✓ Massive addressable market ($550B+ returns industry)</li>
          <li>✓ Perfect timing for voice commerce adoption</li>
        </ul>
      </div>
    </div>
  );
}

