# Hook: post-generate
# Triggered: after all files in Layer 4 are written to disk.
# Purpose: verify files were actually created, spot-check quality.

## File existence check
```bash
# Verify all 10 expected output files exist
for f in \
  "${BASE}_ES.html" "${BASE}_EN.html" \
  "${BASE}_ES.docx" "${BASE}_EN.docx" \
  "${BASE}_pricing.xlsx" \
  "${BASE}_ES.pptx" "${BASE}_EN.pptx" \
  "${BASE}_ES.md" "${BASE}_EN.md" \
  "${BASE}_verification.md"; do
  [ -f "$OUTPUT_DIR/$f" ] && echo "✓ $f" || echo "✗ MISSING: $f"
done
```

## File size sanity (soft limits — warn but don't abort)
```
HTML:  1KB–500KB   (< 1KB = likely empty; > 500KB = likely bloated)
DOCX:  5KB–10MB
XLSX:  1KB–5MB
PPTX:  10KB–50MB
MD:    1KB–200KB
```

## Content spot-checks

### Whitelabel: zero MetodologIA references
```bash
if [ "$BRAND_MODE" = "whitelabel" ]; then
  for f in "${BASE}_ES.html" "${BASE}_EN.html" "${BASE}_ES.md" "${BASE}_EN.md"; do
    grep -i "metodolog" "$OUTPUT_DIR/$f" && \
      echo "⚠️ WHITELABEL VIOLATION: MetodologIA found in $f" || echo "✓ $f clean"
  done
fi
```

### CTA presence in HTML files
```bash
grep -i "accept proposal\|aceptar propuesta\|schedule\|agendar\|mailto:" \
  "$OUTPUT_DIR/${BASE}_ES.html" > /dev/null && echo "✓ CTA present" || echo "⚠️ CTA missing in ES HTML"
```

### Price in MD files
```bash
grep -i "COP\|total" "$OUTPUT_DIR/${BASE}_ES.md" > /dev/null && \
  echo "✓ Price section present" || echo "⚠️ Price section not found in ES MD"
```

## Summary report
After checks, print:
```
POST-GENERATION QA
==================
Files generated: [n]/10
Missing files: [list or "none"]
Whitelabel check: [PASS | FAIL | N/A]
Size anomalies: [list or "none"]
Content checks: [PASS | WARNINGS]

Output directory: [path]
Total size: [X] KB
```

## On partial failure
If some files are missing:
1. Identify which format failed (check script error output).
2. Retry only the failed format (do not regenerate all).
3. If retry also fails: report to user with the specific error + dependency hint.

Never silently skip a format. A missing file must be explicitly reported.
