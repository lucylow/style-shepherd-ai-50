import type { InnovationScore } from '@/lib/idea-quality/types';

export class InnovationScoringService {
  calculateInnovationScore(): InnovationScore {
    const technicalNovelty = this.scoreTechnicalInnovation();
    const businessModelNovelty = this.scoreBusinessModelInnovation();
    const marketTiming = this.scoreMarketTiming();
    const defensibility = this.scoreDefensibility();
    const scalability = this.scoreScalability();

    const overallScore = (
      technicalNovelty * 0.25 +
      businessModelNovelty * 0.20 +
      marketTiming * 0.20 +
      defensibility * 0.20 +
      scalability * 0.15
    );

    return {
      technicalNovelty,
      businessModelNovelty,
      marketTiming,
      defensibility,
      scalability,
      overallScore: Math.round(overallScore),
    };
  }

  private scoreTechnicalInnovation(): number {
    const scores = {
      returnsPredictor: 9, // Proprietary ML model + unique data
      multiAgentArchitecture: 8, // Advanced but not revolutionary
      voiceFashion: 8, // Novel intersection of domains
      crossBrandPersonalization: 9, // Hard to replicate
      realtimeInference: 7, // Mature technology, well-executed
    };
    return Object.values(scores).reduce((a, b) => a + b) / Object.values(scores).length;
  }

  private scoreBusinessModelNovelty(): number {
    const scores = {
      returnsPrevention: 9, // Unique value prop - nobody else does this
      revenueShare: 8, // Aligned with retailer success
      multiStakeholder: 8, // Solves for consumers, retailers, environment
      networkEffects: 9, // Gets better with scale
      sustainability: 8, // Monetizes environmental benefit
    };
    return Object.values(scores).reduce((a, b) => a + b) / Object.values(scores).length;
  }

  private scoreMarketTiming(): number {
    const scores = {
      voiceCommerceTiming: 9, // $40B market emerging now
      sustainabilityTrend: 9, // Top of mind for enterprises
      returnsVolume: 8, // Growing with e-commerce
      techMaturity: 8, // LLMs + voice AI ready for prime time
      consumerReadiness: 7, // Voice adoption at 45% of millennials
    };
    return Object.values(scores).reduce((a, b) => a + b) / Object.values(scores).length;
  }

  private scoreDefensibility(): number {
    const scores = {
      dataMoat: 9, // Proprietary returns data = powerful moat
      networkEffects: 8, // More users = better recommendations
      brand: 7, // Can build strong brand in emerging category
      patents: 8, // Potential for patentable ML methods
      switching: 7, // Medium switching cost once integrated
    };
    return Object.values(scores).reduce((a, b) => a + b) / Object.values(scores).length;
  }

  private scoreScalability(): number {
    const scores = {
      saasBusiness: 9, // Software scales with fixed costs
      internationalExpansion: 8, // Voice can work in any language
      verticalExpansion: 8, // Sizing works for all fashion categories
      dataNetworks: 9, // Better with more retailers
      marginImprovement: 8, // Improves as scale increases
    };
    return Object.values(scores).reduce((a, b) => a + b) / Object.values(scores).length;
  }
}

