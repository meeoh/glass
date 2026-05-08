// Google OAuth2 service for Glass
// Handles authorization flow and token management for Google Calendar access.

const { BrowserWindow, shell, session } = require('electron');
const fetch = require('node-fetch');
const path = require('path');
const http = require('http');
const EventEmitter = require('events');
const sqliteClient = require('../common/services/sqliteClient');

// Placeholder OAuth2 credentials — replace before distribution
let oauthConfig = {};
try { oauthConfig = require('./oauth-config.json'); } catch (e) { /* not yet generated */ }
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || oauthConfig.client_id || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || oauthConfig.client_secret || '';
// Redirect URI uses a local HTTP server on a dynamic port
// The actual URI is set at auth time (http://localhost:<port>/oauth/callback)
let REDIRECT_URI = 'http://localhost/oauth/callback';
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
];

class GoogleAuthService extends EventEmitter {
    constructor() {
        super();
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.userEmail = null;
        this.userName = null;
        this.userPhoto = null;
        this._callbackServer = null;
        this._authTimeout = null;
    }

    /**
     * Initialize — restore tokens from SQLite if available.
     * Call after database is initialized.
     */
    async initialize() {
        try {
            this._ensureTable();
            const db = sqliteClient.getDb();
            const row = db.prepare('SELECT * FROM google_auth LIMIT 1').get();
            if (row && row.refresh_token) {
                this.refreshToken = row.refresh_token;
                this.accessToken = row.access_token;
                this.tokenExpiry = row.token_expiry ? Number(row.token_expiry) : null;
                this.userEmail = row.user_email;
                this.userName = row.user_name;
                this.userPhoto = row.user_photo;
                console.log(`[GoogleAuth] Restored session for ${this.userEmail}`);
                // Refresh token if expired
                if (this.tokenExpiry && Date.now() > this.tokenExpiry - 60000) {
                    try {
                        await this._refreshAccessToken();
                        this._saveTokens();
                    } catch (err) {
                        console.log('[GoogleAuth] Stored token refresh failed, clearing:', err.message);
                        this.signOut();
                    }
                }
            }
        } catch (err) {
            console.error('[GoogleAuth] Failed to restore session:', err.message);
        }
    }

    _ensureTable() {
        const db = sqliteClient.getDb();
        db.exec(`
            CREATE TABLE IF NOT EXISTS google_auth (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                access_token TEXT,
                refresh_token TEXT,
                token_expiry TEXT,
                user_email TEXT,
                user_name TEXT,
                user_photo TEXT
            )
        `);
    }

    _saveTokens() {
        try {
            const db = sqliteClient.getDb();
            db.prepare(`
                INSERT OR REPLACE INTO google_auth (id, access_token, refresh_token, token_expiry, user_email, user_name, user_photo)
                VALUES (1, ?, ?, ?, ?, ?, ?)
            `).run(
                this.accessToken,
                this.refreshToken,
                this.tokenExpiry ? String(this.tokenExpiry) : null,
                this.userEmail,
                this.userName,
                this.userPhoto
            );
        } catch (err) {
            console.error('[GoogleAuth] Failed to save tokens:', err.message);
        }
    }

    _clearTokens() {
        try {
            const db = sqliteClient.getDb();
            db.prepare('DELETE FROM google_auth').run();
        } catch (err) {
            console.error('[GoogleAuth] Failed to clear tokens:', err.message);
        }
    }

    /**
     * Whether the user has authorized their Google account.
     */
    isAuthorized() {
        return !!(this.accessToken && this.refreshToken);
    }

    /**
     * Get the current user's email (used for Vault active call lookup).
     */
    getUserEmail() {
        return this.userEmail;
    }

    /**
     * Get user profile info for display.
     */
    getUserProfile() {
        return {
            email: this.userEmail,
            name: this.userName,
            photo: this.userPhoto,
            isAuthorized: this.isAuthorized(),
        };
    }

    /**
     * Start the OAuth2 authorization flow.
     * Opens the system browser (supports passkeys/WebAuthn) and listens
     * for the callback on a temporary local HTTP server.
     */
    async authorize() {
        // Clean up any leftover server from a previous failed attempt
        this._cleanupCallbackServer();

        return new Promise((resolve, reject) => {
            // Spin up a temporary HTTP server to receive the OAuth callback
            this._callbackServer = http.createServer(async (req, res) => {
                try {
                    const url = new URL(req.url, `http://localhost`);
                    if (!url.pathname.startsWith('/oauth/callback')) {
                        res.writeHead(404);
                        res.end();
                        return;
                    }

                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');

                    if (error) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<html><body style="font-family:system-ui;text-align:center;padding:60px;background:#0d0d0f;color:#f0f0f2"><h2>Authorization failed</h2><p>You can close this tab.</p></body></html>');
                        this._cleanupCallbackServer();
                        reject(new Error(`Google auth error: ${error}`));
                        return;
                    }

                    if (!code) {
                        res.writeHead(400);
                        res.end('Missing code');
                        return;
                    }

                    // Exchange code for tokens
                    await this._exchangeCodeForTokens(code);
                    await this._fetchUserProfile();
                    this._saveTokens();

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><body style="font-family:system-ui;text-align:center;padding:60px;background:#0d0d0f;color:#f0f0f2"><h2>✅ Connected to Glass</h2><p style="color:#a0a0a8">You can close this tab and return to Glass.</p></body></html>');

                    this._cleanupCallbackServer();
                    this.emit('auth-changed', this.getUserProfile());
                    console.log(`[GoogleAuth] Authorized as ${this.userEmail}`);
                    resolve(this.getUserProfile());
                } catch (err) {
                    res.writeHead(500);
                    res.end('Authorization failed');
                    this._cleanupCallbackServer();
                    reject(err);
                }
            });

            // Listen on a fixed port so the redirect URI is predictable
            // (must match what's registered in Google Cloud Console)
            const CALLBACK_PORT = 51989;
            this._callbackServer.listen(CALLBACK_PORT, '127.0.0.1', () => {
                const port = this._callbackServer.address().port;
                REDIRECT_URI = `http://localhost:${port}/oauth/callback`;
                const authUrl = this._buildAuthUrl();
                console.log(`[GoogleAuth] Callback server on port ${port}, opening browser...`);
                shell.openExternal(authUrl);
            });

            this._callbackServer.on('error', (err) => {
                console.error('[GoogleAuth] Callback server error:', err);
                this._cleanupCallbackServer();
                reject(err);
            });

            // Timeout after 5 minutes
            this._authTimeout = setTimeout(() => {
                this._cleanupCallbackServer();
                reject(new Error('Authorization timed out'));
            }, 5 * 60 * 1000);
        });
    }

    /**
     * Sign out — clear tokens and notify listeners.
     */
    signOut() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.userEmail = null;
        this.userName = null;
        this.userPhoto = null;
        this._clearTokens();
        this.emit('auth-changed', this.getUserProfile());
        console.log('[GoogleAuth] Signed out');
    }

    /**
     * Get a valid access token, refreshing if needed.
     */
    async getValidToken() {
        if (!this.isAuthorized()) return null;

        // Refresh if expired or about to expire (1 min buffer)
        if (this.tokenExpiry && Date.now() > this.tokenExpiry - 60000) {
            try {
                await this._refreshAccessToken();
            } catch (err) {
                console.error('[GoogleAuth] Token refresh failed:', err.message);
                this.signOut();
                return null;
            }
        }

        return this.accessToken;
    }

    // ─── Private ───

    _cleanupCallbackServer() {
        if (this._authTimeout) {
            clearTimeout(this._authTimeout);
            this._authTimeout = null;
        }
        if (this._callbackServer) {
            this._callbackServer.close();
            this._callbackServer = null;
        }
    }

    _buildAuthUrl() {
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            response_type: 'code',
            scope: SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent',
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async _exchangeCodeForTokens(code) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            }).toString(),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${text}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token || this.refreshToken;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    }

    async _refreshAccessToken() {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token',
            }).toString(),
        });

        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.status}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        this._saveTokens();
        console.log('[GoogleAuth] Access token refreshed');
    }

    async _fetchUserProfile() {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${this.accessToken}` },
        });

        if (response.ok) {
            const data = await response.json();
            this.userEmail = data.email;
            this.userName = data.name;
            this.userPhoto = data.picture;
        }
    }
}

const googleAuthService = new GoogleAuthService();
module.exports = googleAuthService;
