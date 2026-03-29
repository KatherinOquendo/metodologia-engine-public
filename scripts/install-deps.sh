#!/usr/bin/env bash
# install-deps.sh — MetodologIA Proposal Engine dependency installer
# Run once per environment, or re-run to verify/update.
#
# Installs:
#   npm:  docx@9, pptxgenjs@3, handlebars@4, js-yaml@4
#   pip:  openpyxl>=3.1, pyyaml>=6, jinja2>=3.1
#
# Usage:
#   bash scripts/install-deps.sh          # install all
#   bash scripts/install-deps.sh --check  # check only, no install
#   bash scripts/install-deps.sh --npm    # npm only
#   bash scripts/install-deps.sh --pip    # pip only
#
# Exit codes:
#   0 — all dependencies satisfied
#   1 — one or more installs failed
#   2 — missing runtime (node or python not found)

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; RESET='\033[0m'; BOLD='\033[1m'

ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✗${RESET} $*" >&2; }
info() { echo -e "${CYAN}→${RESET} $*"; }
hdr()  { echo -e "\n${BOLD}$*${RESET}"; }

# ─── Argument parsing ─────────────────────────────────────────────────────────
CHECK_ONLY=false
NPM_ONLY=false
PIP_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    --npm)   NPM_ONLY=true ;;
    --pip)   PIP_ONLY=true ;;
    -h|--help)
      echo "Usage: $0 [--check|--npm|--pip]"
      echo "  --check  Check installed deps only (no install)"
      echo "  --npm    Install npm packages only"
      echo "  --pip    Install pip packages only"
      exit 0
      ;;
  esac
done

FAILURES=0

# ─── Runtime detection ────────────────────────────────────────────────────────
hdr "MetodologIA Proposal Engine — Dependency Setup"

# Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
  if [ "$NODE_MAJOR" -ge 18 ]; then
    ok "Node.js $NODE_VER (≥18 required)"
  else
    err "Node.js $NODE_VER found — requires v18+. Upgrade at https://nodejs.org"
    exit 2
  fi
else
  warn "Node.js not found. npm packages will be skipped."
  warn "Install Node.js v18+ to enable HTML/DOCX/PPTX generation."
  NPM_ONLY=false
  [ "$PIP_ONLY" = false ] && warn "Proceeding with pip only."
fi

# Python
if command -v python3 &>/dev/null; then
  PY_VER=$(python3 --version 2>&1 | awk '{print $2}')
  PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
  PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
  if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 9 ]; then
    ok "Python $PY_VER (≥3.9 required)"
  else
    err "Python $PY_VER found — requires 3.9+."
    FAILURES=$((FAILURES + 1))
  fi
else
  warn "python3 not found. pip packages will be skipped (XLSX output disabled)."
  PIP_ONLY=false
fi

# ─── npm packages ─────────────────────────────────────────────────────────────
if [ "$PIP_ONLY" = false ] && command -v node &>/dev/null; then
  hdr "npm packages"

  # Determine install dir: prefer skill scripts dir, fall back to cwd
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  NPM_DIR="$SCRIPT_DIR/../skills/metodologia-proposal-engine"
  [ -d "$NPM_DIR" ] || NPM_DIR="$SCRIPT_DIR/.."

  NPM_PACKAGES=(
    "docx@9"
    "pptxgenjs@3"
    "handlebars@4"
    "js-yaml@4"
  )

  if [ "$CHECK_ONLY" = true ]; then
    info "Checking npm packages in $NPM_DIR ..."
    for pkg in "${NPM_PACKAGES[@]}"; do
      pkg_name=$(echo "$pkg" | cut -d@ -f1)
      if [ -d "$NPM_DIR/node_modules/$pkg_name" ]; then
        ok "$pkg"
      else
        warn "$pkg — NOT installed"
        FAILURES=$((FAILURES + 1))
      fi
    done
  else
    info "Installing npm packages into $NPM_DIR ..."
    cd "$NPM_DIR"
    for pkg in "${NPM_PACKAGES[@]}"; do
      pkg_name=$(echo "$pkg" | cut -d@ -f1)
      if [ -d "node_modules/$pkg_name" ]; then
        ok "$pkg (already installed)"
      else
        info "Installing $pkg ..."
        if npm install --save "$pkg" --prefer-offline 2>&1 | tail -3; then
          ok "$pkg installed"
        else
          err "Failed to install $pkg"
          FAILURES=$((FAILURES + 1))
        fi
      fi
    done
    cd - >/dev/null
  fi
fi

# ─── pip packages ─────────────────────────────────────────────────────────────
if [ "$NPM_ONLY" = false ] && command -v python3 &>/dev/null; then
  hdr "pip packages"

  PIP_PACKAGES=(
    "openpyxl>=3.1"
    "pyyaml>=6"
    "jinja2>=3.1"
  )

  if [ "$CHECK_ONLY" = true ]; then
    info "Checking pip packages ..."
    for pkg in "${PIP_PACKAGES[@]}"; do
      pkg_name=$(echo "$pkg" | sed 's/[>=<].*//')
      if python3 -c "import $pkg_name" 2>/dev/null; then
        ok "$pkg"
      else
        # Try import with normalized name (openpyxl, pyyaml→yaml, jinja2)
        import_name=$(echo "$pkg_name" | sed 's/pyyaml/yaml/' | sed 's/jinja2/jinja2/')
        if python3 -c "import $import_name" 2>/dev/null; then
          ok "$pkg"
        else
          warn "$pkg — NOT installed"
          FAILURES=$((FAILURES + 1))
        fi
      fi
    done
  else
    info "Installing pip packages ..."
    for pkg in "${PIP_PACKAGES[@]}"; do
      if pip3 install "$pkg" --quiet; then
        ok "$pkg installed"
      else
        err "Failed to install $pkg"
        FAILURES=$((FAILURES + 1))
      fi
    done
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
hdr "Summary"
if [ "$FAILURES" -eq 0 ]; then
  ok "All dependencies satisfied. Proposal engine is ready."
  echo ""
  echo "  Minimum output (always available):  2 × .md + 1 × verification report"
  echo "  With npm deps:                       + HTML, DOCX, PPTX (per language)"
  echo "  With pip deps:                       + XLSX (bilingual)"
else
  err "$FAILURES dependency check(s) failed."
  echo "  The engine will degrade gracefully: unavailable formats are skipped."
  echo "  Run without --check to attempt installation."
fi

exit $FAILURES
