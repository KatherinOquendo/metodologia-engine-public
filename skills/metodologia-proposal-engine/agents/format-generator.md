# Subagent: Format Generator
# Spawn when: parallelizing format generation (Cowork environment) 
# or when user requests a specific format only.

## Role
Generate a single output format from a validated ProposalData object.
You receive: a JSON-serialized ProposalData + a BrandConfig object + target format + target language.
You produce: the output file.

## Input protocol
```
Format: [html | docx | xlsx | pptx | markdown]
Language: [es | en | both]
ProposalData: [JSON]
BrandConfig: [JSON — from brand-resolver.js output]
OutputDir: [path]
```

## Per-format instructions

### HTML
- Load `references/brand-system.md §4 HTML` for CSS patterns.
- Import Poppins from Google Fonts (own brand only); for whitelabel, use partner fonts.
- Must be responsive (mobile breakpoint at 640px).
- Hero: gradient using brand primary color.
- Pricing table: header navy, alternating rows, gold total row.
- CTA button: brand accent color, display font bold.
- Footer: brand primary bg, proposal ID + brand name.
- Verify: zero MetodologIA references if whitelabel.

### DOCX
- Read `references/brand-system.md §4 DOCX` for styles.
- Use `docx` npm package (`npm install -g docx`).
- Set page size explicitly: US Letter (12240 × 15840 DXA), 1" margins.
- Font substitutions: Poppins → Arial, Futura → Trebuchet MS (Office compat).
- Never use `\n` — separate Paragraph elements only.
- Never use unicode bullets — use `LevelFormat.BULLET` with numbering config.
- Tables: always set both `columnWidths` array AND `width` on each cell.
- Always `ShadingType.CLEAR` never `SOLID`.
- Run `validate.py` after creation if available.

### XLSX
- Use `openpyxl` (`pip install openpyxl --break-system-packages`).
- Create two sheets: "ES — Propuesta" and "EN — Proposal".
- Run `scripts/recalc.py` after if available (recalculates formulas via LibreOffice).
- Use Excel formulas for totals (`=SUM(D5:D{n})`) — never hardcode calculated values.
- Apply brand colors: header navy fill + white text, total row gold fill + navy text.
- Verify zero formula errors before saving.

### PPTX
- Use `pptxgenjs` npm package (`npm install -g pptxgenjs`).
- Layout: `LAYOUT_WIDE` (10" × 5.63").
- Minimum 6 slides: cover, problem, solution, scope, pricing, CTA.
- Cover: brand primary background, darker left panel, brand accent bottom-right bar.
- Section slides: white bg, section tag (9pt, charSpacing 4), title 22pt bold, 3pt accent line.
- Footer bar on all slides: brand primary, proposal ID + brand name, 8pt white.
- Read `references/brand-system.md §4 PPTX` for exact measurements.

### Markdown
- Clean front matter (YAML): id, date, client, lang, version, valid_days.
- Standard sections: Executive Summary, Challenge, Solution, Scope, Work Plan, Investment, Why Us, Next Steps.
- Investment as markdown table.
- Footer: valid X days from date · ID.
- No HTML in markdown output.

## Quality checks before returning file
```
□ File opens without errors
□ All prices match ProposalData.services array
□ CTA present and has action verb
□ Language is correct (no mixing unless explicitly both)
□ Brand tokens correctly applied
□ Whitelabel: MetodologIA not mentioned anywhere
□ File size reasonable (HTML < 300KB, DOCX < 5MB, XLSX < 2MB, PPTX < 20MB)
```

## Output
Return: `{ success: true, path: "[outputDir]/[filename]" }` or `{ success: false, error: "[description]" }`
