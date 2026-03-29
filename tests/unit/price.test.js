/**
 * price.test.js — Unit tests for scripts/utils/price.js
 * Tests: formatCOP, formatUSD, calcIVA, buildInvestmentSummary, validateAgainstCanonical
 */
'use strict';

const path = require('path');
const { describe, test, expect, runAll } = require('../harness');
const {
  formatCOP,
  formatUSD,
  format,
  calcIVA,
  buildInvestmentSummary,
  validateAgainstCanonical,
  IVA_RATE,
  USD_DISCLAIMER_ES,
  USD_DISCLAIMER_EN,
} = require(
  path.resolve(__dirname, '../../skills/metodologia-proposal-engine/scripts/utils/price')
);

// ─── formatCOP() ─────────────────────────────────────────────────────────────

describe('formatCOP()', () => {
  test('12,000,000 → COP 12.000.000 (Colombian locale)', () => {
    expect(formatCOP(12000000)).toBe('COP 12.000.000');
  });
  test('200,000 → COP 200.000', () => {
    expect(formatCOP(200000)).toBe('COP 200.000');
  });
  test('900,000 → COP 900.000', () => {
    expect(formatCOP(900000)).toBe('COP 900.000');
  });
  test('no decimals in COP amounts', () => {
    expect(formatCOP(12000000)).not.toContain(',');
    expect(formatCOP(12000000)).not.toMatch(/\.\d{2}$/);
  });
  test('NaN → COP —', () => {
    expect(formatCOP(NaN)).toBe('COP —');
  });
  test('non-number → COP —', () => {
    expect(formatCOP('twelve')).toBe('COP —');
  });
  test('rounds decimal amounts', () => {
    expect(formatCOP(12000000.7)).toBe('COP 12.000.001');
  });
});

// ─── formatUSD() ─────────────────────────────────────────────────────────────

describe('formatUSD() — PC-05: always includes disclaimer', () => {
  test('includes amount and ES disclaimer', () => {
    const result = formatUSD(500, 'es');
    expect(result).toContain('USD 500');
    expect(result).toContain(USD_DISCLAIMER_ES);
  });
  test('includes EN disclaimer for lang=en', () => {
    const result = formatUSD(500, 'en');
    expect(result).toContain(USD_DISCLAIMER_EN);
  });
  test('never omits disclaimer — no call without it', () => {
    // Even if lang is undefined, disclaimer must appear
    const result = formatUSD(500);
    expect(result).toContain('sujeta');
  });
});

// ─── format() dispatcher ─────────────────────────────────────────────────────

describe('format() — currency dispatcher', () => {
  test('COP routes to formatCOP', () => {
    expect(format(12000000, 'COP', 'es')).toBe('COP 12.000.000');
  });
  test('USD routes to formatUSD with disclaimer', () => {
    expect(format(500, 'USD', 'en')).toContain(USD_DISCLAIMER_EN);
  });
  test('EUR formats with European locale', () => {
    const result = format(1000, 'EUR', 'es');
    expect(result).toContain('EUR');
    expect(result).toContain('1');
  });
});

// ─── IVA_RATE constant ────────────────────────────────────────────────────────

describe('IVA_RATE', () => {
  test('IVA is 19%', () => {
    expect(IVA_RATE).toBe(0.19);
  });
});

// ─── calcIVA() ────────────────────────────────────────────────────────────────

describe('calcIVA() — B2B (discriminated)', () => {
  test('calculates IVA on COP 12,000,000', () => {
    const result = calcIVA(12000000, 'b2b');
    expect(result.subtotal).toBe(12000000);
    expect(result.iva).toBe(2280000);       // 12M × 0.19
    expect(result.total).toBe(14280000);    // 12M + 2.28M
  });
  test('calculates IVA on COP 900,000', () => {
    const result = calcIVA(900000, 'b2b');
    expect(result.iva).toBe(171000);
    expect(result.total).toBe(1071000);
  });
  test('calculates IVA on COP 3,000,000', () => {
    const result = calcIVA(3000000, 'b2b');
    expect(result.iva).toBe(570000);
    expect(result.total).toBe(3570000);
  });
});

describe('calcIVA() — B2C (included, no line item)', () => {
  test('B2C: iva is null, total = subtotal (IVA already included)', () => {
    const result = calcIVA(900000, 'b2c');
    expect(result.iva).toBeNull();
    expect(result.total).toBe(900000);   // no change
    expect(result.subtotal).toBe(900000);
  });
  test('B2C never adds IVA to total', () => {
    const result = calcIVA(200000, 'b2c');
    expect(result.total).toBe(200000);
  });
  test('B2C default when segment omitted', () => {
    // Segment defaults to 'b2b' per function signature
    const result = calcIVA(12000000);
    expect(result.iva).toBe(2280000);  // b2b behavior
  });
});

// ─── validateAgainstCanonical() ───────────────────────────────────────────────

describe('validateAgainstCanonical() — L1 check', () => {
  test('exact match → valid: true', () => {
    const r = validateAgainstCanonical(12000000, 12000000);
    expect(r.valid).toBe(true);
    expect(r.delta).toBe(0);
  });
  test('mismatch → valid: false with L1 in message', () => {
    const r = validateAgainstCanonical(11000000, 12000000);
    expect(r.valid).toBe(false);
    expect(r.message).toContain('L1');
  });
  test('mismatch includes delta value', () => {
    const r = validateAgainstCanonical(10000000, 12000000);
    expect(r.delta).toBe(-2000000);
  });
  test('higher proposed price is also invalid', () => {
    const r = validateAgainstCanonical(13000000, 12000000);
    expect(r.valid).toBe(false);
    expect(r.delta).toBeGreaterThan(0);
  });
  test('B2C price check: 900K vs 900K → valid', () => {
    const r = validateAgainstCanonical(900000, 900000);
    expect(r.valid).toBe(true);
  });
});

// ─── buildInvestmentSummary() ─────────────────────────────────────────────────

describe('buildInvestmentSummary()', () => {
  const services = [
    { name: 'Bootcamp TA', price: 12000000, description: 'main', is_standard: true },
  ];

  test('B2B: total includes IVA', () => {
    const s = buildInvestmentSummary(services, 'b2b', 'COP', 'es');
    expect(s.total).toBe(14280000);
    expect(s.iva).toBe(2280000);
    expect(s.vat_label).toBe('IVA');
  });

  test('B2C: total = subtotal, iva null, no vat_label', () => {
    const s = buildInvestmentSummary(services, 'b2c', 'COP', 'es');
    expect(s.total).toBe(12000000);
    expect(s.iva).toBeNull();
    expect(s.vat_label).toBeNull();
  });

  test('services_formatted includes price_formatted string', () => {
    const s = buildInvestmentSummary(services, 'b2b', 'COP', 'es');
    expect(s.services_formatted[0].price_formatted).toContain('COP');
  });

  test('has_por_confirmar false when all services are standard', () => {
    const s = buildInvestmentSummary(services, 'b2b', 'COP', 'es');
    expect(s.has_por_confirmar).toBe(false);
  });

  test('has_por_confirmar true when any service is non-standard', () => {
    const custom = [{ ...services[0], is_standard: false }];
    const s = buildInvestmentSummary(custom, 'b2b', 'COP', 'es');
    expect(s.has_por_confirmar).toBe(true);
  });

  test('has_usd false for COP', () => {
    const s = buildInvestmentSummary(services, 'b2b', 'COP', 'es');
    expect(s.has_usd).toBe(false);
  });

  test('has_usd true for USD currency', () => {
    const s = buildInvestmentSummary(services, 'b2b', 'USD', 'en');
    expect(s.has_usd).toBe(true);
  });

  test('multi-service: sums all service prices for subtotal', () => {
    const multi = [
      { name: 'Svc A', price: 3000000, description: '', is_standard: true },
      { name: 'Svc B', price: 9000000, description: '', is_standard: true },
    ];
    const s = buildInvestmentSummary(multi, 'b2b', 'COP', 'es');
    expect(s.subtotal).toBe(12000000);
    expect(s.total).toBe(14280000);
  });

  test('B2B EN: vat_label = VAT', () => {
    const s = buildInvestmentSummary(services, 'b2b', 'COP', 'en');
    expect(s.vat_label).toBe('VAT');
  });

  test('non-standard service price_formatted = [POR CONFIRMAR]', () => {
    const nonStd = [{ name: 'Custom', price: 0, description: '', is_standard: false }];
    const s = buildInvestmentSummary(nonStd, 'b2b', 'COP', 'es');
    expect(s.services_formatted[0].price_formatted).toBe('[POR CONFIRMAR]');
  });
});

module.exports = { runAll };
