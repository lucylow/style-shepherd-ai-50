/**
 * Unit Economics Calculator
 * Interactive calculator showing ROI for retailers
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { TrendingUp, DollarSign, Percent, Package } from 'lucide-react';
import { Button } from './ui/button';

interface EconomicsResult {
  annualReturns: number;
  returnRate: number;
  returnHandlingCost: number;
  returnsPrevented: number;
  costSaved: number;
  performanceFee: number;
  netSavings: number;
  roi: number;
  breakEvenMonths: number;
}

export const UnitEconomicsCalculator = () => {
  const [annualOrders, setAnnualOrders] = useState(10000);
  const [avgOrderValue, setAvgOrderValue] = useState(75);
  const [currentReturnRate, setCurrentReturnRate] = useState(25); // percentage
  const [returnReductionTarget, setReturnReductionTarget] = useState(30); // percentage reduction
  const [handlingCostPerReturn, setHandlingCostPerReturn] = useState(30); // $ per return
  const [performanceFeePercent, setPerformanceFeePercent] = useState(12); // percentage of savings

  const calculateEconomics = (): EconomicsResult => {
    const annualReturns = annualOrders * (currentReturnRate / 100);
    const returnsPrevented = annualReturns * (returnReductionTarget / 100);
    const returnHandlingCost = annualReturns * handlingCostPerReturn;
    const costSaved = returnsPrevented * handlingCostPerReturn;
    const performanceFee = costSaved * (performanceFeePercent / 100);
    const netSavings = costSaved - performanceFee;
    const monthlyCost = 2500; // Pilot/month cost
    const annualCost = monthlyCost * 12;
    const roi = ((netSavings - annualCost) / annualCost) * 100;
    const breakEvenMonths = annualCost / (netSavings / 12);

    return {
      annualReturns,
      returnRate: currentReturnRate,
      returnHandlingCost,
      returnsPrevented,
      costSaved,
      performanceFee,
      netSavings,
      roi,
      breakEvenMonths: Math.max(0, breakEvenMonths),
    };
  };

  const results = calculateEconomics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Unit Economics Calculator</h2>
        <p className="text-muted-foreground">
          Calculate ROI and savings for your retail business
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Retailer Inputs</CardTitle>
            <CardDescription>
              Adjust these values to see potential savings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="annualOrders">Annual Orders</Label>
              <Input
                id="annualOrders"
                type="number"
                value={annualOrders}
                onChange={(e) => setAnnualOrders(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgOrderValue">Average Order Value ($)</Label>
              <Input
                id="avgOrderValue"
                type="number"
                value={avgOrderValue}
                onChange={(e) => setAvgOrderValue(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentReturnRate">Current Return Rate (%)</Label>
              <Input
                id="currentReturnRate"
                type="number"
                value={currentReturnRate}
                onChange={(e) => setCurrentReturnRate(Number(e.target.value))}
                min="0"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Industry average: 25% for online fashion
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnReduction">Expected Return Reduction (%)</Label>
              <Input
                id="returnReduction"
                type="number"
                value={returnReductionTarget}
                onChange={(e) => setReturnReductionTarget(Number(e.target.value))}
                min="0"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Pilot target: 15-30% reduction
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="handlingCost">Return Handling Cost per Return ($)</Label>
              <Input
                id="handlingCost"
                type="number"
                value={handlingCostPerReturn}
                onChange={(e) => setHandlingCostPerReturn(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Includes shipping, processing, restocking, inventory loss
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="performanceFee">Performance Fee (%)</Label>
              <Input
                id="performanceFee"
                type="number"
                value={performanceFeePercent}
                onChange={(e) => setPerformanceFeePercent(Number(e.target.value))}
                min="0"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Fee on prevented return savings (typically 10-15%)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* ROI Summary */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <CardTitle>Annual ROI Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Annual Returns (Current):</span>
                  <span className="font-semibold">{Math.round(results.annualReturns).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Returns Prevented:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {Math.round(results.returnsPrevented).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cost Saved:</span>
                  <span className="font-semibold">${Math.round(results.costSaved).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Performance Fee:</span>
                  <span className="font-semibold">${Math.round(results.performanceFee).toLocaleString()}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Net Savings:</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${Math.round(results.netSavings).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Annual ROI:</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {results.roi > 0 ? `${Math.round(results.roi)}%` : 'Break-even'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Current Return Costs:</span>
                </div>
                <span className="font-semibold">
                  ${Math.round(results.returnHandlingCost).toLocaleString()}/year
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">New Return Rate:</span>
                </div>
                <span className="font-semibold">
                  {((results.annualReturns - results.returnsPrevented) / annualOrders * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Break-even Period:</span>
                </div>
                <span className="font-semibold">
                  {results.breakEvenMonths > 0 
                    ? `${results.breakEvenMonths.toFixed(1)} months`
                    : 'Immediate ROI'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Environmental Impact */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-sm">Environmental Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CO₂ Saved:</span>
                  <span className="font-semibold">
                    {Math.round(results.returnsPrevented * 24).toLocaleString()}kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waste Prevented:</span>
                  <span className="font-semibold">
                    {Math.round(results.returnsPrevented * 2.2).toLocaleString()}kg
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

