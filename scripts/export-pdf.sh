#!/usr/bin/env bash
# export-pdf.sh — Export HTML proposal files to PDF
# MetodologIA Proposal Engine v1.1
#
# Tries PDF renderers in order of quality:
#   1. Puppeteer (Node.js) — best fidelity, supports CSS print rules
#   2. wkhtmltopdf         — reliable fallback, no JS
#   3. Chromium headless   — system Chrome/Chromium if available
#   4. Print reminder      — if nothing works, guides the user
#
# Usage:
#   bash scripts/export-pdf.sh outputs/propuesta_*.html
#   bash scripts/export-pdf.sh --all        # process all HTML in outputs/
#   bash scripts/export-pdf.sh --dir /path  # process HTML in a specific dir
#
# Output: same directory as source HTML, filename changes .html → .pdf
#
# Exit codes:
#   0 — at least one PDF generated
#   1 — no renderer available
#   2 — no HTML files found

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; RESET='\033[0m'; BOLD='\033[1m'

ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✗${RESET} $*" >&2; }
info() { echo -e "${CYAN}→${RESET} $*"; }
hdr()  { echo -e "\n${BOLD}$*${RESET}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ─── PDF page settings ────────────────────────────────────────────────────────
PAGE_SIZE="A4"
PAGE_MARGIN="15mm"
PRINT_BG="true"    # include background colors/images

# ─── Argument parsing ─────────────────────────────────────────────────────────
HTML_FILES=()
OUTPUT_DIR=""

if [ "$#" -eq 0 ] || [ "$1" = "--all" ]; then
  # Default: find all proposal HTML in outputs/
  DEFAULT_OUT="$PLUGIN_ROOT/outputs"
  [ -d "$DEFAULT_OUT" ] || DEFAULT_OUT="$PWD/outputs"
  if [ -d "$DEFAULT_OUT" ]; then
    while IFS= read -r f; do HTML_FILES+=("$f"); done \
      < <(find "$DEFAULT_OUT" -maxdepth 1 -name "propuesta_*.html" 2>/dev/null)
  fi
elif [ "$1" = "--dir" ] && [ -n "${2:-}" ]; then
  while IFS= read -r f; do HTML_FILES+=("$f"); done \
    < <(find "$2" -maxdepth 1 -name "*.html" 2>/dev/null)
  OUTPUT_DIR="$2"
else
  HTML_FILES=("$@")
fi

if [ "${#HTML_FILES[@]}" -eq 0 ]; then
  err "No HTML files found."
  echo "  Usage: $0 outputs/propuesta_*.html"
  echo "         $0 --all"
  exit 2
fi

hdr "MetodologIA Proposal Engine — PDF Export"
info "Files to export: ${#HTML_FILES[@]}"

# ─── Detect available renderer ────────────────────────────────────────────────
RENDERER=""
RENDERER_CMD=""

# 1. Puppeteer via Node.js inline script
if command -v node &>/dev/null; then
  # Check if puppeteer is installed
  PPTR_CHECK="$PLUGIN_ROOT/skills/metodologia-proposal-engine/node_modules/puppeteer"
  PPTR_GLOBAL="$(node -e "require.resolve('puppeteer')" 2>/dev/null || true)"
  if [ -d "$PPTR_CHECK" ] || [ -n "$PPTR_GLOBAL" ]; then
    RENDERER="puppeteer"
    info "Renderer: Puppeteer (Node.js) — best quality"
  fi
fi

# 2. wkhtmltopdf
if [ -z "$RENDERER" ] && command -v wkhtmltopdf &>/dev/null; then
  RENDERER="wkhtmltopdf"
  info "Renderer: wkhtmltopdf — good quality"
fi

# 3. Chromium/Chrome headless
if [ -z "$RENDERER" ]; then
  for chrome_cmd in google-chrome chromium-browser chromium google-chrome-stable; do
    if command -v "$chrome_cmd" &>/dev/null; then
      RENDERER="chromium"
      RENDERER_CMD="$chrome_cmd"
      info "Renderer: $chrome_cmd (headless) — good quality"
      break
    fi
  done
fi

if [ -z "$RENDERER" ]; then
  warn "No PDF renderer found."
  echo ""
  echo "  To enable PDF export, install ONE of:"
  echo "    Puppeteer:    npm install puppeteer  (in skills/metodologia-proposal-engine/)"
  echo "    wkhtmltopdf:  https://wkhtmltopdf.org/downloads.html"
  echo "    Chrome:       https://google.com/chrome"
  echo ""
  echo "  Workaround: open the HTML file in any browser and use File → Print → Save as PDF."
  echo "  The HTML template includes @media print styles optimized for A4."
  exit 1
fi

# ─── Puppeteer inline script ──────────────────────────────────────────────────
puppeteer_pdf() {
  local html_path="$1"
  local pdf_path="$2"

  # Resolve puppeteer module path
  local pptr_path="$PLUGIN_ROOT/skills/metodologia-proposal-engine/node_modules/puppeteer"
  [ -d "$pptr_path" ] || pptr_path=""

  node - "$html_path" "$pdf_path" "$pptr_path" <<'NODEEOF'
const [,, htmlFile, pdfFile, pptarPath] = process.argv;
const pptr = require(pptarPath || 'puppeteer');
const path = require('path');
(async () => {
  const browser = await pptr.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page    = await browser.newPage();
  const fileUrl = 'file://' + path.resolve(htmlFile);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.pdf({
    path:              pdfFile,
    format:            'A4',
    margin:            { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    printBackground:   true,
    displayHeaderFooter: false,
    preferCSSPageSize: false,
  });
  await browser.close();
  console.log('PDF written: ' + pdfFile);
})().catch(e => { console.error(e.message); process.exit(1); });
NODEEOF
}

# ─── wkhtmltopdf renderer ─────────────────────────────────────────────────────
wkhtmltopdf_pdf() {
  local html_path="$1"
  local pdf_path="$2"
  wkhtmltopdf \
    --page-size "$PAGE_SIZE" \
    --margin-top "$PAGE_MARGIN" \
    --margin-bottom "$PAGE_MARGIN" \
    --margin-left "$PAGE_MARGIN" \
    --margin-right "$PAGE_MARGIN" \
    --print-media-type \
    --enable-local-file-access \
    --no-stop-slow-scripts \
    --quiet \
    "$html_path" "$pdf_path"
}

# ─── Chromium headless renderer ───────────────────────────────────────────────
chromium_pdf() {
  local html_path="$1"
  local pdf_path="$2"
  "$RENDERER_CMD" \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --print-to-pdf="$pdf_path" \
    --print-to-pdf-no-header \
    --no-pdf-header-footer \
    "file://$(realpath "$html_path")" 2>/dev/null
}

# ─── Process each file ────────────────────────────────────────────────────────
GENERATED=0
FAILED=0

for html_file in "${HTML_FILES[@]}"; do
  if [ ! -f "$html_file" ]; then
    warn "File not found: $html_file — skipping"
    continue
  fi

  pdf_file="${html_file%.html}.pdf"
  base="$(basename "$html_file")"

  info "Exporting: $base"

  case "$RENDERER" in
    puppeteer)
      if puppeteer_pdf "$html_file" "$pdf_file" 2>/dev/null; then
        ok "→ $(basename "$pdf_file")"
        GENERATED=$((GENERATED + 1))
      else
        err "Puppeteer failed for $base"
        FAILED=$((FAILED + 1))
      fi
      ;;
    wkhtmltopdf)
      if wkhtmltopdf_pdf "$html_file" "$pdf_file" 2>/dev/null; then
        ok "→ $(basename "$pdf_file")"
        GENERATED=$((GENERATED + 1))
      else
        err "wkhtmltopdf failed for $base"
        FAILED=$((FAILED + 1))
      fi
      ;;
    chromium)
      if chromium_pdf "$html_file" "$pdf_file" 2>/dev/null; then
        ok "→ $(basename "$pdf_file")"
        GENERATED=$((GENERATED + 1))
      else
        err "Chromium failed for $base"
        FAILED=$((FAILED + 1))
      fi
      ;;
  esac
done

# ─── Summary ──────────────────────────────────────────────────────────────────
hdr "Export Summary"
ok "$GENERATED PDF(s) generated"
[ "$FAILED" -gt 0 ] && warn "$FAILED file(s) failed to export"

if [ "$GENERATED" -gt 0 ]; then
  info "Output location: same directory as source HTML"
fi

[ "$GENERATED" -gt 0 ] && exit 0 || exit 1
