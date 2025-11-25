/**
 * MSW (Mock Service Worker) handlers for ElevenLabs voice agents
 * 
 * Usage:
 * 1. Install MSW: npm install -D msw
 * 2. Import and use these handlers in your test setup or dev environment
 * 3. Or use json-server: npx json-server --watch mocks/eleven_agents.json --port 4001
 */

import type { VoiceAgent, ConversationExample } from './elevenAgentsTypes';

// Mock data - in production, this would be loaded from the JSON file
const mockAgentsData = {
  reference_slide_url: "/mnt/data/A_presentation_slide_titled_\"The_Challenge_in_Fash.png",
  agents: [] as VoiceAgent[],
  conversations: [] as ConversationExample[],
};

// Load mock data (for browser/MSW usage)
async function loadMockData() {
  try {
    const response = await fetch('/mocks/eleven_agents.json');
    const data = await response.json();
    Object.assign(mockAgentsData, data);
  } catch (error) {
    console.warn('Failed to load mock agents data:', error);
  }
}

// MSW handlers
export const elevenAgentsHandlers = [
  // GET /api/agents - Get all agents
  {
    method: 'get',
    path: '/api/agents',
    response: async () => {
      await loadMockData();
      return {
        status: 200,
        body: {
          agents: mockAgentsData.agents,
          count: mockAgentsData.agents.length,
        },
      };
    },
  },

  // GET /api/agents/:agentId - Get specific agent
  {
    method: 'get',
    path: '/api/agents/:agentId',
    response: async ({ params }: { params: { agentId: string } }) => {
      await loadMockData();
      const agent = mockAgentsData.agents.find(a => a.agent_id === params.agentId);
      if (!agent) {
        return {
          status: 404,
          body: { error: 'Agent not found' },
        };
      }
      return {
        status: 200,
        body: { agent },
      };
    },
  },

  // POST /api/assistant - Process assistant query with agent
  {
    method: 'post',
    path: '/api/assistant',
    response: async ({ body }: { body: any }) => {
      await loadMockData();
      const { session_id, agent_id, text } = body;
      
      // Find agent
      const agent = mockAgentsData.agents.find(a => a.agent_id === agent_id) || mockAgentsData.agents[0];
      
      // Mock response based on agent capabilities
      const response = {
        text: `[Mock] ${agent.display_name} says: ${text}`,
        agent_id: agent.agent_id,
        tts_url: `/mock_audio/${agent.agent_id}/${session_id}_${Date.now()}.wav`,
        fallback: 'browser',
        actions: [],
      };

      return {
        status: 200,
        body: response,
      };
    },
  },

  // POST /api/tts - Generate TTS with agent voice
  {
    method: 'post',
    path: '/api/tts',
    response: async ({ body }: { body: any }) => {
      await loadMockData();
      const { text, agent_id, voice_id } = body;
      const agent = mockAgentsData.agents.find(a => 
        a.agent_id === agent_id || a.voice_id === voice_id
      ) || mockAgentsData.agents[0];

      return {
        status: 200,
        body: {
          audio_url: `/mock_audio/${agent.agent_id}/tts_${Date.now()}.wav`,
          fallback: 'browser',
          agent_id: agent.agent_id,
          voice_settings: {
            stability: agent.stability,
            similarity_boost: agent.similarity_boost,
          },
        },
      };
    },
  },

  // GET /api/conversations/:sessionId - Get conversation example
  {
    method: 'get',
    path: '/api/conversations/:sessionId',
    response: async ({ params }: { params: { sessionId: string } }) => {
      await loadMockData();
      const conversation = mockAgentsData.conversations.find(
        c => c.session_id === params.sessionId
      );
      if (!conversation) {
        return {
          status: 404,
          body: { error: 'Conversation not found' },
        };
      }
      return {
        status: 200,
        body: { conversation },
      };
    },
  },
];

// Simple fetch-based mock service (no MSW required)
export class ElevenAgentsMockService {
  private baseUrl = '/api';

  async getAgents(): Promise<VoiceAgent[]> {
    const response = await fetch(`${this.baseUrl}/agents`);
    const data = await response.json();
    return data.agents || [];
  }

  async getAgent(agentId: string): Promise<VoiceAgent | null> {
    const response = await fetch(`${this.baseUrl}/agents/${agentId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.agent || null;
  }

  async processAssistantQuery(params: {
    session_id: string;
    agent_id: string;
    text: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }

  async generateTTS(params: {
    text: string;
    agent_id?: string;
    voice_id?: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
}

// Export singleton instance
export const elevenAgentsMockService = new ElevenAgentsMockService();

