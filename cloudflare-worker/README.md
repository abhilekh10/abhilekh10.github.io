# AI Trip Ideas — Cloudflare Worker

This Worker is the only place your OpenAI API key is used. It receives a
free-text trip request from `trip-ideas/trip-ideas.js`, calls OpenAI, and
returns structured destination suggestions. The key never touches the
browser or the git repo.

## One-time setup

You need a free Cloudflare account and Node.js installed locally.

```bash
npm install -g wrangler
cd cloudflare-worker
wrangler login
```

`wrangler login` opens a browser window for you to authorize — do this
yourself, it needs your own Cloudflare login.

## Set the API key as an encrypted secret

Run this yourself in your own terminal (not through an AI agent) so the key
only ever touches your machine and Cloudflare's encrypted store:

```bash
wrangler secret put OPENAI_API_KEY
```

It will prompt you to paste the key — paste your **rotated** key, not one
that has ever been shared in chat, email, or committed to git.

## Deploy

```bash
wrangler deploy
```

This prints a URL like `https://bookbindass-trip-ideas.<your-subdomain>.workers.dev`.

## Wire it into the site

Open [`../trip-ideas/trip-ideas.js`](../trip-ideas/trip-ideas.js) and set:

```js
var CONFIG = {
  ENDPOINT: "https://bookbindass-trip-ideas.<your-subdomain>.workers.dev"
};
```

Commit and push that one-line change — it's just a public URL, not a secret.

## Recommended hardening (do this before real traffic)

This is a public, unauthenticated endpoint that spends your OpenAI credits
per request, so:

1. **Set an OpenAI spending cap** in the OpenAI dashboard under
   Billing → Limits, so a traffic spike or abuse can't run up a large bill.
2. **Add a Cloudflare Rate Limiting Rule** (dashboard → your zone → Security
   → WAF → Rate limiting rules) on the Worker's route — e.g. 10 requests per
   minute per IP. This is free on Cloudflare's free plan and needs no code
   changes here.
3. Optionally lock `ALLOWED_ORIGIN` in `wrangler.toml` to your exact domain
   (already set to `https://bookbindass.com`) so the endpoint can't be
   easily embedded on other sites.

## Updating the key later

If you ever need to rotate the key again:

```bash
wrangler secret put OPENAI_API_KEY
```

This overwrites the existing secret — no redeploy of the code needed.
