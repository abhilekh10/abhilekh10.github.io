# AI Trip Ideas — Cloudflare Worker

This Worker receives a free-text trip request from `trip-ideas/trip-ideas.js`
and runs it through **Cloudflare Workers AI** — inference happens directly on
Cloudflare's infrastructure via the `env.AI` binding in `wrangler.toml`.
There is no external API key to create, store, rotate, or leak.

## One-time setup

You need a free Cloudflare account and Node.js installed locally.

```bash
cd cloudflare-worker
npx wrangler login
```

`wrangler login` opens a browser window for you to authorize — do this
yourself, it needs your own Cloudflare login.

## Deploy

```bash
npx wrangler deploy
```

This prints a URL like `https://bookbindass-trip-ideas.<your-subdomain>.workers.dev`.
That's it — no secret to set. The `[ai]` binding in `wrangler.toml` gives the
Worker access to Workers AI automatically, billed to (and authenticated as)
your own Cloudflare account.

## Wire it into the site

Open [`../trip-ideas/trip-ideas.js`](../trip-ideas/trip-ideas.js) and set:

```js
var CONFIG = {
  ENDPOINT: "https://bookbindass-trip-ideas.<your-subdomain>.workers.dev"
};
```

Commit and push that one-line change — it's just a public URL, not a secret.

## Changing the model

The model is set via `WORKERS_AI_MODEL` in `wrangler.toml` (currently
`@cf/zai-org/glm-4.7-flash`). Browse the full catalog at
[developers.cloudflare.com/workers-ai/models](https://developers.cloudflare.com/workers-ai/models/)
— pick any "Text Generation" model that supports `response_format`. Note
that reasoning models (this one included) spend part of their token budget
on an internal chain-of-thought before the final answer, so
`max_completion_tokens` in `worker.js` is set generously (2000) to leave
room for both.

## Recommended hardening (do this before real traffic)

This is a public, unauthenticated endpoint that consumes Workers AI usage
(billed to your Cloudflare account, on Cloudflare's Workers AI pricing) per
request, so:

1. **Add a Cloudflare Rate Limiting Rule** (dashboard → your zone → Security
   → WAF → Rate limiting rules) on the Worker's route — e.g. 10 requests per
   minute per IP. Free on Cloudflare's free plan, no code changes needed.
2. Optionally lock `ALLOWED_ORIGIN` in `wrangler.toml` to your exact domain
   (already set to `https://bookbindass.com`) so the endpoint can't be
   easily embedded on other sites.
3. Watch your Workers AI usage in the Cloudflare dashboard (Workers & Pages
   → AI) if you expect meaningful traffic.
