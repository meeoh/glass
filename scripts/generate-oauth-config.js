#!/usr/bin/env node
// Generates oauth-config.json from environment variables at build time.
// This file gets packaged into the app so users don't need to configure OAuth.
//
// Usage:
//   GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy npm run build
//
// For local development, create the file manually or use .env with dotenv.

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'src', 'features', 'googleAuth', 'oauth-config.json');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    // Check if config already exists (dev created it manually)
    if (fs.existsSync(configPath)) {
        console.log('[oauth-config] oauth-config.json already exists, skipping generation.');
        process.exit(0);
    }
    console.error('[oauth-config] ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars are required for build.');
    console.error('[oauth-config] For local dev, create src/features/googleAuth/oauth-config.json manually.');
    process.exit(1);
}

const config = {
    client_id: clientId,
    client_secret: clientSecret,
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('[oauth-config] Generated oauth-config.json for packaging.');
