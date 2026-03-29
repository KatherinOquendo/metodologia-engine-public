# Data Contracts — Agent-to-Agent Handoff Schemas
# Load when: building, testing, or debugging any inter-agent data flow.
# Authoritative for: field names, required vs optional, type constraints.

## Purpose

This file documents the exact JSON schemas that flow between agents in the proposal pipeline. Without this contract, agents may invent field names that others don't recognize — causing silent failures or wrong behavior. Every field listed here is verified against `references/schemas.md` (the ProposalData source of truth).

**Convention:** `[REQUIRED]` = must be present (non-null) for the receiving agent to function. `[OPTIONAL]` = agent handles gracefully when absent.

---

## Contract 1: proposal-conductor → input-interpreter

**Trigger:** Layer 1.5 — raw user input received.

```json
{
  "raw_input": "[string — user's exact text, unmodified]"  // [REQUIRED]
}
```

No other fields. Conductor does not pre-process or clean input before passing.

---

## Contract 2: input-interpreter → proposal-conductor

**Trigger:** After normalization complete.

```json
{
  "id": "PRO-2026-001",                    // [REQUIRED] format: PRO-YYYY-NNN
  "date": "2026-03-29",                    // [REQUIRED] format: YYYY-MM-DD
  "valid_days": 30,                        // [REQUIRED] integer
  "client": {
    "name": "[string or [CLIENT NAME]]",   // [REQUIRED]
    "company": "[string or [CLIENT COMPANY]]", // [REQUIRED]
    "role": "[string or [ASSUMED: decision-maker]]", // [REQUIRED]
    "industry": "[string or [INDUSTRY]]"  // [REQUIRED]
  },
  "service_slug": "bootcamp-trabajar-amplificado", // [OPTIONAL] null if unknown
  "segment": "b2b",                        // [REQUIRED] b2b|b2c|cobrand|whitelabel
  "mode": "STANDARD",                      // [REQUIRED] STANDARD|INNOVATION|CATALOG_EDIT
  "confidence": {
    "overall": 73,                         // [REQUIRED] integer 0-100
    "recovery_path": "proceed_with_flags", // [REQUIRED] one of 5 valid values
    "critical_fields": {
      "problem": 0.8,                      // [REQUIRED] float 0.0-1.0
      "segment": 0.6                       // [REQUIRED] float 0.0-1.0
    }
  },
  "assumptions": [                         // [REQUIRED] empty array if none
    { "field": "company_name", "value": "[CLIENT COMPANY]", "reason": "not mentioned in input" }
  ],
  "suggested_question": "Who is this for?", // [OPTIONAL] null if not needed
  "contradiction_detected": false           // [REQUIRED] boolean
}
```

**Validation:** `segment` must never be null. `confidence.overall` must be a number. `mode` must be exactly one of the 3 valid strings.

---

## Contract 3: proposal-conductor → service-selector

**Trigger:** Layer 2 — after normalization.

Full ProposalData from Contract 2, unchanged. service-selector reads whatever input-interpreter returned.

---

## Contract 4: service-selector → proposal-conductor

**Trigger:** After catalog match, segment, audience, brand resolved.

ProposalData enriched with these fields added/updated:

```json
{
  "service_slug": "bootcamp-trabajar-amplificado", // [REQUIRED] valid slug or null with mode=INNOVATION
  "segment": "b2b",                        // [REQUIRED] — may differ from input-interpreter's value
  "audience_version": "commercial-b2b",    // [REQUIRED] one of 6 valid values
  "brand": {
    "mode": "own",                         // [REQUIRED] own|cobrand|whitelabel
    "colors": {
      "primary": "#0A1628",                // [REQUIRED]
      "accent": "#C9A84C",                 // [REQUIRED]
      "secondary": "#1A3A5C",             // [REQUIRED]
      "dark": "#060F1A",                   // [REQUIRED]
      "gray": "#8899AA",                   // [REQUIRED]
      "white": "#FFFFFF",                  // [REQUIRED]
      "light": "#F4F6F9"                   // [REQUIRED]
    },
    "fonts": {
      "display": "Poppins, sans-serif",    // [REQUIRED]
      "body": "Trebuchet MS, sans-serif",  // [REQUIRED]
      "note": "Arial, sans-serif"          // [REQUIRED]
    },
    "logo": {
      "primary_svg": "[inline SVG string]", // [REQUIRED]
      "primary_name": "MetodologIA"         // [REQUIRED]
    },
    "show_metodologia": true,              // [REQUIRED] false in whitelabel
    "show_partner": false,                 // [REQUIRED] true in cobrand + whitelabel
    "partner": null                        // [OPTIONAL] required if cobrand/whitelabel
  },
  "mode": "STANDARD",                      // [REQUIRED] — may change to INNOVATION
  "services": [                            // [REQUIRED] min 1 entry
    {
      "name": "Bootcamp Trabajar Amplificado", // [REQUIRED]
      "description": "...",               // [REQUIRED]
      "price": 12000000,                   // [REQUIRED] in COP, integer
      "is_standard": true                  // [REQUIRED] false = Innovation Mode pricing
    }
  ],
  "currency": "COP",                       // [REQUIRED]
  "payment_terms": "50% signing, 50% delivery", // [REQUIRED]
  "match_confidence": 82,                  // [REQUIRED] integer 0-100
  "match_flags": []                        // [REQUIRED] empty array if none
}
```

---

## Contract 5: proposal-conductor → proposal-writer

Full enriched ProposalData from Contract 4. No additional fields.

---

## Contract 6: proposal-writer → proposal-conductor

ProposalData with `i18n` populated:

```json
{
  "i18n": {
    "es": {
      "title": "Propuesta Comercial — [Nombre] para [Empresa]", // [REQUIRED]
      "hook": "[1-2 sentences naming client's pain]",           // [REQUIRED]
      "problem": "[multi-paragraph gap analysis]",              // [REQUIRED]
      "solution": "[Minto conclusion — decisory recommendation]", // [REQUIRED]
      "scope": ["[deliverable 1]", "[deliverable 2]"],          // [REQUIRED] min 1 item
      "exclusions": "[what this is NOT]",                       // [REQUIRED] or "[pending]"
      "plan": [
        { "name": "Fase 1", "duration": "3 días", "milestone": "[verifiable outcome]" }
      ],                                                         // [REQUIRED] min 1 phase
      "why": ["[differentiator 1]", "[differentiator 2]"],     // [REQUIRED] min 2 items
      "cta_text": "[verb + object + context]"                   // [REQUIRED]
    },
    "en": { /* same structure as es */ }                        // [REQUIRED]
  }
}
```

**Validation:** Both `i18n.es` and `i18n.en` must be fully populated. No field can be null or empty string.

---

## Contract 7: proposal-conductor → legal-guardian

Full ProposalData after merging Contracts 4 + 6 (service selection + i18n content).

---

## Contract 8: legal-guardian → proposal-conductor

```json
{
  "status": "APPROVED",                    // [REQUIRED] APPROVED|APPROVED_WITH_WARNINGS|BLOCKED
  "blockers_found": [],                    // [REQUIRED] array of BlockerItem (may be empty)
  "blockers_fixed": [],                    // [REQUIRED] array of BlockerItem (may be empty)
  "warnings_active": [],                   // [REQUIRED] array of WarningItem (may be empty)
  "brand_mode": "own",                     // [REQUIRED]
  "partner_brand_applied": null,           // [OPTIONAL]
  "language": "both",                      // [REQUIRED] en|es|both
  "canonical_reference": "bootcamp-ta v1.0 2026-03-29", // [OPTIONAL]
  "mode": "STANDARD",                      // [REQUIRED]
  "date": "2026-03-29",                    // [REQUIRED]
  "route_to_innovation": false,            // [REQUIRED] boolean — true when L6 fires
  "l6_out_of_scope_item": null             // [OPTIONAL] string if route_to_innovation=true
}
```

**Critical rule:** If `status = "BLOCKED"`, proposal-conductor MUST NOT call format-producer. Period.

---

## Contract 9: proposal-conductor → format-producer

Full ProposalData + VerificationReport:

```json
{
  "proposal_data": { /* full ProposalData */ },  // [REQUIRED]
  "verification_report": { /* VerificationReport from Contract 8 */ }, // [REQUIRED]
  "output_dir": "outputs/"                       // [OPTIONAL] defaults to outputs/ or /mnt/user-data/uploads/outputs/
}
```

**Precondition enforced by format-producer:** `verification_report.status` must be "APPROVED" or "APPROVED_WITH_WARNINGS". If "BLOCKED": format-producer refuses and returns error.

---

## Contract 10: format-producer → proposal-conductor

```json
{
  "output_dir": "outputs/",               // [REQUIRED]
  "generated": ["file1.html", "..."],     // [REQUIRED] list of relative filenames
  "skipped": [                            // [REQUIRED] empty array if none
    { "file": "file.docx", "reason": "npm 'docx' not installed — run: npm install docx" }
  ],
  "errors": [],                           // [REQUIRED] empty array if none; non-empty = partial failure
  "total_generated": 5,                  // [REQUIRED] integer
  "total_skipped": 5                     // [REQUIRED] integer
}
```

**Minimum acceptable output:** `total_generated >= 3` (2 MD files + 1 verification report). If `total_generated < 3`: conductor treats this as a generation failure, not a graceful degradation.

---

## Schema version history

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-03-29 | Initial contracts documentation — derived from SKILL.md + schemas.md |
