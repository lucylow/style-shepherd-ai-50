# ElevenLabs Voice Agents Mock Data

This directory contains mock data for 11 ElevenLabs-style voice agents that can be used for testing, demos, and development.

## Quick Start

### Option 1: JSON Server (Recommended for Quick Testing)

```bash
# Install json-server if not already installed
npm install -g json-server

# Start the mock server
npx json-server --watch mocks/eleven_agents.json --port 4001
```

Then access:
- All agents: `GET http://localhost:4001/agents`
- Specific agent: `GET http://localhost:4001/agents?agent_id=agent_rachel`
- Conversations: `GET http://localhost:4001/conversations`

### Option 2: Backend Integration

The mock data is integrated with the backend `AgentRegistry` service:

```typescript
import { agentRegistry } from './services/AgentRegistry';

// Get all agents
const agents = agentRegistry.getAllAgents();

// Get specific agent
const rachel = agentRegistry.getAgent('agent_rachel');

// Suggest agent based on context
const agent = agentRegistry.suggestAgent({
  intent: 'size_recommendation',
  userType: 'customer'
});

// Get agent configuration
const config = agentRegistry.getAgentConfiguration('agent_rachel');
```

### Option 3: MSW Handlers (For Frontend Testing)

See `src/mocks/elevenAgentsHandlers.ts` for MSW handlers that can be used in tests or development.

## Available Agents

1. **Rachel** (`agent_rachel`) - Warm, professional voice for onboarding and help flows
2. **Liam** (`agent_liam`) - Confident, concise voice for B2B merchant conversations
3. **Ava** (`agent_ava`) - Playful and fashionable for trend discovery
4. **Noah** (`agent_noah`) - Direct technical assistant for model transparency
5. **Emma** (`agent_emma`) - Friendly voice emphasizing sustainability
6. **Oliver** (`agent_oliver`) - Concise checkout assistant
7. **Sophia** (`agent_sophia`) - Empathetic returns agent
8. **Elijah** (`agent_elijah`) - Data-savvy merchant analytics assistant
9. **Isabella** (`agent_isabella`) - Concierge voice for VIP users
10. **Mason** (`agent_mason`) - Low-latency voice for short confirmations
11. **Grace** (`agent_grace`) - Instructive voice for tutorials and onboarding

## Usage Examples

### Get Agent by Capability

```typescript
// Get agents that can handle size recommendations
const sizeAgents = agentRegistry.getAgentsByCapability('size_recommendation');

// Get agents for merchant onboarding
const merchantAgents = agentRegistry.getAgentsByCapability('merchant_onboarding');
```

### Use Agent in Voice Assistant

```typescript
import { voiceAssistant } from './services/VoiceAssistant';
import { agentRegistry } from './services/AgentRegistry';

// Get agent and convert to voice settings
const agent = agentRegistry.getAgent('agent_rachel');
const voiceSettings = agentRegistry.agentToVoiceSettings(agent);

// Use in conversation
const state = await voiceAssistant.startConversation(userId);
// Voice settings will use agent's configuration
```

### Get Conversation Examples

```typescript
// Get all conversations for an agent
const conversations = agentRegistry.getConversationsByAgent('agent_rachel');

// Get specific conversation
const conversation = agentRegistry.getConversationExample('sess_demo_001');
```

## API Integration

### Backend Routes (To Be Added)

The following routes should be added to `server/src/routes/api.ts`:

```typescript
// GET /api/agents - Get all available agents
router.get('/agents', async (req, res) => {
  await agentRegistry.initialize();
  const agents = agentRegistry.getAllAgents();
  res.json({ agents, count: agents.length });
});

// GET /api/agents/:agentId - Get specific agent
router.get('/agents/:agentId', async (req, res) => {
  await agentRegistry.initialize();
  const agent = agentRegistry.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  res.json({ agent });
});

// GET /api/agents/by-capability/:capability - Get agents by capability
router.get('/agents/by-capability/:capability', async (req, res) => {
  await agentRegistry.initialize();
  const agents = agentRegistry.getAgentsByCapability(req.params.capability);
  res.json({ agents, count: agents.length });
});

// POST /api/agents/suggest - Suggest agent based on context
router.post('/agents/suggest', async (req, res) => {
  await agentRegistry.initialize();
  const agent = agentRegistry.suggestAgent(req.body);
  if (!agent) {
    return res.status(404).json({ error: 'No suitable agent found' });
  }
  res.json({ agent });
});
```

## Reference Slide

The mock data includes a reference to a presentation slide:
- URL: `/mnt/data/A_presentation_slide_titled_"The_Challenge_in_Fash.png`
- Access via: `agentRegistry.getReferenceSlideUrl()`

This can be served through your static assets route for demos.

## Fallback Strategy

The mock data includes fallback strategy configuration:

1. **Browser Web Speech API** - Client-side, instant, no key required
2. **pyttsx3** - Server-side lightweight offline TTS
3. **Coqui** - High-quality open-source models (heavy to host)
4. **ElevenLabs** - High-quality commercial TTS (requires API key)

The agent registry exposes this via `agentRegistry.getFallbackStrategy()`.

## Testing

### Playback Test

Test the TTS pipeline end-to-end:

```typescript
// 1. POST /api/assistant { session_id, agent_id, text }
// 2. Backend returns { tts_url or audio_blob or fallback:browser }
// 3. If audio_blob returned, frontend plays audio
//    If tts_url returned, fetch and play
//    If fallback:browser, use Web Speech API
```

### Mock Webhook Event

Simulate an audio generation webhook:

```json
{
  "event": "tts.generated",
  "agent_id": "agent_rachel",
  "session_id": "sess_demo_001",
  "audio_url": "/mock_audio/agent_rachel/sess_demo_001_001.wav",
  "duration_ms": 1420
}
```

## Next Steps

1. ✅ Mock data file created (`mocks/eleven_agents.json`)
2. ✅ Agent registry service created (`server/src/services/AgentRegistry.ts`)
3. ✅ TypeScript types created (`src/mocks/elevenAgentsTypes.ts`)
4. ✅ MSW handlers created (`src/mocks/elevenAgentsHandlers.ts`)
5. ⏳ Add API routes to `server/src/routes/api.ts`
6. ⏳ Update VoiceAssistant service to support agent selection
7. ⏳ Create demo page for testing agents

## Cost Control

The mock data includes usage examples showing how to track TTS costs:

- Free tier: 1,000 calls/month
- Premium tier: 100,000 calls/month

Use quotas to demonstrate cost control to judges/evaluators.

