import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userProfile, preferences, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Based on this user profile and preferences, provide personalized fashion recommendations:

User Profile:
- Body Type: ${userProfile?.bodyType || "Not specified"}
- Height: ${userProfile?.height || "Not specified"}
- Size Preferences: ${userProfile?.sizePreferences || "Not specified"}
- Style: ${preferences?.style || "Not specified"}
- Budget Range: ${preferences?.budgetRange || "Mid-range"}
- Occasion: ${context?.occasion || "Casual everyday"}

Analyze and return a structured JSON response with:
{
  "recommendations": [
    {
      "category": "string",
      "items": ["item1", "item2"],
      "reasoning": "why these items work for this user"
    }
  ],
  "sizeGuidance": "specific sizing advice",
  "styleNotes": "styling tips"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a fashion AI that provides personalized recommendations. Return JSON only.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_recommendations",
              description: "Generate personalized fashion recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        items: { type: "array", items: { type: "string" } },
                        reasoning: { type: "string" },
                      },
                      required: ["category", "items", "reasoning"],
                    },
                  },
                  sizeGuidance: { type: "string" },
                  styleNotes: { type: "string" },
                },
                required: ["recommendations", "sizeGuidance", "styleNotes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const recommendations = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(recommendations), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No recommendations generated");
  } catch (error) {
    console.error("Style recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
