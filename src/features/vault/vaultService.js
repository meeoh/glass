// Vault CRM integration service
// Fetches contact/account data from the Vault API to inform sales coaching.

const fetch = require('node-fetch');

const VAULT_BASE_URL = process.env.VAULT_URL || 'https://u2.shop.dev';
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN || '';

class VaultService {
    constructor() {
        this.currentContact = null;
        this.listeners = [];
    }

    /**
     * Look up a contact by email or name.
     * @param {object} params - { email: string } or { name: string }
     * @returns {object|null} Full contact data or null if not found
     */
    async lookupContact({ email, name }) {
        if (!VAULT_API_TOKEN) {
            console.log('[VaultService] Vault API token not configured, skipping lookup.');
            return null;
        }
        const query = email
            ? `email=${encodeURIComponent(email.trim())}`
            : `name=${encodeURIComponent(name.trim())}`;

        const url = `${VAULT_BASE_URL}/crm/api/contacts/lookup?${query}`;
        console.log(`[VaultService] Looking up contact: ${url}`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${VAULT_API_TOKEN}`,
                    'Accept': 'application/json',
                },
                timeout: 10000,
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('[VaultService] Contact not found');
                    return null;
                }
                throw new Error(`Vault API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.currentContact = data;
            this._notifyListeners(data);
            console.log(`[VaultService] Contact loaded: ${data.contact?.name} (${data.contact?.email})`);
            return data;
        } catch (error) {
            console.error('[VaultService] Lookup failed:', error.message);
            return null;
        }
    }

    /**
     * Get the currently loaded contact data.
     */
    getCurrentContact() {
        return this.currentContact;
    }

    /**
     * Clear the current contact (e.g., when starting a new call).
     */
    clearContact() {
        this.currentContact = null;
        this._notifyListeners(null);
    }

    /**
     * Build a context string for the LLM prompt from the current contact data.
     * Returns a concise, AI-readable summary of everything the sales rep should know.
     */
    buildPromptContext() {
        const data = this.currentContact;
        if (!data) return '';

        const sections = [];
        const c = data.contact;
        const a = data.account;

        // Contact summary
        if (c) {
            sections.push(`CONTACT: ${c.name || 'Unknown'}`);
            if (c.title) sections.push(`  Title: ${c.title}${c.department ? ` (${c.department})` : ''}`);
            if (c.seniority) sections.push(`  Seniority: ${c.seniority}`);
            if (c.stage) sections.push(`  Stage: ${c.stage}`);
            if (c.lead_score) sections.push(`  Lead Score: ${c.lead_score}`);
            if (c.customer_fit_score) sections.push(`  Customer Fit Score: ${c.customer_fit_score}`);
            if (c.current_ecommerce_platform) sections.push(`  Current Platform: ${c.current_ecommerce_platform}`);
            if (c.current_pos_solution) sections.push(`  Current POS: ${c.current_pos_solution}`);
            if (c.primary_product_interest) sections.push(`  Interested In: ${c.primary_product_interest}`);
            if (c.country) sections.push(`  Location: ${c.country}`);
            if (c.engagement) {
                const e = c.engagement;
                const engagementParts = [];
                if (e.calls > 0) engagementParts.push(`${e.calls} calls (${e.connected_calls} connected)`);
                if (e.emails_sent > 0) engagementParts.push(`${e.emails_sent} emails sent, ${e.email_replies} replies`);
                if (engagementParts.length > 0) sections.push(`  Engagement: ${engagementParts.join(', ')}`);
            }
            if (c.do_not_call) sections.push('  ⚠️ DO NOT CALL');
            if (c.do_not_message) sections.push('  ⚠️ DO NOT MESSAGE');
        }

        // Account summary
        if (a) {
            sections.push('');
            sections.push(`ACCOUNT: ${a.name || 'Unknown'}`);
            if (a.domain) sections.push(`  Website: ${a.domain}`);
            if (a.industry) sections.push(`  Industry: ${a.industry}`);
            if (a.estimated_total_revenue_usd) sections.push(`  Est. Revenue: $${(a.estimated_total_revenue_usd / 1000000).toFixed(1)}M`);
            if (a.gmv_usd_l365d) sections.push(`  GMV (L365D): $${(a.gmv_usd_l365d / 1000000).toFixed(1)}M`);
            if (a.ecomm_platform) sections.push(`  E-comm Platform: ${a.ecomm_platform}`);
            if (a.pos_platform) sections.push(`  POS Platform: ${a.pos_platform}`);
            if (a.plus_status) sections.push(`  Plus Status: ${a.plus_status}`);
            if (a.territory_segment) sections.push(`  Segment: ${a.territory_segment}`);
            if (a.sales_notes) sections.push(`  Sales Notes: ${a.sales_notes}`);
            if (a.open_opportunity_count > 0) sections.push(`  Open Opportunities: ${a.open_opportunity_count}`);
        }

        // Shops
        if (data.shops && data.shops.length > 0) {
            sections.push('');
            sections.push('SHOPS:');
            data.shops.slice(0, 5).forEach(s => {
                const parts = [s.name];
                if (s.current_plan) parts.push(`plan: ${s.current_plan}`);
                if (s.is_active === false) parts.push('INACTIVE');
                if (s.domain) parts.push(s.domain);
                sections.push(`  - ${parts.join(' | ')}`);
            });
        }

        // Active deals
        if (data.deals && data.deals.length > 0) {
            const activeDeals = data.deals.filter(d => !d.is_closed);
            const closedDeals = data.deals.filter(d => d.is_closed);
            if (activeDeals.length > 0) {
                sections.push('');
                sections.push('ACTIVE DEALS:');
                activeDeals.forEach(d => {
                    const parts = [d.name, `phase: ${d.phase}`];
                    if (d.projected_close_date) parts.push(`close: ${d.projected_close_date}`);
                    sections.push(`  - ${parts.join(' | ')}`);
                });
            }
            if (closedDeals.length > 0) {
                sections.push('');
                sections.push('RECENT CLOSED DEALS:');
                closedDeals.slice(0, 3).forEach(d => {
                    sections.push(`  - ${d.name} | ${d.is_won ? 'WON' : 'LOST'}${d.close_reason ? ` (${d.close_reason})` : ''}`);
                });
            }
        }

        // Recent calls
        if (data.recent_calls && data.recent_calls.length > 0) {
            sections.push('');
            sections.push('RECENT CALLS:');
            data.recent_calls.slice(0, 5).forEach(call => {
                const parts = [];
                if (call.occurred_at) parts.push(new Date(call.occurred_at).toLocaleDateString());
                if (call.disposition) parts.push(call.disposition);
                if (call.duration_seconds) parts.push(`${Math.round(call.duration_seconds / 60)}min`);
                if (call.sentiment) parts.push(`sentiment: ${call.sentiment}`);
                sections.push(`  - ${parts.join(' | ')}`);
            });
        }

        // Recent emails
        if (data.recent_emails && data.recent_emails.length > 0) {
            sections.push('');
            sections.push('RECENT EMAILS:');
            data.recent_emails.slice(0, 5).forEach(email => {
                const parts = [];
                if (email.created_at) parts.push(new Date(email.created_at).toLocaleDateString());
                parts.push(email.direction);
                if (email.subject) parts.push(`"${email.subject}"`);
                if (email.opened_at) parts.push('opened');
                if (email.clicked_at) parts.push('clicked');
                sections.push(`  - ${parts.join(' | ')}`);
            });
        }

        // Notes
        if (data.notes && data.notes.length > 0) {
            sections.push('');
            sections.push('NOTES:');
            data.notes.slice(0, 5).forEach(note => {
                const date = note.created_at ? new Date(note.created_at).toLocaleDateString() : '';
                sections.push(`  - [${date}${note.author ? ` by ${note.author}` : ''}] ${note.body}`);
            });
        }

        return sections.join('\n');
    }

    /**
     * Build a short highlights summary for display in the UI.
     */
    buildHighlights() {
        const data = this.currentContact;
        if (!data) return null;

        const highlights = [];
        const c = data.contact;
        const a = data.account;

        if (c?.title) highlights.push(`**${c.title}**${c.department ? ` at ${c.department}` : ''}`);
        if (c?.current_ecommerce_platform) highlights.push(`Currently on **${c.current_ecommerce_platform}**`);
        if (c?.primary_product_interest) highlights.push(`Interested in **${c.primary_product_interest}**`);
        if (a?.estimated_total_revenue_usd) highlights.push(`Company revenue: **$${(a.estimated_total_revenue_usd / 1000000).toFixed(1)}M**`);
        if (a?.gmv_usd_l365d) highlights.push(`GMV (last 365d): **$${(a.gmv_usd_l365d / 1000000).toFixed(1)}M**`);
        if (a?.sales_notes) highlights.push(`📝 ${a.sales_notes}`);
        if (c?.lead_score) highlights.push(`Lead score: **${c.lead_score}**`);

        // Deal status
        if (data.deals) {
            const activeDeals = data.deals.filter(d => !d.is_closed);
            if (activeDeals.length > 0) {
                highlights.push(`🤝 ${activeDeals.length} active deal(s) — ${activeDeals[0].name} (${activeDeals[0].phase})`);
            }
            const recentLost = data.deals.find(d => d.is_closed && !d.is_won);
            if (recentLost) {
                highlights.push(`⚠️ Previously lost: ${recentLost.name}${recentLost.close_reason ? ` (${recentLost.close_reason})` : ''}`);
            }
        }

        // Engagement summary
        if (c?.engagement) {
            const e = c.engagement;
            if (e.calls > 0) highlights.push(`📞 ${e.calls} prior calls (${e.connected_calls} connected)`);
            if (e.email_replies > 0) highlights.push(`✉️ ${e.email_replies} email replies from ${e.emails_sent} sent`);
            else if (e.emails_sent > 0) highlights.push(`✉️ ${e.emails_sent} emails sent, no replies yet`);
        }

        return {
            name: c?.name || 'Unknown',
            company: a?.name || '',
            highlights,
        };
    }

    onContactChanged(listener) {
        this.listeners.push(listener);
    }

    _notifyListeners(data) {
        this.listeners.forEach(fn => {
            try { fn(data); } catch (e) { console.error('[VaultService] Listener error:', e); }
        });
    }
}

const vaultService = new VaultService();
module.exports = vaultService;
