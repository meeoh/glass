# Architecture

## Overview

The app is an Electron desktop application with three layers:

1. **Electron Main Process** (`src/`) — business logic, audio routing, AI providers, SQLite storage
2. **Renderer / UI** (`src/ui/`) — Lit web components, bundled by esbuild
3. **Web Dashboard** (`pickleglass_web/`) — Next.js static app for settings/activity (not critical for V0)

## AI Provider Stack

| Function | Provider | Model | Endpoint | Auth |
|---|---|---|---|---|
| **STT — mic ("Me")** | Deepgram | nova-3 | `wss://api.deepgram.com/v1/listen` | Deepgram API key |
| **STT — system audio ("Them")** | Deepgram | nova-3 | Same (separate WebSocket) | Deepgram API key |
| **LLM — Ask / Q&A** | OpenAI via Shopify proxy | gpt-4.1 | `https://proxy-shopify-ai.local.shop.dev/v1/chat/completions` | Shopify proxy token |
| **LLM — Streaming (insights)** | OpenAI via Shopify proxy | gpt-4.1 | Same (stream=true) | Shopify proxy token |

## External API Integrations

| Function | Endpoint | Auth |
|---|---|---|
| **Google OAuth2** | `https://accounts.google.com/o/oauth2/v2/auth` | OAuth2 client ID/secret (env vars) |
| **Google Calendar** | `https://www.googleapis.com/calendar/v3/calendars/primary/events` | OAuth2 access token |
| **Google User Profile** | `https://www.googleapis.com/oauth2/v2/userinfo` | OAuth2 access token |
| **Vault Contact Lookup** | `GET /crm/api/contacts/lookup?email=...` | Bearer token |
| **Vault Batch Lookup** | `GET /crm/api/contacts/batch_lookup?emails[]=...` | Bearer token |
| **Vault Active Call** | `GET /crm/api/active_call?user_email=...` | Bearer token |

## Audio Capture Pipeline

```
┌─────────────────────────────────────────────────┐
│                 Renderer Process                 │
│                                                  │
│  getUserMedia (mic) ──→ PCM16 chunks ──→ IPC ──→ Main Process ──→ Deepgram WS ("Me")
│                                                  │
│  getDisplayMedia (loopback) ──→ PCM16 chunks ──→ IPC ──→ Main Process ──→ Deepgram WS ("Them")
│                                                  │
└─────────────────────────────────────────────────┘

Audio flow:
1. Renderer captures audio at 24kHz, mono, PCM16
2. Audio is chunked into 100ms segments
3. Chunks are base64-encoded and sent to main process via IPC
4. Main process forwards to Deepgram WebSocket
5. Deepgram returns partial + final transcriptions
6. Main process sends transcription events back to renderer
7. SttView component renders them in real-time
```

## Auto Call Detection

```
┌──────────────────────────────────────────────────────────┐
│  MicWatcher (native Swift binary)                        │
│  Polls CoreAudio kAudioDevicePropertyDeviceIsRunning-    │
│  Somewhere every 2s. Prints MIC_ACTIVE / MIC_INACTIVE.  │
└───────────────────┬──────────────────────────────────────┘
                    │ stdout
                    ▼
┌──────────────────────────────────────────────────────────┐
│  callDetectionService.js (main process)                  │
│  Spawns MicWatcher, reads stdout, emits 'call-started'.  │
│  On call-started → listenService.handleListenRequest()   │
└──────────────────────────────────────────────────────────┘
```

- Auto-start: ✅ Detects when any app grabs the mic → auto-starts listening
- Auto-stop: ❌ Not yet — Glass holds the mic so can't detect when call app releases it

## Key Files

### Call Detection
- `src/native/MicWatcher.swift` — native Swift binary, polls CoreAudio mic state
- `src/native/MicWatcher` — compiled binary (not in git, auto-compiles on first run)
- `src/features/callDetection/callDetectionService.js` — spawns MicWatcher, emits call events

### Google Auth & Calendar
- `src/features/googleAuth/googleAuthService.js` — Google OAuth2 flow (system browser + local HTTP callback server), token persistence in SQLite
- `src/features/calendar/calendarService.js` — polls Google Calendar every 5 min, provides current event + external attendee data

### Contact Auto-Matching
- `src/features/contactMatch/contactMatchService.js` — orchestrates two parallel match methods (Vault active call + calendar attendees)
- `src/features/vault/vaultService.js` — Vault CRM contact lookup + prompt context builder

### Sales Knowledge Base
- `src/features/common/prompts/knowledgeLoader.js` — dynamically loads knowledge files based on CRM data + conversation keywords
- `src/features/common/prompts/knowledge/*.md` — 16 markdown knowledge files (MEDDPICC, competitive, verticals, regional)

### Post-Call Summary
- `src/features/listen/summary/postCallSummaryService.js` — generates concise summary on Done, pushes to Vault CRM as a note

### Audio & STT
- `src/ui/listen/audioCore/listenCapture.js` — audio capture in renderer (mic + system audio)
- `src/ui/listen/audioCore/renderer.js` — bridges capture events to the UI
- `src/features/listen/stt/sttService.js` — manages two STT sessions (Me/Them), routes transcriptions
- `src/features/listen/listenService.js` — orchestrates listen sessions (start/stop/save)

### AI Providers
- `src/features/common/ai/factory.js` — provider registry and factory functions
- `src/features/common/ai/providers/openai.js` — OpenAI provider (hardcoded to Shopify proxy)
- `src/features/common/ai/providers/deepgram.js` — Deepgram STT provider
- `src/features/common/ai/providers/gemini.js` — Gemini provider (available but not active)

### Data Layer
- `src/features/common/services/modelStateService.js` — manages API keys, model selection, auto-seeding
- `src/features/common/repositories/` — SQLite-only repositories (Firebase removed)
- `src/features/common/services/authService.js` — simplified local-only auth

### UI
- `src/ui/main/main.html` — main app window (Google auth, calendar events, call status)
- `src/ui/listen/ListenView.js` — HUD listen panel (transcript + insights tabs, draggable)
- `src/ui/listen/stt/SttView.js` — real-time transcript display
- `src/ui/listen/summary/SummaryView.js` — AI-generated meeting insights
- `src/ui/app/PickleGlassApp.js` — HUD app shell

### Window Management
- `src/window/windowManager.js` — creates/manages Electron windows (main app, header, listen, ask, settings)
- `src/bridge/featureBridge.js` — IPC handlers connecting renderer ↔ main process

## Data Storage

All data stored locally in SQLite at `~/Library/Application Support/Glass/pickleglass.db`:
- Sessions (listen/ask)
- Transcripts (speaker, text, timestamp)
- AI messages
- Summaries
- Provider settings (API keys, selected models)
