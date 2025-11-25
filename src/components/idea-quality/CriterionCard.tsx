import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import type { JudgingCriteria, Evidence } from '@/lib/idea-quality/types';

interface CriterionCardProps {
  criterion: JudgingCriteria;
  number: number;
}

export function CriterionCard({ criterion, number }: CriterionCardProps) {
  const scorePercent = (criterion.styleShepherdScore / criterion.maxScore) * 100;
  const isExceptional = scorePercent >= 94;
  const isStrong = scorePercent >= 88;

  const getEvidenceIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'statistic':
        return <TrendingUp className="w-4 h-4" />;
      case 'research':
        return <AlertCircle className="w-4 h-4" />;
      case 'user_validation':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-indigo-600">#{number}</span>
              <CardTitle className="text-xl">{criterion.criterion}</CardTitle>
            </div>
            <div className="flex items-center space-x-3 mt-2">
              <Badge
                variant={isExceptional ? 'default' : isStrong ? 'secondary' : 'outline'}
                className={
                  isExceptional
                    ? 'bg-yellow-500 text-white'
                    : isStrong
                      ? 'bg-blue-500 text-white'
                      : ''
                }
              >
                Weight: {(criterion.weight * 100).toFixed(0)}%
              </Badge>
              <div className="text-3xl font-bold text-gray-900">
                {criterion.styleShepherdScore}/{criterion.maxScore}
              </div>
              {isExceptional && (
                <Badge className="bg-green-500 text-white">🏆 Exceptional</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Score</span>
            <span>{scorePercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${
                isExceptional
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                  : isStrong
                    ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                    : 'bg-gradient-to-r from-indigo-400 to-indigo-600'
              }`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        {/* Evidence */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>Supporting Evidence</span>
          </h4>
          <div className="space-y-3">
            {criterion.evidence.map((evidence, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start space-x-2 mb-1">
                  <div className="text-indigo-600 mt-0.5">
                    {getEvidenceIcon(evidence.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {evidence.type.replace('_', ' ')}
                      </Badge>
                      <span className="font-medium text-gray-900">{evidence.value}</span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      Source: {evidence.source}
                    </div>
                    <div className="text-xs text-gray-700 italic">
                      {evidence.relevance}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Detailed Reasoning</h4>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {criterion.reasoning.trim()}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

