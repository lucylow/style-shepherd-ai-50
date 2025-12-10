import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VULTR_API_KEY = Deno.env.get("VULTR_API_KEY") || "";
const VULTR_URL = "https://api.vultrinference.com/v1/chat/completions";

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

// Simple in-memory cache
const cache = new Map<string, { value: VultrResponse; expiresAt: number }>();

function getCached(key: string): VultrResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: VultrResponse, ttlMs = 30000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Retry with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts = 3,
  baseDelay = 300
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const delay = baseDelay * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model = "llama2-7b-chat-Q5_K_M", messages } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ success: false, message: "messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cache key based on request
    const cacheKey = `vultr:${btoa(JSON.stringify({ model, messages }))}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new Response(
        JSON.stringify({ ...cached, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mock fallback when API key not configured
    if (!VULTR_API_KEY) {
      const userMsg = messages?.slice(-1)[0]?.content ?? "Hello";
      const mockResponse: VultrResponse = {
        success: true,
        source: "mock",
        model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `Fashioni (demo mode): For "${userMsg}" — I recommend Size M with a relaxed fit. This style pairs beautifully with white sneakers and minimalist accessories for a polished look.`,
            },
          },
        ],
      };
      return new Response(
        JSON.stringify(mockResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Vultr Inference API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetchWithRetry(
        VULTR_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${VULTR_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages }),
          signal: controller.signal,
        },
        3,
        300
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("Vultr API error:", response.status, errorText);
        return new Response(
          JSON.stringify({
            success: false,
            source: "vultr",
            status: response.status,
            error: errorText || `Vultr error ${response.status}`,
          }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const result: VultrResponse = { success: true, source: "vultr", ...data };

      // Cache successful responses
      setCache(cacheKey, result, 30000);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  } catch (error) {
    console.error("vultr-inference error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
