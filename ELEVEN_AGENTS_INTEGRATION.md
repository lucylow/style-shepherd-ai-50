# ElevenLabs Voice Agents Integration Summary

## ✅ What's Been Completed

### 1. Mock Data File
- **Location**: `mocks/eleven_agents.json`
- **Contains**: 11 agent profiles, conversation examples, API templates, fallback strategies, usage/billing mocks

### 2. Backend Services
- **AgentRegistry Service**: `server/src/services/AgentRegistry.ts`
  - Loads and manages agents from JSON
  - Provides agent selection by capability, style, intent
  - Converts agents to voice settings
  - Singleton pattern for easy access

- **Agent Routes**: `server/src/routes/agents.ts`
  - `GET /api/agents` - List all agents
  - `GET /api/agents/:agentId` - Get specific agent
  - `GET /api/agents/by-capability/:capability` - Filter by capability
  - `GET /api/agents/by-style/:tag` - Filter by style tag
  - `POST /api/agents/suggest` - Suggest agent based on context
  - `GET /api/conversations/:sessionId` - Get conversation example
  - `GET /api/conversations/by-agent/:agentId` - Get conversations for agent
  - `GET /api/agents/config/fallback-strategy` - Get fallback config
  - `GET /api/agents/config/usage-billing` - Get usage/billing data

### 3. Frontend Types & Mock Service
- **TypeScript Types**: `src/mocks/elevenAgentsTypes.ts`
- **MSW Handlers**: `src/mocks/elevenAgentsHandlers.ts`
- **Mock Service**: `ElevenAgentsMockService` class for easy testing

### 4. Documentation
- **README**: `mocks/ELEVEN_AGENTS_README.md` - Comprehensive usage guide

## 🚀 Quick Start

### Test with JSON Server

```bash
# Terminal 1: Start JSON server
npx json-server --watch mocks/eleven_agents.json --port 4001

# Terminal 2: Start your backend (if not already running)
cd server && npm run dev
```

### Use in Backend Code

```typescript
import { agentRegistry } from './services/AgentRegistry';

// Initialize (happens automatically, but you can await)
await agentRegistry.initialize();

// Get all agents
const agents = agentRegistry.getAllAgents();

// Get specific agent
const rachel = agentRegistry.getAgent('agent_rachel');

// Suggest agent based on context
const agent = agentRegistry.suggestAgent({
  intent: 'size_recommendation',
  userType: 'customer'
});

// Convert to voice settings for VoiceAssistant
const voiceSettings = agentRegistry.agentToVoiceSettings(agent);
```

### Test API Endpoints

```bash
# Get all agents
curl http://localhost:3001/api/agents

# Get specific agent
curl http://localhost:3001/api/agents/agent_rachel

# Suggest agent
curl -X POST http://localhost:3001/api/agents/suggest \
  -H "Content-Type: application/json" \
  -d '{"intent": "size_recommendation", "userType": "customer"}'

# Get agents by capability
curl http://localhost:3001/api/agents/by-capability/size_recommendation
```

## 📋 Available Agents

1. **Rachel** (`agent_rachel`) - Warm, professional onboarding
2. **Liam** (`agent_liam`) - Confident B2B merchant assistant
3. **Ava** (`agent_ava`) - Playful trend discovery
4. **Noah** (`agent_noah`) - Technical model transparency
5. **Emma** (`agent_emma`) - Friendly sustainability focus
6. **Oliver** (`agent_oliver`) - Concise checkout assistant
7. **Sophia** (`agent_sophia`) - Empathetic returns agent
8. **Elijah** (`agent_elijah`) - Data-savvy analytics
9. **Isabella** (`agent_isabella`) - VIP concierge
10. **Mason** (`agent_mason`) - Short confirmations
11. **Grace** (`agent_grace`) - Tutorials and onboarding

## 🔄 Next Steps (Optional Enhancements)

### 1. Update VoiceAssistant Service

Integrate agent selection into the VoiceAssistant service:

```typescript
// In VoiceAssistant.ts
import { agentRegistry } from './AgentRegistry';

async startConversation(userId: string, agentId?: string): Promise<ConversationState> {
  await agentRegistry.initialize();
  
  // Use specified agent or suggest based on user profile
  const agent = agentId 
    ? agentRegistry.getAgent(agentId)
    : agentRegistry.suggestAgent({ userType: 'customer' });
  
  if (agent) {
    const voiceSettings = agentRegistry.agentToVoiceSettings(agent);
    // Use agent's voice settings...
  }
}
```

### 2. Create Agent Selection UI

Create a React component to let users select agents:

```tsx
// src/components/AgentSelector.tsx
const agents = await fetch('/api/agents').then(r => r.json());

<Select onValueChange={(agentId) => setSelectedAgent(agentId)}>
  {agents.map(agent => (
    <option value={agent.agent_id}>{agent.display_name}</option>
  ))}
</Select>
```

### 3. Add Agent Context to API Calls

Update `/api/assistant` endpoint to accept and use `agent_id`:

```typescript
// In server/src/routes/api.ts
router.post('/assistant', async (req, res) => {
  const { query, agent_id, userId } = req.body;
  
  let agent = null;
  if (agent_id) {
    await agentRegistry.initialize();
    agent = agentRegistry.getAgent(agent_id);
  }
  
  // Use agent's voice settings if specified
  // ...
});
```

### 4. Create Demo Page

Create a simple demo page to test agents:

```tsx
// src/pages/VoiceAgentDemo.tsx
// - Dropdown to select agent
// - Text input to test TTS
// - Play button to hear agent speak
// - Show agent persona and capabilities
```

## 📊 Testing

### Test Playback Pipeline

1. POST to `/api/assistant` with `{ session_id, agent_id, text }`
2. Backend returns `{ tts_url, audio_blob, or fallback:browser }`
3. Frontend plays audio based on response type

### Test Agent Selection

```typescript
// Test agent suggestion
const agent = agentRegistry.suggestAgent({
  intent: 'return_product',
  userType: 'customer'
});
// Should return agent_sophia (empathetic returns agent)
```

### Test Conversations

```bash
# Get conversation example
curl http://localhost:3001/api/conversations/sess_demo_001

# Get all conversations for an agent
curl http://localhost:3001/api/conversations/by-agent/agent_rachel
```

## 📝 Notes

- The mock data file path is relative to the server root: `../mocks/eleven_agents.json`
- Agent registry initializes automatically on import, but you should await `initialize()` before use
- Voice IDs in the mock data (e.g., `rachel_v1`) are placeholders - replace with actual ElevenLabs voice IDs in production
- The fallback strategy supports browser TTS (no key), local TTS, and ElevenLabs (requires API key)

## 🐛 Troubleshooting

### Agent Registry Not Loading

Check that the path to `mocks/eleven_agents.json` is correct. The service looks for it at `../mocks/eleven_agents.json` relative to the server directory.

### Routes Not Working

Ensure the agent routes are mounted in `server/src/routes/api.ts`:
```typescript
router.use(agentRoutes);
```

### Type Errors

Make sure TypeScript can find the types. The types are exported from `src/mocks/elevenAgentsTypes.ts`.

---

**Ready to use!** The mock data and services are fully integrated and ready for testing and development.

