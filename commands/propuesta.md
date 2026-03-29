---
description: "Generate a complete bilingual (ES+EN) commercial proposal for any MetodologIA service. Runs the full 5-layer pipeline: normalize input → match service → write Minto Complete content → verify legal compliance → produce 10 output files (HTML, DOCX, PPTX, XLSX, MD × ES+EN + verification report). Use whenever a user wants to create a proposal, quote, pitch deck, commercial offer, or scope document for a client — even if they just say 'I have a meeting with this client' or paste a rough brief. Use: /propuesta [client description]"
user-invocable: true
---

# /propuesta — Full Proposal Pipeline

Activate `proposal-conductor` with the following context:

**Input received:** `$ARGUMENTS`

**Task:** Run the full 5-layer proposal pipeline for the input above and deliver all output files.

---

## Pipeline

1. **Discovery (silent):** Load catalog from `services.yaml`, `conditions.yaml`, `segments.yaml`. Map all active [POR CONFIRMAR] items. Use `.proposal-state.json` cache if fresh (< 10 min).

2. **Normalization:** Pass input to `input-interpreter`. Score confidence. Apply smart defaults for all missing fields. Never block on input quality.

3. **Design:** Route to `service-selector` (service + segment + audience + brand), then `proposal-writer` (Minto Complete, bilingual ES+EN).

4. **Verification:** Run `legal-guardian` — mandatory before any file is written. Never skip. If BLOCKED: present 3 recovery options (auto-fix / manual / Innovation Mode).

5. **Generation + Delivery:** Run `format-producer`. Present all outputs with: file paths, verification status, assumptions list, [POR CONFIRMAR] items to resolve, and offer to iterate.

---

## Hard rules

- Never block on input quality — use smart defaults
- Never skip the legal gate (Layer 3)
- Always produce both ES and EN versions
- Deliver with: file paths + assumptions + [POR CONFIRMAR] + offer to iterate

---

## Edge cases

- **Empty `$ARGUMENTS`:** Ask exactly one question: "Who is this proposal for?" Then run full pipeline.
- **`$ARGUMENTS` is a file path:** Read the file, treat its contents as the input.
- **Input is in English:** Produce EN-first delivery order (EN files listed first). Same quality in both languages.
- **Input requests CATALOG EDIT:** Route to `catalog-curator` instead of the proposal pipeline.

---

## Quality bar for this run

A successful `/propuesta` run always delivers:
- At minimum: 2 MD files + 1 verification report (3 files guaranteed)
- Ideally: 10 files with all formats
- Verification status: APPROVED or APPROVED_WITH_WARNINGS (never BLOCKED when delivering)
- All [POR CONFIRMAR] items identified and listed with their exact conditional wording
