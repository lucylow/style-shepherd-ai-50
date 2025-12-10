import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVEN_LABS_API_KEY = Deno.env.get("ELEVEN_LABS_API_KEY") || "";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George - clear male voice

interface TTSResponse {
  success: boolean;
  source: "eleven" | "mock";
  audioBase64?: string;
  mimeType?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId = DEFAULT_VOICE_ID } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ success: false, message: "text (string) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit text length for demo purposes
    const truncatedText = text.slice(0, 500);

    // Mock fallback when API key not configured
    if (!ELEVEN_LABS_API_KEY) {
      console.log("ElevenLabs API key not configured, returning mock response");
      const mockResponse: TTSResponse = {
        success: true,
        source: "mock",
        audioBase64: "", // Empty - client should handle gracefully
        mimeType: "audio/mpeg",
      };
      return new Response(
        JSON.stringify(mockResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call ElevenLabs TTS API
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_LABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: truncatedText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("ElevenLabs API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          source: "eleven",
          error: errorText || `ElevenLabs error ${response.status}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert audio to base64
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const audioBase64 = btoa(binary);

    const result: TTSResponse = {
      success: true,
      source: "eleven",
      audioBase64,
      mimeType: "audio/mpeg",
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("elevenlabs-tts error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
