import type { ImpactProjection } from '@/lib/idea-quality/types';

export class SolutionImpactCalculator {
  calculateStyleShepherdImpact(
    annualFashionGMV: number = 216e9, // $216B US
    adoptionRate: number = 0.25 // Conservative 25% in Year 3
  ): ImpactProjection {
    const targetMarket = annualFashionGMV * adoptionRate;
    const baseReturnRate = 0.30;
    const optimizedReturnRate = 0.12;
    const costPerReturn = 45;
    const avgItemsPerOrder = 5;

    return {
      consumerlevel: {
        usersImpacted: 450e6 * adoptionRate,
        timeSaved: {
          hoursPerYear: (450e6 * adoptionRate * 12 * 0.67), // 67% time reduction on returns
          economicValue: (450e6 * adoptionRate * 12 * 0.67) * 20, // $20/hr
        },
        returnsEliminated: (targetMarket * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate)),
        stressEliminated: '45% reduction in shopping anxiety',
      },
      retailerLevel: {
        returnsSaved: (targetMarket * baseReturnRate * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate)),
        costSavings: (targetMarket * baseReturnRate * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate)) * costPerReturn,
        conversionLift: targetMarket * 0.12, // 12% increase in conversions
        repeatPurchaseIncrease: targetMarket * 0.18,
      },
      environmentalLevel: {
        returnsPrevented: (targetMarket * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate)),
        carbonEmissionsPrevented: (targetMarket * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate)) * 24,
        packagingWasteReduced: (targetMarket * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate)) * 2.5,
        equivalentTo: {
          carsTakenOffRoad: Math.round((targetMarket * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate) * 24) / 4000),
          treesPlanted: Math.round((targetMarket * avgItemsPerOrder * (baseReturnRate - optimizedReturnRate) * 24) / 21),
        },
      },
      societalLevel: {
        jobsCreated: Math.round((450e6 * adoptionRate) * 0.00015),
        smallBusinessEmpowered: 'Enables SMB retailers to compete at scale',
        sustainabilityEducated: Math.round(450e6 * adoptionRate * 1.5), // Multiplier effect
      },
    };
  }
}

