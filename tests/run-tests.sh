#!/usr/bin/env bash
# run-tests.sh — MetodologIA Proposal Engine test runner
# Runs all unit + integration tests via Node.js (zero external deps)
#
# Usage:
#   bash tests/run-tests.sh           # run all suites
#   bash tests/run-tests.sh --unit    # unit tests only
#   bash tests/run-tests.sh --integ   # integration tests only
#   bash tests/run-tests.sh --watch   # re-run on file change (requires entr)
#
# Exit codes:
#   0 — all tests passed
#   1 — one or more tests failed
#   2 — Node.js not found

set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'

info()  { echo -e "${CYAN}→${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
err()   { echo -e "${RED}✗${RESET} $*" >&2; }
hdr()   { echo -e "\n${BOLD}$*${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v node &>/dev/null; then
  err "Node.js not found. Install Node.js v18+ to run tests."
  exit 2
fi

NODE_MAJOR=$(node --version | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node.js v18+ required (found $(node --version))"
  exit 2
fi

# ─── Argument parsing ─────────────────────────────────────────────────────────
UNIT_ONLY=false
INTEG_ONLY=false
WATCH=false

for arg in "$@"; do
  case "$arg" in
    --unit)  UNIT_ONLY=true ;;
    --integ) INTEG_ONLY=true ;;
    --watch) WATCH=true ;;
    -h|--help)
      echo "Usage: $0 [--unit|--integ|--watch]"
      exit 0
      ;;
  esac
done

# ─── Test suites ──────────────────────────────────────────────────────────────
UNIT_SUITES=(
  "$SCRIPT_DIR/unit/slug.test.js"
  "$SCRIPT_DIR/unit/price.test.js"
  "$SCRIPT_DIR/unit/date.test.js"
  "$SCRIPT_DIR/unit/verify-legal.test.js"
)

INTEG_SUITES=(
  "$SCRIPT_DIR/integration/command-to-agent.test.js"
)

# ─── Runner function ──────────────────────────────────────────────────────────
run_suite() {
  local file="$1"
  local name
  name="$(basename "$file")"
  node - "$file" "$SCRIPT_DIR" <<'NODEEOF'
const [,, suiteFile, harnessDir] = process.argv;
const harness = require(harnessDir + '/harness');
// Re-inject harness into the suite's require resolution
const Module = require('module');
const orig = Module._resolveFilename;
Module._resolveFilename = function(req, parent, ...args) {
  if (req === '../harness') return require.resolve(harnessDir + '/harness');
  return orig.call(this, req, parent, ...args);
};
require(suiteFile);
harness.runAll().then(({ failed }) => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
NODEEOF
}

# ─── Execute ──────────────────────────────────────────────────────────────────
run_tests() {
  local total_suites=0
  local failed_suites=0

  hdr "MetodologIA Proposal Engine — Test Suite"
  echo "  Node.js $(node --version)"
  echo "  Root: $PLUGIN_ROOT"

  run_group() {
    local label="$1"
    shift
    local suites=("$@")

    hdr "$label"
    for suite in "${suites[@]}"; do
      if [ ! -f "$suite" ]; then
        err "Suite not found: $suite"
        failed_suites=$((failed_suites + 1))
        continue
      fi
      total_suites=$((total_suites + 1))
      local name
      name="$(basename "$suite")"
      info "Running $name ..."
      if run_suite "$suite"; then
        ok "$name — PASS"
      else
        err "$name — FAIL"
        failed_suites=$((failed_suites + 1))
      fi
    done
  }

  if [ "$INTEG_ONLY" = false ]; then
    run_group "Unit Tests" "${UNIT_SUITES[@]}"
  fi

  if [ "$UNIT_ONLY" = false ]; then
    run_group "Integration Tests" "${INTEG_SUITES[@]}"
  fi

  hdr "Overall"
  echo "  Suites: $total_suites  |  Failed: $failed_suites"

  if [ "$failed_suites" -eq 0 ]; then
    ok "All suites passed."
    return 0
  else
    err "$failed_suites suite(s) failed."
    return 1
  fi
}

if [ "$WATCH" = true ]; then
  if ! command -v entr &>/dev/null; then
    err "--watch requires 'entr'. Install: brew install entr / apt install entr"
    exit 1
  fi
  info "Watch mode — re-runs on .js file change. Ctrl+C to stop."
  find "$PLUGIN_ROOT/tests" "$PLUGIN_ROOT/skills/metodologia-proposal-engine/scripts" \
    -name "*.js" | entr -c bash "$0" "$@" --no-watch 2>/dev/null
else
  run_tests
fi
