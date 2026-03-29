---
description: "Instant price estimate for any MetodologIA service — no files generated. Returns service name, COP price, IVA treatment, payment terms, credit options, and [POR CONFIRMAR] flags. Use whenever someone asks 'how much does X cost?', 'what's the price for Y?', or 'can you give me a quick number?' — even if they don't explicitly say cotización or quote. Use: /cotizacion [service or description] [b2b|b2c]"
user-invocable: true
---

# /cotizacion — Quick Price Estimate

Activate `service-selector` for a read-only price query. Do NOT generate proposal files. Do NOT run legal verification.

**Input received:** `$ARGUMENTS`

---

## Steps

1. Parse input: identify service name/description and segment (b2b/b2c — default to b2b if not specified).

2. Query catalog:
   ```bash
   node skills/metodologia-proposal-engine/scripts/catalog-query.js --list all --json
   ```

3. Match service using the signal scoring table from `service-selector`. If match confidence < 40%: list the top 3 closest matches and ask "Which one are you thinking of?"

4. Return price information:

```
Servicio: [canonical_name]
Slug: [slug]
Tier: [1|2|3]  Brand: [MetodologIA|IAC]

B2B: COP [amount] + IVA (VAT discriminated on invoice)
B2C: COP [amount] (IVA incluido)  [or: [POR CONFIRMAR — PC-02]]

Condiciones de pago: [from conditions.yaml]
Vigencia: [valid_days] días
Incluye: [top 3-5 deliverables from canonico.md or services.yaml]

Crédito disponible: [if applicable — CONFIRMED credits only]
Nota PC: [any active PC items affecting this quote, with exact conditional wording]
```

5. If multiple services match within 15 points of each other: show all matches as a comparison table.

---

## Edge cases

- **IAC Tier 3 with B2C request:** Show nearest Tier 1 B2C alternative. Add: "[PC-02] Este servicio opera vía canal IAC (B2B). Alternativa B2C más cercana: [Tier 1 service]."
- **Vague input with no clear service match:** List top 3 matches with prices. Ask which fits.
- **Budget-only input ("tengo 5 millones"):** Show all services priced within ±50% of that budget.
- **Empty `$ARGUMENTS`:** Ask: "¿Para qué tipo de servicio necesitas la cotización?"

---

## Mandatory footer

Always end with:
> "Esta es una estimación. Para un documento comercial completo con verificación legal: `/propuesta [descripción del cliente]`"
