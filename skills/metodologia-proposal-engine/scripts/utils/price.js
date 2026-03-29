/**
 * price.js — Price formatting, IVA calculation, USD conversion
 * MetodologIA Proposal Engine v1.1
 *
 * Used by: generate-all.js, proposal-writer agent, legal-guardian (L1 price check)
 *
 * Rules enforced:
 * - COP amounts always formatted with Colombian locale (dots as thousands separator)
 * - USD amounts always append "(indicative rate, subject to variation)" — PC-05
 * - IVA (19%) always discriminated for B2B; always included for B2C
 * - Never round or approximate catalog prices — canonical value is the floor
 *
 * @module utils/price
 */

'use strict';

// ─── IVA rate ─────────────────────────────────────────────────────────────────
const IVA_RATE = 0.19;

// ─── USD disclaimer text (PC-05) ──────────────────────────────────────────────
const USD_DISCLAIMER_ES = '(Tasa indicativa, sujeta a variación)';
const USD_DISCLAIMER_EN = '(Indicative rate, subject to variation)';

/**
 * Format a COP price with Colombian locale formatting.
 * Output: "COP 12.000.000" (no decimals — catalog prices are whole numbers)
 *
 * @param {number} amount
 * @returns {string}
 *
 * @example
 * formatCOP(12000000) // → 'COP 12.000.000'
 * formatCOP(200000)   // → 'COP 200.000'
 */
function formatCOP(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'COP —';
  return 'COP ' + Math.round(amount).toLocaleString('es-CO');
}

/**
 * Format a USD price with disclaimer appended.
 * Always includes PC-05 disclaimer — never a fixed rate.
 *
 * @param {number} amount
 * @param {'es'|'en'} lang
 * @returns {string}
 *
 * @example
 * formatUSD(500, 'es') // → 'USD 500 (Tasa indicativa, sujeta a variación)'
 */
function formatUSD(amount, lang = 'es') {
  if (typeof amount !== 'number' || isNaN(amount)) return 'USD —';
  const disclaimer = lang === 'en' ? USD_DISCLAIMER_EN : USD_DISCLAIMER_ES;
  return `USD ${Math.round(amount).toLocaleString('en-US')} ${disclaimer}`;
}

/**
 * Format a price in the given currency.
 *
 * @param {number} amount
 * @param {'COP'|'USD'|'EUR'} currency
 * @param {'es'|'en'} lang
 * @returns {string}
 */
function format(amount, currency = 'COP', lang = 'es') {
  switch (currency) {
    case 'COP': return formatCOP(amount);
    case 'USD': return formatUSD(amount, lang);
    case 'EUR': return `EUR ${Math.round(amount).toLocaleString('de-DE')}`;
    default:    return `${currency} ${amount}`;
  }
}

/**
 * Calculate IVA for a B2B proposal (discriminated — IVA shown separately).
 * B2C: IVA is included in the displayed price (return null for IVA line).
 *
 * @param {number} subtotal    — price before IVA (the catalog price IS the pretax value for B2B)
 * @param {'b2b'|'b2c'} segment
 * @returns {{ subtotal: number, iva: number|null, total: number }}
 *
 * For B2B: total = subtotal + iva
 * For B2C: total = subtotal (IVA already included in catalog B2C price)
 *
 * @example
 * calcIVA(12000000, 'b2b')
 * // → { subtotal: 12000000, iva: 2280000, total: 14280000 }
 *
 * calcIVA(900000, 'b2c')
 * // → { subtotal: 900000, iva: null, total: 900000 }
 */
function calcIVA(subtotal, segment = 'b2b') {
  if (segment === 'b2c') {
    return { subtotal, iva: null, total: subtotal };
  }
  const iva   = Math.round(subtotal * IVA_RATE);
  const total = subtotal + iva;
  return { subtotal, iva, total };
}

/**
 * Build the full investment summary for a proposal.
 * Accepts an array of ServiceLine objects and the segment.
 *
 * @param {Array<{name: string, price: number, is_standard: boolean}>} services
 * @param {'b2b'|'b2c'} segment
 * @param {'COP'|'USD'|'EUR'} currency
 * @param {'es'|'en'} lang
 * @returns {{
 *   services_formatted: Array,
 *   subtotal: number,
 *   subtotal_formatted: string,
 *   iva: number|null,
 *   vat_formatted: string|null,
 *   total: number,
 *   total_formatted: string,
 *   has_por_confirmar: boolean,
 *   has_usd: boolean
 * }}
 */
function buildInvestmentSummary(services, segment = 'b2b', currency = 'COP', lang = 'es') {
  const subtotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const { iva, total } = calcIVA(subtotal, segment);

  const services_formatted = services.map(s => ({
    ...s,
    price_formatted: s.price ? format(s.price, currency, lang) : '[POR CONFIRMAR]',
  }));

  return {
    services_formatted,
    subtotal,
    subtotal_formatted: format(subtotal, currency, lang),
    iva,
    vat_formatted: iva ? format(iva, currency, lang) : null,
    vat_label:     segment === 'b2b' ? (lang === 'en' ? 'VAT' : 'IVA') : null,
    total,
    total_formatted: format(total, currency, lang),
    has_por_confirmar: services.some(s => !s.is_standard),
    has_usd: currency === 'USD',
  };
}

/**
 * Validate that a price matches the canonical value within tolerance.
 * Used by legal-guardian for L1 check.
 *
 * @param {number} proposed  — price in the proposal
 * @param {number} canonical — price from services.yaml
 * @returns {{ valid: boolean, delta: number, message: string }}
 *
 * Tolerance: exactly 0 — catalog prices must be exact. No rounding allowed.
 */
function validateAgainstCanonical(proposed, canonical) {
  if (proposed === canonical) {
    return { valid: true, delta: 0, message: 'Price matches canonical.' };
  }
  const delta = proposed - canonical;
  return {
    valid: false,
    delta,
    message: `L1: Price mismatch. Proposed ${formatCOP(proposed)}, canonical ${formatCOP(canonical)}. Delta: ${delta > 0 ? '+' : ''}${formatCOP(delta)}.`,
  };
}

module.exports = {
  formatCOP,
  formatUSD,
  format,
  calcIVA,
  buildInvestmentSummary,
  validateAgainstCanonical,
  IVA_RATE,
  USD_DISCLAIMER_ES,
  USD_DISCLAIMER_EN,
};
