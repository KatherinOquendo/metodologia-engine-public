#!/usr/bin/env node
/**
 * catalog-query.js — Query catalog/services.yaml and conditions.yaml programmatically.
 * Enables: find service, check price, check credit chain, list by segment.
 *
 * Usage: node catalog-query.js --find bootcamp-trabajar-amplificado
 *        node catalog-query.js --list b2b
 *        node catalog-query.js --credit-from workshop-de-ocupado-a-productivo --credit-to bootcamp-trabajar-amplificado
 *        node catalog-query.js --price bootcamp-trabajar-amplificado b2b_cop
 */

const fs   = require('fs');
const path = require('path');

// Try to load yaml, fallback to simple parser
let yaml;
try {
  yaml = require('js-yaml');
} catch {
  // Simple YAML parser for basic key-value structures
  yaml = {
    load: (str) => {
      try { return JSON.parse(str); } catch { return null; }
    }
  };
}

const SKILL_DIR = path.resolve(__dirname, '..');
const SERVICES_FILE  = path.join(SKILL_DIR, 'catalog/services.yaml');
const CONDITIONS_FILE = path.join(SKILL_DIR, 'catalog/conditions.yaml');

function loadCatalog() {
  let services = [], conditions = {};
  try {
    const svcRaw = fs.readFileSync(SERVICES_FILE, 'utf8');
    const parsed = yaml.load(svcRaw);
    services = parsed?.services || [];
  } catch (e) {
    // Try loading from repo root if skill catalog not found
    try {
      const altPath = path.join(process.cwd(), 'catalog/services.yaml');
      const svcRaw = fs.readFileSync(altPath, 'utf8');
      services = yaml.load(svcRaw)?.services || [];
    } catch { services = []; }
  }
  try {
    const condRaw = fs.readFileSync(CONDITIONS_FILE, 'utf8');
    conditions = yaml.load(condRaw) || {};
  } catch { conditions = {}; }
  return { services, conditions };
}

function findService(slug) {
  const { services } = loadCatalog();
  return services.find(s => s.slug === slug) || null;
}

function listBySegment(segment) {
  const { services } = loadCatalog();
  return services.filter(s => {
    if (!s.segments) return false;
    if (Array.isArray(s.segments)) return s.segments.some(seg => seg.includes(segment));
    return JSON.stringify(s.segments).includes(segment);
  });
}

function checkCredit(fromSlug, toSlug) {
  const service = findService(fromSlug);
  if (!service) return { found: false, message: `Service '${fromSlug}' not in catalog` };

  const outgoing = service.credits?.outgoing || [];
  const match = outgoing.find(c => c.to === toSlug);

  if (!match) return { found: false, message: `No credit from '${fromSlug}' to '${toSlug}' defined` };

  const isConfirmed = match.status === 'CONFIRMED';
  return {
    found: true,
    from: fromSlug,
    to: toSlug,
    pct: match.pct || null,
    window_months: match.window_months || null,
    cumulative: match.cumulative || null,
    transferable: match.transferable || null,
    status: match.status,
    confirmed: isConfirmed,
    safe_to_quote: isConfirmed,
    warning: isConfirmed ? null : `POR CONFIRMAR — do not state as confirmed. Use: "Credit applicable subject to current policy."`
  };
}

function getPrice(slug, priceField = 'b2b_cop') {
  const service = findService(slug);
  if (!service) return { found: false };
  const price = service.pricing?.[priceField];
  const status = price == null ? 'POR_CONFIRMAR' : 'CONFIRMED';
  return {
    found: true,
    slug,
    field: priceField,
    value: price,
    status,
    currency: 'COP',
    vat_note: service.pricing?.[`vat_${priceField.replace('_cop', '')}`] || null,
    safe_to_quote: status === 'CONFIRMED',
    warning: status === 'POR_CONFIRMAR' ? `Price not confirmed — mark as [POR CONFIRMAR] in proposal` : null,
  };
}

function getGuaranteeClause(language = 'en') {
  const { conditions } = loadCatalog();
  const g = conditions?.guarantees?.standard;
  if (!g) return null;
  return language === 'es' ? g.exact_clause_es : g.exact_clause_en;
}

function checkPorConfirmar() {
  const { conditions } = loadCatalog();
  const pending = conditions?.credit_chains?.pending || [];
  return pending.map(pc => ({
    id: pc.id,
    from: pc.from,
    to: pc.to,
    owner: pc.owner,
    deadline: pc.deadline,
    impact: pc.impact,
  }));
}

// ── CLI ────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonOut = args.includes('--json');
  const out = (data) => jsonOut ? console.log(JSON.stringify(data, null, 2)) : console.log(JSON.stringify(data, null, 2));

  if (args.includes('--find')) {
    const slug = args[args.indexOf('--find') + 1];
    out(findService(slug));
  } else if (args.includes('--list')) {
    const segment = args[args.indexOf('--list') + 1] || 'b2b';
    out(listBySegment(segment));
  } else if (args.includes('--credit-from')) {
    const from = args[args.indexOf('--credit-from') + 1];
    const to   = args[args.indexOf('--credit-to') + 1];
    out(checkCredit(from, to));
  } else if (args.includes('--price')) {
    const slug  = args[args.indexOf('--price') + 1];
    const field = args[args.indexOf('--price') + 2] || 'b2b_cop';
    out(getPrice(slug, field));
  } else if (args.includes('--guarantee')) {
    const lang = args[args.indexOf('--guarantee') + 1] || 'en';
    console.log(getGuaranteeClause(lang));
  } else if (args.includes('--pending')) {
    out(checkPorConfirmar());
  } else {
    console.log(`catalog-query.js — Usage:
  --find <slug>                           Find a service by slug
  --list <segment>                        List services available for segment (b2b|b2c|cobrand|whitelabel)
  --credit-from <slug> --credit-to <slug> Check credit chain
  --price <slug> [field]                  Get price (default field: b2b_cop)
  --guarantee [en|es]                     Get exact guarantee clause
  --pending                               List all POR CONFIRMAR items
  --json                                  Output as JSON`);
  }
}

module.exports = { findService, listBySegment, checkCredit, getPrice, getGuaranteeClause, checkPorConfirmar };
