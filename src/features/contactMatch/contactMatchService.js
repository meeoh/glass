// Contact Auto-Matching Service
// Orchestrates two parallel methods to identify who the sales rep is talking to:
//   1. Vault "active call" API — asks the CRM if the rep is currently on a dialer call
//   2. Calendar matching — checks Google Calendar for meetings happening now, looks up attendees
//
// Vault API result takes precedence. If neither finds a match, the rep can still
// enter the contact manually (existing flow).

const EventEmitter = require('events');
const vaultService = require('../vault/vaultService');
const calendarService = require('../calendar/calendarService');
const googleAuthService = require('../googleAuth/googleAuthService');
const fetch = require('node-fetch');

const VAULT_BASE_URL = process.env.VAULT_URL || 'https://u2.shop.dev';
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN || 'glass-dev-token';

class ContactMatchService extends EventEmitter {
    constructor() {
        super();
        this._isMatching = false;
        this._matchSource = null; // 'vault_active_call' | 'calendar' | 'manual' | null
        this._repEmail = null; // Can be set independently of Google auth
        this._lastCallId = null; // CRM::Call ID from active call match
    }

    /**
     * Set the rep's Shopify email (used for Vault active call lookup).
     * This can be set from Google auth OR configured manually.
     */
    setRepEmail(email) {
        this._repEmail = email;
        console.log(`[ContactMatch] Rep email set to: ${email}`);
    }

    /**
     * Get the rep's email — env var / explicit setting always wins over Google auth.
     */
    getRepEmail() {
        return this._repEmail || googleAuthService.getUserEmail();
    }

    /**
     * Get the source of the current contact match.
     */
    getMatchSource() {
        return this._matchSource;
    }

    /**
     * Attempt to auto-match the contact when a call starts.
     * Runs both methods in parallel, Vault API takes precedence.
     * Returns the matched contact data or null.
     */
    async autoMatch() {
        if (this._isMatching) {
            console.log('[ContactMatch] Already matching, skipping');
            return null;
        }

        this._isMatching = true;
        this._matchSource = null;
        console.log('[ContactMatch] 🔍 Starting auto-match...');

        try {
            // Run both methods in parallel
            const [vaultResult, calendarResult] = await Promise.allSettled([
                this._matchViaVaultActiveCall(),
                this._matchViaCalendar(),
            ]);

            // Vault takes precedence
            if (vaultResult.status === 'fulfilled' && vaultResult.value) {
                console.log(`[ContactMatch] ✅ Matched via Vault active call: ${vaultResult.value.contact?.name}`);
                this._matchSource = 'vault_active_call';
                this._lastCallId = vaultResult.value.call_id || null;
                await this._applyMatch(vaultResult.value);
                return vaultResult.value;
            }

            if (calendarResult.status === 'fulfilled' && calendarResult.value) {
                console.log(`[ContactMatch] ✅ Matched via Calendar: ${calendarResult.value.contact?.name}`);
                this._matchSource = 'calendar';
                await this._applyMatch(calendarResult.value);
                return calendarResult.value;
            }

            // Log failures for debugging
            if (vaultResult.status === 'rejected') {
                console.log('[ContactMatch] Vault active call check failed:', vaultResult.reason?.message);
            }
            if (calendarResult.status === 'rejected') {
                console.log('[ContactMatch] Calendar match failed:', calendarResult.reason?.message);
            }

            console.log('[ContactMatch] ❌ No auto-match found');
            this.emit('match-result', { matched: false, source: null });
            return null;

        } finally {
            this._isMatching = false;
        }
    }

    /**
     * Clear the current match (e.g., when call ends).
     */
    clearMatch() {
        this._matchSource = null;
        this._isMatching = false;
        this._lastCallId = null;
    }

    // ─── Method 1: Vault Active Call API ───

    async _matchViaVaultActiveCall() {
        const repEmail = this.getRepEmail();
        if (!repEmail) {
            console.log('[ContactMatch] No rep email available for Vault active call check (set via Google auth or contactMatchService.setRepEmail())');
            return null;
        }

        const url = `${VAULT_BASE_URL}/crm/api/active_call?user_email=${encodeURIComponent(repEmail)}`;
        console.log(`[ContactMatch] Checking Vault active call for: ${repEmail}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${VAULT_API_TOKEN}`,
                'Accept': 'application/json',
            },
            timeout: 8000,
        });

        if (!response.ok) {
            throw new Error(`Vault active call API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.active) {
            console.log('[ContactMatch] Vault: no active call');
            return null;
        }

        if (!data.contact) {
            console.log('[ContactMatch] Vault: active call found but no contact linked');
            return null;
        }

        // Return the full contact payload (same shape as contacts/lookup)
        return data;
    }

    // ─── Method 2: Calendar Matching ───

    async _matchViaCalendar() {
        if (!googleAuthService.isAuthorized()) {
            console.log('[ContactMatch] Google not authorized, skipping calendar match');
            return null;
        }

        // Get external attendee emails from events happening right now
        const emails = calendarService.getCurrentExternalAttendees();
        if (emails.length === 0) {
            console.log('[ContactMatch] No external attendees in current calendar events');
            return null;
        }

        console.log(`[ContactMatch] Trying calendar attendees: ${emails.join(', ')}`);

        // Try each email against the Vault contact lookup
        for (const email of emails) {
            try {
                const data = await vaultService.lookupContact({ email });
                if (data && data.contact) {
                    return data;
                }
            } catch (err) {
                console.log(`[ContactMatch] Calendar lookup failed for ${email}:`, err.message);
            }
        }

        return null;
    }

    // ─── Apply Match ───

    async _applyMatch(contactData) {
        // The vaultService.lookupContact already stores the contact and notifies listeners.
        // But if the data came from the active_call endpoint, we need to set it manually.
        if (this._matchSource === 'vault_active_call') {
            // Set the contact data on vaultService so the UI and LLM can use it
            vaultService.currentContact = contactData;
            vaultService._notifyListeners(contactData);
        }

        this.emit('match-result', {
            matched: true,
            source: this._matchSource,
            contact: contactData.contact,
        });
    }
}

const contactMatchService = new ContactMatchService();
module.exports = contactMatchService;
