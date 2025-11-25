/**
 * Agent Registry Service
 * Loads and manages the 11 ElevenLabs-style voice agents from mock data
 * Provides agent selection, configuration, and fallback strategies
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

export interface VoiceAgent {
  agent_id: string;
  display_name: string;
  voice_id: string;
  language: string;
  gender: 'male' | 'female';
  persona: string;
  style_tags: string[];
  stability: number;
  similarity_boost: number;
  default_speed: number;
  default_pitch: number;
  fallback_order: string[];
  sample_phrases: string[];
  capabilities: string[];
}

export interface AgentConfiguration {
  agent_id: string;
  dialog_config: {
    max_turns_before_summary?: number;
    should_ask_size_confirmation?: boolean;
    auto_add_to_cart_after_confirmation?: boolean;
    auto_create_invoice_on_confirm?: boolean;
    voice_properties: {
      voice_id: string;
      stability: number;
      similarity_boost: number;
    };
  };
}

export interface ConversationTurn {
  speaker: 'user' | 'agent' | 'merchant';
  text: string;
  ts: string;
  actions?: string[];
}

export interface ConversationExample {
  session_id: string;
  agent_id: string;
  turns: ConversationTurn[];
}

export interface ElevenAgentsData {
  reference_slide_url: string;
  agents: VoiceAgent[];
  conversations: ConversationExample[];
  elevenlabs_api_templates: {
    tts_request_json: {
      url_template: string;
      headers: Record<string, string>;
      body_example: Record<string, any>;
    };
    streaming_request_json: {
      url_template: string;
      notes: string;
    };
  };
  fallback_strategy: {
    priority: Array<{
      name: string;
      type: 'client' | 'server' | 'external';
      notes: string;
    }>;
    selection_logic: string;
  };
  usage_and_billing_mock: {
    agent_usage_examples: Array<{
      agent_id: string;
      monthly_calls: number;
      avg_duration_sec: number;
      estimated_tts_cost_usd: number;
    }>;
    quota: {
      free_tier_calls: number;
      premium_tier_calls: number;
      notes: string;
    };
  };
  agent_configuration_examples: AgentConfiguration[];
  test_integration_snippets: {
    playback_test: {
      description: string;
      steps: string[];
    };
    mock_webhook_event: {
      description: string;
      payload_example: Record<string, any>;
    };
  };
}

export class AgentRegistry {
  private agents: Map<string, VoiceAgent> = new Map();
  private conversations: Map<string, ConversationExample> = new Map();
  private configurations: Map<string, AgentConfiguration> = new Map();
  private data: ElevenAgentsData | null = null;
  private initialized = false;

  /**
   * Load agents from the mock JSON file
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Try to load from mocks directory (relative to server root)
      const mockPath = join(process.cwd(), '..', 'mocks', 'eleven_agents.json');
      const fileContent = await readFile(mockPath, 'utf-8');
      this.data = JSON.parse(fileContent) as ElevenAgentsData;

      // Index agents by agent_id
      for (const agent of this.data.agents) {
        this.agents.set(agent.agent_id, agent);
      }

      // Index conversations by session_id
      for (const conv of this.data.conversations) {
        this.conversations.set(conv.session_id, conv);
      }

      // Index configurations by agent_id
      for (const config of this.data.agent_configuration_examples) {
        this.configurations.set(config.agent_id, config);
      }

      this.initialized = true;
      console.log(`✅ Agent Registry initialized with ${this.agents.size} agents`);
    } catch (error) {
      console.warn('⚠️ Failed to load agent registry from file, using empty registry:', error);
      this.initialized = true; // Mark as initialized to prevent retries
    }
  }

  /**
   * Get all available agents
   */
  getAllAgents(): VoiceAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): VoiceAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent by capability (e.g., "size_recommendation", "merchant_onboarding")
   */
  getAgentsByCapability(capability: string): VoiceAgent[] {
    return this.getAllAgents().filter(agent => 
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Get agent by style tag
   */
  getAgentsByStyleTag(tag: string): VoiceAgent[] {
    return this.getAllAgents().filter(agent =>
      agent.style_tags.includes(tag)
    );
  }

  /**
   * Get agent configuration
   */
  getAgentConfiguration(agentId: string): AgentConfiguration | undefined {
    return this.configurations.get(agentId);
  }

  /**
   * Get conversation example by session ID
   */
  getConversationExample(sessionId: string): ConversationExample | undefined {
    return this.conversations.get(sessionId);
  }

  /**
   * Get all conversation examples for an agent
   */
  getConversationsByAgent(agentId: string): ConversationExample[] {
    return this.data?.conversations.filter(conv => conv.agent_id === agentId) || [];
  }

  /**
   * Get fallback strategy configuration
   */
  getFallbackStrategy() {
    return this.data?.fallback_strategy;
  }

  /**
   * Get ElevenLabs API templates
   */
  getElevenLabsTemplates() {
    return this.data?.elevenlabs_api_templates;
  }

  /**
   * Get usage and billing mock data
   */
  getUsageAndBilling() {
    return this.data?.usage_and_billing_mock;
  }

  /**
   * Get reference slide URL
   */
  getReferenceSlideUrl(): string | undefined {
    return this.data?.reference_slide_url;
  }

  /**
   * Suggest agent based on intent or context
   */
  suggestAgent(context: {
    intent?: string;
    capability?: string;
    style?: string;
    userType?: 'customer' | 'merchant' | 'vip';
  }): VoiceAgent | undefined {
    const { intent, capability, style, userType } = context;

    // Priority 1: User type
    if (userType === 'merchant') {
      return this.getAgentsByCapability('merchant_onboarding')[0] || this.getAgent('agent_liam');
    }
    if (userType === 'vip') {
      return this.getAgent('agent_isabella');
    }

    // Priority 2: Capability
    if (capability) {
      const agents = this.getAgentsByCapability(capability);
      if (agents.length > 0) {
        return agents[0];
      }
    }

    // Priority 3: Intent-based selection
    if (intent) {
      switch (intent) {
        case 'search_product':
        case 'get_recommendations':
          return this.getAgent('agent_rachel');
        case 'return_product':
          return this.getAgent('agent_sophia');
        case 'add_to_cart':
        case 'checkout_flow':
          return this.getAgent('agent_oliver');
        case 'get_style_advice':
        case 'trend_recommendation':
          return this.getAgent('agent_ava');
        default:
          return this.getAgent('agent_rachel'); // Default to Rachel
      }
    }

    // Priority 4: Style-based selection
    if (style) {
      const agents = this.getAgentsByStyleTag(style);
      if (agents.length > 0) {
        return agents[0];
      }
    }

    // Default fallback
    return this.getAgent('agent_rachel');
  }

  /**
   * Convert agent to VoiceSettings for VoiceAssistant service
   */
  agentToVoiceSettings(agent: VoiceAgent): {
    voiceId: string;
    modelId: string;
    stability: number;
    similarityBoost: number;
    style?: number;
    useSpeakerBoost?: boolean;
  } {
    return {
      voiceId: agent.voice_id,
      modelId: 'eleven_multilingual_v2', // Default model
      stability: agent.stability,
      similarityBoost: agent.similarity_boost,
      style: 0.5, // Default style value
      useSpeakerBoost: true,
    };
  }

  /**
   * Get mock data for testing
   */
  getMockData(): ElevenAgentsData | null {
    return this.data;
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();

// Auto-initialize on import (non-blocking)
agentRegistry.initialize().catch(err => {
  console.error('Failed to auto-initialize agent registry:', err);
});

