const { BrowserWindow } = require('electron');
const { getSystemPrompt } = require('../../common/prompts/promptBuilder.js');
const { createLLM } = require('../../common/ai/factory');
const sessionRepository = require('../../common/repositories/session');
const summaryRepository = require('./repositories');
const modelStateService = require('../../common/services/modelStateService');
const vaultService = require('../../vault/vaultService');
const { buildKnowledgeContext } = require('../../common/prompts/knowledgeLoader');

class SummaryService {
    constructor() {
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        this.conversationHistory = [];
        this.currentSessionId = null;
        
        // Callbacks
        this.onAnalysisComplete = null;
        this.onStatusUpdate = null;
    }

    setCallbacks({ onAnalysisComplete, onStatusUpdate }) {
        this.onAnalysisComplete = onAnalysisComplete;
        this.onStatusUpdate = onStatusUpdate;
    }

    setSessionId(sessionId) {
        this.currentSessionId = sessionId;
    }

    sendToRenderer(channel, data) {
        const { windowPool } = require('../../../window/windowManager');
        const listenWindow = windowPool?.get('listen');
        
        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
        }
    }

    addConversationTurn(speaker, text) {
        const conversationText = `${speaker.toLowerCase()}: ${text.trim()}`;
        this.conversationHistory.push(conversationText);
        console.log(`💬 Added conversation text: ${conversationText}`);
        console.log(`📈 Total conversation history: ${this.conversationHistory.length} texts`);

        // Check for high-signal moments that should trigger immediate coaching
        if (speaker.toLowerCase() === 'them') {
            const urgentSignal = this._detectUrgentSignal(text);
            if (urgentSignal) {
                console.log(`⚡ Urgent signal detected: ${urgentSignal.type} — triggering immediate coaching`);
                this._triggerImmediateAnalysis(urgentSignal);
                return;
            }
        }

        // Standard cadence — every 2 turns
        this.triggerAnalysisIfNeeded();
    }

    getConversationHistory() {
        return this.conversationHistory;
    }

    resetConversationHistory() {
        this.conversationHistory = [];
        this.previousAnalysisResult = null;
        this.analysisHistory = [];
        console.log('🔄 Conversation history and analysis state reset');
    }

    /**
     * Converts conversation history into text to include in the prompt.
     * @param {Array<string>} conversationTexts - Array of conversation texts ["me: ~~~", "them: ~~~", ...]
     * @param {number} maxTurns - Maximum number of recent turns to include
     * @returns {string} - Formatted conversation string for the prompt
     */
    formatConversationForPrompt(conversationTexts, maxTurns = 30) {
        if (conversationTexts.length === 0) return '';
        return conversationTexts.slice(-maxTurns).join('\n');
    }

    async makeOutlineAndRequests(conversationTexts, maxTurns = 30) {
        console.log(`🔍 makeOutlineAndRequests called - conversationTexts: ${conversationTexts.length}`);

        if (conversationTexts.length === 0) {
            console.log('⚠️ No conversation texts available for analysis');
            return null;
        }

        const recentConversation = this.formatConversationForPrompt(conversationTexts, maxTurns);

        // 이전 분석 결과를 프롬프트에 포함
        let contextualPrompt = '';
        if (this.previousAnalysisResult) {
            contextualPrompt = `
Previous Analysis Context:
- Main Topic: ${this.previousAnalysisResult.topic.header}
- Key Points: ${this.previousAnalysisResult.summary.slice(0, 3).join(', ')}
- Last Actions: ${this.previousAnalysisResult.actions.slice(0, 2).join(', ')}

Please build upon this context while analyzing the new conversation segments.
`;
        }

        // Build CRM context if a contact is loaded
        const contactData = vaultService.getCurrentContact();
        const crmContext = vaultService.buildPromptContext();
        const crmSection = crmContext
            ? `\n\nCRM DATA FOR THIS CONTACT (use this to personalize your coaching):\n${crmContext}\n`
            : '';

        // Build sales knowledge context (core + vertical + regional + conversation-triggered)
        const knowledgeContext = buildKnowledgeContext(contactData, recentConversation);

        const basePrompt = getSystemPrompt('sales_coaching', '', false);
        const systemPrompt = basePrompt.replace('{{CONVERSATION_HISTORY}}', knowledgeContext + crmSection + recentConversation);

        try {
            if (this.currentSessionId) {
                await sessionRepository.touch(this.currentSessionId);
            }

            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key is not configured.');
            }
            console.log(`🤖 Sending analysis request to ${modelInfo.provider} using model ${modelInfo.model}`);
            
            const messages = [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: `${contextualPrompt}

Based on the latest exchange in this sales call, what should the rep do or say RIGHT NOW?

Format:
- Lead with the most urgent coaching point (objection handling, buying signal, or discovery question)
- Give the exact words to say in quotes
- Max 3-4 bullet points total
- Be specific to what was just said`,
                },
            ];

            console.log('🤖 Sending analysis request to AI...');

            const llm = createLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: 1024,

            });

            const completion = await llm.chat(messages);

            const responseText = completion.content;
            console.log(`✅ Analysis response received: ${responseText}`);
            const structuredData = this.parseSalesCoachingResponse(responseText);

            if (this.currentSessionId) {
                try {
                    summaryRepository.saveSummary({
                        sessionId: this.currentSessionId,
                        text: responseText,
                        tldr: structuredData.summary.join('\n'),
                        bullet_json: JSON.stringify(structuredData.topic.bullets),
                        action_json: JSON.stringify(structuredData.actions),
                        model: modelInfo.model
                    });
                } catch (err) {
                    console.error('[DB] Failed to save summary:', err);
                }
            }

            // 분석 결과 저장
            this.previousAnalysisResult = structuredData;
            this.analysisHistory.push({
                timestamp: Date.now(),
                data: structuredData,
                conversationLength: conversationTexts.length,
            });

            if (this.analysisHistory.length > 10) {
                this.analysisHistory.shift();
            }

            return structuredData;
        } catch (error) {
            console.error('❌ Error during analysis generation:', error.message);
            return this.previousAnalysisResult; // 에러 시 이전 결과 반환
        }
    }

    /**
     * Parse the sales coaching LLM response into structured data for the UI.
     * Treats the full markdown response as the main content rather than
     * trying to parse rigid section headers.
     */
    parseSalesCoachingResponse(responseText) {
        const lines = responseText.split('\n').filter(l => l.trim());
        const sayThis = [];      // What to say — most prominent
        const context = [];      // Supporting context (objection type, signals)
        const questions = [];    // Follow-up questions to ask

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip standalone bold headers — they're labels, not content
            if (trimmed.match(/^\*\*[^*]+\*\*$/) && !trimmed.startsWith('- ')) {
                // But keep objection/signal labels as context
                const label = trimmed.replace(/\*\*/g, '');
                if (label.length < 60) {
                    context.push(label);
                }
                continue;
            }

            const content = trimmed.replace(/^[-*]\s*/, '');

            // Lines with quotes are speakable — highest priority
            if (content.includes('"') || content.includes('\u201c')) {
                sayThis.push(content);
            }
            // Questions go to actions
            else if (content.includes('?')) {
                questions.push(content);
            }
            // Bold-prefixed bullets are context labels
            else if (content.match(/^\*\*[^*]+\*\*/)) {
                context.push(content);
            }
            // Everything else is supporting detail
            else if (content.length > 10) {
                context.push(content);
            }
        }

        // If no quoted suggestions, promote context items
        if (sayThis.length === 0 && context.length > 0) {
            sayThis.push(...context.splice(0, 2));
        }

        return {
            summary: sayThis.slice(0, 4),
            topic: { header: context.length > 0 ? context[0] : '', bullets: context.slice(1, 5) },
            actions: questions.slice(0, 5),
            followUps: [],
        };
    }

    parseResponseText(responseText, previousResult) {
        const structuredData = {
            summary: [],
            topic: { header: '', bullets: [] },
            actions: [],
            followUps: ['✉️ Draft a follow-up email', '✅ Generate action items', '📝 Show summary'],
        };

        // 이전 결과가 있으면 기본값으로 사용
        if (previousResult) {
            structuredData.topic.header = previousResult.topic.header;
            structuredData.summary = [...previousResult.summary];
        }

        try {
            const lines = responseText.split('\n');
            let currentSection = '';
            let isCapturingTopic = false;
            let topicName = '';

            for (const line of lines) {
                const trimmedLine = line.trim();

                // 섹션 헤더 감지
                if (trimmedLine.startsWith('**Summary Overview**')) {
                    currentSection = 'summary-overview';
                    continue;
                } else if (trimmedLine.startsWith('**Key Topic:')) {
                    currentSection = 'topic';
                    isCapturingTopic = true;
                    topicName = trimmedLine.match(/\*\*Key Topic: (.+?)\*\*/)?.[1] || '';
                    if (topicName) {
                        structuredData.topic.header = topicName + ':';
                    }
                    continue;
                } else if (trimmedLine.startsWith('**Extended Explanation**')) {
                    currentSection = 'explanation';
                    continue;
                } else if (trimmedLine.startsWith('**Suggested Questions**')) {
                    currentSection = 'questions';
                    continue;
                }

                // 컨텐츠 파싱
                if (trimmedLine.startsWith('-') && currentSection === 'summary-overview') {
                    const summaryPoint = trimmedLine.substring(1).trim();
                    if (summaryPoint && !structuredData.summary.includes(summaryPoint)) {
                        // 기존 summary 업데이트 (최대 5개 유지)
                        structuredData.summary.unshift(summaryPoint);
                        if (structuredData.summary.length > 5) {
                            structuredData.summary.pop();
                        }
                    }
                } else if (trimmedLine.startsWith('-') && currentSection === 'topic') {
                    const bullet = trimmedLine.substring(1).trim();
                    if (bullet && structuredData.topic.bullets.length < 3) {
                        structuredData.topic.bullets.push(bullet);
                    }
                } else if (currentSection === 'explanation' && trimmedLine) {
                    // explanation을 topic bullets에 추가 (문장 단위로)
                    const sentences = trimmedLine
                        .split(/\.\s+/)
                        .filter(s => s.trim().length > 0)
                        .map(s => s.trim() + (s.endsWith('.') ? '' : '.'));

                    sentences.forEach(sentence => {
                        if (structuredData.topic.bullets.length < 3 && !structuredData.topic.bullets.includes(sentence)) {
                            structuredData.topic.bullets.push(sentence);
                        }
                    });
                } else if (trimmedLine.match(/^\d+\./) && currentSection === 'questions') {
                    const question = trimmedLine.replace(/^\d+\.\s*/, '').trim();
                    if (question && question.includes('?')) {
                        structuredData.actions.push(`❓ ${question}`);
                    }
                }
            }

            // 기본 액션 추가
            const defaultActions = ['✨ What should I say next?', '💬 Suggest follow-up questions'];
            defaultActions.forEach(action => {
                if (!structuredData.actions.includes(action)) {
                    structuredData.actions.push(action);
                }
            });

            // 액션 개수 제한
            structuredData.actions = structuredData.actions.slice(0, 5);

            // 유효성 검증 및 이전 데이터 병합
            if (structuredData.summary.length === 0 && previousResult) {
                structuredData.summary = previousResult.summary;
            }
            if (structuredData.topic.bullets.length === 0 && previousResult) {
                structuredData.topic.bullets = previousResult.topic.bullets;
            }
        } catch (error) {
            console.error('❌ Error parsing response text:', error);
            // 에러 시 이전 결과 반환
            return (
                previousResult || {
                    summary: [],
                    topic: { header: 'Analysis in progress', bullets: [] },
                    actions: ['✨ What should I say next?', '💬 Suggest follow-up questions'],
                    followUps: ['✉️ Draft a follow-up email', '✅ Generate action items', '📝 Show summary'],
                }
            );
        }

        console.log('📊 Final structured data:', JSON.stringify(structuredData, null, 2));
        return structuredData;
    }

    /**
     * Triggers analysis when conversation history reaches 5 texts.
     */
    // ─── Smart Coaching Triggers ───

    // High-signal patterns that warrant immediate coaching (not waiting for 2-turn cadence)
    static URGENT_SIGNALS = {
        objection_price: {
            type: 'objection_price',
            patterns: ['too expensive', 'too costly', 'over budget', 'out of budget', 'can\'t afford', 'price is too', 'cost is too', 'cheaper option', 'cheaper alternative', 'not in the budget', 'budget concern', 'sticker shock', 'that\'s a lot'],
            coachingHint: 'PRICE OBJECTION DETECTED — respond immediately with ROI reframe',
        },
        objection_competitor: {
            type: 'objection_competitor',
            patterns: ['already using', 'current vendor', 'we use bigcommerce', 'we use magento', 'we use woocommerce', 'we use salesforce', 'we use wix', 'we use squarespace', 'happy with our current', 'already have a solution', 'we\'re on shopify\'s competitor', 'looked at other options', 'considering other', 'evaluating other'],
            coachingHint: 'COMPETITOR/STATUS QUO OBJECTION — probe for gaps, don\'t bash',
        },
        objection_timing: {
            type: 'objection_timing',
            patterns: ['not the right time', 'maybe next quarter', 'maybe next year', 'not a priority', 'too busy right now', 'revisit later', 'circle back', 'not ready yet', 'need more time', 'let me think about it', 'i need to think', 'sleep on it'],
            coachingHint: 'TIMING OBJECTION — create urgency around their pain, not your deadline',
        },
        objection_authority: {
            type: 'objection_authority',
            patterns: ['need to talk to my', 'run it by my', 'check with my boss', 'need approval from', 'not my decision', 'have to discuss with', 'need to loop in', 'my manager needs to', 'the team needs to', 'committee decision'],
            coachingHint: 'AUTHORITY OBJECTION — offer to join the next conversation with decision maker',
        },
        buying_signal: {
            type: 'buying_signal',
            patterns: ['what\'s the pricing', 'how much does it cost', 'what does it cost', 'what\'s the timeline', 'how long does implementation', 'when can we start', 'what are the next steps', 'how do we get started', 'can you send a proposal', 'send me a contract', 'what\'s the onboarding', 'can we do a pilot', 'can we do a trial', 'what does migration look like', 'how does the contract work'],
            coachingHint: '🟢 BUYING SIGNAL — advance toward close NOW',
        },
        risk_signal: {
            type: 'risk_signal',
            patterns: ['i\'m not sure', 'i don\'t think this will work', 'we tried something like this before', 'what if it doesn\'t work', 'seems risky', 'concerned about', 'worried about', 'what happens if', 'what\'s the downside', 'too complex', 'sounds complicated'],
            coachingHint: 'RISK/CONCERN DETECTED — offer pilot, phased approach, or case study',
        },
    };

    /**
     * Check if the prospect just said something that needs immediate coaching.
     * Returns the signal object or null.
     */
    _detectUrgentSignal(text) {
        const lower = text.toLowerCase();
        // Debounce — don't fire if we just triggered an immediate analysis within 15s
        if (this._lastImmediateTrigger && Date.now() - this._lastImmediateTrigger < 15000) {
            return null;
        }
        for (const signal of Object.values(SummaryService.URGENT_SIGNALS)) {
            for (const pattern of signal.patterns) {
                if (lower.includes(pattern)) {
                    return signal;
                }
            }
        }
        return null;
    }

    /**
     * Trigger an immediate coaching analysis with the urgent signal hint
     * prepended so the LLM knows to prioritize it.
     */
    async _triggerImmediateAnalysis(signal) {
        this._lastImmediateTrigger = Date.now();

        // Prepend the signal hint to the conversation so the LLM sees it
        const hintedHistory = [
            ...this.conversationHistory.slice(0, -1),
            `[COACHING SYSTEM: ${signal.coachingHint}]`,
            this.conversationHistory[this.conversationHistory.length - 1],
        ];

        console.log(`⚡ Immediate coaching trigger: ${signal.type}`);
        const data = await this.makeOutlineAndRequests(hintedHistory);
        if (data) {
            console.log('⚡ Sending immediate coaching to renderer');
            this.sendToRenderer('summary-update', data);
            if (this.onAnalysisComplete) {
                this.onAnalysisComplete(data);
            }
        }
    }

    async triggerAnalysisIfNeeded() {
        if (this.conversationHistory.length >= 2 && this.conversationHistory.length % 2 === 0) {
            console.log(`Triggering sales coaching analysis - ${this.conversationHistory.length} conversation texts accumulated`);

            const data = await this.makeOutlineAndRequests(this.conversationHistory);
            if (data) {
                console.log('Sending structured data to renderer');
                this.sendToRenderer('summary-update', data);
                
                // Notify callback
                if (this.onAnalysisComplete) {
                    this.onAnalysisComplete(data);
                }
            } else {
                console.log('No analysis data returned');
            }
        }
    }

    getCurrentAnalysisData() {
        return {
            previousResult: this.previousAnalysisResult,
            history: this.analysisHistory,
            conversationLength: this.conversationHistory.length,
        };
    }
}

module.exports = SummaryService; 