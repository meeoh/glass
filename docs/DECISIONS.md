# Technical Decisions Log

## STT Provider: Deepgram (nova-3)

**Decision:** Use Deepgram for real-time speech-to-text.

**Alternatives considered:**
- **OpenAI Realtime API** — ideal but Shopify proxy doesn't forward audio over WebSocket. The proxy connects and handles text messages, but `input_audio_buffer.append` messages are silently dropped. Would work with a direct OpenAI API key.
- **Gemini Live API** — free tier available, but the `gemini-2.5-flash-native-audio-latest` model closes the session with "Cannot extract voices from a non-audio request" before mic audio arrives. Timing issue between session creation and renderer starting audio capture.
- **Whisper (local)** — completely free and private, but transcription quality was poor. Processes in chunks rather than streaming, so noticeable delay.

**Why Deepgram:** Reliable real-time WebSocket STT, no timeout issues, high accuracy, simple integration. Uses the nova-3 model. Free tier includes $200 credit.

## LLM Provider: OpenAI gpt-4.1 via Shopify Proxy

**Decision:** Route all LLM calls through `https://proxy-shopify-ai.local.shop.dev`.

**What works on the proxy:**
- `/v1/chat/completions` (REST) ✅
- `/v1/chat/completions` with streaming ✅
- `/v1/responses` ✅
- `/v1/models` ✅
- `/v1/audio/transcriptions` (whisper-1, gpt-4o-mini-transcribe) ✅

**What doesn't work:**
- `wss://proxy.shopify.ai/v1/realtime` — WebSocket connects and creates session, but audio buffer messages are silently dropped. Text-based realtime conversations work.

## System Audio Capture: Electron Loopback

**Decision:** Use Electron's `getDisplayMedia` with `audio: true` instead of the `SystemAudioDump` binary.

**Why:** The `SystemAudioDump` binary is ad-hoc signed and gets killed by macOS Gatekeeper on Shopify-managed Macs (MDM policy: "Allow applications from App Store & Known Developers", locked by profile). Re-signing with `codesign --force --sign -` doesn't help — needs a real Apple developer certificate.

**Tradeoff:** User must select a screen to share when clicking Listen (macOS requirement for loopback audio). This is a one-time prompt per session.

## Auto Call Detection: CoreAudio Mic Polling

**Decision:** Use a native Swift binary (`MicWatcher`) that polls CoreAudio's `kAudioDevicePropertyDeviceIsRunningSomewhere` every 2 seconds to detect when another app grabs the microphone.

**Why polling instead of event-driven:**
- CoreAudio provides `AudioObjectAddPropertyListenerBlock` for event-driven callbacks
- Tested this approach — the listener callback never fires when spawned as a child process. The `DispatchQueue.main` / `RunLoop.main` combination doesn't dispatch events reliably in a headless CLI process
- Polling every 2s is reliable and the CPU cost is negligible (single CoreAudio property read)

**What it detects:**
- Any app grabbing the microphone (Zoom, Google Meet, Teams, Slack, FaceTime, etc.)
- Input device changes (e.g., user plugs in a headset mid-call)

**Auto-start:** ✅ Working. Mic goes active → Glass auto-starts listening.

**Auto-stop:** ❌ Not yet solved. When Glass starts listening, it grabs the mic itself via `getUserMedia`. CoreAudio's `isRunningSomewhere` stays `true` because Glass is holding the mic, even after the call app releases it. CoreAudio doesn't expose a process count — just a boolean.

**Approaches considered and rejected for auto-stop:**
1. **Mic release + check** — briefly stop Glass's mic, check if anyone else is using it, resume. Works but causes ~200ms audio gaps every check cycle. Unacceptable.
2. **"Them" silence detection** — if no STT transcript from the other side for 60s, assume call ended. Too many false positives (prospect goes quiet, hold music, etc.).
3. **Process/window detection** — check for Zoom's `CptHost` process or Chrome "Meet -" window titles. Works for Zoom but not for browser-based calls (Chrome process stays running).
4. **Track ended event** — listen for `getDisplayMedia` track's `ended` event. Only works if system audio was captured via screen share, and doesn't fire reliably on all platforms.

**Current workaround:** User presses Stop manually. Auto-start is the big UX win.

## Sales Coaching: Trigger Frequency

**Decision:** Trigger LLM analysis every 2 transcript turns.

**History:** Original Glass default was every 5 turns → we changed to 3 → settled on 2.

## Sales Coaching: Prompt & UI Layout

**Decision:** Custom `sales_coaching` prompt with three UI sections:
- **🎯 Say This** — exact words to say (quoted suggestions, most prominent)
- **Context header + bullets** — what was detected (objection type, signals) + supporting detail
- **❓ Ask This** — follow-up questions to ask

The parser routes LLM output by content type: quoted text → Say This, questions → Ask This, everything else → context.

## API Keys: Hardcoded & Auto-Seeded

**Decision:** Hardcode all API keys and auto-seed them into SQLite on first launch. Sales reps never configure anything.

**Keys seeded:**
- Shopify proxy token → OpenAI provider (active for LLM)
- Deepgram API key → Deepgram provider (active for STT)

**Future consideration:** Move keys to environment variables or secure config before distributing to the full sales team.

## Firebase / Auth: Removed Entirely

**Decision:** Strip all Firebase infrastructure. App runs in local-only mode with SQLite.

**Rationale:** This is an internal Shopify tool — no need for cloud sync, user accounts, or Pickle's auth flow. Removing Firebase eliminates all outbound calls to Pickle's infrastructure.

## Google OAuth: System Browser + Local HTTP Callback

**Decision:** Open the Google OAuth URL in the system browser (Safari/Chrome) and catch the redirect via a local HTTP server on port 51989.

**Why not Electron BrowserWindow:** Shopify's Google Workspace uses Okta SSO with passkey/WebAuthn authentication. Electron's BrowserWindow doesn't support the WebAuthn API, so the passkey prompt never fires. The system browser has full WebAuthn support.

**How it works:**
1. Glass spins up a temporary HTTP server on `localhost:51989`
2. Opens the Google OAuth URL in the system browser via `shell.openExternal`
3. User authenticates in their browser (passkeys work natively)
4. Google redirects to `http://localhost:51989/oauth/callback?code=...`
5. Glass exchanges the code for tokens, fetches user profile, closes the server
6. Shows a "Connected to Glass" page in the browser tab

**Redirect URI:** `http://localhost:51989/oauth/callback` — must be registered in the Google Cloud Console.

**Token persistence:** Tokens (access, refresh, user profile) are stored in the `google_auth` SQLite table. On app restart, tokens are restored and refreshed if expired. No re-auth needed unless the user signs out or the refresh token is revoked.

**Google Workspace restrictions:** Shopify's Workspace admin must approve the Google Cloud project before `@shopify.com` accounts can authorize. Personal `@gmail.com` accounts work if added as test users on the OAuth consent screen.

## Calendar Matching: Asymmetric Buffer, Sorted by Proximity

**Decision:** Match calendar events using an asymmetric time buffer: 2 minutes before start, 7 minutes after end. When multiple events overlap, sort by closest start time to now.

**Why asymmetric:** People are often late to calls but rarely early. A symmetric ±5 min buffer created false matches with back-to-back meetings. The -2/+7 shape reflects real-world behavior: tight before (you're rarely joining 5 min early) and generous after (calls commonly run 5–7 min late).

**Back-to-back meetings:** At 10:28 with a 10:00 meeting ending at 10:30 and a 10:30 meeting starting, both may be "current." Sorting by closest start time ensures the 10:30 meeting (2 min away) is tried first.

**Attendee filtering:** Only the rep's own emails (Google auth email + `GLASS_REP_EMAIL`) are excluded. All other attendees are candidates — including `@shopify.com` addresses, since prospects may have Shopify accounts (partner agencies, Plus merchants, etc.).

**Polling:** Every 5 minutes. Also polls immediately on first auth and on manual refresh.

## Calendar Matching: Batch Lookup Instead of Sequential

**Decision:** Send all calendar attendee emails to Vault in a single `GET /crm/api/contacts/batch_lookup` request instead of trying them one-by-one.

**Why:** The sequential approach made N HTTP requests (one per attendee) which was slow and created unnecessary load on Vault. The batch endpoint does a single `WHERE email IN (...)` query and returns the first match in the caller's email order, so the caller controls priority (closest event's attendees first).

**Fallback:** If the batch endpoint returns an error (e.g., older Vault without the endpoint), falls back to the sequential single-email lookup.

**Max 20 emails:** Practical limit to prevent abuse. Calendar events with 20+ attendees are unlikely to be 1:1 sales calls.

## Auto-Match: Two Methods in Parallel, Vault Wins

**Decision:** Run Vault active call check and calendar matching simultaneously. Vault result takes precedence.

**Why Vault wins:** If the rep is using the CRM dialer, the Vault API gives an exact match (the call record links directly to the contact). Calendar matching is a heuristic — the meeting attendee might not be the same person being called.

**Graceful degradation:** If Google isn't connected, only the Vault method runs. If the Vault API is unreachable, only calendar runs. If both fail, the rep can enter the contact manually (existing flow). Nothing crashes.

**Rep identification:** The rep's email for Vault lookups comes from `GLASS_REP_EMAIL` env var (takes priority) or Google auth email. The env var is needed when the Google account email differs from the Shopify/Vault user email.

## Main App Window: Always Visible, HUD Hidden Until Call

**Decision:** Glass launches with a main application window (420×640, dark UI) that's always accessible. The HUD overlay (header + transcript + insights) stays hidden until a call is detected.

**Why:** The HUD is designed for during-call coaching — showing it on launch with nothing to display is confusing. The main window gives the user a home base to connect Google, see their calendar, and understand Glass's status.

**Dock icon:** Always visible so the user can find Glass after switching apps.

**Stop vs Done:**
- Stop — ends listening, keeps HUD visible (user can review transcript/insights)
- Done — hides the HUD entirely, clears matched contact, resets for next call

## Listen Pane: Draggable, Stays Put

**Decision:** The listen/insights pane has a drag handle (pill at the top). Once the user drags it to a new position, it stays there — layout updates from new content don't snap it back.

**Implementation:** A `userDraggedWindows` set tracks which windows have been manually moved. The `updateChildWindowLayouts` function skips layout calculations for dragged windows. The set resets when a new call starts (via `showHUD`).

## MicWatcher: System Default Input Device Only

**Decision:** MicWatcher monitors the macOS **system default input device** (`kAudioHardwarePropertyDefaultInputDevice`). It does NOT monitor all audio devices.

**Implication:** If the user's call app (e.g., Google Meet) is configured to use a specific mic that isn't the system default, MicWatcher won't detect the call. The mic must be set as the system default in System Settings → Sound → Input.

**Known issue — screen recording:** macOS screen recording can grab the default mic, which triggers MicWatcher and auto-starts Glass. After pressing Done, the mic is still held by screen recording, so the next mic activation from a real call may not produce a fresh inactive→active transition. Workaround: start screen recording after joining the call, or use a screen recorder that doesn't capture mic input.

## Content Protection: Disabled for Dev/Demo

**Decision:** `isContentProtectionOn = false` in `windowManager.js`. The app now shows up in screenshots and screen recordings.

**For production:** Set back to `true` so the app is invisible during screen shares.

## Vault CRM Integration

**Decision:** CRM data shown in a right side panel (200px), always visible during the call. Main panel stays full width (window is 620px total).

**API:** `GET https://u2-2.shop.dev/crm/api/contacts/lookup?email=...` with `Bearer glass-dev-token` auth.

**Data flow:** 
1. SDR types email/name in the search bar before or during a call
2. Glass hits the Vault API, gets contact/account/shops/deals/emails/calls/notes
3. Highlights shown in the side panel (title, platform, revenue, lead score, engagement stats)
4. Full CRM context injected into the LLM prompt so coaching references their specific situation

## Window Layout

**Decision:** Listen window is always 620px wide, grows with content up to 600px tall, then scrolls.

**Why fixed 620px:** Avoids fighting Glass's WindowLayoutManager which kept resizing the window back. The 620px accommodates the main panel + CRM side panel without dynamic resizing.

**Scrolling:** The height chain is `html` → `body` → `pickle-glass-app` → `listen-view` → `.assistant-container` → `.main-layout` → `.main-panel` → `.content-area` → `stt-view`/`summary-view`, all with bounded heights. The innermost container (`transcription-container` / `insights-container`) handles scrolling with `overflow-y: auto`. Hidden views use `display: none` at the host level so they don't consume flex space.

## DevTools: Left Open in Dev Mode

**Decision:** Leave DevTools opening in dev mode for now. They open when `app.isPackaged` is false.

**Note:** Closing a DevTools window may close the associated app window. Minimize them instead. Will be disabled before distribution.

## Post-Call Summary: Plain Text, 3 Sentences Max

**Decision:** Generate a concise 3-sentence plain text summary (no markdown, no headers, no bullet points) and push it to Vault CRM.

**Why plain text:** Vault's timeline renders note bodies in a `<p>` tag which collapses newlines. Markdown headers and bullet points render as unreadable inline text. Plain flowing prose displays cleanly.

**Why 3 sentences:** Tested longer summaries with section labels (TOPICS:, OBJECTIONS:, etc.) — too cluttered in the timeline. A natural-sounding 3-sentence paragraph reads well and captures the essentials: what was discussed, concerns raised, and next steps.

**CRM note prefix:** `🤖 AI Summary:` — clearly labels it as AI-generated without being verbose.

**Call matching priority:**
1. Dialer call (`call_id` from active call API) → note on `CRM::Call`
2. Google Meet call (`calendar_event_id` matched against `CRM::Call.external_id`) → note on existing call
3. Fallback → new `CRM::Activity` (type: Meeting) + note

## Smart Coaching Triggers: Immediate on High-Signal Moments

**Decision:** Detect objections, buying signals, and risk signals in real-time and trigger coaching immediately instead of waiting for the 2-turn cadence.

**6 signal types:** price objection, competitor/status quo, timing, authority, buying signal, risk/concern. Pattern-matched against ~60 phrases.

**Why keyword matching (not LLM):** The detection needs to be instant — can't wait for an LLM round-trip just to decide whether to trigger. Simple `string.includes()` is <1ms. The LLM then handles the actual coaching response.

**15-second debounce:** Prevents multiple triggers in rapid succession (e.g., prospect says "too expensive" then "over budget" in the same sentence).

**Coaching hint injection:** A system hint like `[COACHING SYSTEM: PRICE OBJECTION DETECTED]` is prepended to the conversation so the LLM knows to prioritize objection handling over general coaching.

## Google Auth Token Persistence

**Decision:** Store Google OAuth tokens in SQLite (`google_auth` table) so auth survives app restarts.

**What's stored:** access_token, refresh_token, token_expiry, user_email, user_name, user_photo.

**On startup:** `googleAuthService.initialize()` restores tokens from SQLite. If the access token is expired, it auto-refreshes using the refresh token. If the refresh token is revoked, the user is signed out cleanly.

**Sign out:** Clears both in-memory state and the SQLite row.

## Onboarding: What's Per-User vs Baked-In

**Decision:** Only the Shopify Proxy Token is per-user. Everything else is baked into the app at build time.

**Baked in (build-time, via GitHub secrets → config files):**
- Google OAuth Client ID/Secret — app-level credential, same for all users
- Deepgram API Key — shared team STT key, same for all users

**Per-user (entered during onboarding, stored in SQLite):**
- Shopify AI Proxy Token — tied to individual user's email, has expiry, generated at proxy.shopify.ai

**Why:** The proxy token is a personal JWT containing the user's email and an expiry date. It can't be shared. Deepgram and Google OAuth are app-level credentials that identify the application, not the user.

## Build Distribution: GitHub Actions Required

**Decision:** Use GitHub Actions CI to build the macOS DMG. Cannot build on Shopify-managed Macs.

**Why:** Shopify's MDM kills the `app-builder` binary (unsigned) that electron-builder needs to package the app. The binary gets Killed:9 immediately, even after re-signing with `codesign --force --sign -`.

**Workaround:** GitHub Actions macOS runners have no MDM, so the build succeeds there. DMG is uploaded as an artifact.

**Future:** Code-signing with a Shopify Apple Developer certificate would make the app pass Gatekeeper on managed Macs without "Open Anyway".

## Coaching Trigger: Prospect Speech Only

**Decision:** Coaching triggers after the prospect speaks (8+ words), not the rep.

**Rationale:**
- The rep needs coaching *before* they respond — so it must fire after the prospect finishes
- Triggering after the rep speaks is useless — they've already said it
- Short responses ("yeah", "okay") are filtered out to avoid noise
- Smart triggers (objection keywords) still fire immediately regardless of length
- 5-second debounce prevents LLM spam from rapid prospect sentences

**Previous behavior:** Every 2 turns from either side.

## Vault CRM: Disabled by Default

**Decision:** All Vault CRM features are disabled when `VAULT_API_TOKEN` is not set.

**Why:** The app is being distributed before the Vault API endpoint is production-ready. Disabling by default prevents errors and unnecessary network calls. Re-enable by setting the env var.

**What's disabled:** Contact lookup, auto-match, post-call summary push.
**What still works:** Transcription, AI coaching, smart triggers, calendar display.

## Permissions: macOS App Identity

**Decision:** Permissions are per-app-identity on macOS. The packaged DMG ("Sales Assistant.app") needs its own grants, separate from local dev ("Electron").

**Implication:** The onboarding flow must handle permissions properly because a fresh install of the DMG has zero permissions granted. The `tccutil reset` approach for testing locally doesn't reliably work — true testing requires the packaged app.

**Auto-start guard:** MicWatcher detection skips auto-start if mic permission isn't granted yet. This prevents the repeated permission dialog that occurred when MicWatcher fired before the user completed onboarding.
