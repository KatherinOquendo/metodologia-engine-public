# MetodologIA Proposal Engine — Plugin Memory

This context is injected at every session. Agents read this before acting.

---

## Catalog Summary (17 services, 3 tiers)

### Tier 1 — Full canonical docs, confirmed pricing
| Slug | Name | B2C COP | B2B COP | Type |
|------|------|---------|---------|------|
| workshop-de-ocupado-a-productivo | De Ocupado a Productivo | 200,000 | 3,000,000 | Workshop 3h |
| bootcamp-trabajar-amplificado | Bootcamp Trabajar Amplificado | 900,000 | 12,000,000 | Bootcamp 20h |
| consultive-workshop-estrategia | EstrategIA Personal | 750,000 | N/A | ConsultiveWorkshop 6×2h |
| programa-digital-champions | Digital Champions | N/A | 18,000,000 | Program 8wk |
| programa-empoderamiento | Programa Empoderamiento | 1,800,000 | [PC-13] | Program 12wk |

### Tier 2 — Confirmed pricing, partial canonicals
| Slug | Name | B2B COP | Type |
|------|------|---------|------|
| bootcamp-gerencia-proyectos | Gerencia de Proyectos | 12,000,000 | Bootcamp 20h |
| bootcamp-ofimatica-google | Ofimática Google | 8,000,000 | Bootcamp 16h |
| bootcamp-ofimatica-microsoft | Ofimática Microsoft | 8,000,000 | Bootcamp 16h |
| bootcamp-ventas-amplificadas | Ventas Amplificadas | 12,000,000 | Bootcamp 20h |

### Tier 3 — IAC delivery channel only (B2B, B2C pricing requires [POR CONFIRMAR])
bootcamp-amplificacion-ia, bootcamp-ia-comercial, bootcamp-introduccion-ia-generativa,
bootcamp-ofimatica-ia-google, bootcamp-ofimatica-ia-microsoft,
programa-competencias-digitales-universales, programa-liderazgo-digital,
programa-transformacion-digital

**IAC rule:** Tier 3 services are B2B only unless explicitly confirmed. Mark B2C price [POR CONFIRMAR].

---

## Active [POR CONFIRMAR] Items

Never state these as confirmed. Use exact conditional wording:

| ID | Item | Required wording |
|----|------|-----------------|
| PC-01 | Credit Bootcamp TA → other programs | "Credit applicable subject to current policy — consult your ambassador." |
| PC-02 | B2C model for IAC (Tier 3) services | Do not quote B2C price |
| PC-03 | Credit from Tier 2/3 Bootcamps | "Credit conditions pending confirmation." |
| PC-05 | USD rate unification | Add "(indicative rate, subject to variation)" after any USD figure |
| PC-06 | Data controller responsibility in co-brand | Flag legal review required |
| PC-13 | B2B SKU for Programa Empoderamiento | Do not offer B2B version |

**CONFIRMED credits (state freely):**
- Workshop DOAP → Bootcamp TA: 100% · 6 months · non-transferable

---

## Red List — Zero Tolerance in Any Document

**Global (all audiences):**
```
hack · truco · secreto · resultados instantáneos / instant results
transformación / transformation      → ALWAYS use: (R)Evolución / (R)Evolution
revolucionario / revolutionary · disruptivo / disruptive
único en el mercado / unique in the market
soluciones innovadoras / innovative solutions
equipo de expertos / team of experts
resultados garantizados / guaranteed results
sin riesgo / zero risk
```

**Novice audience add:** ROI, OKR, KPI, SLA, framework, agile, sprint, stakeholder, deliverable, pipeline, SSOT, DoD, RACI, meta-prompt, capstone

**Procurement audience add:** innovador, revolucionario, único, líder (no marketing adjectives)

---

## Guarantee Clause (exact wording — L3 enforced)

**Spanish:** "100% de devolución si solicitas el reembolso antes de completar la primera sesión de 4h, con una sesión de retroalimentación estructurada de 1h."

**English:** "100% refund if requested before completing the first 4-hour session, with a 1-hour structured feedback session."

---

## Core Principles (non-negotiable every run)

1. **NEVER BLOCK** — worst input still produces output with smart defaults
2. **VERIFY BEFORE GENERATE** — legal gate (L1-L10) is mandatory before writing any file
3. **BILINGUAL ALWAYS** — produce ES + EN unless user explicitly opts out
4. **MINTO COMPLETE IS THE FLOOR** — every proposal: conclusion + 3 MECE supports + evidence + CTA
5. **[POR CONFIRMAR] NEVER stated as confirmed** — use exact conditional wording
6. **Transformation → "(R)Evolution"** — enforced everywhere, every language
7. **White-label = MetodologIA INVISIBLE** — not subtle, not minimized — completely absent
8. **Co-brand = partner accent on --gold token only** — never override navy or typography
9. **Prototypes ≠ production-ready automations** — always clarify this distinction
10. **Result % always wrapped** — "Indicative target: X%. Actual result depends on adoption consistency."

---

## Audience Versions

| Segment | Version | Tone |
|---------|---------|------|
| B2B executive | ejecutiva-b2b | Formal 3rd person, business case, ≤25 words/sentence |
| B2C executive | ejecutiva-b2c | Direct 2nd person, personal ROI, ≤25 words |
| B2B commercial | comercial-cliente-b2b | Narrative hook, benefits, CTA |
| B2C commercial | comercial-cliente-b2c | Aspirational + concrete, 2nd person |
| Procurement | comercial-compras | Specs, RACI, SLA, full conditions, zero marketing |
| Novice | usuario-inexperto | ≤15 words/sentence, zero jargon |

---

## Output Specification

Default output per proposal = **10 files**:
- `propuesta_[slug]_[YYYY-MM]_ES.html` + `..._EN.html`
- `propuesta_[slug]_[YYYY-MM]_ES.docx` + `..._EN.docx`
- `propuesta_[slug]_[YYYY-MM]_ES.pptx` + `..._EN.pptx`
- `propuesta_[slug]_[YYYY-MM]_bilingual.xlsx`
- `propuesta_[slug]_[YYYY-MM]_ES.md` + `..._EN.md`
- `verification-report_[slug]_[YYYY-MM].md`

Output directory: `outputs/` (repo) or `/mnt/user-data/uploads/outputs/` (Claude Code)

Skills root: `skills/metodologia-proposal-engine/` (relative to plugin directory)
