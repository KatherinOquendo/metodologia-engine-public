# Hook: pre-generate
# Triggered: immediately before Layer 4 (file generation) begins.
# Purpose: last-gate checks that are faster to run here than in verify-legal.js.

## Required inputs at this point
- ProposalData JSON (complete, all fields resolved)
- BrandConfig (from brand-resolver.js)
- VerificationReport (status must be APPROVED or APPROVED_WITH_WARNINGS)

## Pre-generation checks

### 1. Verification gate
```javascript
if (verificationReport.status === 'BLOCKED') {
  throw new Error('Cannot generate: verification failed. Fix blockers first.');
}
```

### 2. ProposalData completeness
Required fields — abort if any missing:
```
□ id (non-empty string)
□ date (YYYY-MM-DD format)
□ client.company (non-empty)
□ services (array with ≥1 item, each has name + price)
□ i18n.es (complete ProposalContent)
□ i18n.en (complete ProposalContent)
□ brand (BrandConfig object)
□ segment (b2b | b2c | cobrand | whitelabel)
```

### 3. CTA validity (each language)
Each `i18n.[lang].cta_text` must contain a verb + object.
Flag (warn, don't abort) if CTA is generic ("contact us", "let us know").

### 4. Scope/exclusions balance
If `scope` has >8 items and `exclusions` is empty → warn:
"Long scope list without exclusions may create scope creep expectations. Consider adding exclusions."

### 5. Price consistency check
All `services[].price` values must match catalog prices (within COP 0 tolerance for confirmed services, allowed to differ for [POR CONFIRMAR] items that are clearly marked).

### 6. Output directory
```bash
mkdir -p [OUTPUT_DIR]
# Verify write permissions
touch [OUTPUT_DIR]/.write_test && rm [OUTPUT_DIR]/.write_test || \
  echo "WARNING: output directory not writable"
```

### 7. Dependencies check
```bash
# Check npm packages
node -e "require('docx')" 2>/dev/null || echo "MISSING: npm install -g docx"
node -e "require('pptxgenjs')" 2>/dev/null || echo "MISSING: npm install -g pptxgenjs"
# Check python
python3 -c "import openpyxl" 2>/dev/null || echo "MISSING: pip install openpyxl --break-system-packages"
```

## Output
If all checks pass: proceed to Layer 4.
If any ABORT check fails: surface the specific error to the user.
If only warnings: log warnings in verification report, proceed.

## File naming validation
Generate and validate all output filenames before creating any file:
```javascript
const slug = companySlug(proposalData.client.company);  // lowercase-kebab
const month = proposalData.date.slice(0,7).replace('-','');
const base = `propuesta_${slug}_${month}`;
// Verify no existing file will be overwritten (unless user confirmed)
```
