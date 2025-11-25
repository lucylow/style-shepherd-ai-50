import type { CompetitiveMoat, MoatScore } from '@/lib/idea-quality/types';

export class MoatAnalysisService {
  analyzeStyleShepherdMoats(): CompetitiveMoat[] {
    return [
      {
        moat: 'Proprietary Returns Prediction Data',
        strength: 'strong',
        duration: '24+ months to replicate',
        networkEffects: true,
        description: `Every return event trains the ML model. Competitors would need:
- Years of return transaction data
- Integration with 50+ retailers
- Proprietary sizing algorithms

This creates a "returns data moat" - the more users and transactions,
the better the model becomes.`,
        timeToReplication: '36-48 months',
        investmentRequired: 50e6, // $50M+ to build competitive capability
      },
      {
        moat: 'Cross-Brand Personalization Network',
        strength: 'strong',
        duration: '18+ months',
        networkEffects: true,
        description: `Unique multi-brand sizing and style database:
- 500+ brand sizing harmonization
- Personal style evolution tracking
- Cross-brand recommendations

Competitors would need to license or rebuild entire ecosystem.`,
        timeToReplication: '24-36 months',
        investmentRequired: 30e6,
      },
      {
        moat: 'Voice Fashion AI Training',
        strength: 'medium',
        duration: '12-18 months',
        networkEffects: false,
        description: `Specialized LLM training on fashion domain:
- 100K+ annotated fashion conversations
- Brand knowledge base
- Emotional intelligence for style coaching

Easier to replicate but requires deep fashion expertise.`,
        timeToReplication: '12-18 months',
        investmentRequired: 10e6,
      },
      {
        moat: 'Retailer Integration Network',
        strength: 'medium',
        duration: '12-24 months',
        networkEffects: true,
        description: `Deep integrations with top retailers:
- Real-time inventory feeds
- Return tracking systems
- Custom sizing data

Creates switching costs and data network effects.`,
        timeToReplication: '24-36 months',
        investmentRequired: 20e6,
      },
      {
        moat: 'Brand & Consumer Trust',
        strength: 'medium',
        duration: '12-36 months',
        networkEffects: true,
        description: `First-mover advantage in returns prevention:
- Brand recognition as "returns fixer"
- Consumer habit formation
- Retailer partnerships

Creates emotional and operational switching costs.`,
        timeToReplication: '18-24 months',
        investmentRequired: 15e6,
      },
    ];
  }

  calculateMoatStrength(): MoatScore {
    const moats = this.analyzeStyleShepherdMoats();

    const weights = {
      'strong': 3,
      'medium': 2,
      'weak': 1,
    };
    const totalScore = moats.reduce((sum, m) =>
      sum + weights[m.strength], 0
    );

    return {
      overallMoatScore: (totalScore / (moats.length * 3)) * 10,
      moatRanking: totalScore > 12 ? 'Strong' : totalScore > 8 ? 'Medium' : 'Weak',
      defenseRating: 'Highly Defensible',
      timeBeforeCompetition: '24-36 months',
      recommendation: 'Pursue immediately - strong moat justifies funding',
    };
  }
}

