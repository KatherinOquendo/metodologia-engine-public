---
description: "Generate a complete bilingual (ES+EN) commercial proposal for any MetodologIA service. Runs the full 5-layer pipeline: normalize input (handles voice notes, vague requests, anything) → match service → write Minto Complete content → verify legal compliance → produce 10 output files (HTML, DOCX, PPTX, XLSX, MD × ES+EN). Use this command whenever a user wants to create a proposal, quote, pitch deck, commercial offer, or scope document for a client — even if they just say 'I have a meeting with this client' or paste a rough brief. Use: /propuesta [client description]"
user-invocable: true
---

# /propuesta — Full Proposal Pipeline

Activate `proposal-conductor` with the following context:

**Input received:** `$ARGUMENTS`

**Task:** Run the full 5-layer proposal pipeline for the input above.

Layer sequence:
1. Discovery (silent): load catalog and [POR CONFIRMAR] map
2. Normalization: pass input to `input-interpreter`, score confidence, recover from any input quality
3. Design: route to `service-selector` then `proposal-writer` (Minto Complete, bilingual)
4. Verification: run `legal-guardian` — mandatory before generating files
5. Generation + Delivery: run `format-producer`, then present all outputs with assumptions and [POR CONFIRMAR] items

**Hard rules:**
- Never block on input quality — use smart defaults
- Never skip the legal gate
- Always produce both ES and EN versions
- Deliver with: output file paths + assumptions list + [POR CONFIRMAR] to resolve + offer to iterate

If `$ARGUMENTS` is empty or unclear, start with: "Who is this proposal for?"
