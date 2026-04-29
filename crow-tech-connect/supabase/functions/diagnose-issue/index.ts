import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Allowed service categories (must match the Postgres enum)
const ALLOWED_CATEGORIES = [
  "construction",
  "plumbing",
  "electrical",
  "roofing",
  "tiling",
  "surveying",
  "maintenance",
  "automotive",
  "tech",
  "creative",
  "outdoor",
  "education",
  "events",
  "painting",
  "carpentry",
  "landscaping",
] as const;

const SYSTEM_PROMPT = `You are Misozi, an empathetic, professional Zambian home-services diagnostician.
A user has uploaded a photo of a problem they need fixed (e.g. a leaky pipe, exposed wiring, broken tile, damaged roof, etc.).

Look carefully at the image and produce a short diagnostic report. Be warm and reassuring — the user may be stressed.

Return your answer ONLY by calling the diagnose tool. Do not write prose.

Severity scale:
- "low" — cosmetic / can wait
- "medium" — should be fixed soon
- "high" — fix today, may worsen
- "critical" — safety hazard, act immediately

Pick the single best category from this fixed list:
${ALLOWED_CATEGORIES.join(", ")}.

If you genuinely cannot tell what the issue is, set problem to "Unable to identify issue clearly", severity "low", category "maintenance", and ask the user for a clearer photo in the recommendation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Diagnose the issue in this photo." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "diagnose",
              description: "Return a structured diagnosis of the issue shown in the photo.",
              parameters: {
                type: "object",
                properties: {
                  problem: {
                    type: "string",
                    description: "Short title of the problem, e.g. 'Leaking pressure valve' or 'Blown electrical circuit'.",
                  },
                  severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                  },
                  category: {
                    type: "string",
                    enum: ALLOWED_CATEGORIES as unknown as string[],
                    description: "The single best service category for this problem.",
                  },
                  recommendation: {
                    type: "string",
                    description: "1-2 warm, empathetic sentences explaining what's happening and what to do next.",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence between 0 and 1 in this diagnosis.",
                  },
                },
                required: ["problem", "severity", "category", "recommendation", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "diagnose" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Could not parse diagnosis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const diagnosis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ diagnosis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnose-issue error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});