# Troubleshooting

## App doesn't open / window doesn't appear

**Most common cause:** A previous Electron instance is still running. Glass uses a single-instance lock — if another instance holds the lock, the new one silently quits.

**Fix:**
```bash
pkill -9 -f "Electron" 2>/dev/null; sleep 2; cd ~/Projects/glass && export PATH="/opt/homebrew/opt/node@20/bin:$PATH" && npx electron .
```

## Auto-detection not working (Glass doesn't start when joining a call)

**Check the terminal for:**
```
[CallDetection] MicWatcher started (pid: ...)
[CallDetection] MicWatcher: MicWatcher: monitoring mic state on device ...
```

If these don't appear, the MicWatcher binary may need recompiling:
```bash
cd ~/Projects/glass
swiftc -O -o src/native/MicWatcher src/native/MicWatcher.swift -framework CoreAudio -framework Foundation
```

**Note:** Auto-detection only triggers on mic state *changes*. If you start Glass while already on a call, it won't detect it. Start Glass first, then join the call.

## "SystemAudioDump" killed by macOS

**Symptom:** System audio ("Them") not capturing. Logs show `SystemAudioDump process closed with code: null`.

**Cause:** Shopify MDM policy restricts unsigned binaries. The `SystemAudioDump` binary is ad-hoc signed and gets killed by Gatekeeper.

**Current fix:** We bypass `SystemAudioDump` entirely and use Electron's native `getDisplayMedia` with `audio: true` for system audio loopback. macOS will ask you to select a screen to share — this is required to enable audio capture.

**Permanent fix:** Code-sign `SystemAudioDump` with a proper Apple developer certificate.

## No transcription appearing

**Check the logs:**
```bash
tail -50 /tmp/glass.log | grep -i 'stt\|error\|deepgram\|closed'
```

Common issues:
- **"Cannot extract voices from a non-audio request"** — Gemini STT issue. Switch to Deepgram.
- **STT session closes immediately** — API key may be invalid or expired.
- **No audio being sent** — Microphone permission not granted. Check System Settings → Privacy & Security → Microphone.

## Error: "Cannot read properties of undefined (reading 'success')" spam

**Symptom:** Terminal floods with `listen:sendSystemAudio` errors.

**Cause:** System audio chunks are being sent before the STT session is fully initialized. Usually happens during auto-start when the session is still initializing.

**Fix:** Already handled with null check in `featureBridge.js`. If it persists, restart Glass.

## EPIPE error dialog on launch

**Symptom:** Dialog saying "Error: write EPIPE" in the main process.

**Cause:** Electron's stdout pipe breaks when launched from a backgrounded process.

**Fix:** Already handled — `process.stdout/stderr.on('error', () => {})` in `index.js`.

## electron-builder install-app-deps fails

**Symptom:** `npm install` fails with `ERR_ELECTRON_BUILDER_CANNOT_EXECUTE`.

**Cause:** The `app-builder` binary is blocked by macOS Gatekeeper (same MDM issue).

**Fix:** Use `npm install --ignore-scripts` then `npx electron-rebuild` separately.

## Node version mismatch

**Symptom:** `NODE_MODULE_VERSION` error when requiring native modules.

**Cause:** Native modules (better-sqlite3, sharp, keytar) compiled against wrong Node version.

**Fix:**
```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
npx electron-rebuild
```

## DevTools windows opening

**Expected in dev mode.** The app opens DevTools for all windows when `app.isPackaged` is false. Minimize them or close them (but don't close the main app window behind them).

To disable, comment out the `openDevTools` lines in `src/window/windowManager.js`.

## Screen recording permission

macOS requires screen recording permission for the Electron loopback audio capture. If the screen picker doesn't appear:
1. Go to System Settings → Privacy & Security → Screen Recording
2. Find "Glass" or "Electron" and enable it
3. Restart the app

## Google auth "Access blocked" error

**For @shopify.com accounts:** `Error 400: access_not_configured` — Shopify's Google Workspace admin needs to approve the Google Cloud project. Click "Request Access" to create a Kepler ticket, or reach out to #help-kepler.

**For personal @gmail.com accounts:** `Error 403: access_denied` — add your personal email as a **test user** in the Google Cloud Console under APIs & Services → OAuth consent screen → Test users.

## Google auth window doesn't open on second click

**Fixed.** Each click cleans up the previous callback server before starting a new one. If this still happens, restart Glass.

## Calendar events not updating after deletion

Google Calendar API can take 1-2 minutes to propagate event deletions. Hit Refresh again after a minute. If the event was created by another account and they deleted it, it may still appear on your calendar until you remove/decline it.

## Auto-detection doesn't work with non-default microphone

MicWatcher monitors the **macOS system default input device** only. If your call app (e.g., Google Meet) uses a different mic selected in its own settings, MicWatcher won't detect it.

**Fix:** Change the mic in **System Settings → Sound → Input** to match what your call app uses.

## Screen recording triggers call detection

macOS screen recording grabs the default mic, which triggers MicWatcher. After pressing Done, the mic is still held by screen recording, so joining a new call may not produce a fresh inactive→active transition.

**Workarounds:**
- Start screen recording **after** joining the call
- Use a screen recorder that doesn't capture mic input
- Manually press Listen from the HUD header (Cmd+\ to show it)

## HUD doesn't appear on second call

After Stop → Done, `micActive` resets so the next mic activation triggers properly. If something else is still holding the mic (screen recording, another app), there's no inactive→active transition to detect.

**Fix:** Ensure the mic goes fully inactive between calls, or manually start listening.

## Contact not auto-matching

Check the logs: `tail -50 /tmp/glass.log | grep -i match`

Common causes:
- **"No rep email available"** — set `GLASS_REP_EMAIL` env var or connect Google
- **"Google not authorized"** — connect Google in the main app window
- **"No external attendees"** — the current calendar event only has internal attendees
- **"Vault: no active call"** — the rep email doesn't match a Vault User, or no active CRM dialer call
- **"Contact not found"** — the attendee email doesn't exist as a CRM::Contact in Vault
