#!/usr/bin/env node
// Generates build-time config files from environment variables.
// These files get packaged into the app so users don't need to configure them.
//
// Usage:
//   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy DEEPGRAM_API_KEY=zzz npm run build
//
// For local development, create the files manually or use .env with dotenv.

const fs = require('fs');
const path = require('path');

// --- Google OAuth config ---
const oauthConfigPath = path.join(__dirname, '..', 'src', 'features', 'googleAuth', 'oauth-config.json');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    if (fs.existsSync(oauthConfigPath)) {
        console.log('[build-config] oauth-config.json already exists, skipping.');
    } else {
        console.error('[build-config] ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars are required for build.');
        process.exit(1);
    }
} else {
    fs.writeFileSync(oauthConfigPath, JSON.stringify({ client_id: clientId, client_secret: clientSecret }, null, 2) + '\n');
    console.log('[build-config] Generated oauth-config.json');
}

// --- Deepgram config ---
const deepgramConfigPath = path.join(__dirname, '..', 'src', 'features', 'listen', 'stt', 'deepgram-config.json');

const deepgramKey = process.env.DEEPGRAM_API_KEY;

if (!deepgramKey) {
    if (fs.existsSync(deepgramConfigPath)) {
        console.log('[build-config] deepgram-config.json already exists, skipping.');
    } else {
        console.error('[build-config] ERROR: DEEPGRAM_API_KEY env var is required for build.');
        process.exit(1);
    }
} else {
    fs.writeFileSync(deepgramConfigPath, JSON.stringify({ api_key: deepgramKey }, null, 2) + '\n');
    console.log('[build-config] Generated deepgram-config.json');
}
