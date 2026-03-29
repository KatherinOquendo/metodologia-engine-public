#!/usr/bin/env bash
# post-write-qa.sh — MetodologIA Proposal Engine Plugin
# Runs after every Write|Edit tool call. Checks output completeness
# and flags legal gate violations in written files.
# Args: $1 = $PWD (project working directory)

set -euo pipefail

PROJECT_DIR="${1:-$PWD}"
OUTPUTS_DIR="$PROJECT_DIR/outputs"

# ─── Guard: only care about files in outputs/ ────────────────────────────────
if [ ! -d "$OUTPUTS_DIR" ]; then
  exit 0
fi

# ─── 1. Count proposal files in outputs/ ─────────────────────────────────────
PROPOSAL_FILES=$(find "$OUTPUTS_DIR" -name "propuesta_*" -type f 2>/dev/null | wc -l)
VERIFY_FILES=$(find "$OUTPUTS_DIR" -name "verification-report_*" -type f 2>/dev/null | wc -l)

# ─── 2. Check for BLOCKED verification reports ───────────────────────────────
BLOCKED_REPORTS=$(find "$OUTPUTS_DIR" -name "verification-report_*" -type f 2>/dev/null | \
  xargs grep -l "🔴 BLOCKED\|Status: BLOCKED" 2>/dev/null | wc -l || echo "0")

# ─── 3. Check for red list words in proposal files (quick spot check) ────────
RED_LIST_HITS=$(find "$OUTPUTS_DIR" -name "propuesta_*" -newer "$OUTPUTS_DIR" -type f 2>/dev/null | \
  xargs grep -li "guaranteed results\|resultados garantizados\|transformación\|revolutionary\|disruptivo" 2>/dev/null | wc -l || echo "0")

# ─── 4. Check white-label files for MetodologIA references ───────────────────
WHITELABEL_FILES=$(find "$OUTPUTS_DIR" -name "propuesta_*whitelabel*" -type f 2>/dev/null | wc -l)
WHITELABEL_LEAKS=0
if [ "$WHITELABEL_FILES" -gt 0 ]; then
  WHITELABEL_LEAKS=$(find "$OUTPUTS_DIR" -name "propuesta_*whitelabel*" -type f 2>/dev/null | \
    xargs grep -li "MetodologIA\|metodolog" 2>/dev/null | wc -l || echo "0")
fi

# ─── 5. Output warnings if issues detected ───────────────────────────────────
echo ""
echo "📋 [metodologia-engine] Post-write QA check"
echo "   Output files: $PROPOSAL_FILES proposal + $VERIFY_FILES verification"

if [ "$PROPOSAL_FILES" -gt 0 ] && [ "$PROPOSAL_FILES" -lt 10 ]; then
  echo "   ⚠️  Incomplete output: $PROPOSAL_FILES/10 files generated (DOCX/PPTX/XLSX may need npm/pip packages)"
fi

if [ "$BLOCKED_REPORTS" -gt 0 ]; then
  echo "   🔴 ALERT: $BLOCKED_REPORTS verification report(s) show BLOCKED status — do not send these proposals"
fi

if [ "$RED_LIST_HITS" -gt 0 ]; then
  echo "   ⚠️  Potential red list words detected in $RED_LIST_HITS file(s) — run /verificar to check"
fi

if [ "$WHITELABEL_LEAKS" -gt 0 ]; then
  echo "   🔴 ALERT: $WHITELABEL_LEAKS white-label file(s) contain 'MetodologIA' references — must be cleaned before sending"
fi

if [ "$PROPOSAL_FILES" -ge 10 ] && [ "$BLOCKED_REPORTS" -eq 0 ] && [ "$RED_LIST_HITS" -eq 0 ] && [ "$WHITELABEL_LEAKS" -eq 0 ]; then
  echo "   ✅ All checks passed ($PROPOSAL_FILES/10 files, no blockers detected)"
fi

echo ""
