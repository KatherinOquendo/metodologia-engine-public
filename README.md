# MetodologIA Proposal Engine

**Agentic ecosystem for bilingual commercial proposal generation.**

Turn any client brief — a voice note, a 3-word description, a rambling email — into a legally verified, brand-correct, bilingual commercial proposal in 10 formats. No API key. Standalone.

---

## What It Does

7 specialized agents collaborate through a conductor to run this pipeline:

```
User input (any quality)
    ↓
🟡 input-interpreter   — voice notes, vague text, contradictions → ProposalData JSON
    ↓
🟢 service-selector    — match catalog service + segment + audience + brand
    ↓
🟣 proposal-writer     — Minto Complete content in ES + EN (opus model)
    ↓
🔴 legal-guardian      — L1-L10 blockers + W1-W7 warnings (mandatory gate)
    ↓
🟠 format-producer     — 10 output files (HTML·DOCX·PPTX·XLSX·MD × ES+EN)
    ↓
🔵 proposal-conductor  — delivery with assumptions + [POR CONFIRMAR] + iterate offer
```

**Catalog management:** `🩵 catalog-curator` handles browsing, adding services, and resolving [POR CONFIRMAR] items.

---

## Quick Start

```
/propuesta equipo de ventas de 20 personas, empresa logística, quieren IA
```

That's it. The conductor handles the rest.

---

## Commands

| Command | What it does |
|---------|-------------|
| `/propuesta [brief]` | Full pipeline → 10 files (HTML·DOCX·PPTX·XLSX·MD × ES+EN) |
| `/cotizacion [servicio]` | Quick price estimate — no files |
| `/catalogo [filtro]` | Browse 17 services with prices and availability |
| `/verificar [contenido]` | Legal compliance check on any content |
| `/actualizar-catalogo` | Add services, update prices, resolve [POR CONFIRMAR] |

---

## Output

Each proposal produces **10 files**:

```
outputs/
├── propuesta_[cliente]_[YYYY-MM]_ES.html    # Responsive, brand-resolved
├── propuesta_[cliente]_[YYYY-MM]_EN.html
├── propuesta_[cliente]_[YYYY-MM]_ES.docx
├── propuesta_[cliente]_[YYYY-MM]_EN.docx
├── propuesta_[cliente]_[YYYY-MM]_ES.pptx   # 6 slides minimum
├── propuesta_[cliente]_[YYYY-MM]_EN.pptx
├── propuesta_[cliente]_[YYYY-MM]_bilingual.xlsx
├── propuesta_[cliente]_[YYYY-MM]_ES.md
├── propuesta_[cliente]_[YYYY-MM]_EN.md
└── verification-report_[cliente]_[YYYY-MM].md
```

**Graceful degradation:** DOCX/PPTX skip if `npm docx`/`pptxgenjs` missing. XLSX skips if `pip openpyxl` missing. MD files always generate.

---

## Branding Modes

| Mode | What it means |
|------|--------------|
| `own` | MetodologIA brand (default) |
| `cobrand` | MetodologIA + partner logo; partner accent on gold token only |
| `whitelabel` | Partner brand only — MetodologIA completely invisible |

```
/propuesta cliente xyz --brand whitelabel --partner "Empresa ABC"
```

---

## Catalog

17 services across 3 tiers:

| Tier | Services | Price range (B2B COP) |
|------|----------|----------------------|
| 1 | Workshop DOAP, Bootcamp TA, EstrategIA, Digital Champions, Empoderamiento | 3M – 18M |
| 2 | Gerencia Proyectos, Ofimática G/MS, Ventas Amplificadas | 8M – 12M |
| 3 (IAC) | 8 AI programs | Confirm B2C availability |

```
/catalogo tier:1          # Browse Tier 1 only
/catalogo b2c             # B2C-available services
/cotizacion bootcamp IA   # Quick estimate
```

---

## Content Quality Standard

Every proposal uses **Minto Complete** structure:

1. **CONCLUSION** — 1-2 sentences, decisory recommendation
2. **SUPPORT 1 [P1 — (R)Evolution]** — gap analysis + method + evidence
3. **SUPPORT 2 [P2 — Intention over intensity]** — design, focus, what it is NOT
4. **SUPPORT 3 [P3 — Technology as ally]** — concrete deliverables, reusable assets
5. **CTA** — verb + object + context (when/where/who)

**Bad:** "We offer innovative AI training solutions that will transform your organization."
**Good:** "Your ops team spends 40% of its time on reports AI generates in minutes. Bootcamp Trabajar Amplificado equips 20 participants with 50+ custom prompts — 90% apply AI in week one. Schedule your diagnostic session this week."

---

## Legal Gate (Non-Negotiable)

The `legal-guardian` agent runs **10 hard blockers** on every proposal before files are written:

| # | Blocker | Auto-fix |
|---|---------|----------|
| L1 | Price ≠ catalog | ✅ |
| L2 | [POR CONFIRMAR] stated as confirmed | ✅ |
| L3 | Guarantee clause wrong wording | ✅ |
| L5 | Result % promised without "Indicative target" | ✅ |
| L7 | Red list word present | ✅ |
| L10 | Fixed USD rate without variation notice | ✅ |

---

## Hooks

**SessionStart:** Loads catalog (17 services, [POR CONFIRMAR] count), initializes session state.

**PostToolUse (Write/Edit):** Counts output files, flags BLOCKED reports, checks white-label leaks.

---

## Requirements

- Node.js ≥ 18 (for scripts)
- `npm install` in `skills/metodologia-proposal-engine/` (js-yaml, handlebars)
- Optional: `npm install docx pptxgenjs` for DOCX/PPTX
- Optional: `pip install openpyxl` for XLSX

---

## Author

Javier Montaño · [MetodologIA](https://metodologia.info) · MIT License
