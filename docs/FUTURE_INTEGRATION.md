# Future Integration Options

## Current: Electron Desktop App

The current approach — a standalone Electron app that captures system audio + mic, transcribes via Deepgram, and shows coaching in an overlay window. Works with any call platform (Zoom, Google Meet, phone, Twilio, etc.).

**Pros:** Universal — works regardless of how the call happens.
**Cons:** Separate app window, screen share prompt for system audio, requires distribution.

## Future Option: Twilio In-Browser Integration

Since the Vault dialer uses Twilio in-browser, there's an opportunity to build the coaching directly into Vault for calls made from the CRM.

### How It Would Work

Twilio's JS SDK exposes `MediaStream` objects for both sides of the call:
- **Local stream** (rep's mic) — available from the Twilio Device/Connection
- **Remote stream** (prospect's voice) — available from the WebRTC connection

Both streams can be piped directly to Deepgram WebSocket STT, identical to how the Electron app does it but without the hacky `getDisplayMedia` loopback.

### Architecture

```
Vault Dialer (Twilio) ──→ Local MediaStream ──→ Deepgram WS ──→ "Me" transcript
                     └──→ Remote MediaStream ──→ Deepgram WS ──→ "Them" transcript
                                                                       │
                                                 Every 2 turns ───────→ gpt-4.1 + CRM context
                                                                       │
                                                       Coaching UI ←───┘
                                                    (injected into Vault page)
```

### Benefits Over Electron
- No separate app — coaching UI lives inside Vault
- No screen share prompt — Twilio gives clean access to both audio streams
- No distribution headache — it's just a Vault feature
- Auto-detects which contact is being called (already in the CRM context)
- Styled to match Vault's design system
- Auth is already handled

### What Carries Over From Electron Work
- **Deepgram STT integration** — same WebSocket approach, same nova-3 model
- **Sales coaching prompt** — `sales_coaching` prompt template works as-is
- **CRM data injection** — the Vault API endpoint already exists, or data can be loaded directly from ActiveRecord since we're inside the app
- **LLM integration** — same Shopify proxy, same gpt-4.1
- **Coaching response parser** — same logic for extracting Say This / Ask This / context

### What's New To Build
- JavaScript module to hook into Twilio call events (connect, disconnect)
- Audio stream tapping from Twilio SDK
- UI panel in the Vault dialer view (Rails view + Stimulus controller)
- WebSocket connection management in the browser

### When To Build This
After the Electron app proves the concept with the sales team. If they find it valuable, build the Twilio integration for Vault-originated calls and keep the Electron app as a fallback for Zoom/Meet/phone calls.

## Other Integration Options Considered

### Chrome Extension
Inject coaching UI into any browser page. Could detect Vault dialer pages and auto-activate.
- **Pro:** Works in browser, can match page styling
- **Con:** Can't capture system audio (only tab audio), complex distribution, separate from Vault codebase

### Electron + Chrome Extension Hybrid
Electron handles audio capture in background, Chrome extension provides UI injected into Vault pages, communicate via localhost WebSocket.
- **Pro:** Best of both worlds — native audio + browser UI
- **Con:** Two things to install and keep in sync

### Build Directly Into Vault (Option 3)
Full Rails feature with audio capture via browser APIs.
- **Pro:** Cleanest long-term, no separate app
- **Con:** `getDisplayMedia` for system audio requires user permission each time, only captures tab audio not system-wide. Only viable for Twilio in-browser calls.

## Recommendation

**Short term:** Keep the Electron app. It works with everything — Zoom, Meet, phone, Twilio.

**Medium term:** Build the Twilio in-browser integration for Vault-originated calls. SDRs making calls from the dialer get a seamless experience with no separate app.

**Long term:** Both coexist. Electron for external calls, Vault-native for dialer calls. Same coaching logic, same prompts, same CRM data — just different audio capture and UI layers.
