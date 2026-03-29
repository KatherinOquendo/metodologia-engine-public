# Workflow: Standard B2B Proposal

## Trigger conditions
- Clear B2B request (company/team context detected)
- Catalog service identified (service_slug matched)
- Confidence ≥ 40% on critical fields

## Time estimate
8–12 minutes end-to-end

## Steps

### Step 1: Discovery (silent)
- Load catalog/services.yaml + catalog/conditions.yaml
- Load transversal docs from repo if available (00-inventario-maestro.md, 00-glosario-catalogo.md)
- Identify the canonical service file for the matched slug
- Check [POR CONFIRMAR] items relevant to this service

### Step 2: Diagnosis (≤ 3 questions)
Ask ONLY if critical info is missing. Priority order:
1. Participant count (if not mentioned) → "How many people will participate?"
2. Timeline (if not mentioned) → "When would you like to start?"
3. Specific context (if industry/problem unclear) → "What's the main challenge your team faces?"

If all critical fields have confidence ≥ 60%, skip questions entirely.

### Step 3: Service selection & pricing
- Pull pricing from catalog: `node scripts/catalog-query.js --price [slug] b2b_cop`
- Validate pricing status (CONFIRMED vs POR CONFIRMAR)
- Calculate per-participant price if multi-cohort
- Apply credit chains if relevant: `node scripts/catalog-query.js --credit-from [prev] --credit-to [current]`

### Step 4: Minto draft
Structure per references/voice-content.md:
- **Conclusion**: One sentence naming the client's pain + our solution
- **Support 1 (P1)**: Gap + method — what they lack and how we fill it
- **Support 2 (P2)**: Design + trade-offs — why this approach over alternatives
- **Support 3 (P3)**: Assets + reusability — what they keep after the engagement
- **Evidence**: Specific numbers, not generic claims
- **CTA**: One action verb + specific object + this week

Tone: 3rd person formal (B2B ejecutiva) per references/voice-content.md.
Max sentence length: 25 words (ejecutiva) / 20 words (comercial).
Draft bilingual content (ES + EN).

### Step 5: Verification gate
Run: `node scripts/verify-legal.js --content "[full draft]" --canonical-price [price] --brand-mode [mode] --json`

If status = BLOCKED:
- Auto-fix what's possible (red list words → safe alternatives, guarantee → exact clause)
- Re-run verification
- If still BLOCKED → present blockers to user and ask for resolution

If status = APPROVED or APPROVED_WITH_WARNINGS:
- Document warnings in verification report
- Proceed to generation

### Step 6: Generation
Run scripts/generate-all.js with complete ProposalData JSON.
Output: 10 files (HTML·DOCX·XLSX·PPTX·MD × ES+EN) + verification report.
Resolve brand using scripts/brand-resolver.js (default: own).

### Step 7: Delivery
Present to user:
1. Summary: "Proposal for [Company] — [Service] — [Price]"
2. Verification status (APPROVED / warnings)
3. File list with paths
4. Any assumptions made (flagged clearly)
5. One-line invitation: "Want to adjust anything before sending?"

## Error handling
- Missing package → skip format, warn, continue with available formats
- Price mismatch between draft and catalog → BLOCK, re-verify
- [POR CONFIRMAR] service → add conditional language, proceed with disclaimer

## Exit conditions
- All files generated and presented to user
- OR user explicitly cancels
