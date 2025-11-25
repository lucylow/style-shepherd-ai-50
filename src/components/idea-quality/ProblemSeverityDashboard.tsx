'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Users, DollarSign, Leaf } from 'lucide-react';

interface ProblemMetric {
  icon: React.ReactNode;
  metric: string;
  value: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
}

export function ProblemSeverityDashboard() {
  const metrics: ProblemMetric[] = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      metric: 'Annual Returns Cost',
      value: '$550B',
      severity: 'critical',
      description: 'Global fashion industry waste from returns management',
    },
    {
      icon: <Users className="w-6 h-6" />,
      metric: 'Consumer Impact',
      value: '450M shoppers',
      severity: 'critical',
      description: '52% hesitate to buy clothes online due to fit anxiety',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      metric: 'Return Rate',
      value: '30-40%',
      severity: 'high',
      description: '3-4x higher for online fashion vs. in-store (10%)',
    },
    {
      icon: <Leaf className="w-6 h-6" />,
      metric: 'Environmental Impact',
      value: '15M tons CO₂',
      severity: 'critical',
      description: 'Annual emissions from fashion returns transportation',
    },
  ];

  const severityColors = {
    critical: 'from-red-50 to-red-100 border-red-200',
    high: 'from-yellow-50 to-yellow-100 border-yellow-200',
    medium: 'from-blue-50 to-blue-100 border-blue-200',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-gradient-to-br ${severityColors[m.severity]} border rounded-lg p-4`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-gray-600">{m.icon}</div>
              <AlertTriangle
                className={`w-4 h-4 ${
                  m.severity === 'critical'
                    ? 'text-red-600'
                    : m.severity === 'high'
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                }`}
              />
            </div>

            <div className="text-xs font-medium text-gray-600 mb-1">{m.metric}</div>

            <div className="text-2xl font-bold text-gray-900 mb-2">{m.value}</div>

            <div className="text-xs text-gray-700 line-clamp-2">{m.description}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

