# Workflow: Adversarial Recovery

## Trigger conditions
- Input confidence < 40% on critical fields
- OR filler word density > 30%
- OR contradictory requirements detected
- OR input < 5 meaningful words

## Time estimate
10–15 minutes (includes one clarification round)

## Steps

### Step 1: Input normalization
Run: `node scripts/input-normalizer.js --input "[raw_input]"`

Evaluate the result:
- `recovery_path` determines the strategy
- `assumptions` lists what was inferred vs. defaulted
- `suggested_question` provides the ONE best question

### Step 2: Apply meta-prompts
Load references/worst-case-recovery.md and apply relevant meta-prompts:

| Condition | Meta-prompt | Action |
|-----------|------------|--------|
| Voice transcription artifacts | MP-01 | Strip fillers, reconstruct intent |
| Screen descriptions | MP-02 | Translate UI references to needs |
| Contradictory requirements | MP-03 | Present as a clear choice |
| Budget too low / missing | MP-04 | Bridge the gap without judgment |
| Unknown service | MP-05 | Top-3 similarity match |
| Blank / minimal input | MP-06 | Single warm question |

### Step 3: Confidence evaluation
Based on `confidence.recovery_path`:

**blank_input_single_question** (0-19%):
- Ask ONE warm question: "Who is this proposal for?" or "What do they need to solve?"
- Do not list requirements. Do not explain the process.
- Wait for response, then re-run normalization.

**one_question_plus_defaults** (20-39%):
- Ask the suggested_question from the normalizer
- Apply smart defaults to everything else
- Wait for response, then proceed with updated data

**smart_defaults_confirm** (40-59%):
- Apply all defaults
- Present a brief summary: "Based on what you shared, I'm preparing a proposal for [service] for [audience]. Does that sound right?"
- If user confirms → proceed. If user corrects → update and proceed.

**proceed_with_flags** (60-79%):
- Proceed directly
- Document all assumptions in the delivery summary
- No questions needed

### Step 4: Build ProposalData
From normalized fields, build ProposalData skeleton:
- Map all extracted/defaulted fields to schema
- Annotate low-confidence fields with [ASSUMED]
- Set service_slug from best match (or null → trigger Innovation Mode)

### Step 5: Route to standard workflow
Based on the recovered data:
- If service_slug matched + segment = b2b → workflows/standard-b2b.md Step 3+
- If service_slug matched + segment = b2c → workflows/standard-b2c.md Step 3+
- If no service match → workflows/innovation-mode.md Step 2+

The standard workflow takes over from the appropriate step (skipping its own diagnosis since we already clarified).

### Step 6: Delivery additions
On top of the standard delivery, add:
1. **Assumptions list**: "I made these assumptions based on your input: [list]"
2. **Placeholder callout**: "These fields need your input: [list of [CLIENT COMPANY] etc.]"
3. **Refinement invitation**: "What would you like to adjust?"

## Anti-patterns (NEVER do these)
- Ask more than 1 question at a time
- Show error messages or "insufficient information" warnings
- List all required fields upfront
- Use domain jargon in questions
- Block generation because input quality is low
- Regenerate everything when user makes a small correction

## Error handling
- Normalization fails entirely → use 100% defaults, generate a template proposal
- User doesn't respond to clarification → proceed with defaults after 1 attempt
- Contradictions unresolvable → present both options, let user choose

## Exit conditions
- Proposal generated (even with heavy defaults)
- Assumptions clearly documented
- User invited to refine
