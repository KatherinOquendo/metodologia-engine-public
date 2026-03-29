# MetodologIA Proposal Engine — Plugin Memory

v1.1 — 2026-03-29. Authoritative for: red list, guarantee clause, PC items, core principles, authority map.

This file is injected at every session. Agents read it before acting. **Not authoritative for:**
- Prices and service details → `catalog/services.yaml` is SSOT
- Audience routing rules → `catalog/segments.yaml` is SSOT
- Automated legal checks → `verify-legal.js` runs those; this file defines the human-readable rules it enforces

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

### Tier 3 — IAC delivery channel only (B2B; B2C requires [POR CONFIRMAR])
bootcamp-amplificacion-ia · bootcamp-ia-comercial · bootcamp-introduccion-ia-generativa ·
bootcamp-ofimatica-ia-google · bootcamp-ofimatica-ia-microsoft · programa-competencias-digitales-universales ·
programa-liderazgo-digital · programa-transformacion-digital

**Tier 3 rule:** B2B only unless explicitly confirmed. Never quote B2C price. Suggest nearest Tier 1 B2C alternative.

---

## Active [POR CONFIRMAR] Items

Never state these as confirmed. Use exact conditional wording. No agent context or inference counts as authorization.

| ID | Item | Affected Services | Required wording |
|----|------|-------------------|-----------------|
| PC-01 | Credit Bootcamp TA → other programs | bootcamp-trabajar-amplificado | "Credit applicable subject to current policy — consult your ambassador." |
| PC-02 | B2C model for IAC (Tier 3) services | All Tier 3 slugs | Do not quote B2C price; offer nearest Tier 1 B2C alternative |
| PC-03 | Credit from Tier 2/3 Bootcamps | All Tier 2 slugs + Tier 3 bootcamps | "Credit conditions pending confirmation." |
| PC-05 | USD rate unification | Any service with USD pricing | Append "(indicative rate, subject to variation)" after every USD figure |
| PC-06 | Data controller in co-brand | Any co-brand proposal | "Legal review of data controller clause required before sending." |
| PC-13 | B2B SKU for Programa Empoderamiento | programa-empoderamiento | Do not offer or price a B2B version |

**CONFIRMED credits (state freely, no caveat):**
- Workshop DOAP → Bootcamp TA: 100% credit · valid 6 months · non-transferable · no cash value

**Threshold rule:** If a single proposal has >3 unresolved PC items, flag APPROVED_WITH_WARNINGS with note: "High [POR CONFIRMAR] density — resolve PC items before client presentation."

---

## Authority Map

Agents must not infer authorization from context. No confirmation = item stays [POR CONFIRMAR].

| Action | Required authority | Channel |
|--------|--------------------|---------|
| Resolve any PC item | JM (Javier Montaño) | Written confirmation → update conditions.yaml + this file |
| Change a published price | JM | Written confirmation → update services.yaml |
| Launch a new service to production | JM + completed pilot (≥1 cohort) | Both conditions required |
| Approve co-brand data controller clause | JM + legal counsel | Both required; PC-06 stays active until both confirm |
| Expand Tier 3 to B2C | JM | Written confirmation; clears PC-02 for that slug only |

---

## Red List — Zero Tolerance in All Documents, All Languages

**Legal/compliance risk** (can expose MetodologIA to false-advertising claims):
- `resultados garantizados / guaranteed results` → use "indicative targets subject to adoption"
- `sin riesgo / zero risk` → the guarantee clause defines the actual risk boundary
- `resultados instantáneos / instant results` → all programs have defined learning cycles

**Brand integrity risk** (dilute positioning or invite comparisons):
- `transformación / transformation` → **always replace with** `(R)Evolución / (R)Evolution`
- `revolucionario / revolutionary` · `disruptivo / disruptive` · `único en el mercado / unique in the market`
- `soluciones innovadoras / innovative solutions` · `equipo de expertos / team of experts`
- `hack · truco · secreto` — prohibited in all contexts

**Audience-fit risk** (exclude or alienate the target reader):
- *Novice add:* ROI, OKR, KPI, SLA, framework, agile, sprint, stakeholder, deliverable, pipeline, SSOT, DoD, RACI, meta-prompt, capstone
- *Procurement add:* innovador, revolucionario, único, líder (no marketing adjectives in spec docs)

Any red-list match triggers L7 BLOCKED. No context exemptions.

---

## Guarantee Clause — Exact Wording (L3 enforced)

Reproduce verbatim. Any paraphrase invalidates the legal gate. L3 applies **only if** the words "guarantee / garantía / devolución / refund" appear in the content — if absent, L3 = N/A.

**Spanish:** "100% de devolución si solicitas el reembolso antes de completar la primera sesión de 4h, con una sesión de retroalimentación estructurada de 1h."

**English:** "100% refund if requested before completing the first 4-hour session, with a 1-hour structured feedback session."

---

## Slug Normalization Rule

Derives `company-slug` from company name for file naming.

1. Lowercase → replace accented characters with ASCII (á→a, é→e, ü→u, ñ→n)
2. Replace `& + / . , '` with hyphen → collapse consecutive hyphens → strip leading/trailing hyphens
3. Truncate to 25 characters at a word boundary (never cut mid-word)
4. Fallback if result is < 2 chars: use `cliente`

Examples: `Café & Co.` → `cafe-co` · `Transportes Rápidos S.A.S.` → `transportes-rapidos-sas`

File name pattern: `propuesta_[service-slug]_[company-slug]_[YYYY-MM]_[LANG].[ext]`

---

## Language Detection Rule

Input language determines primary output order. Both ES and EN are always produced.

| Input language | File delivery order | Primary locale |
|----------------|---------------------|----------------|
| Spanish | ES first | `_ES` files are the canonical version |
| English | EN first | `_EN` files are the canonical version |
| Mixed / ambiguous | ES first (default) | Treat as Spanish input |

"Primary" affects: delivery summary order, first sheet in .xlsx, slide deck default. Content quality is equal in both.

---

## Audience Versions

| Version key | Context | Tone | Default rule |
|-------------|---------|------|--------------|
| ejecutiva-b2b | B2B + C-level/VP/Director recipient | Formal 3rd person, business case, ≤25 words/sentence | Use if company name provided, no individual name |
| ejecutiva-b2c | B2C + financially sophisticated individual | Direct 2nd person, personal ROI, ≤25 words | Use if individual name provided, no company |
| comercial-cliente-b2b | B2B + team lead/manager | Narrative hook, benefits-first, CTA | Use if B2B confirmed, less formal context |
| comercial-cliente-b2c | B2C + general professional | Aspirational + concrete, 2nd person | Use if B2C confirmed, less formal context |
| comercial-compras | Any + Procurement/Legal/Finance recipient | Specs, RACI, SLA, full conditions, zero marketing | Use if RFP/licitación/compras mentioned |
| usuario-inexperto | Any + non-technical, no prior training | ≤15 words/sentence, zero jargon, analogies | Use if user self-identifies as beginner |

**Global default (no signal):** `ejecutiva-b2b`. Document as assumption in verification report.

---

## Core Principles (non-negotiable every run)

1. **NEVER BLOCK** — worst input still produces output with smart defaults and `[ASSUMED]` markers
2. **VERIFY BEFORE GENERATE** — legal gate (L1-L10) mandatory before writing any file
3. **BILINGUAL ALWAYS** — produce ES + EN unless user explicitly opts out in writing
4. **MINTO COMPLETE IS THE FLOOR** — conclusion first + 3 MECE supports + evidence + CTA
5. **[POR CONFIRMAR] never stated as confirmed** — use exact conditional wording from this file
6. **Transformation → "(R)Evolution"** — enforced in every language, every format
7. **White-label = MetodologIA INVISIBLE** — not subtle, not minimized — completely absent from all files
8. **Co-brand = partner accent on `--gold` token only** — never override navy (#0A1628) or typography
9. **Prototypes ≠ production automations** — always include this distinction in any automation proposal
10. **Result % always wrapped** — "Indicative target: X%. Actual result depends on adoption consistency."

---

## Output Specification

Default output per proposal = **10 files**:

| File | Format | Always generated |
|------|--------|-----------------|
| `propuesta_[slugs]_[YYYY-MM]_ES.html` | Web-ready HTML | Requires handlebars |
| `propuesta_[slugs]_[YYYY-MM]_EN.html` | Web-ready HTML | Requires handlebars |
| `propuesta_[slugs]_[YYYY-MM]_ES.docx` | Editable Word | Requires npm `docx` |
| `propuesta_[slugs]_[YYYY-MM]_EN.docx` | Editable Word | Requires npm `docx` |
| `propuesta_[slugs]_[YYYY-MM]_ES.pptx` | Slide deck | Requires npm `pptxgenjs` |
| `propuesta_[slugs]_[YYYY-MM]_EN.pptx` | Slide deck | Requires npm `pptxgenjs` |
| `propuesta_[slugs]_[YYYY-MM]_bilingual.xlsx` | Investment table, both languages | Requires Python `openpyxl` |
| `propuesta_[slugs]_[YYYY-MM]_ES.md` | Plain text / version control | **Always** |
| `propuesta_[slugs]_[YYYY-MM]_EN.md` | Plain text / version control | **Always** |
| `verification-report_[slugs]_[YYYY-MM].md` | Legal gate audit trail | **Always** |

**Minimum guaranteed output (zero dependencies):** 2 MD + 1 verification report.
**Output directories:** repo → `outputs/` · Claude Code → `/mnt/user-data/uploads/outputs/`
**Skills root:** `skills/metodologia-proposal-engine/` (relative to plugin directory)
