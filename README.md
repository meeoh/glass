# Sales Assistant

An internal Shopify desktop app for sales reps. Listens to both sides of a live call, transcribes in real-time, and provides AI-powered coaching and CRM-informed recommendations.

Built on [Pickle Glass](https://github.com/meeoh/glass), rewired to use Shopify infrastructure.

## Quick Start

```bash
# Requires Node 20.x
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# First time — install deps + build
npm install --ignore-scripts
npx electron-rebuild
cd pickleglass_web && npm install && npm run build && cd ..
node build.js

# Run
npx electron .
```

On first launch, the app will walk you through setup:
1. **Shopify AI Proxy Token** — generate at [proxy.shopify.ai](https://proxy.shopify.ai)
2. **Permissions** — grant Microphone + Screen Recording
3. **Google Account** — connect for calendar-based contact matching

## Features

| Feature | Status |
|---|---|
| Live transcript (both sides) | ✅ |
| AI sales coaching (real-time) | ✅ |
| Vault CRM integration | ✅ |
| Auto-start on call detection | ✅ |
| Auto-detect contact (Calendar + Vault) | ✅ |
| Post-call AI summary → CRM | ✅ |
| Smart coaching triggers | ✅ |
| Sales knowledge base (16 files) | ✅ |

## How It Works

1. **MicWatcher** detects when you join a call (any app grabs your mic)
2. Captures your mic + system audio → **Deepgram STT** (real-time)
3. Every 2 turns, **GPT-4.1** generates coaching: "Say This", "Ask This"
4. CRM contact auto-matched via Vault API or Google Calendar attendees
5. On "Done", generates AI summary and pushes to Vault CRM

## Keyboard Shortcuts

- `Cmd + \` — show/hide the HUD

## Environment Variables (Optional)

For local development with `.env`:

| Variable | Description |
|---|---|
| `SHOPIFY_PROXY_TOKEN` | Shopify AI proxy token (per-user, required) |
| `DEEPGRAM_API_KEY` | Deepgram API key (overrides baked-in key) |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID (overrides baked-in) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret (overrides baked-in) |
| `VAULT_URL` | Vault base URL (default: `https://u2.shop.dev`) |
| `VAULT_API_TOKEN` | Vault API token |

## Building for Distribution

Requires GitHub Actions (Shopify MDM blocks the build tool on managed Macs).

Add these as repository secrets, then trigger the workflow from the Actions tab:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DEEPGRAM_API_KEY`

The workflow produces a macOS DMG artifact. Note: the app is not code-signed, so users need to right-click → Open Anyway on first launch.

## Docs

See [docs/](./docs/) for architecture, decisions, troubleshooting, and API details.
