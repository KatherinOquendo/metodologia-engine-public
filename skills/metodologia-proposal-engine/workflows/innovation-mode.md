# Workflow: Innovation Mode

## Trigger conditions
- User need does not match any catalog service exactly
- OR user explicitly requests a custom/new service design
- OR service_hint confidence < 30% with no clear match

## Time estimate
12–20 minutes end-to-end

## Steps

### Step 1: Discovery (silent)
- Load catalog + references/service-innovation.md
- Identify the closest canonical building blocks
- Classify innovation type:
  - **Type A (Contextual)**: Standard service with deep customization (different industry, audience)
  - **Type B (Variant)**: Modified service with added/removed components
  - **Type C (New)**: Novel composition from multiple canonical blocks

### Step 2: Innovation detection
Present to user:
"Your need doesn't match an existing service exactly. I see three options:
1. [Closest match] with customization for your context
2. A variant of [base service] with [specific modifications]
3. A custom design combining elements from our catalog

Which direction fits best?"

If user doesn't choose clearly, default to option 1 (most conservative).

### Step 3: Composition
Run: `node scripts/service-composer.js --from [base_slug] --adapt '[adaptation_json]'`

The composer:
- Builds from canonical building blocks (traced)
- Adds novel elements (marked [POR CONFIRMAR])
- Generates pricing with delta tracking
- Produces [POR CONFIRMAR] items list

### Step 4: Gap documentation
Document every element that deviates from canonical:
- New modules → [POR CONFIRMAR: content not validated]
- Modified pricing → [POR CONFIRMAR: needs commercial approval]
- New deliverables → [POR CONFIRMAR: feasibility not confirmed]

### Step 5: Innovation disclaimer
Add to the proposal (both languages):

ES: "Esta propuesta incluye elementos diseñados a medida que aun no forman parte del catalogo estandar. Los items marcados [POR CONFIRMAR] requieren validacion antes de la contratacion."

EN: "This proposal includes custom-designed elements not yet part of the standard catalog. Items marked [POR CONFIRMAR] require validation before contracting."

This disclaimer is MANDATORY for Type B and C. Type A can omit it if all elements trace to canonical.

### Step 6: Verification gate
Same as standard workflow, but with additional checks:
- All [POR CONFIRMAR] items use conditional language (L2)
- Innovation disclaimer present for Type B/C (auto-add if missing)
- No novel element presented as standard/confirmed

### Step 7: Generation
Same as standard. All files include the disclaimer.
Innovation-specific elements highlighted in the scope section.

### Step 8: Delivery
Present with clear callout:
"This is a custom proposal with [N] elements pending validation.
Before sending to the client, these need commercial approval: [list]"

## Error handling
- Composition fails → fallback to closest standard service with manual customization notes
- Too many novel elements (>50% custom) → warn that this may need a new canonical
- Budget insufficient for composed service → present tiered options

## Exit conditions
- All files generated with innovation disclaimers
- [POR CONFIRMAR] items clearly listed for commercial team
