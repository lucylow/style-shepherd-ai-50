import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OverallJudgingAssessment } from '@/lib/idea-quality/types';
import { JudgeSummaryExporter } from '@/services/judging-criteria/judge-summary-exporter';

interface JudgingCriteriaSummaryProps {
  assessment: OverallJudgingAssessment;
}

export function JudgingCriteriaSummary({ assessment }: JudgingCriteriaSummaryProps) {
  const exporter = new JudgeSummaryExporter();

  const handleDownloadPDF = () => {
    exporter.downloadPDF(assessment);
  };

  const handleDownloadJSON = () => {
    exporter.downloadJSON(assessment);
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Display */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl mb-2">Overall Judging Score</CardTitle>
              <p className="text-gray-600">Comprehensive assessment across all criteria</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-2">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">
                    {assessment.overallScore}
                  </div>
                  <div className="text-xs text-white/80">/100</div>
                </div>
              </div>
              <Badge className="bg-yellow-500 text-white text-lg px-4 py-1">
                {assessment.ranking}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            {assessment.criteria.map((criterion, idx) => {
              const scorePercent =
                (criterion.styleShepherdScore / criterion.maxScore) * 100;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-3 text-center border border-gray-200"
                >
                  <div className="text-xs text-gray-600 mb-1 line-clamp-2">
                    {criterion.criterion}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {criterion.styleShepherdScore}
                  </div>
                  <div className="text-xs text-gray-500">/ {criterion.maxScore}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <div
                      className="bg-indigo-600 h-1 rounded-full"
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Competitive Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Competitive Positioning</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="text-xs text-gray-600 mb-1">Style Shepherd</div>
              <div className="text-2xl font-bold text-indigo-900">
                {assessment.competitorComparison.styleShepherd.score}
              </div>
              <div className="text-xs text-indigo-700">
                {assessment.competitorComparison.styleShepherd.percentile} percentile
              </div>
              <div className="text-xs text-indigo-600 mt-1">
                {assessment.competitorComparison.styleShepherd.tier}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Average Entry</div>
              <div className="text-2xl font-bold text-gray-700">
                {assessment.competitorComparison.averageHackathonEntry.score}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {assessment.competitorComparison.averageHackathonEntry.gap}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-gray-600 mb-1">Typical Winner</div>
              <div className="text-2xl font-bold text-blue-700">
                {assessment.competitorComparison.typicalWinner.score}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {assessment.competitorComparison.typicalWinner.gap}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-xs text-gray-600 mb-1">Championship</div>
              <div className="text-2xl font-bold text-yellow-700">
                {assessment.competitorComparison.championship.score}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {assessment.competitorComparison.championship.gap}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Judge's Verdict */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-900">
            <Trophy className="w-6 h-6" />
            <span>Judge's Verdict</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-6 border border-green-200">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {assessment.verdict.trim()}
            </pre>
          </div>
          <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-300">
            <div className="font-semibold text-green-900 mb-2">Recommendation:</div>
            <div className="text-green-800">{assessment.recommendation}</div>
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Export Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Download Summary (Markdown)</span>
            </Button>
            <Button onClick={handleDownloadJSON} variant="outline" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Download Data (JSON)</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

