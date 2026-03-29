---
description: "Instant price estimate for any MetodologIA service — no files generated. Returns service name, COP price, IVA treatment, payment terms, credit options, and [POR CONFIRMAR] flags. Use this whenever someone asks 'how much does X cost?', 'what's the price for Y?', or 'can you give me a quick number?' — even if they don't explicitly say cotización or quote. Use: /cotizacion [service or description] [b2b|b2c]"
user-invocable: true
---

# /cotizacion — Quick Price Estimate

Activate `service-selector` with the following context:

**Input received:** `$ARGUMENTS`

**Task:** Return a quick price estimate. Do NOT generate proposal files.

Steps:
1. Parse input: identify service name/description and segment (b2b/b2c)
2. Query `catalog/services.yaml` for matching service(s)
3. Return price information in this format:

```
Service: [canonical_name]
Slug: [slug]
Tier: [1|2|3]

B2B price: COP [amount] + IVA (VAT discriminated)
B2C price: COP [amount] (IVA included) [or: [POR CONFIRMAR]]

Payment terms: [from conditions.yaml]
Validity: [from catalog]
Includes: [key deliverables — 3-5 bullets]

Credits toward: [if applicable — confirmed only]
[POR CONFIRMAR items affecting this quote]
```

4. If multiple services match, list top 3 with prices for comparison.
5. If no service matches, suggest the 2 closest alternatives.

**Do not generate files. Do not run legal verification. This is a quick estimate only.**

Note at bottom: "This is an estimate. Generate the full proposal with /propuesta for a legally verified document."
