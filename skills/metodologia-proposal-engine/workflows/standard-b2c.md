# Workflow: Standard B2C Proposal

## Trigger conditions
- Individual buyer detected (personal pronouns, freelancer, self-employed)
- Catalog service identified with B2C pricing available
- Confidence ≥ 40% on critical fields

## Time estimate
6–10 minutes end-to-end

## Steps

### Step 1: Discovery (silent)
- Load catalog, check B2C pricing availability
- If B2C pricing is null or [POR CONFIRMAR] → warn, check if Innovation Mode needed
- Load canonical service file

### Step 2: Diagnosis (≤ 2 questions)
Priority:
1. Goal (if unclear) → "What are you looking to achieve?"
2. Experience level (if unclear) → "Have you worked with AI tools before?"

Skip if both are clear from context.

### Step 3: Service selection & pricing
- Pull B2C price: `node scripts/catalog-query.js --price [slug] b2c_cop`
- Note: B2C prices include IVA (do NOT discriminate separately)
- Payment: installments available (3 cuotas typical)

### Step 4: Minto draft
Same structure as B2B but:
- Tone: 2nd person singular ("tu" in ES, "you" in EN)
- Max sentence length: 20 words (comercial) / 15 words (usuario inexperto)
- Focus on personal transformation, not organizational ROI
- Avoid jargon: apply novice substitutions from scripts/i18n.js
- Evidence: personal outcomes, not team metrics

### Step 5: Verification gate
Same as B2B workflow. Additional check:
- Verify B2C price does NOT show IVA discrimination (L-check)
- Verify no corporate language leaked ("your team", "the organization")

### Step 6: Generation
Same as B2B. Brand mode default: own (B2C is never whitelabel).

### Step 7: Delivery
Same as B2B but simpler language in the summary.
Highlight payment options (installments).

## Error handling
- B2C price unavailable → suggest closest B2B option with note, or activate Innovation Mode
- Service is B2B-only (IAC line) → explain, suggest alternative

## Exit conditions
Same as B2B workflow.
