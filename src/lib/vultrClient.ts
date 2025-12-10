/**
 * Vultr Inference Client
 * 
 * Frontend client for calling Vultr Serverless Inference via Edge Function
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface VultrResponse {
  success: boolean;
  source: "vultr" | "mock";
  status?: number;
  error?: string;
  model?: string;
  choices?: Array<{ index: number; message: { role: string; content: string } }>;
  cached?: boolean;
}

const VULTR_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vultr-inference`;

export async function callVultrInference({
  model = "llama2-7b-chat-Q5_K_M",
  messages = [] as ChatMessage[],
}: {
  model?: string;
  messages?: ChatMessage[];
}): Promise<VultrResponse> {
  try {
    const response = await fetch(VULTR_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        source: "vultr",
        status: response.status,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      source: "vultr",
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * High-level fashion assistant using Vultr inference
 */
export async function getFashionRecommendation(userQuery: string): Promise<string> {
  const systemPrompt = `You are Fashioni, a friendly and knowledgeable fashion stylist AI. 
You help users with:
- Size recommendations based on their measurements
- Style advice and outfit suggestions
- Color coordination tips
- Fabric and material recommendations
Keep responses concise, helpful, and personalized.`;

  const result = await callVultrInference({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery },
    ],
  });

  if (result.success && result.choices?.[0]?.message?.content) {
    return result.choices[0].message.content;
  }

  return result.error || "Sorry, I couldn't generate a recommendation. Please try again.";
}
