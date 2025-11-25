import type {
  MarketSizing,
  EnvironmentalMetrics,
  BusinessImpact,
} from '@/lib/idea-quality/types';

export class MarketSizeCalculator {
  calculateTotalAddressableMarket(year: number = 2025): MarketSizing {
    // Online fashion e-commerce market
    const onlineRetailSize = 1200e9; // $1.2T in 2024
    const fashionPercentage = 0.18; // 18% of online retail
    const baseMarket = onlineRetailSize * fashionPercentage;

    // Returns management specific opportunity
    const returnRate = 0.30; // 30% return rate for online fashion
    const returnsVolume = baseMarket * returnRate;
    const costPerReturn = 45; // $45 average return handling cost
    const returnsManagementMarket = returnsVolume * costPerReturn;

    // Voice commerce TAM
    const voiceCommerceMarket = 40e9; // $40B projected 2025
    const fashionVoiceShare = 0.15; // 15% of voice commerce

    return {
      totalAddressableMarket: {
        value: returnsManagementMarket + (voiceCommerceMarket * fashionVoiceShare),
        components: {
          returnsManagement: returnsManagementMarket,
          voiceCommerce: voiceCommerceMarket * fashionVoiceShare,
          consumerConvenience: baseMarket * 0.08, // 8% willing to pay for perfect fit
        },
      },
      serviceableAddressableMarket: {
        value: returnsManagementMarket * 0.15, // Attainable in 3-5 years
        rationale: 'Targeting top 15% of high-volume online retailers',
      },
      serviceableObtainableMarket: {
        year1: baseMarket * fashionPercentage * 0.002, // 0.2% penetration Year 1
        year3: baseMarket * fashionPercentage * 0.08,  // 8% penetration Year 3
        year5: baseMarket * fashionPercentage * 0.15,   // 15% penetration Year 5
      },
      growthCatalysts: [
        'Increasing return rates (now 30-40% for online fashion)',
        'Consumer demand for sustainability',
        'Enterprise adoption of voice AI',
        'Integration with major retailers (Shopify, WooCommerce)',
        'Expansion to accessories and jewelry',
      ],
    };
  }

  calculateEnvironmentalImpact(
    adoptionRate: number,
    year: number
  ): EnvironmentalMetrics {
    const currentReturns = 5e9; // 5 billion fashion returns annually
    const preventedReturns = currentReturns * adoptionRate;

    // Environmental cost per return
    const carbonPerReturn = 24; // kg CO2
    const packagingWastePerReturn = 2.5; // kg

    return {
      carbonEmissionsPrevented: preventedReturns * carbonPerReturn,
      packagingWasteReduced: preventedReturns * packagingWastePerReturn,
      landfillDiverted: preventedReturns * 0.95, // 95% would go to landfill
      waterSaved: preventedReturns * 150, // liters of water saved per prevented return
      equivalentTo: {
        carsOffRoad: (preventedReturns * carbonPerReturn) / 3500, // km driven
        treesPlanted: (preventedReturns * carbonPerReturn) / 21, // kg CO2 per tree per year
        homeElectricity: (preventedReturns * carbonPerReturn) / 4.7, // tons CO2 per home per year
      },
    };
  }

  calculateBusinessImpact(adoptionRate: number): BusinessImpact {
    const fashionEcommerce = 216e9; // $216B US fashion e-commerce 2024
    const targetMarket = fashionEcommerce * adoptionRate;

    return {
      retailerBenefit: {
        returnCostReductions: (fashionEcommerce * 0.30) * (45) * adoptionRate * 0.25, // 25% reduction
        improvedInventory: fashionEcommerce * adoptionRate * 0.05,
        customerLifetimeValueIncrease: fashionEcommerce * adoptionRate * 0.12,
      },
      consumerBenefit: {
        timeToCheckout: 'Reduced from 15 min to 3 min',
        fitConfidence: 'Improved from 52% to 87%',
        returnHassle: 'Eliminated for 70% of purchases',
      },
      styleshepherdRevenue: {
        year1: targetMarket * 0.001, // 0.1% commission
        year3: targetMarket * 0.015, // 1.5% commission
        year5: targetMarket * 0.025,  // 2.5% commission
      },
    };
  }
}

