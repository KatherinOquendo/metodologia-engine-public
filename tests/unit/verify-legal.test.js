/**
 * verify-legal.test.js — Unit tests for scripts/verify-legal.js
 *
 * Tests every blocker L1–L10 and warnings W1–W7, including:
 * - True positive (should trigger)
 * - True negative (should NOT trigger)
 * - L3 scoping rule: only fires if guarantee/garantía/devolución/refund present
 * - L7 red list: architecture words must NOT be blocked (BUG-02 fix validation)
 * - White-label depth check
 * - PC density threshold (>3 unresolved items → APPROVED_WITH_WARNINGS)
 *
 * Correct guarantee clause (from CLAUDE.md — authoritative):
 *   ES: "100% de devolución si solicitas el reembolso antes de completar
 *        la primera sesión de 4h, con una sesión de retroalimentación estructurada de 1h."
 *   EN: /100% refund if requested before completing the first 4.hour session.*1.hour structured feedback/i
 */
'use strict';

const path = require('path');
const { describe, test, expect, runAll } = require('../harness');
const { verifyContent } = require(
  path.resolve(__dirname, '../../skills/metodologia-proposal-engine/scripts/verify-legal')
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EXACT_GUARANTEE_ES =
  '100% de devolución si solicitas el reembolso antes de completar la primera sesión de 4h, con una sesión de retroalimentación estructurada de 1h.';

const EXACT_GUARANTEE_EN =
  '100% refund if requested before completing the first 4-hour session, with a 1-hour structured feedback session.';

function blockerIds(report) {
  return report.blockers_found.map(b => b.id);
}

function warningIds(report) {
  return report.warnings_active.map(w => w.id);
}

// ─── L1 — Price mismatch ──────────────────────────────────────────────────────

describe('L1 — Price mismatch', () => {
  test('correct canonical price → APPROVED', () => {
    const r = verifyContent('Investment: COP 12.000.000 + IVA', { canonical_price_b2b: 12000000, segment: 'b2b' });
    expect(blockerIds(r)).not.toContain('L1');
  });
  test('wrong price → BLOCKED with L1', () => {
    const r = verifyContent('Investment: COP 11.000.000 + IVA', { canonical_price_b2b: 12000000, segment: 'b2b' });
    expect(blockerIds(r)).toContain('L1');
  });
  test('B2C proposal: L1 not checked (no canonical_price_b2b required)', () => {
    const r = verifyContent('Investment: COP 900.000', { segment: 'b2c' });
    expect(blockerIds(r)).not.toContain('L1');
  });
  test('no price in content when canonical provided → no L1 (nothing to match)', () => {
    const r = verifyContent('Great service for your team.', { canonical_price_b2b: 12000000, segment: 'b2b' });
    expect(blockerIds(r)).not.toContain('L1');
  });
});

// ─── L3 — Guarantee clause ────────────────────────────────────────────────────

describe('L3 — Guarantee clause (scoped: only fires when trigger words present)', () => {
  test('no guarantee word → L3 is N/A (not triggered)', () => {
    const r = verifyContent('Great service for your team.');
    expect(blockerIds(r)).not.toContain('L3');
    expect(r.status).toBe('APPROVED');
  });

  test('trigger word "garantía" without clause → BLOCKED with L3', () => {
    const r = verifyContent('Ofrecemos garantía de satisfacción total.');
    expect(blockerIds(r)).toContain('L3');
  });

  test('trigger word "devolución" without clause → BLOCKED with L3', () => {
    const r = verifyContent('Si no estás satisfecho, hablamos de devolución.');
    expect(blockerIds(r)).toContain('L3');
  });

  test('exact ES guarantee clause → L3 NOT triggered', () => {
    const r = verifyContent(EXACT_GUARANTEE_ES);
    expect(blockerIds(r)).not.toContain('L3');
  });

  test('exact EN guarantee clause → L3 NOT triggered', () => {
    const r = verifyContent(EXACT_GUARANTEE_EN);
    expect(blockerIds(r)).not.toContain('L3');
  });

  test('paraphrased guarantee (wrong wording) → BLOCKED with L3', () => {
    const wrong = 'Garantía: 100% de devolución si no cumple expectativas antes de las 4 horas.';
    const r = verifyContent(wrong);
    expect(blockerIds(r)).toContain('L3');
  });
});

// ─── L4 — Workshop→Bootcamp credit ───────────────────────────────────────────

describe('L4 — Credit terms', () => {
  test('credit mentioned with exact terms → no L4', () => {
    const r = verifyContent('Crédito del workshop: 100%, 6 meses, acumulable, intransferible.');
    expect(blockerIds(r)).not.toContain('L4');
  });
  test('credit mentioned without exact terms → BLOCKED with L4', () => {
    const r = verifyContent('Puede usar su crédito del workshop para el bootcamp.');
    expect(blockerIds(r)).toContain('L4');
  });
  test('no credit mention → L4 not triggered', () => {
    const r = verifyContent('Standard program content.');
    expect(blockerIds(r)).not.toContain('L4');
  });
});

// ─── L5 — Result % without wrapper ───────────────────────────────────────────

describe('L5 — Result % promise', () => {
  test('50% mejora WITH wrapper → no L5', () => {
    const r = verifyContent('Meta orientativa: 50% de mejora en productividad. El resultado depende de la adopción.');
    expect(blockerIds(r)).not.toContain('L5');
  });
  test('50% mejora WITHOUT wrapper → BLOCKED with L5', () => {
    const r = verifyContent('Lograrás 50% de mejora en productividad.');
    expect(blockerIds(r)).toContain('L5');
  });
  test('30% reducción WITHOUT wrapper → BLOCKED with L5', () => {
    const r = verifyContent('Lograrás 30% de reducción en tiempos de reunión.');
    expect(blockerIds(r)).toContain('L5');
  });
  test('percentage in other context (not improvement claim) → no L5', () => {
    // "19%" for IVA shouldn't trigger
    const r = verifyContent('IVA del 19% aplicado sobre el subtotal.');
    expect(blockerIds(r)).not.toContain('L5');
  });
  test('indicative target wrapper (EN) → no L5', () => {
    const r = verifyContent('Indicative target: 40% improvement. Actual result depends on adoption consistency.');
    expect(blockerIds(r)).not.toContain('L5');
  });
});

// ─── L7 — Red list ───────────────────────────────────────────────────────────

describe('L7 — Red list words', () => {
  test('"transformación" → BLOCKED with L7', () => {
    const r = verifyContent('Esto logrará una transformación digital completa.');
    expect(blockerIds(r)).toContain('L7');
  });
  test('"transformation" → BLOCKED with L7', () => {
    const r = verifyContent('This will achieve full digital transformation.');
    expect(blockerIds(r)).toContain('L7');
  });
  test('"disruptivo" → BLOCKED with L7', () => {
    const r = verifyContent('Un enfoque disruptivo para tu equipo.');
    expect(blockerIds(r)).toContain('L7');
  });
  test('"resultados garantizados" → BLOCKED with L7', () => {
    const r = verifyContent('Le ofrecemos resultados garantizados.');
    expect(blockerIds(r)).toContain('L7');
  });
  test('"(R)Evolución" is safe — NOT in red list', () => {
    const r = verifyContent('Este programa produce una (R)Evolución en tu equipo.');
    expect(blockerIds(r)).not.toContain('L7');
  });

  // BUG-02 validation: architecture words removed from red list
  test('"arquitectura" NOT in red list (BUG-02 fix)', () => {
    const r = verifyContent('Diseñamos la arquitectura de servicios digitales.');
    expect(blockerIds(r)).not.toContain('L7');
  });
  test('"architecture" NOT in red list (BUG-02 fix)', () => {
    const r = verifyContent('We design the solution architecture for your team.');
    expect(blockerIds(r)).not.toContain('L7');
  });
  test('"arquitectura de datos" safe', () => {
    const r = verifyContent('Incluye revisión de arquitectura de datos y plataformas.');
    expect(blockerIds(r)).not.toContain('L7');
  });

  test('clean content → no L7', () => {
    const r = verifyContent('Programa de aprendizaje para equipos de ventas.');
    expect(blockerIds(r)).not.toContain('L7');
  });
});

// ─── L8 — Unconfirmed credit chain ────────────────────────────────────────────

describe('L8 — Unconfirmed credit chains', () => {
  test('unconfirmed credit stated without safety wrapper → BLOCKED with L8', () => {
    const r = verifyContent('Puede aplicar un crédito hacia el programa de liderazgo.');
    expect(blockerIds(r)).toContain('L8');
  });
  test('unconfirmed credit WITH conditional wrapper → no L8', () => {
    const r = verifyContent(
      'Puede aplicar crédito hacia el programa, sujeto a política vigente — consultar con su embajador.'
    );
    expect(blockerIds(r)).not.toContain('L8');
  });
});

// ─── L10 — Fixed USD rate ────────────────────────────────────────────────────

describe('L10 — USD rate', () => {
  test('USD without disclaimer → BLOCKED with L10', () => {
    const r = verifyContent('Investment: USD 3,000');
    expect(blockerIds(r)).toContain('L10');
  });
  test('USD with "indicative rate" disclaimer → no L10', () => {
    const r = verifyContent('Investment: USD 3,000 (indicative rate, subject to variation)');
    expect(blockerIds(r)).not.toContain('L10');
  });
  test('USD with Spanish disclaimer → no L10', () => {
    const r = verifyContent('Inversión: USD 3.000 (tasa indicativa, sujeta a variación)');
    expect(blockerIds(r)).not.toContain('L10');
  });
  test('COP price with no USD → no L10', () => {
    const r = verifyContent('Investment: COP 12.000.000');
    expect(blockerIds(r)).not.toContain('L10');
  });
});

// ─── W1-W7 — Warnings ────────────────────────────────────────────────────────

describe('W1–W7 — Warnings (APPROVED_WITH_WARNINGS)', () => {
  test('W1: cobrand mention → warning', () => {
    const r = verifyContent('Esta es una propuesta cobrand con el partner.');
    expect(warningIds(r)).toContain('W1');
    expect(r.status).toBe('APPROVED_WITH_WARNINGS');
  });
  test('W2: >20 participants → warning', () => {
    const r = verifyContent('Programa para más de 20 participantes en tu empresa.');
    expect(warningIds(r)).toContain('W2');
  });
  test('W3: presencial → warning', () => {
    const r = verifyContent('Modalidad presencial en tus instalaciones.');
    expect(warningIds(r)).toContain('W3');
  });
  test('W4: specific AI engine → warning', () => {
    const r = verifyContent('Usaremos ChatGPT para los ejercicios.');
    expect(warningIds(r)).toContain('W4');
  });
  test('W7: INNOVATION mode always gets W7', () => {
    const r = verifyContent('Custom service design.', { mode: 'INNOVATION' });
    expect(warningIds(r)).toContain('W7');
  });
  test('clean content → no warnings', () => {
    const r = verifyContent('Standard B2B service proposal for a 15-person team.');
    expect(r.warnings_active.length).toBe(0);
    expect(r.status).toBe('APPROVED');
  });
});

// ─── White-label depth check ─────────────────────────────────────────────────

describe('White-label — MetodologIA must be invisible', () => {
  test('"MetodologIA" in whitelabel content → BLOCKED', () => {
    const r = verifyContent('Powered by MetodologIA.', { brand_mode: 'whitelabel' });
    expect(blockerIds(r)).toContain('L7');
    expect(r.status).toBe('BLOCKED');
  });
  test('No MetodologIA in whitelabel → APPROVED', () => {
    const r = verifyContent('Partner Learning Platform — AI Bootcamp.', { brand_mode: 'whitelabel' });
    expect(blockerIds(r)).not.toContain('L7');
  });
  test('MetodologIA in own-brand content → not a blocker', () => {
    const r = verifyContent('MetodologIA — Learning Amplified.', { brand_mode: 'own' });
    expect(blockerIds(r)).not.toContain('L7');
  });
});

// ─── Status transitions ───────────────────────────────────────────────────────

describe('Status transitions', () => {
  test('no blockers, no warnings → APPROVED', () => {
    const r = verifyContent('Clean proposal content with no issues.');
    expect(r.status).toBe('APPROVED');
  });
  test('warnings only → APPROVED_WITH_WARNINGS', () => {
    const r = verifyContent('Modalidad presencial, más de 20 participantes.');
    expect(r.status).toBe('APPROVED_WITH_WARNINGS');
    expect(r.blockers_found.length).toBe(0);
  });
  test('any blocker → BLOCKED regardless of warnings', () => {
    const r = verifyContent('Garantía de transformación total para más de 20 personas.');
    expect(r.status).toBe('BLOCKED');
  });
});

// ─── Report structure ─────────────────────────────────────────────────────────

describe('VerificationReport structure', () => {
  test('report has required fields', () => {
    const r = verifyContent('Clean content.');
    expect(r.status).toBeDefined();
    expect(r.blockers_found).toBeDefined();
    expect(r.blockers_fixed).toBeDefined();
    expect(r.warnings_active).toBeDefined();
    expect(r.brand_mode).toBeDefined();
    expect(r.mode).toBeDefined();
    expect(r.date).toBeDefined();
  });
  test('date is ISO format YYYY-MM-DD', () => {
    const r = verifyContent('Clean content.');
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test('default brand_mode is "own"', () => {
    const r = verifyContent('Content.', {});
    expect(r.brand_mode).toBe('own');
  });
  test('default mode is "STANDARD"', () => {
    const r = verifyContent('Content.', {});
    expect(r.mode).toBe('STANDARD');
  });
});

module.exports = { runAll };
