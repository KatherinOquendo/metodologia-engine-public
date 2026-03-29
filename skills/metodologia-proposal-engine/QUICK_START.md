# Quick Start — MetodologIA Proposal Engine
# Your first proposal in 5 minutes. No training required.

## Step 1: Install (one time, ~2 minutes)

```bash
mkdir -p .claude/skills/metodologia-proposal-engine
cp -r mpe-v4/* .claude/skills/metodologia-proposal-engine/
npm install -g docx pptxgenjs js-yaml
pip install openpyxl pyyaml --break-system-packages
```

## Step 2: Write anything. Seriously, anything.

Open Claude Code. Type one of these — or your own version:

**Simplest possible input:**
```
/propuesta equipo de ventas, empresa de seguros, quieren aprender IA
```

**Voice note style (the system handles this):**
```
/propuesta uh sí necesito una propuesta para una empresa que vende software
y tienen como 15 personas en el equipo de operaciones y quieren aprender
a usar la inteligencia artificial para hacer sus reportes más rápido
y creo que el presupuesto es como 12 millones
```

**English:**
```
/propuesta 20-person logistics company operations team, want to use AI for
route analysis and daily reports, roughly COP 12M budget
```

**Minimal, no budget:**
```
/propuesta empresa de manufactura, equipo de 15 personas
```

## Step 3: Answer ≤3 questions (maybe none)

The agent may ask 1–3 short questions if it needs more context.
Answer in natural language — no special format required.

If you skip the questions, the agent uses smart defaults and tells you what it assumed.

## Step 4: Review the verification report

Before the files are generated, you'll see:
```
VERIFICATION REPORT
===================
Status: ✅ APPROVED
Blockers fixed: none
Active warnings: [W4] AI engine — validate with client IT before start
Brand mode: own
Mode: STANDARD
```

Green = you're good. Warnings = things to note. Red = the agent already fixed it.

## Step 5: Get your 10 files

```
outputs/
  propuesta_empresa-manufactura_2026-04_ES.html    ← preview this first
  propuesta_empresa-manufactura_2026-04_EN.html
  propuesta_empresa-manufactura_2026-04_ES.docx    ← send to client
  propuesta_empresa-manufactura_2026-04_EN.docx
  propuesta_empresa-manufactura_2026-04_pricing.xlsx
  propuesta_empresa-manufactura_2026-04_ES.pptx    ← for meetings
  propuesta_empresa-manufactura_2026-04_EN.pptx
  propuesta_empresa-manufactura_2026-04_ES.md
  propuesta_empresa-manufactura_2026-04_EN.md
  propuesta_empresa-manufactura_2026-04_verification.md
```

Open the HTML file in your browser. If it looks right, you're done.

## Adjustments

Say what you want to change in plain language:

```
"El precio está muy alto para este cliente, ¿puedes hacer una versión más básica?"
"Change the timeline to start in August instead of May"
"El cliente se llama TechCorp Colombia, no tenía nombre antes"
"Make a white-label version for our partner IAC"
```

The agent edits surgically — it doesn't regenerate everything for a small change.

## That's it

Total time: 5–15 minutes depending on how much back-and-forth.
No training needed. No methodology knowledge required.
No MetodologIA brand knowledge needed.
The system knows all of that — you just describe the client and the need.

---

## Slash commands (full reference)

```bash
/propuesta [description]               # Start a proposal
/propuesta --brand cobrand --partner "Name #COLOR" [description]  # Co-brand
/propuesta --brand whitelabel --partner "Name #COLOR" [description]  # White-label
/propuesta --lang es [description]     # Spanish only (still generates EN)
/propuesta --format html [description] # HTML only (skips other formats)
/catalog --list b2b                    # See available B2B services
/catalog --find bootcamp-trabajar-amplificado  # Look up a service
/catalog --pending                     # See what's still POR CONFIRMAR
```

## Questions?

The agent understands natural language. Ask it anything:

```
"What services do you have for a 5-person startup?"
"What's the difference between the Workshop and the Bootcamp?"
"Can I give a discount on this proposal?"
"What happens if the client wants to pay in USD?"
```
