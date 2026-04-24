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

### Hardcoded Credentials

The following are hardcoded in the source (since this is an internal tool):

| Key | Location | Purpose |
|---|---|---|
| Shopify proxy token | `openai.js`, `modelStateService.js` | LLM access via Shopify AI proxy |
| Deepgram API key | `modelStateService.js` | Real-time STT |
| Vault API token | `vaultService.js`, `contactMatchService.js` | CRM data access (`glass-dev-token`) |

The following are passed via environment variables (not in source):

| Key | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret |
| `GLASS_REP_EMAIL` | Rep's Shopify email for Vault active call lookup |

**Google OAuth tokens** are stored in SQLite (`google_auth` table) — access token, refresh token, user profile. Cleared on sign out.

**Before distributing to sales reps**, consider moving all hardcoded keys to environment variables or a secure config mechanism.

### Dead Code (disconnected but on disk)

These files still exist but nothing imports them:
- `src/features/common/services/firebaseClient.js`
- `src/features/common/services/migrationService.js`
- `src/features/common/repositories/firestoreConverter.js`
- All `firebase.repository.js` files in each repository directory

Consider deleting these before distribution to keep the codebase clean.
