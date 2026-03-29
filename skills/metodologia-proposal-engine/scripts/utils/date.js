/**
 * date.js — Date utilities for the MetodologIA Proposal Engine
 * MetodologIA Proposal Engine v1.1
 *
 * Responsibilities:
 * - Generate proposal IDs: PRO-YYYY-NNN (sequential within the year)
 * - Calculate proposal validity expiry date
 * - Format dates for ES and EN output (display strings, not ISO)
 *
 * Used by: generate-all.js, proposal-conductor agent (ID assignment),
 *          proposal-html.hbs (valid_until_date, date display)
 *
 * @module utils/date
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Localized month names ─────────────────────────────────────────────────────
const MONTHS_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];
const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/**
 * Parse an ISO date string "YYYY-MM-DD" or accept a Date object.
 * Treats the date as local time (avoids UTC offset shifting the displayed day).
 *
 * @param {string|Date} input
 * @returns {Date}
 */
function parseDate(input) {
  // Always return a COPY — callers like calcExpiry mutate the date object via setDate()
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === 'string') {
    // "YYYY-MM-DD" → local midnight (avoids UTC day shift)
    const [y, m, d] = input.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

/**
 * Format a date for display in a proposal.
 *
 * @param {string|Date} input
 * @param {'es'|'en'} lang
 * @returns {string}
 *
 * @example
 * formatDisplay('2026-03-29', 'es') // → '29 de marzo de 2026'
 * formatDisplay('2026-03-29', 'en') // → 'March 29, 2026'
 */
function formatDisplay(input, lang = 'es') {
  const d = parseDate(input);
  const day  = d.getDate();
  const mon  = d.getMonth();
  const year = d.getFullYear();

  if (lang === 'en') {
    return `${MONTHS_EN[mon]} ${day}, ${year}`;
  }
  return `${day} de ${MONTHS_ES[mon]} de ${year}`;
}

/**
 * Format a date as ISO "YYYY-MM-DD".
 *
 * @param {string|Date} input
 * @returns {string}
 */
function formatISO(input) {
  const d = parseDate(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculate the proposal expiry date.
 *
 * @param {string|Date} issueDate — proposal issue date
 * @param {number}      validDays — validity window in days (default: 30)
 * @returns {{ iso: string, es: string, en: string }}
 *
 * @example
 * calcExpiry('2026-03-29', 30)
 * // → { iso: '2026-04-28', es: '28 de abril de 2026', en: 'April 28, 2026' }
 */
function calcExpiry(issueDate, validDays = 30) {
  const d = parseDate(issueDate);
  d.setDate(d.getDate() + validDays);
  return {
    iso: formatISO(d),
    es:  formatDisplay(d, 'es'),
    en:  formatDisplay(d, 'en'),
  };
}

/**
 * Generate a sequential proposal ID: PRO-YYYY-NNN
 *
 * Reads a counter file (.proposal-counter.json) in the given directory.
 * Creates it if missing. Resets counter when the year changes.
 *
 * @param {string} counterDir — directory where .proposal-counter.json lives
 *                              (defaults to process.cwd())
 * @returns {string} — e.g. "PRO-2026-001"
 *
 * @example
 * generateProposalId('./outputs') // → 'PRO-2026-001'
 * generateProposalId('./outputs') // → 'PRO-2026-002'
 */
function generateProposalId(counterDir) {
  const dir  = counterDir || process.cwd();
  const file = path.join(dir, '.proposal-counter.json');
  const year = new Date().getFullYear();

  let counter = { year, seq: 0 };

  if (fs.existsSync(file)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (raw.year === year) {
        counter = raw;
      }
      // Year changed → counter resets (default above)
    } catch (_) {
      // Corrupt file — reset silently
    }
  }

  counter.seq += 1;

  try {
    fs.writeFileSync(file, JSON.stringify(counter), 'utf8');
  } catch (_) {
    // Non-writable directory — ID still returned, just not persisted
  }

  const seq = String(counter.seq).padStart(3, '0');
  return `PRO-${year}-${seq}`;
}

/**
 * Build the complete date metadata object for a ProposalData record.
 *
 * @param {object} opts
 * @param {string|Date} [opts.issueDate] — defaults to today
 * @param {number}      [opts.validDays] — defaults to 30
 * @param {string}      [opts.counterDir]
 * @returns {{
 *   id:              string,
 *   date:            string,
 *   valid_days:      number,
 *   valid_until:     { iso: string, es: string, en: string },
 *   display:         { es: string, en: string }
 * }}
 */
function buildDateMeta({ issueDate, validDays = 30, counterDir } = {}) {
  const d    = issueDate ? parseDate(issueDate) : new Date();
  const iso  = formatISO(d);

  return {
    id:         generateProposalId(counterDir),
    date:       iso,
    valid_days: validDays,
    valid_until: calcExpiry(d, validDays),
    display: {
      es: formatDisplay(d, 'es'),
      en: formatDisplay(d, 'en'),
    },
  };
}

module.exports = {
  parseDate,
  formatDisplay,
  formatISO,
  calcExpiry,
  generateProposalId,
  buildDateMeta,
};
