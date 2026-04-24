# Roadmap

## V0 — Live Transcription ✅ DONE

Real-time transcription of both sides of a sales call:
- "Me" (sales rep) via microphone → Deepgram STT
- "Them" (prospect) via system audio loopback → Deepgram STT
- Invisible to screen share (disabled for dev/demo)
- All data stored locally in SQLite

## V1 — AI Sales Coaching ✅ DONE

Real-time talking points and suggestions based on the live conversation.

**Implemented:**
- Custom `sales_coaching` prompt in `promptTemplates.js` — detects objections, buying signals, discovery opportunities
- LLM analysis triggers every 2 transcript turns via `summaryService.js`
- Insights panel shows three sections: 🎯 Say This, Context, ❓ Ask This
- Parser routes LLM output by content type (quoted text → Say This, questions → Ask This)
- Uses gpt-4.1 via Shopify proxy
- CRM data from Vault injected into prompt for personalized coaching

## V2 — Vault CRM Integration ✅ DONE

**Vault API endpoint** (branch `glass-contact-api` on u2-2 worktree):
- `GET /crm/api/contacts/lookup?email=...` or `?name=...`
- Returns contact + account + shops + deals + recent calls + recent emails + notes
- Simple Bearer token auth (`glass-dev-token`)

**Glass integration:**
- Search bar for SDR to enter contact email/name
- Side panel showing CRM highlights (title, platform, revenue, engagement, deals)
- CRM context injected into LLM coaching prompt
- AI references specific account details in recommendations

## V2.5 — Auto Call Detection ✅ DONE

**Auto-start:** ✅ Working
- Native Swift `MicWatcher` binary monitors macOS CoreAudio for mic usage
- Uses `kAudioDevicePropertyDeviceIsRunningSomewhere` — polls every 2s
- When any app grabs the mic (Zoom, Meet, Teams, etc.) → Glass auto-starts listening
- Handles input device changes (e.g., plugging in a headset)
- MicWatcher auto-compiles on first run if binary doesn't exist

**Auto-stop:** ❌ Not yet implemented
- Problem: Glass itself holds the mic for "Me" transcription, so `isRunningSomewhere` stays true even after the call app releases it
- CoreAudio doesn't expose how many processes are using the mic, just a boolean
- See DECISIONS.md for approaches considered and rejected

## V3 — Main App Window + Auto Contact Matching ✅ DONE

**Main App Window:**
- Proper macOS application window (420×640, dark/compact modern UI)
- Google Account connection (OAuth2 via system browser for passkey support)
- Today's Meetings list showing calendar events with "Now" badges
- External meeting indicators
- Call status banner with auto-match result
- HUD hidden by default — only shows when mic goes active
- Dock icon always visible

**Google Calendar Integration:**
- OAuth2 with token persistence in SQLite (survives restarts)
- Polls every 5 minutes for today's events
- ±5 minute buffer for "happening now" detection
- Manual refresh button

**Auto Contact Matching (two methods in parallel):**
1. Vault Active Call API — `GET /crm/api/active_call?user_email=...` checks if rep is on a dialer call. Takes precedence.
2. Calendar Matching — extracts external attendee emails from current events, looks each up in Vault CRM.
- Automatically links matched contact to CRM panel + LLM coaching prompt
- Graceful degradation: Google auth optional, Vault API optional, manual entry always available

**Vault Active Call API (u2-2 worktree):**
- `GET /crm/api/active_call?user_email=rep@shopify.com`
- Queries `CRM::Call` for active statuses (queued, initiated, ringing, in_progress)
- Returns full contact/account/shop payload (same shape as contacts/lookup)
- Shared serialization concern extracted from contacts controller

**Post-Call Summary + CRM Push:**
- On Done, generates a concise 3-sentence AI summary via GPT-4.1
- Dialer calls: attaches note to existing `CRM::Call` record
- Google Meet calls: matches calendar event ID against `CRM::Call.external_id` for `source=google_meet`
- Fallback: creates Meeting activity + note
- All notes prefixed with 🤖 AI Summary

**Smart Coaching Triggers:**
- Detects 6 signal types: price objection, competitor, timing, authority, buying signal, risk
- Fires coaching immediately on detection instead of waiting for 2-turn cadence
- 15-second debounce to prevent spamming

**HUD Improvements:**
- Stop keeps HUD visible (review transcript), Done hides it
- Listen pane is draggable (drag handle pill) and stays where user puts it
- CRM side panel auto-populates on contact match

## V4 — Distribution & Polish (Next)

**What to build:**
- Auto-stop call detection (see V2.5)
- Past sessions / history view in main app window
- Remove DevTools from dev mode (or gate behind env var)
- Rebrand: app name, icons, about screen
- Code-sign with Shopify certificate (fixes SystemAudioDump on managed Macs)
- Package as DMG for internal distribution
- Onboarding flow (permissions walkthrough)
- Auto-updater pointing to internal release server
- Move hardcoded API keys to secure config
- Get Google Cloud project approved by Shopify Workspace admin (for @shopify.com accounts)

## Future Ideas

- **Auto-stop call detection** — detect when call ends (see DECISIONS.md for approaches)
- **Call recording** — save full audio for review/coaching
- **Suggested follow-up email** — draft a follow-up email based on the call transcript
- **Team analytics** — aggregate coaching data across reps (common objections, MEDDPICC gaps)
- **Call scoring & MEDDPICC tracker** — live qualification score during the call
- **Coaching replay** — review past calls with coaching overlaid
- **Pre-call briefing** — show a 30-second summary before the call starts
- **Talk-time ratio** — track rep vs prospect talk time, nudge if rep is dominating
- **Multi-language** — support calls in other languages (Deepgram nova-3 supports many)
- **Calendar auto-briefing notifications** — macOS notification 15 min before a scheduled call
- **Twilio in-browser integration** — build coaching directly into Vault for dialer calls (see FUTURE_INTEGRATION.md)
