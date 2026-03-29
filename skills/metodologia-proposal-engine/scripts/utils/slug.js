/**
 * slug.js — Company slug normalization utility
 * MetodologIA Proposal Engine v1.1
 *
 * Implements the 4-step slug algorithm defined in CLAUDE.md § "Slug Normalization Rule".
 * Used by: generate-all.js (file naming), format-producer agent (collision check)
 *
 * Steps:
 *  1. Lowercase → replace accented chars with ASCII
 *  2. Replace & + / . , ' with hyphen → collapse consecutive hyphens → strip leading/trailing
 *  3. Truncate to 25 chars at word boundary (never mid-word)
 *  4. Fallback: if result < 2 chars → "cliente"
 *
 * File collision versioning: if slug already exists, append _v2, _v3, etc.
 *
 * @module utils/slug
 */

'use strict';

// ─── Accent map ───────────────────────────────────────────────────────────────
// Only characters that actually appear in Spanish/Portuguese company names.
// Intentionally minimal — avoid replacing characters with unexpected meanings.
const ACCENT_MAP = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a', å: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o', ø: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c', ý: 'y',
  // Uppercase variants
  Á: 'a', À: 'a', Ä: 'a', Â: 'a', Ã: 'a', Å: 'a',
  É: 'e', È: 'e', Ë: 'e', Ê: 'e',
  Í: 'i', Ì: 'i', Ï: 'i', Î: 'i',
  Ó: 'o', Ò: 'o', Ö: 'o', Ô: 'o', Õ: 'o', Ø: 'o',
  Ú: 'u', Ù: 'u', Ü: 'u', Û: 'u',
  Ñ: 'n', Ç: 'c', Ý: 'y',
};

const MAX_LENGTH = 25;
const FALLBACK   = 'cliente';

/**
 * Normalize a company name into a URL-safe slug (≤ 25 chars).
 *
 * @param {string} name — Raw company name (e.g. "Transportes Rápidos S.A.S.")
 * @returns {string} — Normalized slug (e.g. "transportes-rapidos-sas")
 *
 * @example
 * normalize('Café & Co.')              // → 'cafe-co'
 * normalize('Transportes Rápidos S.A.S.') // → 'transportes-rapidos-sas'
 * normalize('')                        // → 'cliente'
 * normalize('A')                       // → 'cliente'
 */
function normalize(name) {
  if (typeof name !== 'string' || !name.trim()) return FALLBACK;

  // Step 1: lowercase + replace accented chars
  let slug = name
    .trim()
    .split('')
    .map(ch => ACCENT_MAP[ch] ?? ch)
    .join('')
    .toLowerCase();

  // Step 2: punctuation → hyphen, collapse, strip edges
  // Pre-process: remove abbreviation dots (S.A.S. → SAS, U.S.A. → USA)
  //   Pattern: letter immediately followed by dot + letter, OR letter + dot at word boundary
  slug = slug.replace(/([a-z])\.(?=[a-z])/g, '$1');  // S.A.S → SAS mid-word
  slug = slug.replace(/([a-z])\.(?=\s|$|[^a-z])/g, '$1'); // trailing dot on abbrev: S.A.S. end
  // Pre-process: remove apostrophes (O'Brien → OBrien, not O-Brien)
  slug = slug.replace(/'/g, '');
  slug = slug
    .replace(/[&+/.,\s]+/g, '-')    // special chars + whitespace → hyphen (apostrophe already removed)
    .replace(/-{2,}/g, '-')          // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '');        // strip leading/trailing hyphens

  // Remove any character that is not alphanumeric or hyphen
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // Step 3: truncate to MAX_LENGTH at word boundary
  if (slug.length > MAX_LENGTH) {
    const truncated = slug.substring(0, MAX_LENGTH);
    const lastHyphen = truncated.lastIndexOf('-');
    slug = lastHyphen > 1 ? truncated.substring(0, lastHyphen) : truncated;
  }

  // Step 4: fallback if result is too short
  if (slug.length < 2) return FALLBACK;

  return slug;
}

/**
 * Build the full proposal file name (without extension).
 * Pattern: propuesta_[service-slug]_[company-slug]_[YYYY-MM]_[LANG]
 *
 * @param {object} opts
 * @param {string} opts.serviceSlug  — from catalog (e.g. "bootcamp-trabajar-amplificado")
 * @param {string} opts.companyName  — raw company name
 * @param {string} opts.date         — ISO date string "YYYY-MM-DD"
 * @param {string} opts.lang         — "ES" | "EN" | "bilingual"
 * @returns {string}
 *
 * @example
 * buildFileName({
 *   serviceSlug: 'bootcamp-trabajar-amplificado',
 *   companyName: 'Transportes Rápidos S.A.S.',
 *   date: '2026-03-29',
 *   lang: 'ES'
 * })
 * // → 'propuesta_bootcamp-trabajar-amplificado_transportes-rapidos_2026-03_ES'
 */
function buildFileName({ serviceSlug, companyName, date, lang }) {
  const companySlug = normalize(companyName);
  const yearMonth   = (date || new Date().toISOString()).substring(0, 7); // YYYY-MM
  return `propuesta_${serviceSlug}_${companySlug}_${yearMonth}_${lang.toUpperCase()}`;
}

/**
 * Resolve file collision by appending _v2, _v3, etc.
 * Pass an existsCheck function that returns true if the file already exists.
 *
 * @param {string}   baseName    — base file name without extension
 * @param {string}   ext         — file extension including dot (e.g. ".html")
 * @param {Function} existsCheck — (fullName: string) => boolean
 * @returns {string} — collision-free full file name with extension
 *
 * @example
 * resolveCollision('propuesta_boot_acme_2026-03_ES', '.html', name => existingFiles.has(name));
 */
function resolveCollision(baseName, ext, existsCheck) {
  const candidate = baseName + ext;
  if (!existsCheck(candidate)) return candidate;

  for (let v = 2; v <= 99; v++) {
    const versioned = `${baseName}_v${v}${ext}`;
    if (!existsCheck(versioned)) return versioned;
  }

  // Extremely unlikely: 98 collisions. Use timestamp suffix as last resort.
  return `${baseName}_${Date.now()}${ext}`;
}

module.exports = { normalize, buildFileName, resolveCollision };
