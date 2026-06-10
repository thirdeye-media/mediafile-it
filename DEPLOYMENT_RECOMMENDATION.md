# Deployment Recommendation: MediaFile-it

**Prepared for:** Pablo Núñez
**Date:** 7 June 2026
**Recommendation:** Deploy on **Northflank (free Sandbox tier)**

---

## Summary

MediaFile-it should be deployed on **Northflank's free Sandbox tier**. It fits the
app's architecture with no code rewrite, runs genuinely free for a low-traffic
site, and avoids the timeout and licensing problems that make Vercel's free tier
unsuitable here.

## Why this app drives the decision

MediaFile-it is a **single long-running Node/Express server** (`server.ts` →
`app.listen`) that serves the React frontend *and* proxies requests to slow
external services — LLMs (Gemini, Anthropic, OpenRouter, Mistral) and web search
(Tavily, Perplexity, Brave, DuckDuckGo). These calls routinely take
**15–60+ seconds**. The build already produces one Node bundle
(`dist/server.cjs`). In short, it is **container-shaped, not serverless-shaped** —
and that single fact decides the platform.

## Why not Vercel (free Hobby)

| Issue | Impact |
|---|---|
| Serverless only — no persistent server | Would require tearing `server.ts` into separate `/api/*` functions (a real rewrite). |
| 10-second function timeout (60s max) | The AI/search calls would hit **504 timeouts** constantly. Disqualifying on its own. |
| Non-commercial use only | Free Hobby forbids business use; if this ever touches Third Eye Media, it breaks Vercel's terms (Pro is $20/mo). |

Vercel's free tier is excellent for static/Next.js frontends — the opposite of
what this app is.

## Why Northflank (free Sandbox)

- **Always-on compute, no sleeping** — runs the existing server unchanged; long
  AI calls have no request timeout.
- **No database required** — MediaFile has no DB and no file uploads, so it avoids
  the paid-storage cost that affects other apps. The free Sandbox's one service
  slot is all that is needed.
- **Free SSL + custom domain**, env-var management for API keys, and automatic
  deploys from Git.
- **Zero rewrite** — `npm run build` / `npm start` are already deploy-ready.

The only condition is a **credit card to activate** the free tier (identity
verification; Sandbox resources themselves are not charged).

## One small fix before deploy

The server hardcoded `const PORT = 3000` (server.ts:12). Hosting platforms inject
a `PORT` env var, so this now reads `Number(process.env.PORT) || 3000`. The
server already binds `0.0.0.0`, which is correct.

## Recommendation

Deploy MediaFile-it to **Northflank free Sandbox** — it matches the app's
long-running, AI-proxy architecture, costs nothing at this traffic level, and
needs no structural changes beyond the one-line `PORT` fix.
