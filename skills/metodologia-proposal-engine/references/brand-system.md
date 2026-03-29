# Brand System — MetodologIA Proposal Engine
# Covers: design tokens, dynamic branding, runtime resolution, per-format specs

## Contents
1. Design tokens (own brand)
2. Runtime brand resolution
3. Branding modes: own | cobrand | whitelabel
4. Per-format specs (HTML, DOCX, XLSX, PPTX)
5. Logo SVG codes
6. Compliance checklist

---

## 1. Design Tokens — Own Brand

```css
/* Color palette */
--navy:    #122562;   /* primary background, headings */
--gold:    #FFD700;   /* accent, CTAs, highlights */
--blue:    #137DC5;   /* links, section chips */
--dark:    #1F2833;   /* body text */
--lavender:#BBA0CC;   /* secondary chips, soft dividers */
--gray:    #808080;   /* borders, footnotes, support text */
--white:   #FFFFFF;   /* clean backgrounds */
--light:   #F8F9FC;   /* alternate section backgrounds */

/* Programmatic variants */
--navy-10: rgba(18,37,98,0.10);
--gold-20: rgba(255,215,0,0.20);
--blue-15: rgba(19,125,197,0.15);

/* Typography */
--font-display: 'Poppins', 'Arial', sans-serif;    /* headings, CTAs */
--font-body:    'Trebuchet MS', Arial, sans-serif; /* body text */
--font-note:    'Futura PT', 'Trebuchet MS', sans-serif; /* callouts, footnotes */

/* Spacing (Neo-Swiss grid) */
--space-sm: 8px; --space-md: 16px; --space-lg: 24px;
--space-xl: 40px; --space-2xl: 64px;

/* Shadows (soft, never dramatic) */
--shadow-sm: 0 1px 4px rgba(18,37,98,0.06);
--shadow-md: 0 2px 8px rgba(18,37,98,0.08);
/* NEVER: blur > 24px, opacity > 0.15 */

/* Border radii */
--radius-sm: 4px; --radius-md: 8px; --radius-lg: 16px;
```

**Typography scale:**
| Role | Font | Weight | Size |
|------|------|--------|------|
| Display/Hero | Poppins | 700 | 40–48px |
| H1 | Poppins | 700 | 28–32px |
| H2 | Poppins | 600 | 20–24px |
| H3 | Poppins | 600 | 16–18px |
| Body | Trebuchet MS | 400 | 14–16px |
| Small/Note | Futura/Trebuchet | 300 | 11–12px |

---

## 2. Runtime Brand Resolution

Call `scripts/brand-resolver.js` with input object:
```javascript
const config = await resolveBrand({
  brand_mode: 'own' | 'cobrand' | 'whitelabel',  // explicit input
  service_slug: 'bootcamp-trabajar-amplificado',  // to infer default_brand_mode
  partner: {                                       // required for cobrand/whitelabel
    name: 'Partner Corp',
    logo_svg: '...',          // inline SVG or path
    color_primary: '#005A8E',
    color_accent: '#F4A300',
    color_secondary: '#003D6B',
    font_display: 'Montserrat, Arial',
    font_body: 'Open Sans, Arial'
  }
});
// Returns: BrandConfig object with all resolved tokens
```

Resolution priority (from `catalog/segments.yaml`):
1. Explicit `brand_mode` in request → always wins
2. Service `default_brand_mode` in `catalog/services.yaml`
3. Channel inference: slug starting with `iac/` → whitelabel
4. Default: `own`

---

## 3. Branding Modes

### own (default)
All MetodologIA tokens apply. No partner presence.

### cobrand
- Both logos displayed: MetodologIA primary position, partner secondary
- `--gold` token replaced with partner's primary color
- `--navy`, `--blue`, `--dark` never replaced
- Typography never changed
- All section headers, footers, certificates show both brands
- **Rule:** partner brand adds, never substitutes. MetodologIA design system is the structural base.
- **Legal prerequisite:** signed master contract + brand use agreement

### whitelabel
- Partner brand completely replaces MetodologIA
- ALL color tokens replaced by partner palette
- ALL typography replaced by partner fonts
- MetodologIA name, logo, and references NEVER appear in output
- Methodology, structure, and quality standards remain unchanged
- Certificates issued under partner brand only
- **IAC:** this channel always defaults to whitelabel [DECISION 2026-03-29, JM: eliminates IAC-specific code paths everywhere; brand_mode handles it uniformly]
- **Legal prerequisite:** signed license contract + setup fee paid

---

## 4. Per-Format Brand Specs

### HTML
```css
/* Load Poppins from Google Fonts (own brand only) */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700');
/* For whitelabel: load partner's font or use font-face */
```
- Hero: `linear-gradient(135deg, var(--navy) 0%, #1a3a8c 100%)`
- Cards: `background: var(--light)`, `border-left: 3px solid var(--gold)`
- CTA button: `background: var(--gold)`, `color: var(--navy)`, `font-family: var(--font-display)`

### DOCX (Office-compatible)
```javascript
// Fonts: Poppins → Arial, Futura → Trebuchet MS (Office compat)
FONT_HEADING = 'Arial'
FONT_BODY    = 'Trebuchet MS'
FONT_NOTE    = 'Trebuchet MS'
// Colors (hex, no #)
NAVY = '122562'; GOLD = 'FFD700'; BLUE = '137DC5'
DARK = '1F2833'; GRAY = '808080'; LIGHT = 'F8F9FC'
// Font sizes (half-points: 1pt = 2 units)
H1 = 56; H2 = 40; H3 = 32; BODY = 26; NOTE = 20
// Page: US Letter | 1" margins
PAGE_W = 12240; PAGE_H = 15840; MARGIN = 1440
```
**Table rules:** always `columnWidths` array + `width` on each cell (dual width). Use `WidthType.DXA`. Never `WidthType.PERCENTAGE` (breaks in Google Docs). Use `ShadingType.CLEAR` never `SOLID`.

### XLSX (openpyxl)
```python
header_font  = Font(name='Arial', bold=True, color='FFFFFF', size=11)
header_fill  = PatternFill('solid', start_color='122562')
total_fill   = PatternFill('solid', start_color='FFD700')
total_font   = Font(name='Arial', bold=True, size=12, color='122562')
alt_fill     = PatternFill('solid', start_color='F8F9FC')
thin_border  = Side(style='thin', color='E0E4F0')
```

### PPTX (pptxgenjs)
```javascript
// Slide: 16:9, 10" × 5.63"
// Colors (no #): NAVY='122562', GOLD='FFD700', BLUE='137DC5'
// Slide structure: tag (9pt, charSpacing:4) → title (24pt bold) → accent line (3pt gold)
// Slide footer: ID + brand, 8pt white on navy bar
// Cover: navy bg, darker left panel, gold bottom-right bar
// CTA slide: navy bg, gold CTA button shape
```

---

## 5. Logo SVG (inline-embeddable)

### MetodologIA (36×36)
```svg
<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#0A122A"/>
    <stop offset="100%" stop-color="#1E293B"/>
  </linearGradient></defs>
  <rect width="36" height="36" rx="10" fill="url(#lg)"/>
  <!-- Pillar 1: solid -->
  <rect x="10" y="12" width="3" height="12" rx="1" fill="white"/>
  <!-- Pillar 2: top + small base -->
  <rect x="16" y="12" width="3" height="8" rx="1" fill="white"/>
  <rect x="16" y="22" width="3" height="2" rx="1" fill="white"/>
  <!-- Pillar 3: top + medium base -->
  <rect x="22" y="12" width="3" height="6" rx="1" fill="white"/>
  <rect x="22" y="20" width="3" height="4" rx="1" fill="white"/>
  <!-- AI dot: gold -->
  <circle cx="18" cy="8" r="2" fill="#FFD700"/>
</svg>
```

### Compact (16×16 for DOCX headers, XLSX cells)
Replace `width="36" height="36"` with `width="16" height="16"`.

---

## 6. Brand Compliance Checklist

Before finalizing any output:
```
□ Colors: only defined palette tokens (or partner's when cobrand/whitelabel)
□ Typography: Poppins headings, Trebuchet body (own/cobrand)
□ Shadows: blur ≤24px, opacity ≤0.15 (own/cobrand)
□ Gradients: only micro-gradients (own/cobrand) — no realistic shadows
□ Logo: correct size and clear space
□ CTA button: gold background, navy text, Poppins bold (own/cobrand)
□ Whitelabel: ZERO MetodologIA references in any output file
□ Cobrand: ONLY gold token overridden by partner primary — all else MetodologIA
```
