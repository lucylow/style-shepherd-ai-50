/**
 * TypeScript types for ElevenLabs voice agents mock data
 */

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

export interface ElevenAgentsData {
  reference_slide_url: string;
  agents: VoiceAgent[];
  conversations: ConversationExample[];
  elevenlabs_api_templates: Record<string, any>;
  fallback_strategy: Record<string, any>;
  usage_and_billing_mock: Record<string, any>;
  agent_configuration_examples: AgentConfiguration[];
  test_integration_snippets: Record<string, any>;
}

