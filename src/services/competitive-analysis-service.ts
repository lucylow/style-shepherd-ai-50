import type {
  CompetitorAnalysis,
  ComparisonMatrix,
  CompetitiveAdvantage,
  PositioningStatement,
  Feature,
  Limitation,
} from '@/lib/idea-quality/types';

export class CompetitiveAnalysisService {
  async analyzeCompetitor(competitorName: string): Promise<CompetitorAnalysis> {
    // Pre-defined competitor data
    const competitorData: Record<string, Omit<CompetitorAnalysis, 'id'>> = {
      'Pinterest': {
        name: 'Pinterest',
        category: 'fashion-ai',
        marketCap: 20e9,
        fundingStage: 'Public',
        keyFeatures: [
          {
            name: 'Visual Discovery',
            description: 'Image-based fashion discovery',
            maturityLevel: 'advanced',
            styleShepherdAdvantage: 'No voice interface, no returns prevention',
          },
          {
            name: 'Style Boards',
            description: 'Users save and organize fashion inspiration',
            maturityLevel: 'advanced',
          },
        ],
        limitations: [
          {
            area: 'Returns Prevention',
            description: 'No focus on preventing returns before purchase',
            styleShepherdSolution: 'Proactive returns prediction engine',
            impactScore: 10,
          },
          {
            area: 'Voice Interface',
            description: 'No voice-first shopping experience',
            styleShepherdSolution: 'Specialized voice AI for fashion',
            impactScore: 8,
          },
        ],
        targetMarket: 'Visual discovery users',
        launchYear: 2010,
      },
      'True Fit': {
        name: 'True Fit',
        category: 'sizing-tools',
        fundingStage: 'Series C',
        keyFeatures: [
          {
            name: 'Size Recommendations',
            description: 'ML-based sizing suggestions',
            maturityLevel: 'advanced',
            styleShepherdAdvantage: 'Limited to sizing, no voice interface',
          },
        ],
        limitations: [
          {
            area: 'Returns Prevention',
            description: 'Reactive sizing, not proactive prevention',
            styleShepherdSolution: 'Predicts returns before purchase',
            impactScore: 10,
          },
          {
            area: 'Voice Interface',
            description: 'No conversational shopping experience',
            styleShepherdSolution: 'Voice-first fashion AI',
            impactScore: 9,
          },
        ],
        targetMarket: 'Online fashion retailers',
        fundingRaised: 55e6,
        launchYear: 2010,
      },
      'Google Shopping': {
        name: 'Google Shopping',
        category: 'voice-shopping',
        keyFeatures: [
          {
            name: 'Voice Search',
            description: 'Basic voice product search',
            maturityLevel: 'basic',
            styleShepherdAdvantage: 'No fashion expertise, no returns prevention',
          },
        ],
        limitations: [
          {
            area: 'Fashion Expertise',
            description: 'Generic shopping, no fashion-specific knowledge',
            styleShepherdSolution: 'Specialized fashion AI with style intelligence',
            impactScore: 9,
          },
          {
            area: 'Returns Prevention',
            description: 'No focus on preventing returns',
            styleShepherdSolution: 'Core returns prevention technology',
            impactScore: 10,
          },
        ],
        targetMarket: 'General e-commerce',
        launchYear: 2002,
      },
    };

    const data = competitorData[competitorName];
    if (!data) {
      // Default competitor
      return {
        id: competitorName.toLowerCase().replace(/\s+/g, '-'),
        name: competitorName,
        category: 'fashion-ai',
        keyFeatures: [],
        limitations: [],
        targetMarket: 'Unknown',
        launchYear: 2020,
      };
    }

    return {
      id: competitorName.toLowerCase().replace(/\s+/g, '-'),
      ...data,
    };
  }

  async compareAgainstCompetitors(
    competitors: string[],
    styleShepherdFeatures: string[]
  ): Promise<ComparisonMatrix> {
    const analyses = await Promise.all(
      competitors.map(c => this.analyzeCompetitor(c))
    );

    return {
      competitors: analyses,
      styleShepherd: {
        features: styleShepherdFeatures,
        uniquePoints: this.extractUniquePoints(analyses, styleShepherdFeatures),
        competitiveAdvantages: this.identifyAdvantages(analyses, styleShepherdFeatures),
      },
      marketPositioning: this.generatePositioning(analyses),
    };
  }

  private extractUniquePoints(
    competitors: CompetitorAnalysis[],
    styleShepherdFeatures: string[]
  ): string[] {
    const competitorFeatures = new Set(
      competitors.flatMap(c => c.keyFeatures.map(f => f.name))
    );
    return styleShepherdFeatures.filter(f => !competitorFeatures.has(f));
  }

  private identifyAdvantages(
    competitors: CompetitorAnalysis[],
    styleShepherdFeatures: string[]
  ): CompetitiveAdvantage[] {
    const advantages: CompetitiveAdvantage[] = [
      {
        advantage: 'Proactive Returns Prediction Engine - Unique in market',
        defensibility: 'high',
        timeToReplication: '18-24 months',
        resourcesRequired: 'Significant ML expertise + proprietary data',
        networkEffects: true,
      },
      {
        advantage: 'Voice-First Interface Designed for Fashion Complexity',
        defensibility: 'medium',
        timeToReplication: '12-18 months',
        resourcesRequired: 'ElevenLabs integration + fashion NLP training',
        networkEffects: false,
      },
      {
        advantage: 'Cross-Brand Personalization Without Retailer Partnerships',
        defensibility: 'high',
        timeToReplication: '24+ months',
        resourcesRequired: 'Brand partnerships + massive dataset',
        networkEffects: true,
      },
    ];
    return advantages;
  }

  private generatePositioning(competitors: CompetitorAnalysis[]): PositioningStatement {
    return {
      headline: 'The Personal Fashion Guardian That Prevents Returns',
      subheading: 'Voice-first AI that learns your style and predicts perfect fits',
      keyMessage: 'Style Shepherd turns returns management from reactive to proactive',
      targetSegment: 'Fashion-conscious online shoppers seeking convenience and fit confidence',
      differentiation: [
        'Only solution combining voice shopping with returns prevention',
        'Proprietary sizing prediction using return patterns',
        'Emotional intelligence in fashion conversations',
      ],
    };
  }

  generateDetailedComparison(): {
    dimensions: Array<{
      dimension: string;
      competitors: Record<string, string>;
      styleShepherd: string;
      importance: string;
    }>;
    overallWinnerAreas: string[];
  } {
    return {
      dimensions: [
        {
          dimension: 'Returns Prevention Capability',
          competitors: {
            'Pinterest': 'Not addressed',
            'True Fit': 'Limited to sizing',
            'Google Assistant': 'No fashion expertise',
            'Traditional Checkout': 'Not addressed',
          },
          styleShepherd: 'Proprietary ML predicts and prevents returns before purchase',
          importance: 'Critical',
        },
        {
          dimension: 'Voice-First Fashion Conversation',
          competitors: {
            'Amazon Alexa': 'Generic shopping, no fashion knowledge',
            'Google Shopping': 'Text-based primarily',
            'Fashion Apps': 'Visual interface, manual browsing',
            'Personal Shoppers': 'Expensive, not scalable',
          },
          styleShepherd: 'Specialized voice AI trained for complex fashion decisions',
          importance: 'High',
        },
        {
          dimension: 'Cross-Brand Sizing Knowledge',
          competitors: {
            'Brand Websites': 'Siloed, incomplete',
            'Wikipedia Size Chart': 'Manual, outdated',
            "Amazon's Fit Score": 'Limited to Amazon products',
            'True Fit': 'Limited integration',
          },
          styleShepherd: 'Comprehensive database across 500+ brands learning from returns',
          importance: 'High',
        },
        {
          dimension: 'Environmental Impact Tracking',
          competitors: {
            'All competitors': 'Not measured or communicated',
          },
          styleShepherd: 'Quantifies and monetizes returns prevention environmental benefit',
          importance: 'Differentiator',
        },
        {
          dimension: 'Learning from Returns Data',
          competitors: {
            'All competitors': 'One-way data flow - no learning from returns',
          },
          styleShepherd: 'Proprietary feedback loop - better predictions over time',
          importance: 'Critical moat',
        },
      ],
      overallWinnerAreas: [
        'Returns Prevention (unique capability)',
        'Voice + Fashion Integration (novel)',
        'Environmental Impact (meaningful differentiator)',
        'Multi-stakeholder Value (consumers + retailers + planet)',
      ],
    };
  }
}

