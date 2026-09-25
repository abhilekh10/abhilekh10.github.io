/* =========================================================
   Bookbindass — AI Trip Ideas Worker
   Deploy this yourself with Wrangler (see README.md in this
   folder). Runs on Cloudflare Workers AI — inference happens on
   Cloudflare's own infrastructure via the `env.AI` binding, so
   there is no external API key to manage, rotate, or leak.
   ========================================================= */

const MAX_QUERY_LENGTH = 300;

const SYSTEM_PROMPT = `You are a travel-budget assistant for Indian travelers on BookBindass.com.
Given a free-text trip request, reply with STRICT JSON only (no markdown, no prose) matching this shape:

{
  "trip": { "from": string|null, "adults": number, "children": number, "days": number },
  "suggestions": [
    { "destination": string, "priceLow": number, "priceHigh": number, "reason": string }
  ]
}

Rules:
- "trip.adults" defaults to 2 and "trip.children" defaults to 0 if not stated.
- "trip.days" is your best guess at trip length in days; default to 5 if not stated.
- "trip.from" is the departure city if mentioned, otherwise null.
- Return 3 to 5 "suggestions", ordered cheapest first.
- priceLow/priceHigh are total trip cost in INR for the whole group (not per person), rounded to the nearest 1000.
- Keep "reason" under 20 words, concrete and specific to the traveler's stated budget/season/interests.
- Only ever return the JSON object described above — no other keys, no commentary.`;

function corsHeaders(origin, allowedOrigin) {
  const allow = !allowedOrigin || allowedOrigin === "*" || origin === allowedOrigin
    ? (allowedOrigin || "*")
    : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, headers);
    }

    if (!env.AI) {
      return jsonResponse({ error: "Server is not configured (missing AI binding)." }, 500, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: "Invalid JSON body." }, 400, headers);
    }

    const query = (body && typeof body.query === "string" ? body.query : "").trim();
    if (!query) {
      return jsonResponse({ error: "Please describe your trip." }, 400, headers);
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return jsonResponse({ error: "That's a bit long — please keep it under " + MAX_QUERY_LENGTH + " characters." }, 400, headers);
    }

    const model = env.WORKERS_AI_MODEL || "@cf/zai-org/glm-4.7-flash";

    const MAX_ATTEMPTS = 2;
    let aiResp;
    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        aiResp = await env.AI.run(model, {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_completion_tokens: 2000
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        console.error("Workers AI error (attempt " + attempt + ")", e && e.message ? e.message : String(e));
      }
    }

    if (lastErr) {
      return jsonResponse({ error: "The AI service is temporarily unavailable. Please try again shortly." }, 502, headers);
    }

    // This model returns an OpenAI-compatible chat completion shape;
    // guard for a couple of other shapes some Workers AI models use.
    const raw = typeof aiResp === "string"
      ? aiResp
      : (aiResp && aiResp.choices && aiResp.choices[0] && aiResp.choices[0].message && aiResp.choices[0].message.content)
        || (aiResp && aiResp.response)
        || (aiResp && aiResp.result && aiResp.result.response)
        || null;

    if (!raw) {
      console.error("Workers AI unexpected shape", JSON.stringify(aiResp).slice(0, 800));
      return jsonResponse({ error: "The AI service returned an empty response." }, 502, headers);
    }

    // Strip a ```json ... ``` fence in case the model wraps the JSON
    // despite response_format being set to json_object.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Workers AI unparsable response", raw.slice(0, 500));
      return jsonResponse({ error: "Could not understand the AI response. Please try again." }, 502, headers);
    }

    if (!parsed || !Array.isArray(parsed.suggestions)) {
      return jsonResponse({ error: "The AI response was malformed. Please try again." }, 502, headers);
    }

    return jsonResponse(parsed, 200, headers);
  }
};
