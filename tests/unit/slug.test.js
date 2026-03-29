/**
 * slug.test.js — Unit tests for scripts/utils/slug.js
 * Tests: normalize(), buildFileName(), resolveCollision()
 */
'use strict';

const path = require('path');
const { describe, test, expect, runAll } = require('../harness');
const { normalize, buildFileName, resolveCollision } = require(
  path.resolve(__dirname, '../../skills/metodologia-proposal-engine/scripts/utils/slug')
);

// ─── normalize() ─────────────────────────────────────────────────────────────

describe('normalize() — accent removal', () => {
  test('á é í ó ú ñ → ascii equivalents', () => {
    expect(normalize('Café Rápido Ñoño')).toBe('cafe-rapido-nono');
  });
  test('Ü Ö Ä → u o a', () => {
    expect(normalize('Müller & Söhne')).toBe('muller-sohne');
  });
  test('uppercase → lowercase', () => {
    expect(normalize('EMPRESA GRANDE')).toBe('empresa-grande');
  });
});

describe('normalize() — punctuation → hyphen', () => {
  test('& replaced with hyphen, consecutive hyphens collapsed', () => {
    expect(normalize('Café & Co.')).toBe('cafe-co');
  });
  test('/ replaced with hyphen', () => {
    expect(normalize('Alpha/Beta')).toBe('alpha-beta');
  });
  test('. in S.A.S. → collapsed hyphens → clean slug', () => {
    expect(normalize('Transportes Rápidos S.A.S.')).toBe('transportes-rapidos-sas');
  });
  test("apostrophe and comma removed cleanly", () => {
    expect(normalize("O'Brien, Corp")).toBe('obrien-corp');
  });
  test("leading/trailing hyphens stripped", () => {
    expect(normalize('  -Leading Corp-  ')).toBe('leading-corp');
  });
});

describe('normalize() — truncation', () => {
  test('result ≤ 25 chars', () => {
    const result = normalize('Corporación Ejemplo de Nombres Muy Largos S.A.S.');
    expect(result.length).toBeLessThanOrEqual(25);
  });
  test('truncation at word boundary (no mid-word cut)', () => {
    // "empresa-de-nombre-muy-largo" = 26 chars → truncates at last hyphen
    const result = normalize('Empresa De Nombre Muy Largo');
    expect(result).not.toMatch(/-$/); // no trailing hyphen
  });
  test('short name under 25 chars not truncated', () => {
    expect(normalize('Acme Corp')).toBe('acme-corp');
  });
});

describe('normalize() — fallback cases', () => {
  test('empty string → "cliente"', () => {
    expect(normalize('')).toBe('cliente');
  });
  test('single char → "cliente"', () => {
    expect(normalize('A')).toBe('cliente');
  });
  test('whitespace only → "cliente"', () => {
    expect(normalize('   ')).toBe('cliente');
  });
  test('non-string input → "cliente"', () => {
    expect(normalize(null)).toBe('cliente');
    expect(normalize(undefined)).toBe('cliente');
    expect(normalize(42)).toBe('cliente');
  });
  test('only special chars → "cliente"', () => {
    expect(normalize('&&& ///')).toBe('cliente');
  });
});

describe('normalize() — known examples from CLAUDE.md', () => {
  test('Café & Co. → cafe-co', () => {
    expect(normalize('Café & Co.')).toBe('cafe-co');
  });
  test('Transportes Rápidos S.A.S. → transportes-rapidos-sas', () => {
    expect(normalize('Transportes Rápidos S.A.S.')).toBe('transportes-rapidos-sas');
  });
});

// ─── buildFileName() ─────────────────────────────────────────────────────────

describe('buildFileName()', () => {
  const base = {
    serviceSlug: 'bootcamp-trabajar-amplificado',
    companyName: 'Transportes Rápidos S.A.S.',
    date: '2026-03-29',
    lang: 'ES',
  };

  test('returns correct pattern: propuesta_[svc]_[co]_[YYYY-MM]_[LANG]', () => {
    const name = buildFileName(base);
    expect(name).toBe('propuesta_bootcamp-trabajar-amplificado_transportes-rapidos-sas_2026-03_ES');
  });

  test('lang is uppercased', () => {
    expect(buildFileName({ ...base, lang: 'en' })).toContain('_EN');
  });

  test('date only uses YYYY-MM (no day)', () => {
    const name = buildFileName({ ...base, date: '2026-12-01' });
    expect(name).toContain('2026-12');
    expect(name).not.toContain('2026-12-01');
  });

  test('bilingual lang preserved', () => {
    expect(buildFileName({ ...base, lang: 'bilingual' })).toContain('_BILINGUAL');
  });

  test('fallback company name when blank', () => {
    const name = buildFileName({ ...base, companyName: '' });
    expect(name).toContain('_cliente_');
  });
});

// ─── resolveCollision() ───────────────────────────────────────────────────────

describe('resolveCollision()', () => {
  test('no collision → returns base + ext unchanged', () => {
    const result = resolveCollision('propuesta_boot_acme_2026-03_ES', '.html', () => false);
    expect(result).toBe('propuesta_boot_acme_2026-03_ES.html');
  });

  test('one collision → appends _v2', () => {
    const existing = new Set(['propuesta_boot_acme_2026-03_ES.html']);
    const result = resolveCollision('propuesta_boot_acme_2026-03_ES', '.html', n => existing.has(n));
    expect(result).toBe('propuesta_boot_acme_2026-03_ES_v2.html');
  });

  test('multiple collisions → increments until free', () => {
    const existing = new Set([
      'propuesta_boot_acme_2026-03_ES.html',
      'propuesta_boot_acme_2026-03_ES_v2.html',
      'propuesta_boot_acme_2026-03_ES_v3.html',
    ]);
    const result = resolveCollision('propuesta_boot_acme_2026-03_ES', '.html', n => existing.has(n));
    expect(result).toBe('propuesta_boot_acme_2026-03_ES_v4.html');
  });

  test('extension included in result', () => {
    const result = resolveCollision('propuesta_x', '.docx', () => false);
    expect(result).toMatch(/\.docx$/);
  });
});

module.exports = { runAll };
