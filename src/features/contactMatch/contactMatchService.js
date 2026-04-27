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
        this._matchedCalendarEvent = null; // Calendar event that produced the match
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
                this._matchedCalendarEvent = calendarResult.value._calendarEvent || null;
                delete calendarResult.value._calendarEvent; // Don't leak internal field
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
        this._matchedCalendarEvent = null;
    }

    /**
     * Get metadata about the current match for UI display.
     */
    getMatchMeta() {
        if (!this._matchSource) return null;
        if (this._matchSource === 'vault_active_call') {
            return { source: 'vault_active_call', label: 'Vault Dialer' };
        }
        if (this._matchSource === 'calendar') {
            const eventName = this._matchedCalendarEvent?.summary || 'Calendar Event';
            return { source: 'calendar', label: eventName, meetLink: this._matchedCalendarEvent?.meetLink || null };
        }
        return { source: this._matchSource, label: this._matchSource };
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

        // Get current events sorted by proximity, then collect attendee emails in order
        const currentEvents = calendarService.getCurrentEvents();
        if (currentEvents.length === 0) {
            console.log('[ContactMatch] No current calendar events');
            return null;
        }

        const repEmail = googleAuthService.getUserEmail()?.toLowerCase();
        const repShopifyEmail = this.getRepEmail()?.toLowerCase();

        // Build ordered email list from closest event first, preserving which event each email came from
        const emailEventMap = new Map(); // email → event
        const orderedEmails = [];

        for (const event of currentEvents) {
            for (const attendee of (event.attendees || [])) {
                const email = attendee.email?.toLowerCase();
                if (email &&
                    email !== repEmail &&
                    email !== repShopifyEmail &&
                    !attendee.self &&
                    !emailEventMap.has(email)) {
                    emailEventMap.set(email, event);
                    orderedEmails.push(email);
                }
            }
        }

        if (orderedEmails.length === 0) {
            console.log('[ContactMatch] No external attendees in current calendar events');
            return null;
        }

        console.log(`[ContactMatch] Batch looking up ${orderedEmails.length} calendar attendees: ${orderedEmails.join(', ')}`);

        // Single batch request to Vault — it returns the first match in our email order
        try {
            const emailParams = orderedEmails.map(e => `emails[]=${encodeURIComponent(e)}`).join('&');
            const url = `${VAULT_BASE_URL}/crm/api/contacts/batch_lookup?${emailParams}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${VAULT_API_TOKEN}`,
                    'Accept': 'application/json',
                },
                timeout: 8000,
            });

            if (!response.ok) {
                throw new Error(`Vault batch lookup error: ${response.status}`);
            }

            const data = await response.json();
            if (data.matched && data.contact) {
                // Attach the calendar event that this match came from (for UI display)
                const matchedEmail = data.matched_email;
                data._calendarEvent = emailEventMap.get(matchedEmail) || currentEvents[0];

                // Also set on vaultService so LLM and UI can use it
                vaultService.currentContact = data;
                vaultService._notifyListeners(data);

                return data;
            }

            console.log('[ContactMatch] Batch lookup: no contacts found in Vault');
            return null;
        } catch (err) {
            console.error('[ContactMatch] Batch calendar lookup failed:', err.message);
            // Fallback: try the old sequential method
            return this._matchViaCalendarFallback(orderedEmails, emailEventMap);
        }
    }

    /**
     * Fallback sequential lookup if the batch endpoint isn't available.
     */
    async _matchViaCalendarFallback(emails, emailEventMap) {
        console.log('[ContactMatch] Falling back to sequential calendar lookup');
        for (const email of emails) {
            try {
                const data = await vaultService.lookupContact({ email });
                if (data && data.contact) {
                    data._calendarEvent = emailEventMap?.get(email) || null;
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
            matchMeta: this.getMatchMeta(),
        });
    }
}

const contactMatchService = new ContactMatchService();
module.exports = contactMatchService;
