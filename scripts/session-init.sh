#!/usr/bin/env bash
# session-init.sh — MetodologIA Proposal Engine Plugin
# Runs at SessionStart: loads catalog summary, flags [POR CONFIRMAR] items,
# initializes proposal state file for the session.
# Args: $1 = $PWD (project working directory)

set -euo pipefail

PROJECT_DIR="${1:-$PWD}"
PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_DIR="$PLUGIN_DIR/skills/metodologia-proposal-engine"
STATE_FILE="$PROJECT_DIR/.proposal-state.json"

# ─── Guard: only run if skill directory exists ────────────────────────────────
if [ ! -d "$SKILL_DIR" ]; then
  echo "⚠️  [metodologia-engine] Skill directory not found: $SKILL_DIR" >&2
  exit 0
fi

# ─── 1. Count available services ─────────────────────────────────────────────
SERVICES_YAML="$SKILL_DIR/catalog/services.yaml"
if [ -f "$SERVICES_YAML" ]; then
  TOTAL=$(grep -c "^  - slug:" "$SERVICES_YAML" 2>/dev/null || echo "?")
  TIER1=$(grep -A1 "tier: 1" "$SERVICES_YAML" 2>/dev/null | grep -c "tier:" || echo "?")
  TIER2=$(grep -A1 "tier: 2" "$SERVICES_YAML" 2>/dev/null | grep -c "tier:" || echo "?")
  TIER3=$(grep -A1 "tier: 3" "$SERVICES_YAML" 2>/dev/null | grep -c "tier:" || echo "?")
else
  TOTAL="?"; TIER1="?"; TIER2="?"; TIER3="?"
fi

# ─── 2. Count active [POR CONFIRMAR] items ───────────────────────────────────
PC_COUNT=$(grep -r "POR_CONFIRMAR\|POR CONFIRMAR" "$SKILL_DIR/catalog/" 2>/dev/null | grep -v "^Binary" | wc -l || echo "0")
PC_CRITICAL=$(grep -r "PC-01\|PC-02\|PC-05" "$SKILL_DIR/catalog/" 2>/dev/null | wc -l || echo "0")

# ─── 3. Write proposal state file ────────────────────────────────────────────
cat > "$STATE_FILE" <<EOF
{
  "session_start": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "plugin": "metodologia-engine",
  "catalog": {
    "total_services": $TOTAL,
    "tier1": $TIER1,
    "tier2": $TIER2,
    "tier3": $TIER3,
    "por_confirmar_items": $PC_COUNT,
    "por_confirmar_critical": $PC_CRITICAL
  },
  "proposal": null,
  "verification_status": null
}
EOF

# ─── 4. Output context injection (appears in Claude Code session context) ─────
cat <<CONTEXT

---
## MetodologIA Proposal Engine — Session Context

**Catalog loaded:** $TOTAL services ($TIER1 Tier 1 · $TIER2 Tier 2 · $TIER3 Tier 3 IAC)
**[POR CONFIRMAR] items active:** $PC_COUNT (${PC_CRITICAL} critical: PC-01, PC-02, PC-05)

**Quick commands:**
- \`/propuesta [descripción]\` — Full proposal pipeline → 10 files
- \`/cotizacion [servicio] [cliente]\` — Quick price estimate
- \`/catalogo [filtro]\` — Browse service catalog
- \`/verificar [contenido]\` — Legal compliance check
- \`/actualizar-catalogo\` — Update catalog

**Key rules active this session:**
- Never state [POR CONFIRMAR] items as confirmed
- Legal gate mandatory before any file generation
- All output bilingual (ES + EN) unless user opts out
- "Transformation" → always "(R)Evolution"
---

CONTEXT
