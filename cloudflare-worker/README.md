# AI Trip Ideas — Cloudflare Worker

This Worker is the only place your Gemini API key is used. It receives a
free-text trip request from `trip-ideas/trip-ideas.js`, calls Google's
Gemini API, and returns structured destination suggestions. The key never
touches the browser or the git repo.

## Get a Gemini API key

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
sign in with your Google account, and create an API key. Gemini has a
free tier, so you can test this without billing set up first.

## One-time setup

You need a free Cloudflare account and Node.js installed locally.

```bash
cd cloudflare-worker
npx wrangler login
```

`wrangler login` opens a browser window for you to authorize — do this
yourself, it needs your own Cloudflare login. (You've already done this
once for this project, so you likely only need to do this again if you
log out or switch machines.)

## Set the API key as an encrypted secret

Run this yourself in your own terminal (not through an AI agent) so the key
only ever touches your machine and Cloudflare's encrypted store:

```bash
npx wrangler secret put GEMINI_API_KEY
```

It will prompt you to paste the key — paste it directly, and never share
it in chat, email, or commit it to git.

If you previously set `OPENAI_API_KEY` on this Worker and are no longer
using OpenAI, you can remove it (optional, just tidiness):

```bash
npx wrangler secret delete OPENAI_API_KEY
```

## Deploy

```bash
npx wrangler deploy
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

This is a public, unauthenticated endpoint that spends your Gemini quota
per request, so:

1. **Watch your Gemini usage/quota** in [Google AI Studio](https://aistudio.google.com/)
   or the Google Cloud console, so a traffic spike or abuse doesn't exhaust
   your free tier or run up a bill if you're on a paid tier.
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
npx wrangler secret put GEMINI_API_KEY
```

This overwrites the existing secret — no redeploy of the code needed.
