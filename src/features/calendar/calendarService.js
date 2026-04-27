// Google Calendar service for Glass
// Polls today's events and provides contact matching data.

const fetch = require('node-fetch');
const EventEmitter = require('events');
const googleAuthService = require('../googleAuth/googleAuthService');

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const EVENT_BUFFER_BEFORE_MINUTES = 2; // 2 min before start (tight — rarely early)
const EVENT_BUFFER_AFTER_MINUTES = 7;  // 7 min after end (generous — calls run late)

class CalendarService extends EventEmitter {
    constructor() {
        super();
        this.todayEvents = [];
        this._pollTimer = null;
        this._isPolling = false;
    }

    /**
     * Start polling Google Calendar for today's events.
     * Safe to call even if not authorized — will no-op.
     */
    start() {
        if (this._pollTimer) return;

        // Poll immediately, then every 5 minutes
        this._poll();
        this._pollTimer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
        console.log('[Calendar] Polling started (every 5 min)');
    }

    /**
     * Stop polling.
     */
    stop() {
        if (this._pollTimer) {
            clearInterval(this._pollTimer);
            this._pollTimer = null;
            console.log('[Calendar] Polling stopped');
        }
    }

    /**
     * Force a refresh of today's events.
     */
    async refresh() {
        await this._poll();
    }

    /**
     * Get all events for today.
     */
    getTodayEvents() {
        return this.todayEvents;
    }

    /**
     * Get events that are happening right now (asymmetric buffer: -2 min before start, +7 min after end).
     * Tight before start (people rarely join early), generous after end (calls run late).
     */
    getCurrentEvents() {
        const now = new Date();
        const beforeMs = EVENT_BUFFER_BEFORE_MINUTES * 60 * 1000;
        const afterMs = EVENT_BUFFER_AFTER_MINUTES * 60 * 1000;

        return this.todayEvents
            .filter(event => {
                const start = new Date(event.start);
                const end = new Date(event.end);
                // Event is "current" if now is within [start - beforeBuffer, end + afterBuffer]
                return now >= new Date(start.getTime() - beforeMs) &&
                       now <= new Date(end.getTime() + afterMs);
            })
            // Sort by closest start time to now (prefer the meeting about to start / just started)
            .sort((a, b) => {
                const distA = Math.abs(now - new Date(a.start));
                const distB = Math.abs(now - new Date(b.start));
                return distA - distB;
            });
    }

    /**
     * Get external attendee emails from events happening right now.
     * Filters out @shopify.com addresses and the rep's own email.
     */
    getCurrentExternalAttendees() {
        const currentEvents = this.getCurrentEvents();
        const repEmail = googleAuthService.getUserEmail()?.toLowerCase();
        const contactMatchService = require('../contactMatch/contactMatchService');
        const repShopifyEmail = contactMatchService.getRepEmail()?.toLowerCase();
        const emails = new Set();

        for (const event of currentEvents) {
            for (const attendee of (event.attendees || [])) {
                const email = attendee.email?.toLowerCase();
                if (email &&
                    email !== repEmail &&
                    email !== repShopifyEmail &&
                    !attendee.self) {
                    emails.add(email);
                }
            }
        }

        return Array.from(emails);
    }

    // ─── Private ───

    async _poll() {
        if (this._isPolling) return;
        if (!googleAuthService.isAuthorized()) {
            // Not authorized — clear events and skip
            if (this.todayEvents.length > 0) {
                this.todayEvents = [];
                this.emit('events-updated', this.todayEvents);
            }
            return;
        }

        this._isPolling = true;
        try {
            const token = await googleAuthService.getValidToken();
            if (!token) {
                this._isPolling = false;
                return;
            }

            const events = await this._fetchTodayEvents(token);
            this.todayEvents = events;
            this.emit('events-updated', events);
            console.log(`[Calendar] Fetched ${events.length} events for today:`, events.map(e => `${e.summary} (${e.status})`).join(', '));
        } catch (err) {
            console.error('[Calendar] Poll failed:', err.message);
            // Don't crash — just keep the old events
        } finally {
            this._isPolling = false;
        }
    }

    async _fetchTodayEvents(token) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const params = new URLSearchParams({
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '50',
            showDeleted: 'true',
        });

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Calendar API error: ${response.status} ${text}`);
        }

        const data = await response.json();
        return (data.items || [])
            .filter(event => event.status !== 'cancelled')
            .map(event => this._normalizeEvent(event));
    }

    _normalizeEvent(event) {
        const start = event.start?.dateTime || event.start?.date;
        const end = event.end?.dateTime || event.end?.date;
        const attendees = (event.attendees || []).map(a => ({
            email: a.email,
            displayName: a.displayName,
            responseStatus: a.responseStatus,
            self: a.self || false,
            organizer: a.organizer || false,
        }));

        // Determine if this meeting has attendees other than the rep
        const repEmail = googleAuthService.getUserEmail()?.toLowerCase();
        const hasExternalAttendee = attendees.some(a =>
            !a.self &&
            a.email &&
            a.email.toLowerCase() !== repEmail
        );

        return {
            id: event.id,
            summary: event.summary || '(No title)',
            description: event.description,
            start,
            end,
            attendees,
            hasExternalAttendee,
            meetLink: event.hangoutLink || null,
            location: event.location || null,
            status: event.status,
        };
    }
}

const calendarService = new CalendarService();
module.exports = calendarService;
