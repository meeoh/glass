export const EMEA_COACHING_CONTEXT = {

  // ── BY SUBREGION ────────────────────────────────────────────────────────────

  bySubregion: {

    'UK/Ireland': {
      topObjections: ['pricing/cost (78% of calls)', 'B2B capabilities (44%)', 'migration risk (25%)'],
      dominantTalkTracks: [
        "AI/agentic commerce — Universal Commerce Protocol framing resonated strongly across all segments'",
        "TCO reframe: \"licence fee is 20-30% of total cost\" — most effective opener against pricing pushback'",
        "Migration risk reframe: \"platform debt compounds quarterly\" — connects emotionally to UK merchant growth ambitions'",
        "Shop Pay conversion story lands well with fashion/apparel brands (Palace, Oh Polly profile)'",
      ],
      competitors: ['Magento/Adobe Commerce (most common)', 'Salesforce Commerce Cloud (mid-market/enterprise)', 'WooCommerce (SMB)'],
      merchantProofPoints: [
        "Palace Skateboards: 27 Shopify instances globally — use for multi-brand/complex retail conversations'",
        "Oh Polly: Shopify Plus fashion brand, strong on conversion + drops — use for fashion D2C objections'",
        "JD Sports: large retail omni-channel on Shopify — use for \"we have too many stores\" objections'",
        "Naked Wines: D2C subscription commerce — use for recurring revenue / subscription model questions'",
        "CRTZ (Corteiz): fast-growing UK streetwear on Shopify — use for high-growth fashion drop culture'",
      ],
      regionalNuances: [
        'UK buyers are direct and data-driven — lead with numbers, not relationship warmth',
        "Brexit-era compliance concerns (customs, VAT, cross-border) are real — Shopify Markets handles this natively'",
        'UK enterprise buyers are sophisticated; avoid junior sales openers ("great question!")',
        "Irish market: smaller deal sizes but fast decisions; relationship matters more than in GB'",
        "Shopify Payments is well-established in UK — payment rate objections are about interchange vs blended rate, not trust'",
      ],
      perspectiveInsights: [
        'UK/Enterprise: River Island closed a £2.3M deal partly by bringing Shopify Payments and Shop Pay conversion data into the conversation early — not just platform features. If payments haven\'t come up yet, bring them in.',
        'UK/Enterprise: Tech teams here know MACH and composable architecture. Use that language when architects are in the room: "Shopify is composable at every layer — Hydrogen for headless storefronts, APIs for everything, App Store for extensions."',
      ],
    },

    // FRITES kept for legacy account docs that still have this subregion value
    'FRITES': {
      topObjections: ['B2B capabilities (50% of calls)', 'pricing/cost (52%)', 'payment processing fit (33%)'],
      dominantTalkTracks: ['See France, Italy, Spain individual entries for specific coaching'],
      competitors: ['Magento/Adobe Commerce (#1)', 'PrestaShop (#2)', 'Salesforce Commerce Cloud (enterprise)'],
      merchantProofPoints: [],
      regionalNuances: ['Legacy entry — use France, Italy, or Spain context instead'],
      perspectiveInsights: [],
    },

    'France': {
      // Source: 1,639 EMEA FR calls. SFCC displacement is the #1 deal type.
      topObjections: [
        "pricing/cost (52% of calls)'",
        "B2B capabilities (50%)'",
        "Salesforce Commerce Cloud switching cost — \"SFCC is enterprise-grade\"'",
        "NF5 fiscal compliance (resolved 2025) — address proactively'",
        "SaaS lock-in / data sovereignty concerns'",
        "migration risk'",
      ],
      dominantTalkTracks: [
        "SFCC displacement is the #1 French enterprise deal type. Lead with: \"What does your current SFCC maintenance contract AND agency cost annually — not just the license?\" The total shocks them. Then: \"What if you redirected half of that to growth?\"'",
        "Peer reference calls close French enterprise deals. Showroomprivé closed after 30-min reference calls with Westwing and Boden. Arrange before paper process starts, not after.'",
        "NF5 compliance is resolved as of 2025 — address it proactively before it becomes an objection.'",
        "French IT teams are skeptical of SaaS lock-in. Reframe: \"Shopify's open ecosystem means your data and integrations are yours. You can export everything.\"'",
        "TCO argument resonates: SFCC implementation costs run 2-3x the license fee once you count agency dependency and ongoing maintenance.'",
        "B2B on Shopify: unlimited catalogs, payment terms, partial payments — strongest differentiator vs Magento/PrestaShop.'",
      ],
      competitors: [
        "Salesforce Commerce Cloud — #1 French enterprise competitor. Ask: \"What's your annual SFCC agency and maintenance cost beyond the license?\"'",
        "Magento/Adobe Commerce — #1 overall, strong in mid-market'",
        "PrestaShop — strong SMB/mid-market local incumbent, acknowledge it, pivot to TCO'",
      ],
      merchantProofPoints: [
        "Showroomprivé (FR): flash-sale specialist, migrated from SFCC — $2.4M deal closed after peer reference calls. Use for large FR enterprise SFCC displacement.'",
        "Caudalie (FR): French luxury skincare D2C on Shopify Plus. Use for premium/beauty brand conversations.'",
        "Orchestra Premaman (FR): large French children's fashion retailer. Use for omni-channel/retail complexity.'",
      ],
      regionalNuances: [
        "French buyers expect formal structure: send a written agenda before the call, follow up with a written summary, reference official documentation.'",
        "French IT teams are among the most skeptical of SaaS lock-in in EMEA — address data portability and open APIs early.'",
        "NF5 compliance (fiscal certification): resolved as of 2025. Raise it proactively: \"I know NF5 was a concern before — it's been certified since 2025.\"'",
        "GDPR and data sovereignty are table stakes for French enterprise. Do not promise custom DPA terms — route to legal.'",
        "French enterprise sales cycles are long — 6-12 months. Champion development and the peer reference call are the two highest-leverage moves.'",
        "French language: most business meetings are in French. Coaching cards always in English.'",
      ],
      perspectiveInsights: [
        "FR/Enterprise SFCC: \"Don't lead with features. Lead with cost. Ask: 'What does your annual SFCC platform, agency, and maintenance budget look like — all in?' The total is usually €500K-€1M+. Then: 'What would you do with half of that redirected to growth?'\"'",
        "FR/Reference call: \"The single highest-conversion move in French enterprise is a peer reference call. Arrange 30 minutes with a similar merchant before paper process starts. Showroomprivé closed after reference calls with Westwing and Boden — not after the product demo.\"'",
        "FR/Formal process: \"French buyers evaluate the vendor as much as the product. Show up with a formal agenda, follow up every call in writing, and reference Shopify's French-language support and local team. Trust compounds with process.\"'",
      ],
    },

    'Italy': {
      // Source: 963 EMEA IT calls. Multi-entity + SAP/SFCC displacement dominant.
      topObjections: [
        "B2B capabilities (50% of calls)'",
        "pricing/cost (52%)'",
        "multi-entity / multi-brand management requirements'",
        "Talon One (loyalty/promotions) integration requirement'",
        "migration from Salesforce Commerce Cloud or SAP Hybris'",
        "invoice-based procurement and extended payment terms'",
      ],
      dominantTalkTracks: [
        "Multi-entity is the opening question for every Italian mid-market and enterprise call. \"How many separate brand or entity instances are you managing today?\" This shapes the entire architecture and pricing conversation.'",
        "Italian fashion/luxury references close Italian deals. Use Twinset (SFCC migration, multi-entity), MVC Group (SAP Hybris displacement), Antonioli/Slam Jam by name — these are known in Italian retail.'",
        "Talon One comes up as a specific deal requirement in Italian fashion/retail. When mentioned, it's often the integration blocking or enabling the decision. Confirm supported natively and loop in solutions engineering.'",
        "SAP Hybris displacement: \"What does your current SAP maintenance contract cost annually — beyond just the license?\" The MVC Group case (3 Italian sports brands migrated) is the right proof point.'",
        "SFCC displacement: same playbook as France — ask for total cost including agency and maintenance.'",
      ],
      competitors: [
        "Salesforce Commerce Cloud (enterprise IT) — same displacement playbook as France'",
        "SAP Hybris / SAP Commerce Cloud — manufacturing and industrial enterprise'",
        "Magento/Adobe Commerce — mid-market standard'",
        "PrestaShop — SMB incumbent'",
      ],
      merchantProofPoints: [
        "Twinset (IT): Italian luxury fashion group, migrated from SFCC — multi-entity, multi-brand, Talon One integration. Use for IT fashion/apparel SFCC displacement.'",
        "MVC Group (IT): 3 Italian sports brands (Castelli, Sportful, Karpos), migrated from SAP Hybris. Use for multi-brand groups displacing SAP.'",
        "Antonioli, Slam Jam, Teddy Group, Westwing Europe: Italian fashion/luxury/lifestyle on Shopify. Use for references when Italian prospects want local proof.'",
      ],
      regionalNuances: [
        "Italian mid-market and enterprise brands almost always have multi-entity requirements. Ask early — this shapes the entire architecture discussion.'",
        "Talon One is a common integration requirement in IT fashion/retail. It's often the specific thing blocking or enabling the decision.'",
        "Invoice-based procurement is standard in Italian B2B — paper process will be longer than in Northern Europe. Map it in the first 2 calls.'",
        "Italian language: most enterprise calls are in Italian or mixed. Coaching cards always in English.'",
        "Northern Italian industrial brands (Lombardy, Veneto) often run SAP — same ERP coexistence pitch as AMER/Manufacturing.'",
        "Fashion and lifestyle proof points carry more weight than global stats in Italian enterprise conversations.'",
      ],
      perspectiveInsights: [
        "IT/Multi-entity: \"The first question for every Italian mid-market deal: 'How many separate brand or entity instances are you managing today?' Then: 'With Shopify Plus, all of those run from one admin — one catalog, one inventory, one team. What does it currently cost you to manage them separately?'\"'",
        "IT/Talon One: \"When Talon One comes up — don't let it become a blocker. Confirm it's supported natively, then: 'This is actually a signal we see from serious buyers — you're thinking about the full loyalty architecture, not just the platform. Let me get solutions engineering on a call to walk through the integration in detail.'\"'",
        "IT/SAP: \"'What's your current SAP maintenance contract costing annually — beyond the license?' The answer usually reframes the TCO conversation. MVC Group migrated 3 Italian sports brands from SAP Hybris to Shopify Plus — the decision came down to that exact question.\"'",
      ],
    },

    'Spain': {
      // Source: 1,000 EMEA ES calls. Redsys + PrestaShop dominance. Price-sensitive.
      topObjections: [
        "pricing/cost (high — Spain is more price-sensitive than France/Italy)'",
        "B2B capabilities'",
        "local payment method support — Redsys, Bizum, SEPA Direct Debit'",
        "PrestaShop feature parity at lower cost'",
        "Shopify Payments + local PSP coexistence'",
      ],
      dominantTalkTracks: [
        "Redsys is non-negotiable for Spanish merchants — confirm support before any payment discussion. Shopify Payments + Redsys coexistence is the standard setup.'",
        "PrestaShop is the incumbent in Spanish SMB and mid-market. Don't dismiss it. Acknowledge: \"PrestaShop is a solid choice for local markets. The question is what happens when you want to expand beyond Spain.\" Differentiate on TCO at scale and global infrastructure.'",
        "Bizum is growing rapidly for B2B payments in Spain — confirm support proactively.'",
        "TCO argument: Spanish buyers respond to specific numbers. Run the full cost comparison including agency, hosting, and integration maintenance.'",
        "B2B on Shopify: SEPA Direct Debit, payment terms, and company accounts are the key capabilities for Spanish B2B merchants.'",
      ],
      competitors: [
        "PrestaShop — #1 Spanish mid-market and SMB. Local, well-known. Don't dismiss.'",
        "Magento/Adobe Commerce — enterprise and larger mid-market'",
        "WooCommerce — SMB self-hosted'",
        "Salesforce Commerce Cloud — enterprise only'",
      ],
      merchantProofPoints: [
        // Spanish merchant proof points — use global references when local unavailable
        "Heinz: 6-week migration to Shopify D2C — use for migration timeline objections'",
        "Glossier: rebuilt ecommerce in 3 months after leaving custom stack'",
      ],
      regionalNuances: [
        "Redsys (local payment gateway): required for Spanish consumer checkout. Confirm support before any pricing discussion.'",
        "Bizum (mobile payment): growing rapidly for B2B and consumer. Confirm support.'",
        "SEPA Direct Debit: critical for B2B recurring payments. Confirm support.'",
        "Spain is more price-sensitive than France or Italy — TCO arguments must be specific and detailed, not general.'",
        "PrestaShop is a strong local incumbent — acknowledge it honestly before pivoting to global scale and TCO.'",
        "Shopify Payments + local PSP coexistence is a very common ask. Frame as \"best of breed\" — Shopify for commerce, local PSP for specific payment methods.'",
        "Spanish market: SMB is the highest volume; mid-market and enterprise deals are smaller in number but growing.'",
      ],
      perspectiveInsights: [
        "ES/Redsys: \"Confirm Redsys support in the first 5 minutes. Don't let it become a late-stage blocker. 'We support Redsys natively and Shopify Payments can coexist with your local PSP — do you want me to walk through how that's set up?'\"'",
        "ES/PrestaShop: \"When PrestaShop comes up — acknowledge it: 'PrestaShop works well for Spanish-market merchants. The question worth asking your team: five years from now, when you're selling to France, Germany, and the US, which platform gives you that without rebuilding?'\"'",
        "ES/TCO: \"Spanish buyers respond to specific numbers more than any other Southern European market. 'Let me run the 3-year total cost side by side — platform, agency, hosting, and integration maintenance. Want to do that now?'\"'",
      ],
    },

    'DACH': {
      topObjections: ['pricing/cost (62%)', 'lock-in / contract flexibility (33%)', 'B2B capabilities (41%)', 'local payment methods (Klarna DE, SEPA, PayPal DE)'],
      dominantTalkTracks: [
        "AI/agentic commerce — strong resonance, especially in Large/Enterprise; frame as competitive moat'",
        "B2B on Shopify: DACH has significant wholesale and trade commerce — lead with payment terms, custom catalogs, net terms'",
        "TCO + agency dependency reframe: \"most Shopify merchants reduce agency reliance within 12 months\" — resonates with German teams that have large in-house development appetite'",
        'Lock-in reframe: "Shopify\'s open ecosystem means your data and integrations are yours" — address proactively before the question',
      ],
      competitors: ['Magento/Adobe Commerce (#1 enterprise)', 'Shopware (#2, major local competitor)', 'WooCommerce (SMB)', 'SAP Commerce (enterprise)'],
      merchantProofPoints: [
        "Tennis Point: German sports retailer on Shopify — cautionary note: raised concerns about unexpected tax costs post-migration; address VAT/tax setup early in DACH deals'",
        "Cyberport: major German electronics retailer — use for large catalogue / high SKU count conversations'",
        "Boll & Kirch Filterbau: German B2B industrial manufacturer on Shopify B2B — use for complex B2B requirements in manufacturing/industrial'",
        "Engelhorn (fashion): large German omni-channel fashion retailer — use for German fashion/retail migration stories'",
      ],
      regionalNuances: [
        "German buyers are process-oriented and risk-averse — never minimise migration complexity, always validate their concern then show the path'",
        'Shopware is a strong local competitor: acknowledge it seriously, don\'t dismiss; differentiate on ecosystem scale, App Store depth, and AI/agentic roadmap',
        "Many DACH calls are conducted in German — rep should be aware coaching cards are always in English even when transcript is German'",
        "German enterprise: formal procurement process, longer paper process, InfoSec/data residency reviews are common — map paper process in first 2 calls'",
        "GDPR and German DSGVO compliance: Shopify has EU data residency options; do not overpromise — route complex data processing questions to DPA and legal'",
        "Austrian market: similar to Germany but smaller deals and faster decisions'",
        "Swiss market: multi-currency and multi-language are baseline requirements; Shopify Markets handles this — lead with it'",
        'Klarna integration in DACH is expected, not a differentiator — confirm it\'s available and move on',
      ],
      perspectiveInsights: [
        'DE is the one EMEA market where pricing and TCO arguments reliably close deals — data shows nearly 40% of DACH wins cite price as the primary reason, versus under 8% in France. If you haven\'t run a 3-year TCO model yet, that\'s the highest-priority next step for this deal.',
        'DE/Shopware: Don\'t dismiss Shopware — their reps are well-trained and they know the German mid-market. The right move: "Shopware is a solid choice for German mid-market. The question worth asking is: five years from now, when AI-native commerce is the standard, which platform do you want to be on? Their roadmap vs. ours is worth a direct comparison."',
        'DE: German buyers want a structured process, not a pitch. Lead with a clear agenda, provide written materials after the call, and give them time to review. Rushing a German buyer signals you don\'t understand how they make decisions.',
      ],
    },

    'Nordics': {
      topObjections: ['pricing/cost (78%)', 'local payment methods (37%)', 'lock-in / contract flexibility (30%)', 'Shopify Payments vs local PSPs'],
      dominantTalkTracks: [
        "AI/agentic commerce — Nordics buyers are tech-forward; Universal Commerce Protocol framing resonates well'",
        "Local payment method support: Klarna (Sweden/Germany), Vipps (Norway), MobilePay (Denmark/Finland) — confirm compatibility proactively, do not wait for the question'",
        "Sustainability / brand narrative: Nordic fashion brands care about brand coherence across channels — Hydrogen/headless pitch fits here for premium DTC brands'",
        "TCO reframe effective; Nordics buyers are analytically strong, so be prepared for detailed TCO questions'",
      ],
      competitors: ['Magento/Adobe Commerce (#1)', 'Centra (local Swedish competitor, fashion-focused)', 'WooCommerce (SMB)', 'Salesforce (enterprise)'],
      merchantProofPoints: [
        "Houdini Sportswear: Swedish sustainable outdoor brand — use for sustainability-conscious brand conversations (verify current platform before citing)'",
        'Stokke: Norwegian premium children\'s brand, global presence — use for international expansion and multi-market conversations (verify current platform before citing)',
        "Fiskars: Finnish heritage brand, global presence — use for large B2C/B2B mixed commerce conversations (verify current platform before citing)'",
        "Lego (DK): not a Shopify customer but well-known Nordics reference — competitor proof point for D2C digital commerce'",
      ],
      regionalNuances: [
        "Nordic buyers are direct, data-driven, and allergic to fluff — lead with data, keep pitches tight'",
        "Klarna is table stakes in Sweden; Vipps in Norway; MobilePay in Denmark/Finland — confirm payment method compatibility before any pricing discussion'",
        "Centra is a local Swedish competitor focused on fashion wholesale/D2C — acknowledge it if mentioned, differentiate on App Store breadth and AI roadmap'",
        'Swedish market: sustainability credentials matter for consumer-facing brands; Shopify\'s carbon offset shipping and sustainability reporting are relevant',
        "Norwegian market: VAT and cross-border to EU require Shopify Markets — lead with it for brands selling outside Norway'",
        "Finnish market: smaller, relationship-driven; fewer proof points available — lean on global brand stories and TCO data'",
        'Lock-in concerns in Nordics often come from tech teams who have heard about Shopify\'s App Store dependency — reframe as ecosystem vs. proprietary stack',
      ],
      perspectiveInsights: [
        "DK leads the Nordics with a 40% win rate — the highest of any high-volume EMEA market. Danish buyers are highly analytical; bring specific benchmarks (Shopify Checkout conversion uplift, BFCM infrastructure scale stats) rather than general claims.'",
        'Nordics/Centra: If Centra comes up, don\'t dismiss it — their fashion-specific workflow is genuinely good. The right angle: "Centra is built for fashion. The question is what you can build beyond fashion — B2B channels, AI, the full App Store ecosystem. Their platform is narrower by design."',
      ],
    },

    'BENELUX': {
      topObjections: ['payment processing / Adyen comparison (41%)', 'pricing/cost (77%)', 'lock-in / contract flexibility (35%)'],
      dominantTalkTracks: [
        "AI/agentic commerce — top talk track across all BENELUX calls'",
        "Shopify Payments + Adyen coexistence: \"best of breed\" framing — Shopify as the commerce OS, Adyen or Mollie for payments enterprise-side — resolves the either/or objection'",
        "iDEAL comparison is standard in Netherlands — confirm native iDEAL support proactively'",
        "TCO framing: BENELUX buyers are commercially sophisticated, especially in Netherlands; use detailed TCO breakdown'",
        "B2B capabilities: significant wholesale commerce in BENELUX; lead with payment terms, custom catalogs, and multi-storefront'",
      ],
      competitors: ['Magento/Adobe Commerce (#1)', 'WooCommerce (SMB)', 'Salesforce Commerce Cloud (enterprise)', 'Adyen (payment comparison, not a platform competitor)'],
      merchantProofPoints: [
        "Shoeby: Dutch fashion retailer on Shopify Plus — use for Dutch retail/omni-channel conversations'",
        "Matt Sleeps: Dutch D2C mattress brand, 3x cost reduction vs Medusa.js — use when prospect is evaluating open-source/headless alternatives (\"we could build it ourselves\")'",
        "EQOM Group: Belgian multi-brand sports group on Shopify — use for multi-brand, multi-country conversations in BENELUX'",
        "Coolblue (subsidiary on Shopify): Dutch electronics — use for large-catalogue, high-volume retail conversations'",
        "Miele (NL): appliance brand D2C pilot — use for traditional enterprise brands exploring D2C'",
      ],
      regionalNuances: [
        'Netherlands: Adyen is headquartered in Amsterdam — "Adyen vs Shopify Payments" is the most common payment objection; use best-of-breed framing, don\'t force an either/or choice',
        "Netherlands: iDEAL is required for Dutch consumers; confirm native support early'",
        "Belgium: French and Dutch-speaking market segments; language of the call matters for follow-up materials'",
        "Luxembourg: financial services/fintech concentration; GDPR and data sovereignty are front-of-mind'",
        'BENELUX enterprise buyers are sophisticated — overly transactional reps lose credibility quickly; be peer-level',
        "Mollie is a popular PSP in BENELUX for SMB/mid-market — Shopify Payments + Mollie coexistence is a common ask; confirm and move on'",
        "Lock-in concerns often relate to App Store dependency — reframe as ecosystem vs. maintaining custom integrations'",
      ],
      perspectiveInsights: [
        'NL: Netherlands merchants often already use Adyen. Don\'t fight it — use "best of breed" framing: Shopify for commerce + Adyen for payments can coexist. Matt Sleeps cited 3x cost reduction vs Medusa.js when they moved to Shopify — the commerce platform cost is separable from the payments processor.',
        'NL: iDEAL support must be confirmed early for Dutch merchants — it\'s table stakes, not a differentiator. Confirm it proactively before they ask.',
      ],
    },

    'Rest of EMEA': {
      topObjections: ['payment processing localisation (44%)', 'lock-in / contract flexibility (37%)', 'B2B capabilities (50%)', 'GDPR / compliance (highest in EMEA at ~20% of calls)'],
      dominantTalkTracks: [
        "AI/agentic commerce — dominant across all segments'",
        "B2B on Shopify: most impactful in CEE (Poland, Czech), Middle East, and South Africa — wholesale/trade commerce is major use case'",
        "GDPR and NIS2 compliance: address proactively for Poland, CEE, and any public-sector adjacent deals'",
        "Shopify Markets for multi-currency and cross-border: strong differentiator for regional hub merchants (e.g. South Africa → Africa)'",
        "Local payment method support varies significantly — confirm early and escalate to solutions engineering if needed'",
      ],
      competitors: ['Magento/Adobe Commerce (#1)', 'WooCommerce (Poland/CEE SMB)', 'Salesforce (MEA enterprise)', 'PrestaShop (Poland, CEE)', 'Local/custom builds (common in MEA)'],
      merchantProofPoints: [
        "Pupil Foods (Poland): raised GDPR/NIS2 compliance as a requirement — escalated to legal/DPA process; use as proof that Shopify takes compliance seriously and has a defined path'",
        "Core Group South Africa: multi-brand sports/outdoor retailer — use for African market multi-brand / regional expansion conversations'",
        "Stokke (Norway → global): expanding Shopify footprint into MEA via Markets — use for cross-border expansion from Nordics/Europe into MEA'",
        "NESPRESSO (global, multiple EMEA markets): use for multi-country, multi-currency, D2C + B2B mixed model conversations'",
      ],
      regionalNuances: [
        "Poland and CEE: GDPR compliance is highly salient; NIS2 directive adds complexity for any platform touching critical infrastructure — do NOT promise compliance outcomes; route to DPA and legal'",
        "Middle East: VAT was introduced in KSA/UAE in 2017-2018; Shopify handles local tax natively — confirm this proactively'",
        "South Africa: Rand currency and cross-border payment friction are real; Shopify Markets + local PSP (PayFast, Peach Payments) is the answer'",
        "Turkey: currency volatility is a real concern; multi-currency and FX handling via Shopify Markets matters'",
        "Israel: tech-savvy buyers, fast decisions, but security/data residency questions are common'",
        'Rest of EMEA has higher variance — ask which country the prospect is based in early and adjust accordingly',
        "For GCC/Middle East enterprise: decision cycles are longer, relationship-driven; champion development is critical'",
      ],
      perspectiveInsights: [
        'Rest of EMEA has higher variance than any other region — ask which specific country the prospect is based in early; adjust payment method, compliance, and language expectations accordingly before going deep on features.',
        'Poland/CEE: GDPR and NIS2 are real concerns, not box-ticking. Acknowledge them directly: "Shopify has a defined DPA process and we\'ve been through this with other Polish merchants — let me get our compliance team on a call to walk through it specifically."',
        'GCC/MEA: Relationship and credibility come before product. If you don\'t have a local reference, use a global enterprise reference and lead with the champion relationship — don\'t pitch the product before trust is established.',
      ],
    },
  },

  // ── BY SEGMENT ──────────────────────────────────────────────────────────────

  bySegment: {

    'SDR': {
      topObjections: [
        '"I\'m not the right person" (most common — get the right name before hanging up)',
        '"We\'re happy with what we have" (status quo bias)',
        "\"Send me some info / email me\" (polite deflection)'",
        '"We don\'t have budget right now"',
        '"We\'re locked in a contract"',
        "\"We already evaluated Shopify\"'",
      ],
      dominantTalkTracks: [
        "Challenger opener: lead with a provocative insight about their vertical or size BEFORE asking any questions — earn the right to qualify'",
        'Permission-based close: "If what I\'m seeing is true for you, would it be worth 30 minutes to find out?" — lower friction than asking for a meeting directly',
        'Compelling event hunt: "What\'s driving your roadmap right now?" / "Is there a replatform conversation happening, or is this more future-state?"',
        "Social proof opener: name a similar merchant who made the switch — \"We just helped [similar brand] go live in 6 weeks after 3 years on Magento\"'",
        'Not-the-right-person recovery: "Totally understand — who on your team owns the ecommerce platform decision? Even just a name helps me not waste your colleagues\' time."',
        '"Send me info" reframe: "What would need to be true for this to be worth 30 minutes of your time? I\'d rather tailor something than send a generic deck."',
      ],
      coachingNuances: [
        "GOAL IS A BOOKED MEETING, not a full discovery — JARVIS should not push for complete MEDDPICC; get Pain + Decision Maker + a specific next step'",
        "MEDDPICC for SDR stage: qualify only Identified Pain (is there a real problem?) and basic Decision Process (who owns this?) — skip metrics, paper process, champion depth'",
        'COMMIT is the #1 card — every SDR call must end with a specific next step, a named attendee, and a date/time; "I\'ll follow up" is a failure',
        "Rep should give an insight or provocative statement within the first 30 seconds — if they lead with \"just checking in\" or \"I wanted to introduce myself\", fire a COACH card immediately'",
        "Calls are short (5–20 min) — JARVIS should not fire ASK cards for deep MEDDPICC elements; focus on pain and urgency only'",
        'If prospect says "not the right person" and rep doesn\'t ask for the right person\'s name — fire a COACH card',
        "Avoid feature dumps — SDR calls are about pain identification, not product demos; if rep is listing features, fire a COACH card'",
        "Urgency signals matter more than qualification depth at this stage — a replatform timeline, a recent BFCM failure, or a growth target are all green lights'",
        'Champion test at SDR stage: "If the meeting goes well and we identify a fit — is this a decision you\'d make, or would others need to be involved?"',
      ],
    },

    'SMB': {
      topObjections: ['pricing/cost (81%)', 'payment processing rates (39%)', 'feature gaps vs current platform'],
      dominantTalkTracks: [
        'Q1 promotional framing: free trial extensions and first-month incentives close SMB deals — ask if there\'s a current promotional offer to anchor urgency',
        "Quick time-to-value: \"you could be live in days, not months\" — SMB buyers are time-constrained'",
        'App Store as superpower: "you don\'t need to build it, it\'s already in the App Store" — counter to "our current platform has X built in"',
        "Payment simplicity: Shopify Payments as one less vendor to manage — not primarily a rate conversation at SMB scale'",
      ],
      coachingNuances: [
        'SMB calls tend to be shorter — get to pain quickly, don\'t over-qualify',
        "Decision-maker is often in the room; close faster than mid-market or enterprise'",
        "MEDDPICC is lighter at SMB — focus on identified pain, decision process, and competition'",
        "Avoid feature dumps — SMB buyers are overwhelmed by options; lead with one specific pain solution'",
      ],
    },

    'Mid-Mkt': {
      topObjections: ['B2B capabilities (45%)', 'migration complexity and risk (37%)', 'pricing/cost (55%)', 'integration with existing ERP/WMS (25%)'],
      dominantTalkTracks: [
        "TCO framing: most effective opener — \"licence fee is 20-30% of total cost, where do you want to spend the rest?\"'",
        "Shopify Markets as differentiator: international expansion without a new platform — strong for mid-market brands growing cross-border'",
        "Migration risk reframe: \"platform debt compounds; staying is not risk-free either\" — pair with migration timeline stats (3x more likely on budget)'",
        "B2B on Shopify: for brands with wholesale/trade channels, this is the key differentiator vs Magento and WooCommerce'",
      ],
      coachingNuances: [
        "Mid-market deals have 2-4 stakeholders — map all of them early; champion development is critical'",
        "IT/CTO is often a veto stakeholder — get a technical champion alongside the business champion'",
        "Integration questions (ERP, PIM, WMS) are common — confirm with solutions engineering before promising specific connector behavior'",
        "Budget is often pre-allocated to existing platform renewals — create urgency around platform debt before budget season'",
      ],
    },

    'Large': {
      topObjections: ['migration risk and timeline (40%)', 'Adyen/payment processor comparison (30%)', 'support SLAs (25%)', 'B2B capabilities (35%)', 'contract flexibility (28%)'],
      dominantTalkTracks: [
        "Enterprise migration narrative: \"migration risk is real, but platform debt compounds\" — acknowledge risk fully, then show the managed path'",
        "Adyen/PSP coexistence: \"Shopify as commerce OS, Adyen for enterprise payments\" — best-of-breed framing for large merchants'",
        "Support SLA conversation: 24/7 priority support + dedicated Merchant Success Manager — make this concrete and personal'",
        'AI/agentic commerce as competitive moat: frame Universal Commerce Protocol as a distribution advantage competitors can\'t match',
        "Shopify Plus ROI: use TCO study data + conversion stats for business case building; large merchants have internal finance stakeholders who need numbers'",
      ],
      coachingNuances: [
        'Large deals involve 5-8+ stakeholders — MEDDPICC discipline is critical; don\'t close without Economic Buyer engagement',
        "InfoSec and data privacy reviews are standard — get these started early; delays here are deal killers'",
        "Champion must have access to CFO or CPO — test their access early (\"would you be comfortable presenting the business case to your CFO?\")'",
        "Pilot/POC stage is common — agree a clear success criteria and timeline before the pilot starts'",
        "Paper process is complex: procurement, legal, InfoSec — identify the owner on their side early and manage proactively'",
      ],
    },

    'Enterprise': {
      topObjections: ['B2B capabilities (38%)', 'contract / MSA complexity (31%)', 'trust and platform maturity (28%)', 'data residency / compliance (22%)', 'support model for global operations'],
      dominantTalkTracks: [
        "Shopify as enterprise-grade platform: Gartner MQ Leader 3 years, IDC/Forrester Leader — use analyst recognition to build credibility with C-suite'",
        'Commerce Components by Shopify: for enterprises that don\'t want full migration — modular adoption path (Checkout, Payments, POS as standalone) reduces risk perception',
        "Universal Commerce Protocol + AI roadmap: enterprise buyers care about competitive positioning 3-5 years out; frame agentic commerce as the next moat'",
        "Reference-ability: Gymshark, Allbirds, Staples Canada — pick the most relevant proof point for their industry'",
        'MSA process: acknowledge it\'s complex, commit to routing through commercial team immediately — don\'t negotiate terms on the call',
      ],
      coachingNuances: [
        "Enterprise sales cycles are 6-18 months — champion development and Economic Buyer engagement are the primary levers'",
        "Champion must reach CEO/CFO; without exec sponsorship, enterprise deals stall in IT or procurement'",
        "Legal/MSA review adds significant time — flag this early, get internal commercial/legal engaged within first 30 days'",
        'Data residency is a real requirement for some enterprises (EU data stays in EU) — don\'t promise; route to DPA and solutions engineering',
        'ESCALATE is the right mode for most compliance/contract questions in enterprise — rep must commit to a specific follow-up owner and timeline, not "I\'ll look into it"',
        "Trust/maturity objection (\"is Shopify really ready for our scale?\") — respond with analyst recognition + BFCM infrastructure stats + reference customers at similar scale'",
      ],
    },
  },
};

// ─── AMER Coaching Context ────────────────────────────────────────────────────
// Source: BigQuery analysis of 130,810 AMER calls (Jan–Apr 2026)
// shopify-dw.sales.sales_calls × raw_salesforce_banff.opportunity
// Internal territory subregions: All (SMB/cross-sell), Lifestyle (D2C fashion/home),
// DI (Distribution/Industrial), Consumer (CPG), FAB (Food & Bev), MFG (Manufacturing)

