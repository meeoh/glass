// Knowledge Loader — loads sales coaching knowledge from markdown files
// and builds a context string for the LLM prompt.
// Dynamically selects relevant knowledge based on the contact's region/vertical.

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');

// Cache loaded files in memory
const _cache = {};

function _loadFile(filename) {
    if (_cache[filename]) return _cache[filename];
    try {
        const filePath = path.join(KNOWLEDGE_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        _cache[filename] = content;
        return content;
    } catch (err) {
        console.error(`[KnowledgeLoader] Failed to load ${filename}:`, err.message);
        return '';
    }
}

/**
 * Core knowledge — always included in every coaching prompt.
 * ~25K tokens total.
 */
function getCoreKnowledge() {
    const sections = [];

    // MEDDPICC framework
    sections.push(_loadFile('meddpicc.md'));

    // Shopify competitive proof points
    sections.push(_loadFile('shopify_competitive.md'));

    // Shopify Plus product knowledge
    sections.push(_loadFile('plus.md'));

    // Payments
    sections.push(_loadFile('payments.md'));

    // POS
    sections.push(_loadFile('pos.md'));

    // Unified commerce
    sections.push(_loadFile('unified.md'));

    return sections.filter(Boolean).join('\n\n');
}

/**
 * Vertical-specific knowledge — included when we know the contact's industry.
 */
function getVerticalKnowledge(vertical) {
    if (!vertical) return '';

    const verticalMap = {
        // Map CRM vertical/industry values to knowledge files
        'b2b': 'b2b.md',
        'wholesale': 'b2b.md',
        'food': 'food_bev.md',
        'food & beverage': 'food_bev.md',
        'food, beverages & tobacco': 'food_bev.md',
        'beverage': 'food_bev.md',
        'consumer goods': 'consumer_goods.md',
        'cpg': 'consumer_goods.md',
        'fmcg': 'consumer_goods.md',
        'lifestyle': 'lifestyle.md',
        'fashion': 'lifestyle.md',
        'apparel': 'lifestyle.md',
        'apparel & accessories': 'lifestyle.md',
        'manufacturing': 'manufacturing.md',
        'industrial': 'manufacturing.md',
        'emerging': 'emerging.md',
        'startup': 'emerging.md',
        'capital': 'capital.md',
        'lending': 'capital.md',
    };

    const normalizedVertical = vertical.toLowerCase().trim();
    const filename = verticalMap[normalizedVertical];
    if (filename) {
        return _loadFile(filename);
    }

    // Try partial match
    for (const [key, file] of Object.entries(verticalMap)) {
        if (normalizedVertical.includes(key) || key.includes(normalizedVertical)) {
            return _loadFile(file);
        }
    }

    return '';
}

/**
 * Region-specific coaching context — included when we know the contact's region.
 */
// Map country codes/names to regions for fallback when territory_name isn't set
const COUNTRY_TO_REGION = {
    // AMER
    'us': 'amer', 'usa': 'amer', 'united states': 'amer', 'canada': 'amer', 'ca': 'amer',
    'mexico': 'amer', 'mx': 'amer', 'brazil': 'amer', 'br': 'amer', 'colombia': 'amer', 'co': 'amer',
    'argentina': 'amer', 'ar': 'amer', 'chile': 'amer', 'cl': 'amer', 'peru': 'amer', 'pe': 'amer',
    // EMEA
    'gb': 'emea', 'uk': 'emea', 'united kingdom': 'emea', 'de': 'emea', 'germany': 'emea',
    'fr': 'emea', 'france': 'emea', 'it': 'emea', 'italy': 'emea', 'es': 'emea', 'spain': 'emea',
    'nl': 'emea', 'netherlands': 'emea', 'be': 'emea', 'belgium': 'emea', 'se': 'emea', 'sweden': 'emea',
    'dk': 'emea', 'denmark': 'emea', 'no': 'emea', 'norway': 'emea', 'ch': 'emea', 'switzerland': 'emea',
    'at': 'emea', 'austria': 'emea', 'pl': 'emea', 'poland': 'emea', 'ie': 'emea', 'ireland': 'emea',
    'ae': 'emea', 'uae': 'emea', 'united arab emirates': 'emea', 'sa': 'emea', 'saudi arabia': 'emea',
    'za': 'emea', 'south africa': 'emea', 'eg': 'emea', 'egypt': 'emea', 'ng': 'emea', 'nigeria': 'emea',
    // APAC
    'au': 'apac', 'australia': 'apac', 'nz': 'apac', 'new zealand': 'apac',
    'jp': 'apac', 'japan': 'apac', 'in': 'apac', 'india': 'apac',
    'sg': 'apac', 'singapore': 'apac', 'hk': 'apac', 'hong kong': 'apac',
    'cn': 'apac', 'china': 'apac', 'kr': 'apac', 'south korea': 'apac',
    'id': 'apac', 'indonesia': 'apac', 'th': 'apac', 'thailand': 'apac',
    'ph': 'apac', 'philippines': 'apac', 'pk': 'apac', 'pakistan': 'apac',
    'my': 'apac', 'malaysia': 'apac', 'tw': 'apac', 'taiwan': 'apac',
};

function getRegionalKnowledge(region) {
    if (!region) return '';

    const normalized = region.toLowerCase().trim();

    // Direct match (territory_name starts with EMEA_, AMER_, APAC_)
    if (normalized.includes('emea')) return _loadFile('region_emea.md');
    if (normalized.includes('amer')) return _loadFile('region_amer.md');
    if (normalized.includes('apac')) return _loadFile('region_apac.md');

    // Country-based fallback
    const mapped = COUNTRY_TO_REGION[normalized];
    if (mapped === 'emea') return _loadFile('region_emea.md');
    if (mapped === 'amer') return _loadFile('region_amer.md');
    if (mapped === 'apac') return _loadFile('region_apac.md');

    return '';
}

/**
 * Conversation keyword triggers — maps keywords/phrases in the transcript
 * to knowledge files that should be loaded.
 */
const CONVERSATION_TRIGGERS = {
    // B2B / Wholesale
    'b2b.md': ['b2b', 'wholesale', 'company accounts', 'payment terms', 'net 30', 'net 60', 'bulk order', 'trade account', 'business buyer', 'catalog pricing'],
    // Capital / Lending
    'capital.md': ['capital', 'loan', 'funding', 'financing', 'cash advance', 'factor rate', 'remittance', 'shopify capital', 'working capital', 'cash flow'],
    // POS / Retail
    'pos.md': ['pos', 'point of sale', 'in-store', 'in store', 'retail location', 'brick and mortar', 'physical store', 'terminal', 'card reader', 'till'],
    // Unified Commerce
    'unified.md': ['omnichannel', 'omni-channel', 'unified commerce', 'online and offline', 'pop-up', 'popup store', 'multiple locations', 'inventory sync'],
    // Plus
    'plus.md': ['shopify plus', 'plus plan', 'expansion store', 'launchpad', 'shopify flow', 'checkout extensibility', 'hydrogen', 'headless'],
    // Payments
    'payments.md': ['shopify payments', 'payment gateway', 'transaction fee', 'stripe', 'paypal', 'shop pay', 'accelerated checkout', 'wallet'],
    // Food & Beverage
    'food_bev.md': ['food', 'beverage', 'restaurant', 'grocery', 'perishable', 'subscription box', 'meal kit', 'cpg food'],
    // Consumer Goods
    'consumer_goods.md': ['cpg', 'consumer goods', 'fmcg', 'consumer packaged', 'household', 'personal care'],
    // Lifestyle / Fashion
    'lifestyle.md': ['fashion', 'apparel', 'clothing', 'lifestyle brand', 'streetwear', 'luxury', 'accessories'],
    // Manufacturing
    'manufacturing.md': ['manufacturing', 'industrial', 'oem', 'factory', 'supply chain', 'made to order'],
    // Emerging / Startup
    'emerging.md': ['startup', 'early stage', 'pre-revenue', 'seed funding', 'series a', 'just launched', 'new brand'],
    // Competitor mentions
    'shopify_competitive.md': ['bigcommerce', 'magento', 'adobe commerce', 'salesforce commerce', 'woocommerce', 'wix', 'squarespace', 'lightspeed', 'oracle', 'vtex', 'commercetools'],
    // Regional
    'region_emea.md': ['europe', 'emea', 'uk market', 'gdpr', 'vat', 'eu regulation', 'pound', 'euro'],
    'region_amer.md': ['north america', 'us market', 'american', 'canada', 'latam', 'latin america', 'mexico', 'brazil'],
    'region_apac.md': ['asia', 'apac', 'australia', 'japan', 'india', 'southeast asia', 'new zealand', 'china'],
};

/**
 * Scan conversation transcript for keywords that trigger additional knowledge loading.
 * @param {string} transcript - Recent conversation text
 * @returns {string[]} Array of knowledge filenames to load
 */
function getConversationTriggeredFiles(transcript) {
    if (!transcript) return [];
    const lower = transcript.toLowerCase();
    const triggered = new Set();

    for (const [filename, keywords] of Object.entries(CONVERSATION_TRIGGERS)) {
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                triggered.add(filename);
                break; // One match per file is enough
            }
        }
    }

    return Array.from(triggered);
}

/**
 * Build the full knowledge context for a coaching prompt.
 * @param {object} contactData - The CRM contact/account data (optional)
 * @param {string} transcript - Recent conversation transcript (optional)
 * @returns {string} Knowledge context to inject into the system prompt
 */
function buildKnowledgeContext(contactData, transcript) {
    const sections = [];
    const loadedFiles = new Set();

    // Always include core knowledge
    sections.push('═══ SALES KNOWLEDGE BASE ═══');
    sections.push(getCoreKnowledge());
    // Track core files as loaded so we don't double-load
    ['meddpicc.md', 'shopify_competitive.md', 'plus.md', 'payments.md', 'pos.md', 'unified.md'].forEach(f => loadedFiles.add(f));

    // Add vertical-specific knowledge if we know the industry
    const vertical = contactData?.account?.industry || contactData?.contact?.primary_product_interest;
    const verticalKnowledge = getVerticalKnowledge(vertical);
    if (verticalKnowledge) {
        sections.push(`\n═══ VERTICAL: ${vertical.toUpperCase()} ═══`);
        sections.push(verticalKnowledge);
        // Mark the vertical file as loaded
        for (const [key, file] of Object.entries({
            'b2b': 'b2b.md', 'food': 'food_bev.md', 'consumer': 'consumer_goods.md',
            'lifestyle': 'lifestyle.md', 'fashion': 'lifestyle.md', 'apparel': 'lifestyle.md',
            'manufacturing': 'manufacturing.md', 'emerging': 'emerging.md', 'capital': 'capital.md',
        })) {
            if (vertical?.toLowerCase().includes(key)) loadedFiles.add(file);
        }
    }

    // Add regional knowledge if we know the region
    // Try: territory_name (e.g. "EMEA_Mid-Mkt_North_All_A_B2B_02") → region → country
    const region = contactData?.account?.territory_name || contactData?.account?.region || contactData?.account?.country;
    const regionalKnowledge = getRegionalKnowledge(region);
    if (regionalKnowledge) {
        sections.push(`\n═══ REGIONAL CONTEXT: ${region.toUpperCase()} ═══`);
        sections.push(regionalKnowledge);
        if (region?.toLowerCase().includes('emea')) loadedFiles.add('region_emea.md');
        if (region?.toLowerCase().includes('amer')) loadedFiles.add('region_amer.md');
        if (region?.toLowerCase().includes('apac')) loadedFiles.add('region_apac.md');
    }

    // Scan conversation for additional knowledge triggers
    const conversationFiles = getConversationTriggeredFiles(transcript);
    for (const filename of conversationFiles) {
        if (!loadedFiles.has(filename)) {
            const content = _loadFile(filename);
            if (content) {
                const label = filename.replace('.md', '').replace(/_/g, ' ').toUpperCase();
                sections.push(`\n═══ ${label} (triggered by conversation) ═══`);
                sections.push(content);
                loadedFiles.add(filename);
            }
        }
    }

    sections.push('═══════════════════════════════');

    console.log(`[KnowledgeLoader] Loaded ${loadedFiles.size} knowledge files (${conversationFiles.filter(f => !['meddpicc.md','shopify_competitive.md','plus.md','payments.md','pos.md','unified.md'].includes(f)).length} triggered by conversation)`);

    return sections.filter(Boolean).join('\n');
}

module.exports = {
    buildKnowledgeContext,
    getCoreKnowledge,
    getVerticalKnowledge,
    getRegionalKnowledge,
    getConversationTriggeredFiles,
};
