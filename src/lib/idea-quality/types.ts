// Type definitions for Idea Quality Framework

export interface CompetitorAnalysis {
  id: string;
  name: string;
  category: 'voice-shopping' | 'fashion-ai' | 'returns-management' | 'sizing-tools';
  marketCap?: number;
  fundingStage?: string;
  keyFeatures: Feature[];
  limitations: Limitation[];
  targetMarket: string;
  fundingRaised?: number;
  launchYear: number;
}

export interface Feature {
  name: string;
  description: string;
  maturityLevel: 'basic' | 'advanced' | 'proprietary';
  styleShepherdAdvantage?: string;
}

export interface Limitation {
  area: string;
  description: string;
  styleShepherdSolution: string;
  impactScore: number; // 1-10
}

export interface MarketInsight {
  segment: string;
  size: number;
  cagr: number;
  year: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface CompetitiveAdvantage {
  advantage: string;
  defensibility: 'high' | 'medium' | 'low';
  timeToReplication: string;
  resourcesRequired: string;
  networkEffects: boolean;
}

export interface ComparisonMatrix {
  competitors: CompetitorAnalysis[];
  styleShepherd: {
    features: string[];
    uniquePoints: string[];
    competitiveAdvantages: CompetitiveAdvantage[];
  };
  marketPositioning: PositioningStatement;
}

export interface PositioningStatement {
  headline: string;
  subheading: string;
  keyMessage: string;
  targetSegment: string;
  differentiation: string[];
}

export interface MarketSizing {
  totalAddressableMarket: {
    value: number;
    components: {
      returnsManagement: number;
      voiceCommerce: number;
      consumerConvenience: number;
    };
  };
  serviceableAddressableMarket: {
    value: number;
    rationale: string;
  };
  serviceableObtainableMarket: {
    year1: number;
    year3: number;
    year5: number;
  };
  growthCatalysts: string[];
}

export interface EnvironmentalMetrics {
  carbonEmissionsPrevented: number;
  packagingWasteReduced: number;
  landfillDiverted: number;
  waterSaved: number;
  equivalentTo: {
    carsOffRoad: number;
    treesPlanted: number;
    homeElectricity: number;
  };
}

export interface BusinessImpact {
  retailerBenefit: {
    returnCostReductions: number;
    improvedInventory: number;
    customerLifetimeValueIncrease: number;
  };
  consumerBenefit: {
    timeToCheckout: string;
    fitConfidence: string;
    returnHassle: string;
  };
  styleshepherdRevenue: {
    year1: number;
    year3: number;
    year5: number;
  };
}

export interface ProblemStatement {
  problem: string;
  affectedUsers: number;
  economicImpact: number;
  frequencyOfOccurrence: string;
  emotionalImpact: string;
  currentSolutions: Solution[];
  solutionGaps: Gap[];
}

export interface Solution {
  name: string;
  effectiveness: number;
  limitation: string;
}

export interface Gap {
  gap: string;
  impact: string;
  styleShepherdSolution: string;
}

export interface ConsumerInsight {
  insight: string;
  source: string;
  relevance: 'High' | 'Medium' | 'Low';
  valueProposition: string;
}

export interface RetailerInsight {
  insight: string;
  source: string;
  relevance: 'Critical' | 'High' | 'Medium';
  styleShepherdBenefit: string;
}

export interface ConsumerMetrics {
  timeToCheckout: {
    baseline: number;
    withStyleShepherd: number;
    timeSaved: number;
    economicValue: number;
  };
  fitConfidence: {
    baseline: number;
    withStyleShepherd: number;
    confidenceImprovement: number;
    affectedUsers: number;
  };
  returnsReduction: {
    baselineReturnRate: number;
    withStyleShepherd: number;
    returnsPrevented: number;
    hassleEliminated: number;
  };
  satisfactionImprovement: {
    nps: string;
    repeatPurchaseRate: string;
    brandLoyalty: string;
  };
}

export interface RetailerMetrics {
  returnCostReduction: {
    returnsSaved: number;
    costSavings: number;
    roi: number;
  };
  conversionImpact: {
    conversionLift: number;
    aoV: number;
    customerAcquisitionCostReduction: number;
  };
  inventoryOptimization: {
    wasteReduction: number;
    stockoutReduction: number;
    inventoryTurns: string;
  };
  operationalEfficiency: {
    returnsProcessingTime: string;
    customerServiceTickets: string;
    automationRate: string;
  };
}

export interface SocietalMetrics {
  accessibility: {
    languagesSupported: number;
    culturalAdaptation: boolean;
    accessibilityScore: string;
    inclusiveDesign: string;
  };
  economicOpportunity: {
    jobsCreated: number;
    economicOutput: number;
    smallBusinessEnable: string;
  };
  educationalImpact: {
    sustainabilityAwareness: string;
    dataLiteracy: string;
    skillDevelopment: string;
  };
  equityImpact: {
    accessForUnderserved: string;
    womenInTech: string;
    inclusivity: string;
  };
}

export interface ImpactMetrics {
  consumerLevel: ConsumerMetrics;
  retailerLevel: RetailerMetrics;
  environmentalLevel: EnvironmentalMetrics;
  societalLevel: SocietalMetrics;
}

export interface InnovationScore {
  technicalNovelty: number;
  businessModelNovelty: number;
  marketTiming: number;
  defensibility: number;
  scalability: number;
  overallScore: number;
}

export interface CompetitiveMoat {
  moat: string;
  strength: 'strong' | 'medium' | 'weak';
  duration: string;
  networkEffects: boolean;
  description: string;
  timeToReplication: string;
  investmentRequired: number;
}

export interface MoatScore {
  overallMoatScore: number;
  moatRanking: string;
  defenseRating: string;
  timeBeforeCompetition: string;
  recommendation: string;
}

export interface IdeaQualityScore {
  overallScore: number;
  dimensions: {
    creativity: number;
    uniqueness: number;
    marketFit: number;
    realWorldImpact: number;
    feasibility: number;
    scalability: number;
    defensibility: number;
  };
  competitiveRanking: string;
  recommendation: string;
  strengths: string[];
  improvements: string[];
}

export interface ImpactProjection {
  consumerlevel: {
    usersImpacted: number;
    timeSaved: {
      hoursPerYear: number;
      economicValue: number;
    };
    returnsEliminated: number;
    stressEliminated: string;
  };
  retailerLevel: {
    returnsSaved: number;
    costSavings: number;
    conversionLift: number;
    repeatPurchaseIncrease: number;
  };
  environmentalLevel: {
    returnsPrevented: number;
    carbonEmissionsPrevented: number;
    packagingWasteReduced: number;
    equivalentTo: {
      carsTakenOffRoad: number;
      treesPlanted: number;
    };
  };
  societalLevel: {
    jobsCreated: number;
    smallBusinessEmpowered: string;
    sustainabilityEducated: number;
  };
}

export interface ComparisonDimension {
  dimension: string;
  competitors: Record<string, string>;
  styleShepherd: string;
  importance: string;
}

export interface DetailedComparisonMatrix {
  dimensions: ComparisonDimension[];
  overallWinnerAreas: string[];
}

// Judging Criteria Framework Types
export interface Evidence {
  type: 'statistic' | 'research' | 'user_validation' | 'market_analysis' | 'technical';
  value: string;
  source: string;
  relevance: string;
}

export interface JudgingCriteria {
  criterion: string;
  weight: number; // Relative importance
  maxScore: number;
  evidence: Evidence[];
  styleShepherdScore: number;
  reasoning: string;
}

export interface OverallJudgingAssessment {
  overallScore: number;
  criteria: JudgingCriteria[];
  ranking: string;
  verdict: string;
  competitorComparison: CompetitorComparison;
  recommendation: string;
}

export interface CompetitorComparison {
  styleShepherd: { score: number; percentile: string; tier: string };
  averageHackathonEntry: { score: number; gap: string };
  typicalWinner: { score: number; gap: string };
  championship: { score: number; gap: string };
}

export interface PDFContent {
  title: string;
  sections: PDFSection[];
}

export interface PDFSection {
  title: string;
  content: string;
}

