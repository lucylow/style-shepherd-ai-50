'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImpactMeasurementService } from '@/services/impact-measurement-service';
import type { ImpactMetrics } from '@/lib/idea-quality/types';
import { Users, Building2, Leaf, Globe } from 'lucide-react';

function formatNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

export function ImpactMeasurementDashboard() {
  const [impact, setImpact] = useState<ImpactMetrics | null>(null);

  useEffect(() => {
    const service = new ImpactMeasurementService();
    const userCount = 450e6;
    const adoption = 0.25;

    const consumerImpact = service.calculateConsumerImpact(userCount, adoption);
    const retailerImpact = service.calculateRetailerImpact(216e9, adoption);
    const envImpact = service.calculateEnvironmentalImpact(65e6);
    const socialImpact = service.calculateSocietalImpact(userCount * adoption);

    setImpact({
      consumerLevel: consumerImpact,
      retailerLevel: retailerImpact,
      environmentalLevel: envImpact,
      societalLevel: socialImpact,
    });
  }, []);

  if (!impact) {
    return <div className="text-center p-8">Loading impact metrics...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Consumer Impact */}
      <Card className="bg-blue-50 border-l-4 border-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>👥 Consumer Impact</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {formatNumber(impact.consumerLevel.timeToCheckout.timeSaved / 1e6)}M hours
              </div>
              <div className="text-xs text-gray-600 mb-2">Time Saved</div>
              <div className="text-sm text-gray-700">
                3 min checkout vs 15 min traditional
              </div>
              <div className="text-sm font-semibold text-green-600 mt-1">
                ${formatNumber(impact.consumerLevel.timeToCheckout.economicValue / 1e9)}B value
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {Math.round(impact.consumerLevel.fitConfidence.confidenceImprovement * 100)}%
              </div>
              <div className="text-xs text-gray-600 mb-2">Fit Confidence Improvement</div>
              <div className="text-sm text-gray-700">
                From 52% to 87% confident
              </div>
              <div className="text-sm font-semibold text-green-600 mt-1">
                {formatNumber(impact.consumerLevel.fitConfidence.affectedUsers / 1e6)}M users
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {formatNumber(impact.consumerLevel.returnsReduction.returnsPrevented / 1e6)}M items
              </div>
              <div className="text-xs text-gray-600 mb-2">Returns Eliminated</div>
              <div className="text-sm text-gray-700">No more return hassle</div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-900 mb-1">
                +{impact.consumerLevel.satisfactionImprovement.nps}
              </div>
              <div className="text-xs text-gray-600 mb-2">NPS Improvement</div>
              <div className="text-sm text-gray-700">
                {impact.consumerLevel.satisfactionImprovement.brandLoyalty}% more loyal
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retailer Impact */}
      <Card className="bg-green-50 border-l-4 border-green-600">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-green-600" />
            <span>🏪 Retailer Impact</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-900 mb-1">
                ${formatNumber(impact.retailerLevel.returnCostReduction.costSavings / 1e9)}B
              </div>
              <div className="text-xs text-gray-600 mb-2">Return Cost Savings</div>
              <div className="text-sm font-semibold text-green-600">
                {impact.retailerLevel.returnCostReduction.roi}x ROI
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-900 mb-1">
                +{Math.round(impact.retailerLevel.conversionImpact.conversionLift * 100)}%
              </div>
              <div className="text-xs text-gray-600 mb-2">Conversion Lift</div>
              <div className="text-sm text-gray-700">
                ${formatNumber(impact.retailerLevel.conversionImpact.aoV / 1e9)}B incremental AOV
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-900 mb-1">
                {Math.round(impact.retailerLevel.inventoryOptimization.wasteReduction * 100)}%
              </div>
              <div className="text-xs text-gray-600 mb-2">Waste Reduction</div>
              <div className="text-sm text-gray-700">
                {impact.retailerLevel.inventoryOptimization.stockoutReduction}% stockout reduction
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-900 mb-1">
                {impact.retailerLevel.operationalEfficiency.returnsProcessingTime}
              </div>
              <div className="text-xs text-gray-600 mb-2">Returns Processing Time</div>
              <div className="text-sm text-gray-700">
                {impact.retailerLevel.operationalEfficiency.customerServiceTickets} support tickets
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environmental Impact */}
      <Card className="bg-emerald-50 border-l-4 border-emerald-600">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Leaf className="w-5 h-5 text-emerald-600" />
            <span>🌍 Environmental Impact</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-3xl mb-2">🚗</div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatNumber(impact.environmentalLevel.equivalentTo.carsOffRoad / 1e3)}K
              </div>
              <div className="text-xs text-gray-600">Cars Off Road</div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-3xl mb-2">🌳</div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatNumber(impact.environmentalLevel.equivalentTo.treesPlanted / 1e6)}M
              </div>
              <div className="text-xs text-gray-600">Trees Planted</div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-3xl mb-2">♻️</div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatNumber(impact.environmentalLevel.landfillDiverted / 1e6)}M
              </div>
              <div className="text-xs text-gray-600">Items from Landfill</div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <div className="text-3xl mb-2">💧</div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatNumber(impact.environmentalLevel.waterSaved / 1e9)}B
              </div>
              <div className="text-xs text-gray-600">Liters Water Saved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Societal Impact */}
      <Card className="bg-purple-50 border-l-4 border-purple-600">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <span>🌐 Societal Impact</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="font-semibold mb-2">Accessibility</div>
              <div className="text-sm text-gray-700">
                {impact.societalLevel.accessibility.languagesSupported} languages supported
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {impact.societalLevel.accessibility.inclusiveDesign}
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <div className="font-semibold mb-2">Economic Opportunity</div>
              <div className="text-sm text-gray-700">
                {formatNumber(impact.societalLevel.economicOpportunity.jobsCreated / 1e3)}K jobs created
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {impact.societalLevel.economicOpportunity.smallBusinessEnable}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

