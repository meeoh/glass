// Post-Call Summary Service
// Generates an AI summary when a call ends and pushes it to Vault CRM.

const { createLLM } = require('../../common/ai/factory');
const modelStateService = require('../../common/services/modelStateService');
const vaultService = require('../../vault/vaultService');
const contactMatchService = require('../../contactMatch/contactMatchService');
const fetch = require('node-fetch');

const VAULT_BASE_URL = process.env.VAULT_URL || 'https://u2.shop.dev';
const VAULT_API_TOKEN = process.env.VAULT_API_TOKEN || '';

const SUMMARY_PROMPT = `You are a sales call summarizer. Given a transcript of a sales call, write a brief, natural-sounding summary paragraph for the CRM.

Rules:
- MAXIMUM 3 sentences. Never exceed 3 sentences.
- No labels, headers, prefixes, bullet points, or markdown
- Cover: what was discussed, any concerns raised, and the agreed next step
- Write naturally, like a human jotting a quick note after a call
- Be concise — every word must earn its place
- Don't invent information not in the transcript

Example:
Discussed their BigCommerce setup and pain around manual inventory sync across 2 retail locations — Flora raised pricing and migration risk concerns. She wants a demo with her ops team and asked about implementation timeline. Next step is scheduling that demo for Tuesday and sending an ROI calculator.`;

class PostCallSummaryService {
    constructor() {
        this._generating = false;
    }

    /**
     * Generate a post-call summary and push it to Vault.
     * @param {string[]} conversationHistory - Array of conversation texts
     * @param {object} options - { callId, durationSeconds }
     * @returns {object} { success, summary, crmResult }
     */
    async generateAndPush(conversationHistory, options = {}) {
        if (!VAULT_API_TOKEN) {
            console.log('[PostCallSummary] Vault API token not configured, skipping summary push.');
            return { success: false, error: 'Vault not configured' };
        }
        if (this._generating) {
            console.log('[PostCallSummary] Already generating, skipping');
            return { success: false, error: 'Already generating' };
        }

        if (!conversationHistory || conversationHistory.length < 2) {
            console.log('[PostCallSummary] Too few conversation turns, skipping summary');
            return { success: false, error: 'Too few turns for a meaningful summary' };
        }

        this._generating = true;
        try {
            // Generate the summary via LLM
            const summary = await this._generateSummary(conversationHistory);
            if (!summary) {
                return { success: false, error: 'Failed to generate summary' };
            }

            console.log(`[PostCallSummary] Summary generated (${summary.length} chars)`);

            // Push to Vault CRM
            const crmResult = await this._pushToVault(summary, options);

            return { success: true, summary, crmResult };
        } catch (err) {
            console.error('[PostCallSummary] Error:', err.message);
            return { success: false, error: err.message };
        } finally {
            this._generating = false;
        }
    }

    async _generateSummary(conversationHistory) {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('LLM not configured');
            }

            const llm = createLLM(modelInfo.provider, modelInfo.apiKey, modelInfo.model);
            const transcript = conversationHistory.join('\n');

            // Include CRM context if available
            const crmContext = vaultService.buildPromptContext();
            const contextSection = crmContext
                ? `\nCRM Context for this contact:\n${crmContext}\n`
                : '';

            const response = await llm.chat([
                { role: 'system', content: SUMMARY_PROMPT },
                { role: 'user', content: `${contextSection}\nCall Transcript:\n${transcript}` },
            ]);

            return response?.content || response?.message?.content || null;
        } catch (err) {
            console.error('[PostCallSummary] LLM generation failed:', err.message);
            return null;
        }
    }

    async _pushToVault(summary, options = {}) {
        // Use pre-captured data from options (captured before clearMatch/clearContact)
        const contactData = options.contactData || vaultService.getCurrentContact();
        const matchSource = options.matchSource || contactMatchService.getMatchSource();
        const repEmail = options.repEmail || contactMatchService.getRepEmail();

        if (!contactData?.contact && !options.callId) {
            console.log('[PostCallSummary] No contact matched and no call_id — skipping CRM push');
            return { pushed: false, reason: 'no_contact' };
        }

        const body = {
            user_email: repEmail,
            summary: summary,
            duration_seconds: options.durationSeconds || null,
        };

        // Dialer call — attach to the CRM::Call
        if (matchSource === 'vault_active_call' && options.callId) {
            body.call_id = options.callId;
        } else {
            // External call — pass contact + calendar event ID for Google Meet matching
            if (contactData?.contact?.id) {
                body.contact_id = contactData.contact.id;
            } else if (contactData?.contact?.email) {
                body.contact_email = contactData.contact.email;
            }
            if (options.calendarEventId) {
                body.calendar_event_id = options.calendarEventId;
            }
        }

        try {
            const url = `${VAULT_BASE_URL}/crm/api/call_summary`;
            console.log(`[PostCallSummary] Pushing summary to Vault: ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${VAULT_API_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(body),
                timeout: 15000,
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`[PostCallSummary] Vault push failed: ${response.status} ${text}`);
                return { pushed: false, reason: `vault_error_${response.status}` };
            }

            const result = await response.json();
            console.log(`[PostCallSummary] ✅ Summary pushed to Vault: ${result.type} (note_id: ${result.note_id})`);
            return { pushed: true, ...result };
        } catch (err) {
            console.error('[PostCallSummary] Vault push failed:', err.message);
            return { pushed: false, reason: err.message };
        }
    }
}

const postCallSummaryService = new PostCallSummaryService();
module.exports = postCallSummaryService;
