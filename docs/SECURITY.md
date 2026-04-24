# Security Audit & Notes

## Audit Summary (performed on fork)

The upstream Glass codebase was audited before modification. **No malicious behavior found.**

### Clean ✅
- No telemetry, analytics, or tracking (zero Mixpanel, Segment, Sentry, PostHog, etc.)
- `SystemAudioDump` binary — clean, only uses CoreAudio/AVFoundation, no network calls
- AEC WASM module (`aec.js`) — compiled Speex echo cancellation, no network calls
- No data exfiltration — audio only goes to configured STT provider

### Removed ⚠️ → ✅
- **Portkey hardcoded API key** (`gRv2UGRMq6GGLJ8aVEB4e7adIewu`) — was in `openai.js`, routed OpenAI traffic through Pickle's Portkey account. **Removed.**
- **Firebase config** — Pickle's Firebase project credentials (`pickle-3651a`). Would send data to their Firestore if auth was enabled. **Removed.**
- **Pickle's Vercel endpoint** — `https://serverless-api-sf3o.vercel.app/api/virtual_key` for token exchange. **Removed.**
- **Pickle's Cloud Function** — `https://us-west1-pickle-3651a.cloudfunctions.net/pickleGlassAuthCallback`. **Removed.**

### Current Outbound Connections

| Destination | Purpose | Data Sent |
|---|---|---|
| `wss://api.deepgram.com` | Real-time STT | Raw audio (PCM16) from mic and system |
| `https://proxy-shopify-ai.local.shop.dev` | LLM chat completions | Transcript text, prompts |
| `https://accounts.google.com` | Google OAuth2 | Auth code exchange (no audio/transcript data) |
| `https://www.googleapis.com/calendar/v3` | Google Calendar | Read-only calendar events |
| `https://www.googleapis.com/oauth2/v2/userinfo` | Google profile | Email, name, photo |
| `https://u2-2.shop.dev/crm/api/` | Vault CRM | Contact lookup queries, rep email |
| `localhost:51989` | Google OAuth callback | Receives auth code redirect (temporary, local only) |
| `localhost` (dynamic ports) | Internal web dashboard | Nothing external |

### Credentials

All sensitive credentials are passed via environment variables (`.env` file, gitignored):

| Key | Purpose |
|---|---|
| `SHOPIFY_PROXY_TOKEN` | Shopify AI proxy token for LLM access |
| `DEEPGRAM_API_KEY` | Deepgram API key for real-time STT |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `GLASS_REP_EMAIL` | Rep's Shopify email for Vault active call lookup |

The only hardcoded credential is `glass-dev-token` in `vaultService.js` and `contactMatchService.js` — a static dev token for the Vault API, overridable via `VAULT_API_TOKEN` env var.

**Google OAuth tokens** are stored in SQLite (`google_auth` table) — access token, refresh token, user profile. Cleared on sign out.

### Dead Code

All Firebase-related dead code has been deleted:
- `firebaseClient.js`, `migrationService.js`, `firestoreConverter.js`, and all `firebase.repository.js` files removed.
- `pickleglass_web/utils/firebase.ts` credentials stripped (empty strings).
