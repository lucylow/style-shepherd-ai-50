'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketSizeCalculator } from '@/services/market-size-calculator';
import type { MarketSizing, EnvironmentalMetrics, BusinessImpact } from '@/lib/idea-quality/types';
import { DollarSign, TrendingUp, Leaf, Building2 } from 'lucide-react';

function formatCurrency(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toFixed(0)}`;
}

export function MarketOpportunityDashboard() {
  const [market, setMarket] = useState<MarketSizing | null>(null);
  const [envImpact, setEnvImpact] = useState<EnvironmentalMetrics | null>(null);
  const [businessImpact, setBusinessImpact] = useState<BusinessImpact | null>(null);

  useEffect(() => {
    const calculator = new MarketSizeCalculator();
    setMarket(calculator.calculateTotalAddressableMarket(2025));
    setEnvImpact(calculator.calculateEnvironmentalImpact(0.25, 2028));
    setBusinessImpact(calculator.calculateBusinessImpact(0.25));
  }, []);

  if (!market || !envImpact || !businessImpact) {
    return <div className="text-center p-8">Loading market data...</div>;
  }

  return (
    <div className="space-y-8">
      {/* TAM/SAM/SOM */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Market Opportunity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <DollarSign className="w-5 h-5" />
                <span>Total Addressable Market</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-2">
                {formatCurrency(market.totalAddressableMarket.value)}
              </div>
              <p className="text-sm text-gray-700">
                Global returns management + voice commerce opportunity
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                <span>Serviceable Addressable Market</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 mb-2">
                {formatCurrency(market.serviceableAddressableMarket.value)}
              </div>
              <p className="text-sm text-gray-700">
                {market.serviceableAddressableMarket.rationale}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Building2 className="w-5 h-5" />
                <span>Year 5 Revenue Potential</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-2">
                {formatCurrency(market.serviceableObtainableMarket.year5 * 0.015)}
              </div>
              <p className="text-sm text-gray-700">At 1.5% merchant commission</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Market Components */}
      <Card>
        <CardHeader>
          <CardTitle>Market Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Returns Management</span>
              <span className="font-bold">{formatCurrency(market.totalAddressableMarket.components.returnsManagement)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Voice Commerce</span>
              <span className="font-bold">{formatCurrency(market.totalAddressableMarket.components.voiceCommerce)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Consumer Convenience</span>
              <span className="font-bold">{formatCurrency(market.totalAddressableMarket.components.consumerConvenience)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environmental Impact */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Leaf className="w-5 h-5 text-emerald-600" />
            <span>Environmental Impact at Scale (25% Adoption)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-900">
                {Math.round(envImpact.carbonEmissionsPrevented / 1e6)}M
              </div>
              <div className="text-xs text-gray-600">Tons CO₂ Prevented</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-900">
                {Math.round(envImpact.equivalentTo.treesPlanted / 1e6)}M
              </div>
              <div className="text-xs text-gray-600">Trees Planted Equivalent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-900">
                {Math.round(envImpact.equivalentTo.carsOffRoad / 1e3)}K
              </div>
              <div className="text-xs text-gray-600">Cars Off Road</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-900">
                {Math.round(envImpact.landfillDiverted / 1e9)}B
              </div>
              <div className="text-xs text-gray-600">Items from Landfill</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Business Impact for Retailers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-600 mb-1">
                {formatCurrency(businessImpact.retailerBenefit.returnCostReductions)}
              </div>
              <div className="text-sm text-gray-600">Return Cost Reductions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatCurrency(businessImpact.retailerBenefit.improvedInventory)}
              </div>
              <div className="text-sm text-gray-600">Improved Inventory Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {formatCurrency(businessImpact.retailerBenefit.customerLifetimeValueIncrease)}
              </div>
              <div className="text-sm text-gray-600">CLV Increase</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Catalysts */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Catalysts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {market.growthCatalysts.map((catalyst, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <span className="text-sm">{catalyst}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

