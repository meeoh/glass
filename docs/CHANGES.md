# Changes from Original Glass (Pickle)

Everything we modified from the upstream [meeoh/glass](https://github.com/meeoh/glass) fork.

## Removed: Firebase & Cloud Infrastructure

| What | Files Changed |
|---|---|
| Firebase auth (login/logout/onAuthStateChanged) | `src/features/common/services/authService.js` — rewritten to local-only |
| Firebase Firestore (cloud data sync) | All 6 repository `index.js` files — simplified to SQLite-only |
| `initializeFirebase()` call | `src/index.js` |
| Firebase auth callback (Cloud Function) | `src/index.js` — `handleFirebaseAuthCallback` removed |
| Pickle's Vercel endpoint (`/api/virtual_key`) | `src/features/common/services/authService.js` |
| `setFirebaseVirtualKey` / `isLoggedInWithFirebase` | `src/features/common/services/modelStateService.js` |
| Firebase auth IPC handlers (`start-firebase-auth`, `firebase-logout`) | `src/bridge/featureBridge.js` |
| Encryption key init IPC | `src/bridge/featureBridge.js` |

**Note:** The `firebase.repository.js` files, `firebaseClient.js`, `migrationService.js`, and `firestoreConverter.js` still exist on disk but are completely disconnected — nothing imports them.

## Removed: Portkey & openai-glass Provider

| What | Files Changed |
|---|---|
| Hardcoded Portkey API key (`gRv2UGRMq6GGLJ8aVEB4e7adIewu`) | `src/features/common/ai/providers/openai.js` — removed from 3 places |
| `portkey-ai` SDK import | `src/features/common/ai/providers/openai.js` |
| `openai-glass` provider definition | `src/features/common/ai/factory.js` |
| `usePortkey` / `portkeyVirtualKey` params | `openai.js`, `sttService.js`, `askService.js`, `summaryService.js` |
| `-glass` model suffix sanitization | `src/features/common/ai/factory.js` |

## Added: Shopify Proxy for LLM

`src/features/common/ai/providers/openai.js` — hardcoded to route all OpenAI calls through:
- **REST:** `https://proxy-shopify-ai.local.shop.dev/v1/chat/completions`
- **Auth:** `Bearer shopify-eyJ...` (Shopify proxy token)
- All three paths (LLM, streaming LLM, validation) use the proxy
- The `apiKey` parameter from the system is ignored — proxy token is always used

## Added: Auto-Seeded API Keys

`src/features/common/services/modelStateService.js` — `_ensureProxyKeySeeded()`:
- Seeds Shopify proxy token as the OpenAI provider API key on first launch
- Seeds Deepgram API key for STT on first launch
- Sets OpenAI as active LLM provider, Deepgram as active STT provider
- Sales reps never need to configure anything

## Added: Auto Call Detection

**New files:**
- `src/native/MicWatcher.swift` — Swift binary that polls CoreAudio mic state every 2s
- `src/native/MicWatcher` — compiled binary (auto-compiles on first run, not in git)
- `src/features/callDetection/callDetectionService.js` — spawns MicWatcher, emits `call-started` event

**Changed files:**
- `src/index.js` — starts callDetectionService on app launch, wires `call-started` to `listenService.handleListenRequest('Listen')`
- `src/bridge/featureBridge.js` — syncs manual Listen/Stop with callDetectionService state
- `.gitignore` — excludes compiled MicWatcher binary

**How it works:** MicWatcher polls `kAudioDevicePropertyDeviceIsRunningSomewhere` every 2s. When any app grabs the mic → Glass auto-starts listening. Auto-stop is not yet implemented (see DECISIONS.md).

## Changed: macOS System Audio Capture

`src/ui/listen/audioCore/listenCapture.js`:
- **Before:** Used `SystemAudioDump` binary (blocked by Shopify MDM/Gatekeeper)
- **After:** Uses Electron's native `getDisplayMedia` with `audio: true` for loopback capture
- macOS prompts user to select a screen to share (this enables audio capture)

## Changed: Repository Adapters (SQLite-only)

All 6 repository `index.js` files simplified — removed Firebase branch, always use SQLite:
- `src/features/common/repositories/session/index.js`
- `src/features/common/repositories/user/index.js`
- `src/features/common/repositories/preset/index.js`
- `src/features/ask/repositories/index.js`
- `src/features/listen/stt/repositories/index.js`
- `src/features/listen/summary/repositories/index.js`
- `src/features/settings/repositories/index.js`

## Added: EPIPE Crash Fix

`src/index.js` — added `process.stdout/stderr.on('error', () => {})` to prevent crashes when Electron's stdout pipe breaks.

## Added: Google OAuth + Calendar Integration (V3)

**New files:**
- `src/features/googleAuth/googleAuthService.js` — Google OAuth2 flow using system browser + local HTTP callback server (port 51989). Token persistence in SQLite `google_auth` table.
- `src/features/calendar/calendarService.js` — polls Google Calendar API every 5 min for today's events. Provides current events (±5 min buffer) and external attendee emails.

**Changed files:**
- `src/index.js` — initializes Google auth on startup, restores tokens from SQLite, starts calendar polling if authorized
- `src/bridge/featureBridge.js` — added IPC handlers for `glass:authorize-google`, `glass:sign-out-google`, `glass:refresh-calendar`, `glass:get-initial-state`
- `src/preload.js` — added `glass` namespace with auth, calendar, listen state, and match result IPC channels

**Environment variables:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth2 credentials
- `GLASS_REP_EMAIL` — rep's Shopify email for Vault active call lookups

## Added: Contact Auto-Matching (V3)

**New files:**
- `src/features/contactMatch/contactMatchService.js` — orchestrates two parallel matching methods on call start

**Method 1 — Vault Active Call API:**
- Hits `GET /crm/api/active_call?user_email=<rep_email>` to check if the rep is on a Twilio dialer call
- Returns full contact/account payload if active call found
- Rep email from `GLASS_REP_EMAIL` env var (priority) or Google auth email

**Method 2 — Calendar Matching:**
- Gets external attendee emails from calendar events happening now (±5 min)
- Tries each email against `GET /crm/api/contacts/lookup?email=...`
- First Vault hit wins

**Vault takes precedence.** Calendar is fallback. If neither matches, manual entry still works.

**Changed files:**
- `src/bridge/featureBridge.js` — triggers auto-match on listen start (auto or manual), clears match on Done
- `src/index.js` — wires call-started event to auto-match
- `src/ui/listen/ListenView.js` — listens for `vault:contact-changed` to auto-populate CRM side panel

## Added: Vault Active Call API Endpoint (u2-2)

**New files (on u2-2 worktree, branch `glass-contact-api`):**
- `engines/crm/app/controllers/crm/api/active_calls_controller.rb` — `GET /crm/api/active_call?user_email=...`
- `engines/crm/app/controllers/crm/api/concerns/contact_serialization.rb` — shared serializers extracted from contacts controller

**Changed files:**
- `engines/crm/config/routes.rb` — added `get "active_call"` route
- `engines/crm/app/controllers/crm/api/contacts_controller.rb` — refactored to use shared serialization concern

## Added: Main App Window (V3)

**New files:**
- `src/ui/main/main.html` — standalone app window (420×640, dark UI) with Google auth card, today's meetings list, call status banner, match result display

**Changed files:**
- `src/window/windowManager.js` — added `createMainAppWindow()`, `showHUD()`, `hideHUD()`, `showMainAppWindow()`, `notifyListenStateChanged()`. HUD header now starts hidden (`show: false`). Listen window tracks user drags to prevent snap-back.
- `src/index.js` — creates main app window on launch, shows HUD on call detection, dock icon click shows main window

## Changed: HUD Behavior (V3)

- HUD (header + listen + ask + settings windows) now starts **hidden**
- Shows automatically when MicWatcher detects a call (mic goes active)
- **Stop** — ends listening, keeps HUD visible for review
- **Done** — hides HUD entirely, clears contact match
- Listen pane is now **draggable** (drag handle pill at top) and stays where the user puts it

## Added: Sales Knowledge Base (V3)

**New files:**
- `src/features/common/prompts/knowledgeLoader.js` — loads knowledge files dynamically based on three signals:
  1. CRM contact industry/vertical → loads matching vertical knowledge
  2. CRM contact region → loads matching regional coaching context
  3. Conversation transcript keywords → scanned every 2 turns, triggers additional knowledge (e.g., prospect mentions "BigCommerce" → competitive proof points loaded)
- `src/features/common/prompts/knowledge/` — 16 markdown files:
  - **Core (always loaded):** meddpicc.md, shopify_competitive.md, plus.md, payments.md, pos.md, unified.md
  - **Verticals:** b2b.md, capital.md, consumer_goods.md, emerging.md, food_bev.md, lifestyle.md, manufacturing.md
  - **Regional:** region_emea.md, region_amer.md, region_apac.md

**Changed files:**
- `src/features/listen/summary/summaryService.js` — injects knowledge context into the coaching system prompt alongside CRM data and conversation transcript

**Knowledge sourced from:** [meddpicc-sales-coach](https://github.com/shopify-playground/meddpicc-sales-coach) repo (coaching-engine.js + knowledge/*.js)

**To add new knowledge:** Drop a `.md` file in `src/features/common/prompts/knowledge/` and add keyword triggers to `CONVERSATION_TRIGGERS` in `knowledgeLoader.js`.

## Added: Post-Call Summary + CRM Push (V3)

**New files:**
- `src/features/listen/summary/postCallSummaryService.js` — generates a concise 3-sentence summary via GPT-4.1 on Done, pushes to Vault CRM

**Vault endpoint:** `POST /crm/api/call_summary`
- Dialer calls (`call_id` provided): attaches note to existing `CRM::Call`
- Google Meet calls (`calendar_event_id` provided): matches against `CRM::Call` where `source=google_meet` and `external_id LIKE '{event_id}%'`, attaches note to that call
- Fallback: creates a `CRM::Activity` (type: Meeting) + note
- All notes prefixed with `🤖 AI Summary:`

**Changed files:**
- `src/bridge/featureBridge.js` — captures conversation history on Stop (stashes before reset), triggers summary on Done with pre-captured contact/match/calendar data
- `src/features/contactMatch/contactMatchService.js` — stores `_lastCallId` from Vault active call match

**Conversation history race condition fix:** Stop calls `closeSession()` which resets conversation history. The bridge now captures history on Stop and stashes it for Done to use.

## Added: Smart Coaching Triggers (V3)

**Changed files:**
- `src/features/listen/summary/summaryService.js` — added immediate trigger detection for high-signal moments

**6 signal types detected:**
- Price objection: "too expensive", "over budget", "can't afford", etc.
- Competitor/status quo: "already using", "current vendor", "happy with our current", etc.
- Timing: "not the right time", "maybe next quarter", "let me think about it", etc.
- Authority: "need to talk to my boss", "not my decision", "committee decision", etc.
- Buying signal: "what's the pricing", "how do we get started", "send a proposal", etc.
- Risk/concern: "seems risky", "too complex", "what if it doesn't work", etc.

Pattern-matched against ~60 phrases from prospect speech. Fires immediately instead of waiting for the 2-turn cadence. 15-second debounce prevents spamming.

## Changed: Calendar Attendee Filtering (V3)

- Only the rep's own emails are excluded from attendee matching
- All other attendees are candidates, including `@shopify.com` addresses
- Previous behavior excluded all `@shopify.com` emails, which missed prospects with Shopify accounts

## Changed: Asymmetric Calendar Buffer (V3.1)

- **Before:** ±5 min symmetric buffer for "happening now" detection
- **After:** -2 min before start / +7 min after end (asymmetric)
- Tight before start (people rarely join calls early), generous after end (calls run late)
- Back-to-back meetings still sorted by closest start time to now

## Changed: Batch Calendar Attendee Lookup (V3.1)

- **Before:** Sequential N+1 lookups — each attendee email tried one-by-one against `GET /crm/api/contacts/lookup`
- **After:** All attendee emails sent in a single `GET /crm/api/contacts/batch_lookup?emails[]=...` request
- Vault does a single `WHERE email IN (...)` query and returns the first match in caller's order
- Falls back to sequential lookups if the batch endpoint is unavailable
- Emails are ordered by event proximity (closest event's attendees first)

**New Vault endpoint:** `GET /crm/api/contacts/batch_lookup` (branch `glass-contact-api` on u2-2)

## Added: Match Source Indicator (V3.1)

- When auto-match succeeds, a bar below the top bar shows the match source:
  - 📞 **Vault Dialer** — matched via active call API
  - 📅 **{Meeting Title}** — matched via calendar event
- ✕ dismiss button clears the match and shows the manual contact search bar
- Tracks which calendar event produced the match for accurate labeling

**Changed files:**
- `src/features/contactMatch/contactMatchService.js` — `getMatchMeta()`, `_matchedCalendarEvent` tracking
- `src/ui/listen/ListenView.js` — `match-source-bar` UI, `clearMatchSource()` handler

## Added: Vault Notes Toggle (V3.1)

- Document icon appears in the header pill next to the Done button (only in afterSession state)
- Green glow when active (default) — AI summary will be sent to Vault on Done
- Dimmed when toggled off — summary won't be sent
- Hover tooltip: "AI summary will be sent to Vault" / "AI summary will not be sent"
- State synced to main process via `listen:setSendSummary` IPC channel
- Resets to on for each new session

**Changed files:**
- `src/ui/app/MainHeader.js` — vault-toggle button, styles, `_handleVaultToggle()`
- `src/bridge/featureBridge.js` — `_sendSummary` state, conditional summary generation on Done
- `src/preload.js` — `listenView.setSendSummary()` IPC channel

## Fixed: Feature Windows Not Created on Auto-Start (V3.1)

- When MicWatcher detected a call before the header state transitioned to 'main', feature windows (listen, ask, settings) didn't exist yet
- `showHUD()` now ensures feature windows are created before showing the HUD
- Fixes the transcript/insights panel not appearing on auto-start race condition

## Removed: Firebase API Key from Build Artifacts (V4)

- Deleted `pickleglass_web/out/` directory containing baked-in Firebase API key
- Source file (`pickleglass_web/utils/firebase.ts`) was already stripped — key only lived in static build output
- Directory was already in `.gitignore`, only present as untracked local artifacts

## Removed: Hardcoded `glass-dev-token` Fallback (V4)

| What | Files Changed |
|---|---|
| `glass-dev-token` default removed | `src/features/vault/vaultService.js` |
| Same | `src/features/contactMatch/contactMatchService.js` |
| Same | `src/features/listen/summary/postCallSummaryService.js` |

- All three files now fall back to empty string (`''`) instead of a hardcoded dev token
- Requires `VAULT_API_TOKEN` to be set via `.env` or the environment
- The token is still `glass-dev-token` for local dev — just no longer baked into source

## Changed: Dynamic Proxy Token Reading (V4)

- `src/features/common/ai/providers/openai.js` — replaced static `PROXY_API_TOKEN` constant with `getProxyToken()` function
- Reads `process.env.SHOPIFY_PROXY_TOKEN` at call time instead of module load time
- Allows keys saved during onboarding to take effect without app restart

## Added: First-Launch Onboarding Wizard (V4)

**New IPC handlers** in `src/bridge/featureBridge.js`:
- `glass:check-setup-complete` — returns status of keys, permissions, Google auth
- `glass:save-setup-keys` — saves Shopify proxy token + Deepgram key to SQLite, sets env vars
- `glass:request-mic-permission` — triggers macOS microphone permission prompt

**New preload methods** in `src/preload.js`:
- `checkSetupComplete()`, `saveSetupKeys(keys)`, `requestMicPermission()`, `openSystemPreferences(section)`

**3-step setup wizard** in `src/ui/main/main.html`:
1. **API Keys** — paste Shopify Proxy Token + Deepgram API Key (with links to generation portals)
2. **Permissions** — grant Microphone (button trigger) + Screen Recording (link to System Settings)
3. **Connect Google** — OAuth for calendar-based contact detection + rep email identity

Wizard only shows when no API keys are configured. Once keys are saved, shows the normal main app view. Keys stored in SQLite via `providerSettingsRepository` (same as existing `modelStateService` pattern).

## Rebranded: "Glass" / "Pickle Glass" → "Sales Assistant" (V4)

| File | Change |
|---|---|
| `package.json` | name: `sales-assistant`, productName: `Sales Assistant` |
| `electron-builder.yml` | appId: `com.shopify.sales-assistant`, productName, protocols, publish config |
| `notarize.js` | appBundleId updated |
| `entitlements.plist` | mach-lookup name updated |
| `src/window/windowManager.js` | Main window title |
| `src/ui/main/main.html` | Title, titlebar, footer, hero text |
| `src/ui/app/content.html` | HTML title |
| `src/ui/app/header.html` | HTML title |
| `src/ui/app/WelcomeHeader.js` | Welcome text, privacy notice |
| `src/ui/app/PermissionHeader.js` | Continue button text |
| `src/ui/app/ApiKeyHeader.js` | Privacy notice |
| `src/ui/settings/SettingsView.js` | App title in settings |
| `src/ui/listen/ListenView.js` | "Copy Glass Analysis" → "Copy Analysis", listening status |
| `src/features/common/services/modelStateService.js` | electron-store name |
| `src/features/settings/settingsService.js` | electron-store name |
| `README.md` | Complete rewrite for Sales Assistant |

Internal identifiers (`pickle-glass-app` custom element, `pickleGlassApp` IPC namespace, `window.pickleGlass`) left unchanged to avoid breaking the component/IPC contract.

## Changed: Google OAuth Credentials Baked In (V4)

- `src/features/googleAuth/googleAuthService.js` — Google Client ID and Secret now have real defaults baked into the source instead of placeholder strings
- Users no longer need `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`
- Env vars still override if present (for development with a different OAuth app)

## Removed: Cmd+Shift+Left/Right Global Shortcuts (V4)

- `src/features/shortcuts/shortcutsService.js` — disabled edge-snapping shortcuts (`Cmd+Shift+Left`, `Cmd+Shift+Right`)
- These conflicted with macOS system text selection shortcuts
- Edge snapping via keyboard is no longer available (drag the window instead)

## Changed: Coaching Triggers on Prospect Speech Only (V4)

- `src/features/listen/summary/summaryService.js` — coaching now triggers only after the **prospect** speaks, not the rep
- Requires 8+ words from the prospect to trigger (filters out "yeah", "okay", short affirmations)
- Smart triggers (objection/buying signal keywords) still fire immediately regardless of word count
- 5-second debounce prevents rapid-fire LLM calls from back-to-back prospect sentences
- Rep's speech is still transcribed and included as context, but does NOT trigger coaching
- Result: coaching arrives at exactly the right moment — after the prospect finishes, before the rep responds

## Disabled: Vault CRM Integration (V4 — Temporary)

Vault CRM features (contact lookup, auto-match, post-call summary push) are disabled when `VAULT_API_TOKEN` is not set.

**What's disabled:**
- Contact auto-matching (both Vault active call API and calendar→Vault lookup)
- Post-call AI summary generation and push to CRM
- Manual contact search against Vault

**What still works:**
- Live transcription
- AI coaching (LLM still generates coaching from transcript)
- Smart coaching triggers
- Google Calendar integration (events display, but attendees aren't looked up in Vault)

**To re-enable:** Set `VAULT_API_TOKEN=your-token` in `.env` or the environment. All Vault features will resume automatically.

**Files guarded:**
- `src/features/vault/vaultService.js` — `lookupContact()` returns null early
- `src/features/contactMatch/contactMatchService.js` — `autoMatch()` returns null early
- `src/features/listen/summary/postCallSummaryService.js` — `generateAndPush()` returns early
- `src/bridge/featureBridge.js` — Done button skips summary when token empty

## Note: SystemAudioDump Binary Bypassed (V3)

The upstream Glass app shipped with a native binary (`src/ui/assets/SystemAudioDump`) for capturing system audio via CoreAudio. This binary is ad-hoc signed and gets killed by Shopify's MDM policy (Gatekeeper blocks unsigned/ad-hoc binaries).

**Current workaround:** System audio capture uses Electron's `getDisplayMedia` with `audio: true` instead. This piggybacks on the Screen Recording permission — macOS captures system audio via the display media loopback. The binary still exists in the repo but nothing uses it.

**Long-term fix:** Once the app is properly code-signed with a Shopify Apple Developer certificate, the `SystemAudioDump` binary (or a CoreAudio tap) could be re-enabled for cleaner, lower-latency audio capture.

## Changed: Deepgram API Key Baked In at Build Time (V4)

- Deepgram API key is no longer per-user — it's a shared team key baked into the app at build time
- `src/features/common/services/modelStateService.js` — reads from `deepgram-config.json` if env var not set
- `src/features/listen/stt/deepgram-config.json` — gitignored, generated by `scripts/generate-oauth-config.js`
- Onboarding wizard no longer prompts for Deepgram key — only Shopify Proxy Token (per-user)
- GitHub Actions workflow includes `DEEPGRAM_API_KEY` secret for build-time injection

## Added: GitHub Actions Build Workflow (V4)

- `.github/workflows/build.yml` — builds macOS DMG on GitHub's runners (bypasses Shopify MDM)
- Triggered manually from Actions tab or on version tags (`v*`)
- Google OAuth creds injected from GitHub repository secrets at build time
- Produces downloadable DMG + ZIP artifacts
- Build steps: install deps → build renderer → generate oauth-config.json → electron-builder → upload artifacts

## Changed: Build Process (V4)

- `package.json` — `build:all` now uses `ensure:web` instead of building the full Next.js dashboard
- The `pickleglass_web` dashboard is not needed for the core app; a placeholder `out/` directory is created
- Added `prebuild` script that runs `scripts/generate-oauth-config.js`
- `scripts/generate-oauth-config.js` — generates `oauth-config.json` from `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars
- Config file is gitignored; only exists at build time or for local dev
