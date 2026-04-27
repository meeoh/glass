# Glass — Sales Call Assistant

An internal Electron desktop app for Shopify sales reps. It listens to both sides of a live call, transcribes in real-time, and provides AI-powered talking points and CRM-informed recommendations to help close deals.

Built on top of [Pickle Glass](https://github.com/meeoh/glass), stripped of third-party auth/telemetry and rewired to use Shopify infrastructure.

## Current Status: V3

| Feature | Status |
|---|---|
| Live transcript — sales rep (mic) | ✅ Working |
| Live transcript — prospect (system audio) | ✅ Working |
| AI sales coaching (real-time talking points) | ✅ Working |
| Vault CRM integration (contact lookup + context) | ✅ Working |
| Auto-start listening on call detection | ✅ Working |
| Auto-detect contact (Google Calendar) | ✅ Working |
| Auto-detect contact (Vault active call API) | ✅ Working |
| Main app window (auth, calendar, status) | ✅ Working |
| Google OAuth + Calendar integration | ✅ Working |
| HUD hidden until call starts | ✅ Working |
| Draggable listen/insights pane | ✅ Working |
| Google auth token persistence | ✅ Working |
| Sales knowledge base (16 files, conversation-aware) | ✅ Working |
| Smart coaching triggers (instant on objections) | ✅ Working |
| Post-call AI summary → CRM | ✅ Working |
| Vault notes toggle (opt-out before Done) | ✅ Working |
| Match source indicator (Dialer / Calendar event) | ✅ Working |
| Batch calendar attendee lookup | ✅ Working |
| Auto-stop listening when call ends | 🔜 Planned |
| Invisible to screen share | ✅ Working (inherited) |

## Quick Start

```bash
cd ~/Projects/glass

# Requires Node 20.x
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# First time — install deps + build everything
npm install --ignore-scripts
npx electron-rebuild
cd pickleglass_web && npm install && npm run build && cd ..
node build.js

# Run
npx electron .
```

After first setup, to relaunch just:
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
cd ~/Projects/glass && npx electron .
```

Environment variables are loaded from `.env` automatically (via dotenv).

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SHOPIFY_PROXY_TOKEN` | Yes | Shopify AI proxy token for LLM access |
| `DEEPGRAM_API_KEY` | Yes | Deepgram API key for real-time STT |
| `GOOGLE_CLIENT_ID` | For calendar | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | For calendar | Google OAuth2 client secret |
| `GLASS_REP_EMAIL` | For Vault active call | The sales rep's Shopify email (used to check if they're on a dialer call) |
| `VAULT_URL` | No | Vault base URL (default: `https://u2.shop.dev`) |
| `VAULT_API_TOKEN` | No | Vault API token (default: `glass-dev-token`) |

**Important:** If the app doesn't open, kill any existing Electron processes first:
```bash
pkill -9 -f "Electron" 2>/dev/null; sleep 2; npx electron .
```

## Permissions

On first launch macOS will prompt for:
- **Microphone** — needed to capture the sales rep's voice
- **Screen Recording** — needed to capture system audio (the prospect's voice) via Electron loopback

## How It Works

### Main App Window
On launch, Glass shows a main application window with:
- **Google Account** — connect your Google account to enable calendar-based contact matching
- **Today's Meetings** — shows your calendar events, highlights meetings happening now, flags external attendees
- **Call Status** — shows when you're on a call and who was auto-matched

The HUD overlay (header + transcript + insights) stays hidden until a call is detected.

### Auto Call Detection
Glass automatically detects when you join a call. A native Swift binary (`MicWatcher`) monitors the **macOS system default input device** — when any app (Zoom, Google Meet, Teams, etc.) starts using the mic, Glass auto-starts listening and coaching. No button press needed.

**Important:** MicWatcher tracks the macOS system default input device. If your call app uses a different mic (e.g., selected in Google Meet settings), MicWatcher won't detect it. The mic must be set as the system default in **System Settings → Sound → Input**.

### Auto Contact Matching
When a call starts, Glass automatically tries to identify who you're talking to using two methods **in parallel**:

1. **Vault Active Call API** (takes precedence) — asks the CRM if the rep is currently on a Twilio dialer call. If yes, returns the full contact/account data.
2. **Google Calendar** — checks events happening now (asymmetric buffer: 2 min before start, 7 min after end), collects all external attendee emails from matching events, and sends them in a **single batch request** to `GET /crm/api/contacts/batch_lookup`. The first email that exists in Vault wins.

The Vault API result always wins. If neither method finds a match, the rep can still enter the contact manually. Calendar matching gracefully degrades — if Google isn't connected, only the Vault method runs. If the batch endpoint is unavailable, falls back to sequential lookups.

Once matched, the CRM side panel auto-populates and the LLM coaching prompt includes the contact's full context.

**Match source indicator:** The HUD shows how the contact was matched — 📞 **Vault Dialer** or 📅 **{Meeting Title}**. Click ✕ to dismiss if it matched the wrong event and use manual search instead.

### During a Call
1. The app captures your **microphone** via `getUserMedia`
2. The app captures **system audio** (what comes through your speakers) via Electron's `getDisplayMedia` loopback — macOS will ask you to select a screen to share
3. Both audio streams are sent to **Deepgram's real-time WebSocket STT** (nova-3 model)
4. Transcriptions appear live in the UI, labeled "Me" and "Them"
5. Every 2 transcript turns, **GPT-4.1** analyzes the conversation and provides coaching (Say This / Ask This)

### Sales Knowledge Base
Glass includes 16 knowledge files covering Shopify product knowledge, competitive positioning, MEDDPICC qualification, and regional coaching. Knowledge is dynamically selected based on CRM contact data (industry, region) and conversation keywords (e.g., prospect mentions "BigCommerce" → competitive knowledge loaded).

### Smart Coaching Triggers
In addition to the regular 2-turn coaching cadence, Glass detects high-signal moments and triggers coaching immediately:
- Objections (price, competitor, timing, authority)
- Buying signals (pricing questions, next steps, proposals)
- Risk/concern signals

### Post-Call Summary
When you press Done, Glass generates a concise AI summary and pushes it to Vault CRM:
- Dialer calls: note attached to the `CRM::Call` record
- Google Meet calls: matched via calendar event ID against existing `CRM::Call`
- Other calls: creates a Meeting activity with the summary
- All notes prefixed with 🤖 AI Summary

### Stop vs Done
- **Stop** — ends listening, keeps HUD visible (review transcript/insights)
- **Done** — generates AI summary → pushes to CRM → hides HUD → resets for next call

**Vault notes toggle:** When the Done button appears (after Stop), a document icon appears next to it in the header. Green = AI summary will be sent to Vault (default). Click to toggle off if you don't want notes pushed for this call. Hover for a tooltip explaining the current state. Resets to on for each new session.

## Keyboard Shortcuts

- `Cmd + \` — show/hide the HUD
