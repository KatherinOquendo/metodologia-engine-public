# Data Schemas — MetodologIA Proposal Engine
# Machine-readable contracts for interoperability between skills, agents, and scripts.

## ProposalData (input to generate-all.js)

```typescript
interface ProposalData {
  // Identity
  id: string;              // "PRO-YYYY-NNN"
  date: string;            // "YYYY-MM-DD"
  valid_days: number;      // proposal validity

  // Parties
  client: {
    name: string;
    company: string;
    role: string;
    industry: string;
    email?: string;
  };
  provider: {
    name: string;
    company: string;
    email: string;
    web: string;
    city: string;
    nit?: string;           // B2B invoice requirement (Colombia)
    tax_regime?: string;
  };

  // Service
  service_slug: string;    // from catalog/services.yaml
  segment: "b2b" | "b2c" | "cobrand" | "whitelabel";

  // Branding (resolved by brand-resolver.js)
  brand: BrandConfig;      // see BrandConfig below

  // Commercial
  services: ServiceLine[];
  currency: "COP" | "USD" | "EUR";
  payment_terms: string;

  // Content (bilingual)
  i18n: {
    es: ProposalContent;
    en: ProposalContent;
  };

  // CTA
  cta: {
    action: string;
    suggested_date: string;
    contact?: string;
  };

  // Metadata
  mode: "STANDARD" | "INNOVATION" | "CATALOG_EDIT";
  verification_status: "APPROVED" | "APPROVED_WITH_WARNINGS" | "BLOCKED";
  verification_warnings?: string[];
  canonical_reference?: string;  // "slug vX.Y YYYY-MM-DD"
}

interface ServiceLine {
  name: string;
  description: string;
  price: number;            // always in primary currency (COP)
  is_standard: boolean;     // false = custom/[POR CONFIRMAR]
}

interface ProposalContent {
  title: string;
  hook: string;             // first sentence — names client's pain
  problem: string;          // multi-paragraph
  solution: string;         // Minto conclusion
  scope: string[];          // deliverables list
  exclusions?: string;
  plan: Phase[];
  why: string[];            // differentiators (specific, never generic)
  cta_text: string;
}

interface Phase {
  name: string;
  duration: string;
  milestone: string;
}
```

## BrandConfig (output of brand-resolver.js)

```typescript
interface BrandConfig {
  mode: "own" | "cobrand" | "whitelabel";
  
  // Visual tokens (resolved for this mode)
  colors: {
    primary: string;    // hex
    accent: string;     // hex
    secondary: string;  // hex
    dark: string;
    gray: string;
    white: string;
    light: string;
  };
  
  fonts: {
    display: string;    // CSS font-family string
    body: string;
    note: string;
  };
  
  logo: {
    primary_svg: string;        // inline SVG
    secondary_svg?: string;     // cobrand only
    primary_name: string;       // display name
    secondary_name?: string;    // cobrand only
  };
  
  // Show/hide rules
  show_metodologia: boolean;    // false in whitelabel
  show_partner: boolean;        // true in cobrand + whitelabel
  
  // Partner info (if cobrand or whitelabel)
  partner?: {
    name: string;
    primary_color: string;
    accent_color: string;
    logo_svg: string;
  };
}
```

## VerificationReport

```typescript
interface VerificationReport {
  status: "APPROVED" | "APPROVED_WITH_WARNINGS" | "BLOCKED";
  blockers_found: BlockerItem[];    // L1-L10 that triggered
  blockers_fixed: BlockerItem[];    // L1-L10 auto-corrected
  warnings_active: WarningItem[];   // W1-W7 active
  brand_mode: "own" | "cobrand" | "whitelabel";
  partner_brand_applied?: string;
  language: "en" | "es" | "both";
  canonical_reference?: string;
  mode: "STANDARD" | "INNOVATION" | "CATALOG_EDIT";
  date: string;
}

interface BlockerItem {
  id: string;     // "L1" through "L10"
  description: string;
  fix_applied?: string;
}

interface WarningItem {
  id: string;     // "W1" through "W7"
  description: string;
}
```

## CatalogQuery (input/output for catalog-query.js)

```typescript
// Input
interface CatalogQuery {
  action: "find" | "list" | "check_price" | "check_credit" | "check_segment";
  slug?: string;
  segment?: string;
  from_slug?: string;    // for credit check
  to_slug?: string;
}

// Output
interface CatalogResult {
  found: boolean;
  service?: ServiceEntry;   // from services.yaml
  conditions?: object;      // from conditions.yaml
  warnings?: string[];      // POR CONFIRMAR items relevant to query
}
```

## ServiceDefinition (for CATALOG EDIT MODE)

```typescript
// Minimal shape to add a new service to catalog/services.yaml
interface ServiceDefinition {
  slug: string;                   // unique, kebab-case
  canonical_name: string;
  type: "Workshop" | "Bootcamp" | "ConsultiveWorkshop" | "Program";
  brand: "MetodologIA" | "IAC";
  tier: 1 | 2 | 3;
  category: "entry" | "deepening" | "premium" | "transformation";
  duration_hours: number;
  pricing: {
    b2c_cop?: number | null;
    b2b_cop?: number | null;
    vat_b2c: "included" | "discriminated";
    vat_b2b: "included" | "discriminated";
  };
  segments: string[];             // from availability_matrix keys
  default_brand_mode?: "own" | "cobrand" | "whitelabel";
  canonical_file?: string;        // path to canonico.md
  status: "pending" | "pilot" | "canonico-ok" | "derivadas-ok" | "published";
  what_it_is_not: string[];       // critical for L6 check
}
```

## Eval Schema (evals/evals.json)

```json
{
  "skill_name": "metodologia-proposal-engine",
  "evals": [
    {
      "id": 1,
      "name": "standard-b2b-bootcamp",
      "prompt": "Proposal for logistics company, 20-person ops team, COP 12M budget, start May",
      "expected_output": "10 files: 2 HTML, 2 DOCX, 1 XLSX, 2 PPTX, 2 MD, 1 verification report",
      "assertions": [
        { "id": "a1", "text": "price equals COP 12,000,000 + IVA" },
        { "id": "a2", "text": "guarantee clause uses exact wording" },
        { "id": "a3", "text": "red list contains 0 matches" },
        { "id": "a4", "text": "output contains both ES and EN versions" },
        { "id": "a5", "text": "verification report status is APPROVED or APPROVED_WITH_WARNINGS" }
      ],
      "files": []
    }
  ]
}
```
