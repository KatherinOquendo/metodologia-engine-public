# MetodologIA Proposal Engine — Changelog

## v4.0 — 2026-03-29

**What this resolves:**
- v3 had IAC-specific logic scattered across files; now brand_mode handles it uniformly
- v3 had no machine-readable catalog; scripts depended on .md parsing
- v3 legal check was a reference doc; now it's an executable script (verify-legal.js)
- v3 had no catalog edit capability; now CATALOG EDIT MODE + catalog-manager agent
- v3 generated all formats in one monolithic script; now composable agents
- v3 had no service composition tool; now service-composer.js

**Added:**
- `catalog/services.yaml` — machine-readable SSOT for all 17 services
- `catalog/conditions.yaml` — hot-swappable prices, credits, policies
- `catalog/segments.yaml` — audience rules and branding matrix
- `scripts/brand-resolver.js` — runtime branding: own | cobrand | whitelabel
- `scripts/verify-legal.js` — automated L1–L10 + W1–W7 verification
- `scripts/catalog-query.js` — programmatic catalog queries
- `scripts/i18n.js` — language detection, substitutions, formatting
- `scripts/service-composer.js` — Innovation Mode service composition
- `agents/legal-reviewer.md` — dedicated legal review subagent
- `agents/catalog-manager.md` — catalog CRUD + cascade protocol
- `agents/format-generator.md` — format generation subagent (parallelizable)
- `hooks/on-catalog-update.md` — cascade protocol on catalog change
- `hooks/pre-generate.md` — pre-generation checks
- `hooks/post-generate.md` — post-generation QA
- `evals/evals.json` — 10 test cases covering all modes
- `references/schemas.md` — data schemas for interoperability
- `CHANGELOG.md` (this file)

**Changed:**
- SKILL.md redesigned as a 5-layer orchestrator (discover → design → verify → generate → deliver)
- Brand system now in `references/brand-system.md` with full per-format specs
- Legal guardrails now executable (verify-legal.js) + reference doc
- Voice/Minto in `references/voice-content.md` (leaner, no duplication)
- Service innovation in `references/service-innovation.md` (3 types, clear decision tree)

**Removed:**
- IAC-specific code paths — brand_mode handles this uniformly
- Duplicated pricing tables — catalog/conditions.yaml is now SSOT
- Embedded font/color tokens in SKILL.md — now in brand-system.md + brand-resolver.js
- Redundant "rules" sections that duplicated catalog content

**Decisions:**
- [DECISION 2026-03-29, JM]: catalog/ YAML is preferred over .md scanning; canonical .md still wins on conflict.
- [DECISION 2026-03-29, JM]: whitelabel mode makes MetodologIA completely invisible, no exceptions. IAC channel uses this mode.
- [DECISION 2026-03-29, JM]: cobrand overrides only --gold token; design system never changes.
- [DECISION 2026-03-29, JM]: verify-legal.js runs before any file generation, not after.

**Known open items (carry-forward from v3):**
- PC-01: Bootcamp → EstrategIA/Programs credit chain (JM, 2026-04-15)
- PC-05: Unified USD rate (JM, 2026-04-15)
- PC-13: B2B SKU for Programa Empoderamiento (JM, 2026-Q2)
- Tier 2 and Tier 3 canonical .md files still pending

---

## v3.0 — 2026-03-29
Initial multi-format bilingual engine with legal guardrails.
See prior conversation for details. Superseded by v4.0.
