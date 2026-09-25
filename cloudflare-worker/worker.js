/* =========================================================
   Bookbindass — AI Trip Ideas Worker
   Deploy this yourself with Wrangler (see README.md in this
   folder). It is the only place the Gemini API key is ever
   used — the key lives in Cloudflare's encrypted secret store,
   never in this repo and never in the browser.
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

    if (!env.GEMINI_API_KEY) {
      return jsonResponse({ error: "Server is not configured (missing API key)." }, 500, headers);
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

    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
    const geminiBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: query }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 700
      }
    });

    // Free-tier Gemini keys share a lower-priority capacity pool and
    // return 503 "high demand" far more often than paid keys, even on
    // stable models — a couple of quick retries smooths over most of it.
    const MAX_ATTEMPTS = 3;
    let upstream;
    let lastErrText = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        upstream = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: geminiBody
        });
      } catch (e) {
        if (attempt === MAX_ATTEMPTS) {
          return jsonResponse({ error: "Could not reach the AI service. Please try again." }, 502, headers);
        }
        continue;
      }

      if (upstream.ok) break;

      lastErrText = await upstream.text();
      console.error("Gemini upstream error (attempt " + attempt + ")", upstream.status, lastErrText);

      const retryable = upstream.status === 503 || upstream.status === 429;
      if (!retryable || attempt === MAX_ATTEMPTS) {
        const status = upstream.status === 429 ? 429 : 502;
        return jsonResponse({ error: "The AI service is temporarily unavailable. Please try again shortly." }, status, headers);
      }

      await new Promise(function (resolve) { setTimeout(resolve, 500 * attempt); });
    }

    let payload;
    try {
      payload = await upstream.json();
    } catch (e) {
      return jsonResponse({ error: "Unexpected response from the AI service." }, 502, headers);
    }

    const parts = payload && payload.candidates && payload.candidates[0]
      && payload.candidates[0].content && payload.candidates[0].content.parts;

    // Some models emit a "thought" part before the real answer part —
    // skip those and concatenate only the actual text parts.
    const raw = Array.isArray(parts)
      ? parts.filter(function (p) { return p && p.text && !p.thought; }).map(function (p) { return p.text; }).join("")
      : null;

    if (!raw) {
      return jsonResponse({ error: "The AI service returned an empty response." }, 502, headers);
    }

    // Strip a ```json ... ``` fence in case the model wraps the JSON
    // despite responseMimeType being set to application/json.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Gemini unparsable response", raw.slice(0, 500));
      return jsonResponse({ error: "Could not understand the AI response. Please try again." }, 502, headers);
    }

    if (!parsed || !Array.isArray(parsed.suggestions)) {
      return jsonResponse({ error: "The AI response was malformed. Please try again." }, 502, headers);
    }

    return jsonResponse(parsed, 200, headers);
  }
};
