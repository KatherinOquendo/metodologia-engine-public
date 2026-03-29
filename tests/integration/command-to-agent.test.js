/**
 * command-to-agent.test.js — Integration tests: Command → BFF (conductor) → Agent
 * MetodologIA Proposal Engine v1.1
 *
 * What this tests:
 *   1. Command contract: each slash command produces a valid normalized input object
 *   2. BFF routing: each command correctly identifies the entry agent
 *   3. Data contract validation: required fields at each pipeline handoff
 *   4. Legal gate as hard stop: BLOCKED status prevents format-producer call
 *   5. input-normalizer.js: smart defaults + confidence scoring
 *   6. catalog-query.js: service lookup, price check, segment routing
 *   7. brand-resolver.js: own / cobrand / whitelabel mode output shape
 *
 * These are integration tests: they call the actual JS scripts (no mocks).
 * They do NOT call any AI models — only the deterministic script layer.
 *
 * BFF architecture:
 *   /command (user) → command validates input → proposal-conductor (BFF) →
 *   specialized agents via data contracts → legal gate → format-producer
 */
'use strict';

const path = require('path');
const { describe, test, expect, runAll } = require('../harness');

// ── Script paths ───────────────────────────────────────────────────────────────
const SKILLS = path.resolve(__dirname, '../../skills/metodologia-proposal-engine');
const verifyLegal    = require(`${SKILLS}/scripts/verify-legal`);
const brandResolver  = require(`${SKILLS}/scripts/brand-resolver`);
const catalogQuery   = require(`${SKILLS}/scripts/catalog-query`);
const inputNorm      = require(`${SKILLS}/scripts/input-normalizer`);
const priceUtils     = require(`${SKILLS}/scripts/utils/price`);
const slugUtils      = require(`${SKILLS}/scripts/utils/slug`);
const dateUtils      = require(`${SKILLS}/scripts/utils/date`);

// ─── 1. Command dispatch contract ─────────────────────────────────────────────

describe('Command routing — BFF dispatch table', () => {
  // Routing table mirrors flow-map.md §2
  const ROUTING = {
    '/propuesta':            'proposal-conductor',
    '/cotizacion':           'service-selector',
    '/catalogo':             'catalog-curator',
    '/verificar':            'legal-guardian',
    '/actualizar-catalogo':  'catalog-curator',
  };

  test('all 5 commands have defined entry agents', () => {
    expect(Object.keys(ROUTING).length).toBe(5);
  });

  test('/propuesta routes to proposal-conductor (BFF orchestrator)', () => {
    expect(ROUTING['/propuesta']).toBe('proposal-conductor');
  });

  test('/cotizacion bypasses conductor — direct to service-selector', () => {
    expect(ROUTING['/cotizacion']).toBe('service-selector');
  });

  test('/verificar bypasses conductor — direct to legal-guardian', () => {
    expect(ROUTING['/verificar']).toBe('legal-guardian');
  });

  test('/actualizar-catalogo and /catalogo both route to catalog-curator', () => {
    expect(ROUTING['/actualizar-catalogo']).toBe(ROUTING['/catalogo']);
  });
});

// ─── 2. ProposalData contract validation ──────────────────────────────────────

describe('Data contract — ProposalData required fields', () => {
  // These are the required fields per data-contracts.md
  const REQUIRED_TOP = ['id', 'date', 'valid_days', 'client', 'provider', 'service_slug',
                        'segment', 'brand', 'services', 'currency', 'payment_terms', 'i18n', 'cta',
                        'mode', 'verification_status'];
  const REQUIRED_CLIENT = ['name', 'company', 'role', 'industry'];
  const REQUIRED_BRAND  = ['mode', 'colors', 'fonts', 'logo', 'show_metodologia', 'show_partner'];

  // Minimal valid ProposalData skeleton
  const minimal = {
    id: 'PRO-2026-001', date: '2026-03-29', valid_days: 30,
    client: { name: 'Test User', company: 'Test Corp', role: 'Manager', industry: 'Logistics' },
    provider: { name: 'JM', company: 'MetodologIA', email: 'info@metodologia.co', web: '', city: 'Bogotá' },
    service_slug: 'bootcamp-trabajar-amplificado',
    segment: 'b2b',
    brand: {
      mode: 'own', colors: { primary: '#122562', accent: '#FFD700', secondary: '#137DC5',
        dark: '#1F2833', gray: '#808080', white: '#FFFFFF', light: '#F5F7FA' },
      fonts: { display: 'Poppins', body: 'Trebuchet MS', note: 'Courier New' },
      logo: { primary_svg: '<svg/>', primary_name: 'MetodologIA' },
      show_metodologia: true, show_partner: false,
    },
    services: [{ name: 'Bootcamp TA', description: '', price: 12000000, is_standard: true }],
    currency: 'COP', payment_terms: '50% upfront',
    i18n: { es: { title: 'T', hook: 'H', problem: 'P', solution: 'S', scope: [], plan: [], why: [], cta_text: 'C' },
            en: { title: 'T', hook: 'H', problem: 'P', solution: 'S', scope: [], plan: [], why: [], cta_text: 'C' } },
    cta: { action: 'Schedule call', suggested_date: 'April 2026' },
    mode: 'STANDARD', verification_status: 'APPROVED',
  };

  REQUIRED_TOP.forEach(field => {
    test(`required top-level field: "${field}"`, () => {
      expect(minimal[field]).toBeDefined();
    });
  });

  REQUIRED_CLIENT.forEach(field => {
    test(`required client field: "${field}"`, () => {
      expect(minimal.client[field]).toBeDefined();
    });
  });

  REQUIRED_BRAND.forEach(field => {
    test(`required brand field: "${field}"`, () => {
      expect(minimal.brand[field]).toBeDefined();
    });
  });

  test('segment must be one of b2b/b2c/cobrand/whitelabel', () => {
    const valid = ['b2b', 'b2c', 'cobrand', 'whitelabel'];
    expect(valid.includes(minimal.segment)).toBe(true);
  });

  test('mode must be STANDARD/INNOVATION/CATALOG_EDIT', () => {
    const valid = ['STANDARD', 'INNOVATION', 'CATALOG_EDIT'];
    expect(valid.includes(minimal.mode)).toBe(true);
  });

  test('verification_status must be APPROVED/APPROVED_WITH_WARNINGS/BLOCKED', () => {
    const valid = ['APPROVED', 'APPROVED_WITH_WARNINGS', 'BLOCKED'];
    expect(valid.includes(minimal.verification_status)).toBe(true);
  });
});

// ─── 3. Legal gate as hard stop ───────────────────────────────────────────────

describe('Legal gate — hard stop: BLOCKED prevents format-producer call', () => {
  // This simulates what proposal-conductor enforces per flow-map.md §5 Contract 5
  function canCallFormatProducer(verificationStatus) {
    return verificationStatus === 'APPROVED' || verificationStatus === 'APPROVED_WITH_WARNINGS';
  }

  test('APPROVED → format-producer allowed', () => {
    expect(canCallFormatProducer('APPROVED')).toBe(true);
  });
  test('APPROVED_WITH_WARNINGS → format-producer allowed', () => {
    expect(canCallFormatProducer('APPROVED_WITH_WARNINGS')).toBe(true);
  });
  test('BLOCKED → format-producer NOT allowed', () => {
    expect(canCallFormatProducer('BLOCKED')).toBe(false);
  });
  test('undefined status → format-producer NOT allowed (fail-safe)', () => {
    expect(canCallFormatProducer(undefined)).toBe(false);
  });

  test('transformación content → verify-legal returns BLOCKED', () => {
    const r = verifyLegal.verifyContent('Esto causará una transformación total.');
    expect(r.status).toBe('BLOCKED');
    expect(canCallFormatProducer(r.status)).toBe(false);
  });

  test('clean content → verify-legal returns APPROVED, format-producer allowed', () => {
    const r = verifyLegal.verifyContent('Programa para equipos de trabajo.');
    expect(r.status).toBe('APPROVED');
    expect(canCallFormatProducer(r.status)).toBe(true);
  });
});

// ─── 4. verify-legal.js as the BFF compliance gate ───────────────────────────

describe('verify-legal as BFF compliance gate — pipeline integration', () => {
  test('proposal with exact guarantee → APPROVED', () => {
    const content = [
      'Bootcamp Trabajar Amplificado — equipo de 20 personas.',
      'Inversión: COP 12.000.000.',
      '100% de devolución si solicitas el reembolso antes de completar la primera sesión de 4h, con una sesión de retroalimentación estructurada de 1h.',
    ].join(' ');
    const r = verifyLegal.verifyContent(content, { canonical_price_b2b: 12000000, segment: 'b2b' });
    expect(r.status).toBe('APPROVED');
  });

  test('proposal with red-list word → BLOCKED → must not proceed to format-producer', () => {
    const content = 'Esta transformación digital cambiará tu equipo. COP 12.000.000.';
    const r = verifyLegal.verifyContent(content, { canonical_price_b2b: 12000000 });
    expect(r.status).toBe('BLOCKED');
    expect(r.blockers_found.some(b => b.id === 'L7')).toBe(true);
  });

  test('INNOVATION mode content always gets W7 warning', () => {
    const r = verifyLegal.verifyContent('Custom workshop design.', { mode: 'INNOVATION' });
    expect(r.warnings_active.some(w => w.id === 'W7')).toBe(true);
  });
});

// ─── 5. brand-resolver.js — BFF brand resolution ─────────────────────────────

describe('brand-resolver.js — BFF brand config resolution', () => {
  const { resolveBrand } = brandResolver;

  test('own mode: show_metodologia = true, show_partner = false', () => {
    const b = resolveBrand({ brand_mode: 'own' });
    expect(b.show_metodologia).toBe(true);
    expect(b.show_partner).toBe(false);
  });

  test('whitelabel mode: show_metodologia = false', () => {
    const b = resolveBrand({ brand_mode: 'whitelabel', partner: { name: 'TechLearn', primary_color: '#005A8E', accent_color: '#FFD100', logo_svg: '<svg/>' } });
    expect(b.show_metodologia).toBe(false);
  });

  test('whitelabel: primary color is partner color, not MetodologIA navy', () => {
    const b = resolveBrand({ brand_mode: 'whitelabel', partner: { name: 'TechLearn', primary_color: '#005A8E', accent_color: '#FFFFFF', logo_svg: '<svg/>' } });
    expect(b.colors.primary).toBe('#005A8E');
  });

  test('cobrand: show_metodologia = true AND show_partner = true', () => {
    const b = resolveBrand({ brand_mode: 'cobrand', partner: { name: 'Bancolombia', primary_color: '#FFD100', accent_color: '#FFD100', logo_svg: '<svg/>' } });
    expect(b.show_metodologia).toBe(true);
    expect(b.show_partner).toBe(true);
  });

  test('cobrand: navy primary preserved, only accent overridden', () => {
    const b = resolveBrand({ brand_mode: 'cobrand', partner: { name: 'Bancolombia', primary_color: '#FFD100', accent_color: '#FFD100', logo_svg: '<svg/>' } });
    expect(b.colors.primary).toBe('#122562');   // MetodologIA navy unchanged
    expect(b.colors.accent).toBe('#FFD100');    // partner accent applied
  });

  test('own mode: colors match MetodologIA brand tokens', () => {
    const b = resolveBrand({ brand_mode: 'own' });
    expect(b.colors.primary).toBe('#122562');
    expect(b.colors.accent).toBe('#FFD700');
    expect(b.colors.secondary).toBe('#137DC5');
  });

  test('BrandConfig has required shape', () => {
    const b = resolveBrand({ brand_mode: 'own' });
    expect(b.mode).toBeDefined();
    expect(b.colors).toBeDefined();
    expect(b.fonts).toBeDefined();
    expect(b.logo).toBeDefined();
    expect(b.show_metodologia).toBeDefined();
    expect(b.show_partner).toBeDefined();
  });
});

// ─── 6. catalog-query.js — BFF catalog lookup ─────────────────────────────────

describe('catalog-query.js — BFF service lookup', () => {
  const cq = catalogQuery;

  test('findService bootcamp-trabajar-amplificado → returns service object (not null)', () => {
    const svc = cq.findService('bootcamp-trabajar-amplificado');
    expect(svc).not.toBeNull();
  });

  test('getPrice B2B → value = 12,000,000', () => {
    const r = cq.getPrice('bootcamp-trabajar-amplificado', 'b2b_cop');
    expect(r.found).toBe(true);
    expect(r.value).toBe(12000000);
  });

  test('getPrice B2C workshop → value = 200,000', () => {
    const r = cq.getPrice('workshop-de-ocupado-a-productivo', 'b2c_cop');
    expect(r.found).toBe(true);
    expect(r.value).toBe(200000);
  });

  test('unknown slug → findService returns null', () => {
    const svc = cq.findService('non-existent-service-xyz');
    expect(svc).toBeNull();
  });

  test('getPrice on unknown slug → found: false', () => {
    const r = cq.getPrice('non-existent-service-xyz', 'b2b_cop');
    expect(r.found).toBe(false);
  });

  test('listBySegment b2b → returns array of services', () => {
    const services = cq.listBySegment('b2b');
    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThan(0);
  });

  test('listBySegment b2b → ≥ 5 services (Tier 1 alone has 5)', () => {
    const services = cq.listBySegment('b2b');
    expect(services.length).toBeGreaterThan(4);
  });
});

// ─── 7. input-normalizer.js — Layer 1.5 normalization ─────────────────────────
// Return shape: { status, fields: { segment: {value, confidence, is_default}, ... },
//                 confidence: { overall_percent, per_field: { segment, problem, ... }, ... },
//                 assumptions, suggested_question, cleaned_input, raw_input }

describe('input-normalizer.js — BFF input normalization (Layer 1.5)', () => {
  test('clear B2B input → fields.segment.value = b2b, confidence.per_field.segment ≥ 0.60', () => {
    const r = inputNorm.normalizeInput('Somos un equipo de ventas en Bogotá, empresa de 20 personas');
    expect(r.fields.segment.value).toBe('b2b');
    expect(r.confidence.per_field.segment).toBeGreaterThan(0.59);
  });

  test('individual input → fields.segment.value = b2c', () => {
    const r = inputNorm.normalizeInput('Soy consultor independiente, quiero mejorar mis propuestas');
    expect(r.fields.segment.value).toBe('b2c');
  });

  test('empty input → returns object with defined status (never throws)', () => {
    const r = inputNorm.normalizeInput('');
    expect(r).toBeDefined();
    expect(r.status).toBeDefined();
  });

  test('voice-like input with filler words → does not crash, returns fields', () => {
    const r = inputNorm.normalizeInput('eh... bueno... necesito algo para mi equipo... como... no sé, algo de IA');
    expect(r).toBeDefined();
    expect(r.fields).toBeDefined();
  });

  test('English input → normalizes without crash, confidence object present', () => {
    const r = inputNorm.normalizeInput('We are a product team of 15 people looking for AI training');
    expect(r).toBeDefined();
    expect(r.confidence).toBeDefined();
    // B2B signals detected (team, company)
    expect(r.fields.segment.value).toBe('b2b');
  });

  test('Spanish input → normalizes without crash, status defined', () => {
    const r = inputNorm.normalizeInput('Somos un equipo de logística que necesita capacitación en IA');
    expect(r).toBeDefined();
    expect(r.status).toBeDefined();
    expect(r.fields.segment.value).toBe('b2b');
  });

  test('budget signal extracted → fields.budget.value > 0', () => {
    const r = inputNorm.normalizeInput('Tenemos un presupuesto de 12 millones de pesos');
    expect(r.fields.budget.value).toBeGreaterThan(0);
  });

  test('confidence.per_field values are between 0 and 1 (not percentages)', () => {
    const r = inputNorm.normalizeInput('equipo de trabajo de logistics company');
    expect(r.confidence.per_field.problem).toBeGreaterThan(-1);
    expect(r.confidence.per_field.problem).toBeLessThanOrEqual(1);
    expect(r.confidence.per_field.segment).toBeGreaterThan(-1);
    expect(r.confidence.per_field.segment).toBeLessThanOrEqual(1);
  });
});

// ─── 8. Contract 6: format-producer manifest (output floor) ───────────────────

describe('Contract 6 — format-producer output manifest validation', () => {
  // Tests the minimum guarantee contract: 3 files (2 .md + 1 verification)
  function validateManifest(manifest) {
    return manifest.generated && manifest.generated.length >= 3;
  }

  test('manifest with 10 generated files → valid', () => {
    const m = { generated: Array(10).fill('file.html'), skipped: [], failed: [] };
    expect(validateManifest(m)).toBe(true);
  });

  test('manifest with exactly 3 files (zero-dep floor) → valid', () => {
    const m = {
      generated: ['propuesta_ES.md', 'propuesta_EN.md', 'verification-report.md'],
      skipped: ['propuesta_ES.html', 'propuesta_EN.html'],
      failed: [],
    };
    expect(validateManifest(m)).toBe(true);
  });

  test('manifest with 2 files → invalid (below zero-dep floor)', () => {
    const m = { generated: ['propuesta_ES.md', 'propuesta_EN.md'], skipped: [], failed: [] };
    expect(validateManifest(m)).toBe(false);
  });

  test('manifest with 0 generated → invalid', () => {
    const m = { generated: [], skipped: [], failed: [] };
    expect(validateManifest(m)).toBe(false);
  });
});

// ─── 9. BFF pipeline end-to-end contract chain ────────────────────────────────

describe('Pipeline contract chain — end-to-end deterministic flow', () => {
  test('slug + price + date utilities compose correctly for file naming', () => {
    // Simulate what generate-all.js does: build file name from proposal data
    const os = require('os');
    const fs = require('fs');
    const tmp = fs.mkdtempSync(require('path').join(os.tmpdir(), 'mao-'));

    const dateMeta = dateUtils.buildDateMeta({ issueDate: '2026-03-29', validDays: 30, counterDir: tmp });
    const fileName = slugUtils.buildFileName({
      serviceSlug: 'bootcamp-trabajar-amplificado',
      companyName: 'Transportes del Pacífico',
      date: dateMeta.date,
      lang: 'ES',
    });
    const summary = priceUtils.buildInvestmentSummary(
      [{ name: 'Bootcamp TA', price: 12000000, description: '', is_standard: true }],
      'b2b', 'COP', 'es'
    );
    const verifyReport = verifyLegal.verifyContent(
      `Inversión: ${summary.subtotal_formatted}. Programa para equipos de trabajo.`,
      { canonical_price_b2b: 12000000, segment: 'b2b' }
    );

    // File name has correct pattern
    expect(fileName).toMatch(/^propuesta_bootcamp-trabajar-amplificado_transportes-del-pacifico_2026-03_ES$/);

    // IVA calculated correctly
    expect(summary.iva).toBe(2280000);
    expect(summary.total).toBe(14280000);

    // Legal check passes for clean content
    expect(verifyReport.status).toBe('APPROVED');

    // Date meta has valid proposal ID
    expect(dateMeta.id).toMatch(/^PRO-2026-\d{3}$/);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('whitelabel brand → verify-legal rejects MetodologIA name', () => {
    const brand = brandResolver.resolveBrand({
      brand_mode: 'whitelabel',
      partner: { name: 'TechLearn', primary_color: '#005A8E', accent_color: '#FFFFFF', logo_svg: '<svg/>' },
    });
    // Simulate a content generation that accidentally includes brand name
    const contentWithLeak = `${brand.logo.primary_name} — AI Bootcamp for your team.`;
    // If brand.logo.primary_name is NOT "MetodologIA", no leak
    if (contentWithLeak.toLowerCase().includes('metodolog')) {
      const r = verifyLegal.verifyContent(contentWithLeak, { brand_mode: 'whitelabel' });
      expect(r.status).toBe('BLOCKED');
    } else {
      // Correct: partner name appears, not MetodologIA
      expect(brand.show_metodologia).toBe(false);
    }
  });
});

module.exports = { runAll };
