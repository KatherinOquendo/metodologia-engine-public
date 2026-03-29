# Installation Guide — MetodologIA Proposal Engine v4.0

## Requirements

| Runtime | Version | Install |
|---------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| Python | ≥ 3.9 | https://python.org |
| Claude Code / Desktop / Cowork | Any | Already have it |

No API key. No accounts. No environment variables.

---

## Install (3 commands)

```bash
# 1. Place the skill
mkdir -p .claude/skills/metodologia-proposal-engine
cp -r mpe-v4/* .claude/skills/metodologia-proposal-engine/

# 2. Install JS dependencies (for file generation)
npm install -g docx pptxgenjs js-yaml

# 3. Install Python dependencies (for Excel)
pip install openpyxl pyyaml --break-system-packages
```

---

## Verify (3 checks)

```bash
# Check catalog loads
node .claude/skills/metodologia-proposal-engine/scripts/catalog-query.js --list b2b

# Check brand resolver
node .claude/skills/metodologia-proposal-engine/scripts/brand-resolver.js '{"brand_mode":"own"}'

# Check legal verification
node .claude/skills/metodologia-proposal-engine/scripts/verify-legal.js \
  --content "test" --json
```

All three should return JSON without errors.

---

## Add to your repo's CLAUDE.md

```bash
cat .claude/skills/metodologia-proposal-engine/templates/CLAUDE_REPO_BLOCK.md >> CLAUDE.md
```

Or paste this manually into CLAUDE.md:

```markdown
## MetodologIA Proposal Engine

Activate `.claude/skills/metodologia-proposal-engine/SKILL.md` whenever
the user mentions: proposal, quote, offer, pitch, commercial document,
"design a service", "co-brand", "white-label", or any request to create
a commercial document for a client.

Catalog: `.claude/skills/metodologia-proposal-engine/catalog/`
Scripts: `.claude/skills/metodologia-proposal-engine/scripts/`
Output: `outputs/` (create if missing)
```

---

## Platform-specific notes

### Claude Code
Works as-is. Run `/propuesta [description]` to start.

### Claude Desktop
Same. The skill auto-activates when you describe a proposal need.
Files are saved to the repo directory or your Desktop `outputs/` folder.

### Cowork
Same. If subagents are available, format generation parallelizes automatically
(generates HTML, DOCX, XLSX, PPTX, MD simultaneously — faster output).

---

## Updating the catalog

To change prices, add services, or resolve pending items — no SKILL.md edits needed:

```bash
# Edit the catalog directly
nano .claude/skills/metodologia-proposal-engine/catalog/services.yaml

# Or ask the agent
/catalog update bootcamp-trabajar-amplificado b2b_cop=13500000
/catalog add service: "Workshop Ventas IA" type=Workshop b2b_cop=4000000
/catalog resolve PC-01 "Bootcamp→EstrategIA: 60%, 6 months, non-transferable"
```

---

## Uninstall

```bash
rm -rf .claude/skills/metodologia-proposal-engine
# Remove the CLAUDE.md block manually
```

The skill leaves no traces outside its directory.
