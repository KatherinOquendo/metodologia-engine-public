# Worst-Case Recovery Playbook
# Reference for agents/input-interpreter.md and scripts/input-normalizer.js
# Load when: input confidence < 60% OR adversarial-recovery workflow triggered

## The adversarial user profile

This is the user this system is hardened against:

- **Zero domain knowledge**: doesn't know service names, prices, or methodology
- **Voice-first communication**: transcribed audio with filler words, incomplete thoughts, background artifacts
- **Screen-first context**: describes what they see, not what they need ("that thing on the left", "the blue part")
- **Contradictory requirements**: says "cheap but comprehensive", "quick but thorough"
- **Missing critical info**: no company name, no budget, no timeline — often no clear problem
- **Time-pressured**: 15-minute window, frustrated by questions
- **Does not read output**: skims, clicks, reacts to layout

**Success criterion:** This user receives a complete, legally safe, brand-correct, bilingual proposal without needing to understand MetodologIA's methodology, pricing structure, or brand standards.

---

## Meta-prompt library

These are internal prompts the agent uses to interpret difficult inputs.
They are NOT shown to the user. They run silently as interpretation passes.

### MP-01: voice_note_recovery
```
Context: The following text is a voice note transcription. It contains filler words,
incomplete sentences, false starts, and speech artifacts.

Task: Extract the commercial intent. Identify:
  1. client_name: company or person name (or "unclear")
  2. problem: what they need to solve or achieve (or "unclear")
  3. audience: who will participate (B2B team / B2C individual / "unclear")
  4. budget_signal: any number or price reference mentioned (or "none")
  5. timeline_signal: any urgency or date reference (or "none")
  6. service_hint: any service name, type, or description that maps to catalog

For each field, provide a confidence score: high (>80%) / medium (40-80%) / low (<40%).
If a field is unclear, explain what signal you used to infer it.

Output as JSON only. No prose.

Input: [TRANSCRIPTION]
```

### MP-02: screen_description_recovery
```
Context: The user is describing something they see on screen rather than stating
their actual need. They may be pointing at UI elements, documents, or data.

Task: Translate the screen description into a commercial need.
Identify: what problem they're trying to solve, what type of deliverable they need,
who the audience is, and what service would address this.

Rules:
- "that thing" / "the blue part" / "what's on the left" → infer from context
- Screen descriptions often mean: "I need this format" → identify the format
- When uncertain, map to the most conservative interpretation

Output as ProposalData partial JSON with confidence scores.

Input: [SCREEN_DESCRIPTION]
```

### MP-03: contradiction_resolver
```
Context: The user has stated requirements that cannot be simultaneously satisfied.

Contradiction detected: [A] conflicts with [B]

Task: Present this as a clear choice, not as an error.
Format:
  "You mentioned [A] and also [B] — these pull in different directions.
   
   Option 1: [A-focused description] — this gives you [benefit A], costs approximately [price A]
   Option 2: [B-focused description] — this gives you [benefit B], costs approximately [price B]
   
   Which direction fits better?"

Rules:
- Never say "that's impossible" or "you can't have both"
- Always present as a choice with tradeoffs, not a limitation
- Always include approximate prices for both options

Output: Natural language response in [DETECTED_LANGUAGE].
```

### MP-04: budget_mismatch_recovery
```
Context: The mentioned budget is below the minimum price for any relevant service,
OR no budget was mentioned.

Budget signal: [AMOUNT or "none"]
Relevant service: [SLUG]
Catalog price: [PRICE]

Task: Bridge the gap without saying "your budget isn't enough".

If budget mentioned but too low:
  "Based on what you described, [service] is the best match — it's [PRICE].
   Here's what makes it worth it: [ONE SPECIFIC BENEFIT for their context].
   Want to see the full proposal?"

If no budget mentioned:
  Do not ask for the budget directly. Infer the tier from the client profile
  and need description. Proceed with that tier. Note the price clearly.

Output: Natural language response + proceed with generation at the identified tier.
```

### MP-05: unknown_service_recovery
```
Context: The user referred to a service that doesn't match any catalog entry exactly.

User reference: [WHAT_THEY_SAID]
Similarity matches (top 3):
  1. [SERVICE_A] — similarity: [%] — reason: [why it matches]
  2. [SERVICE_B] — similarity: [%] — reason: [why it matches]
  3. [SERVICE_C] — similarity: [%] — reason: [why it matches]

Task: Present the top matches as a brief multiple choice.
  "You might be thinking of:
   1. [SERVICE_A] — [one sentence: what it does + price]
   2. [SERVICE_B] — [one sentence: what it does + price]
   3. Something else — describe it and I'll design a custom option

   Which one?"

Rules:
- Never say "that service doesn't exist"
- Always include option 3 (custom/innovation mode) as an escape hatch
- Use plain language for service descriptions — no jargon

Output: Natural language question in [DETECTED_LANGUAGE].
```

### MP-06: complete_blank_input
```
Context: The input is too sparse to extract any meaningful commercial intent.
(< 5 words, or pure pleasantries, or entirely off-topic)

Task: Gently prompt for the minimum information needed without overwhelming.
Ask only ONE question — the most impactful one.

Priority order:
  1. If company/person unknown: "Who is this proposal for?"
  2. If problem unknown: "What are they trying to solve or achieve?"
  3. If audience unknown: "Is this for a company team or an individual?"

Never ask multiple questions at once for blank input.
Never list requirements or explain the process.
Just one warm, natural question.

Output: Single natural language question in [DETECTED_LANGUAGE].
```

---

## Input quality classification

| Score | Profile | Recovery path |
|-------|---------|--------------|
| 80–100% | Clear request | Direct to Standard or Innovation flow |
| 60–79% | Mostly clear | Proceed with minor assumptions flagged |
| 40–59% | Incomplete | Use smart defaults + confirm before generating |
| 20–39% | Very unclear | 1 targeted question + defaults for rest |
| 0–19% | Blank/noise | Single warm question (MP-06) |

**Never block at any score.** Always move toward generating something.

---

## Smart defaults library

When a field is missing or unclear, use these defaults rather than stopping:

```javascript
const SMART_DEFAULTS = {
  company_name: '[CLIENT COMPANY]',  // marked placeholder
  segment: inferFromContext(),         // B2B if team language; B2C otherwise
  budget: nearestCatalogTier(),       // match problem size to price tier
  timeline: 'Flexible start',
  industry: inferFromProblem(),       // extract from problem description
  language: detectFromInput(),        // detect + produce bilingual regardless
  service_slug: topSimilarityMatch(), // top-1 match with confirmation
  audience_version: inferFromSegment(), // executive | commercial | procurement | novice
  brand_mode: 'own',                  // default unless partner mentioned
};
```

---

## Recovery workflow (adversarial-recovery.md)

```
STEP 1: Run input-normalizer.js with all 6 meta-prompts available
STEP 2: Score all critical fields (problem, segment)
STEP 3:
  IF score ≥ 40% on critical → proceed with assumptions documented
  IF score < 40% on critical → ask the ONE highest-impact question
STEP 4: Apply smart defaults to all missing non-critical fields
STEP 5: Build ProposalData with confidence annotations
STEP 6: Route to appropriate workflow (standard-b2b, standard-b2c, innovation-mode)
STEP 7: Proceed to Layer 3 (verification) — worst-case inputs need same legal gate
STEP 8: Generate all 10 files — never skip formats because input was weak
STEP 9: Delivery summary calls out:
  - Assumptions made (with brief reason for each)
  - Placeholders that need replacing
  - One clarifying question for the most impactful assumption
```

---

## Anti-patterns (what breaks the adversarial user experience)

| Anti-pattern | Why it breaks | What to do instead |
|---|---|---|
| Ask 5 questions before generating | User gives up | Ask ≤1 targeted question OR use defaults + confirm |
| Say "I need X before I can help" | Gatekeeping | Use placeholder X, proceed, flag at delivery |
| Show error messages | Breaks confidence | Show a choice or a partial result instead |
| List all requirements upfront | Overwhelming | Just start. Course-correct on iteration. |
| Use service jargon in questions | User doesn't know | "Is this for a company team or for yourself?" not "What's the segment?" |
| Regenerate everything on a small change | Wastes time | Surgical edits only |
| Deliver raw JSON as output | Unreadable | Always present as natural language + files |
