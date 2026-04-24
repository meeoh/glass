export const AMER_COACHING_CONTEXT = {

  bySubregion: {
    'AMER': {
      // 130,810 calls, 73,533 transcribed. 99.9% English.
      // Win rates: SMB 39.3% | Mid-Mkt 35.4% | Large 32.5% | Enterprise 15.3%
      // Best win rates: Lifestyle/Enterprise 41% | DI/Large D2C 41%
      topObjections: [
        "pricing/cost (27-43% of calls — highest SMB 43%, Consumer/Large 45%)'",
        "POS/retail unification (40-65% of ALL AMER calls mention retail/POS — unified commerce is the dominant AMER theme)'",
        "migration risk (15-30% — highest in Lifestyle/Large at 30%)'",
        "B2B capabilities (12-64% depending on segment — DI/MFG near 64%)'",
        "headless/composable architecture (1-17% — highest Consumer D2C Enterprise 17%, FAB Enterprise 10%)'",
        "Salesforce Commerce Cloud (2-7% — concentrated in Enterprise and Lifestyle)'",
        "payment rates (10-20% of calls)'",
      ],
      dominantTalkTracks: [
        "Unified commerce is the #1 AMER story: POS/retail mentioned in 40-65% of ALL calls regardless of segment. Lead with one inventory, one customer record, one analytics dashboard.'",
        "NetSuite integration: NetSuite is the dominant ERP in AMER. Shopify has a native connector — position as commerce layer alongside NetSuite for fulfillment + accounting. Ask about it on every AMER call.'",
        "TCO reframe: platform fee is 20-30% of total commerce cost. Engineering overhead, agency fees, integration maintenance are the bigger numbers.'",
        "Speed of experimentation: AMER D2C brands obsess over velocity. \"How long from idea to live A/B test? Shopify merchants: hours. Most platforms: weeks.\"'",
        "BFCM as proof: $11.5B+ BFCM 2025 weekend, 489M req/min, <50ms response. US merchants feel peak season existentially.'",
        "Checkout conversion: 250M+ Shop Pay users, 12% of US ecommerce on Shopify Checkout, 15% better conversion average.'",
        "B2B native: DI and MFG subregions are B2B-heavy. Company accounts, payment terms, custom catalogs — B2B and D2C on the same store, no middleware.'",
        "AI/agentic commerce: Universal Commerce Protocol with Google — products discoverable on ChatGPT, Google Shopping, Copilot. AMER enterprise is actively planning for this.'",
      ],
      competitors: [

        "Magento/Adobe Commerce (975 mentions) — self-hosted = engineering overhead. TCO 42% higher platform costs.'",
        "WooCommerce (834 mentions) — SMB-heavy. Self-hosted fragility. \"Works until something breaks at 11pm on BFCM.\"'",
        "BigCommerce (547 mentions) — \"feature parity at lower price\" claim. TCO inverts: implementation 88% higher, operations 32% higher.'",
        "Salesforce Commerce Cloud (141 mentions — Enterprise/Lifestyle) — checkout 36% better, implementation 16% lower TCO.'",
        "Squarespace/Wix (228 combined) — SMB. Gap: checkout conversion, B2B, POS unification.'",
        "commercetools (small but growing Enterprise D2C) — \"composable at every layer but managed — your team ships features, not patches.\"'",
      ],
      merchantProofPoints: [
        "Gymshark: 40,000+ orders/min during BFCM. Use for scale objections.'",
        "SKIMS: 10M site visits in first hour of a drop, zero downtime. Use for high-volume fashion brands.'",
        "Allbirds: D2C, wholesale, retail, international on one Plus account. Use for omni-channel.'",
        "Glossier: rebuilt ecommerce on Shopify in under 3 months after leaving custom stack. Use for migration timeline.'",
        "Heinz: launched full D2C in 6 weeks. Use when they say migration takes 12-18 months.'",
        "Staples Canada: D2C + B2B wholesale on same Shopify account. Use for B2B + D2C model.'",
        "Figs: healthcare D2C, scaled through IPO on Shopify Plus. Use for \"is Shopify serious enough for a public company?\"'",
        "Mattel: global toy company D2C on Shopify. Enterprise credibility for traditional brands.'",
        "ButcherBox: complex bundle-within-bundle subscription on Shopify Flow at scale. Use for DI/FAB subscription + complex ops.'",
        "Floor & Decor: Shop Pay integrated into SFCC checkout — use when prospect is on SFCC but not ready to migrate.'",
        "Supreme: drops and limited releases. Use for drop culture / high-concurrency D2C.'",
      ],
      regionalNuances: [
        'AMER calls: 99.9% English (130,810 calls). French/Spanish <15 calls combined.',
        "POS/retail is the dominant theme: probe every call — \"Do you have physical locations or pop-ups? How does in-store inventory connect to your online store?\"'",
        "NetSuite: ask proactively — \"What ERP are you running and how does your commerce platform talk to it today?\" It is almost always co-existing, not competing.'",
        "US buyers: direct and results-oriented. Lead with outcomes and numbers.'",
        "US enterprise procurement: InfoSec, SOC 2, legal/MSA review are standard. Map paper process in first 2 calls.'",
        'Lifestyle subregion (fashion, home, lifestyle): Enterprise win rate 41%. Challenger openers on speed of experimentation and AI commerce land best.',
        "DI subregion (Distribution/Industrial): B2B-heavy. Enterprise B2B win rate 28%. Lead with company accounts, payment terms, NetSuite integration.'",
        "MFG subregion (Manufacturing): longest average call times, B2B in 35-40% of calls. SAP/ERP integration is the critical question.'",
        "Canada: mirrors US but smaller deal sizes, faster decisions. Shopify is Canadian — use the brand affinity angle.'",
        "US Shopify Tax handles state sales tax (nexus rules) natively — confirm proactively.'",
        "SOC 2 Type II and ISO 27001: US enterprise procurement asks on every deal.'",
      ],
      perspectiveInsights: [
        'AMER/POS: "POS comes up in 60% of AMER calls. Ask now: \'Do you have stores, pop-ups, or events? How does your in-store inventory connect to your online store today?\' The MID consolidation story — one bank account, one payout — closes deals."',
        'AMER/NetSuite: "NetSuite is mentioned more than any commerce platform in AMER. Lean in: \'What ERP are you on? NetSuite? We have a native connector. Shopify handles commerce, NetSuite handles the back office. What does your current integration cost to maintain annually?\'"',
        'AMER/Composable: "The composable/MACH narrative is strong in enterprise. Don\'t fight it: \'Shopify is composable at every layer — Hydrogen for headless, APIs for everything, Functions for custom logic. The difference is we manage the infrastructure so your team ships features, not patches.\'"',
        'AMER/Lifestyle D2C: "\'How long does it take your team from idea to live A/B test? Shopify merchants do it in hours. 50 experiments per year vs 5 — what\'s the value of 45 more experiments going into BFCM?\'"',
        'AMER/DI B2B: "For Distribution/Industrial accounts, lead with B2B not MEDDPICC. \'What are your net terms requirements? How do B2B customers access your catalog today? Shopify B2B is native, not a plugin.\'"',
        'AMER/SFCC: "Don\'t lead with \'we\'re better than Salesforce.\' Lead with: \'What does your annual Salesforce commerce budget look like — platform, agency, integration combined?\' That total number usually reframes the whole conversation.",',
      ],
    },
  },

  bySegment: {
    // AMER uses the same global segment coaching from EMEA_COACHING_CONTEXT.bySegment
  },
};

// ─── APAC Coaching Context ────────────────────────────────────────────────────
// Source: BigQuery analysis of APAC calls (Jan–Apr 2026)
// shopify-dw.sales.sales_calls × raw_salesforce_banff.opportunity
// Subregions: ANZ, GCR (Greater China Region), JPN, ROA (Rest of Asia/SEA), IND

