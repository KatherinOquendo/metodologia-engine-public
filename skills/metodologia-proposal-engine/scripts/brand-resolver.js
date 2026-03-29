#!/usr/bin/env node
/**
 * brand-resolver.js — Runtime brand config resolver
 * Resolves branding tokens based on mode (own | cobrand | whitelabel)
 * 
 * Usage:
 *   node brand-resolver.js '{"brand_mode":"cobrand","partner":{"name":"IAC","primary_color":"#005A8E"}}'
 *   const { resolveBrand } = require('./brand-resolver');
 *   const config = resolveBrand({ brand_mode: 'whitelabel', partner: { ... } });
 */

const METODOLOGIA_BRAND = {
  name: 'MetodologIA',
  colors: {
    primary:   '#122562',  // navy
    accent:    '#FFD700',  // gold
    secondary: '#137DC5',  // blue
    dark:      '#1F2833',
    lavender:  '#BBA0CC',
    gray:      '#808080',
    white:     '#FFFFFF',
    light:     '#F8F9FC',
  },
  // Hex without # (for DOCX/XLSX/PPTX)
  hex: {
    primary: '122562', accent: 'FFD700', secondary: '137DC5',
    dark: '1F2833', gray: '808080', white: 'FFFFFF', light: 'F8F9FC',
  },
  fonts: {
    display: "'Poppins', 'Arial', sans-serif",
    body:    "'Trebuchet MS', Arial, sans-serif",
    note:    "'Futura PT', 'Trebuchet MS', sans-serif",
    office_display: 'Arial',          // Poppins fallback for Office
    office_body:    'Trebuchet MS',
  },
  logo_svg: `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="mlg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A122A"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient></defs>
    <rect width="36" height="36" rx="10" fill="url(#mlg)"/>
    <rect x="10" y="12" width="3" height="12" rx="1" fill="white"/>
    <rect x="16" y="12" width="3" height="8" rx="1" fill="white"/>
    <rect x="16" y="22" width="3" height="2" rx="1" fill="white"/>
    <rect x="22" y="12" width="3" height="6" rx="1" fill="white"/>
    <rect x="22" y="20" width="3" height="4" rx="1" fill="white"/>
    <circle cx="18" cy="8" r="2" fill="#FFD700"/>
  </svg>`,
};

/**
 * @param {object} input
 * @param {string} input.brand_mode - 'own' | 'cobrand' | 'whitelabel'
 * @param {string} [input.service_slug] - used to infer default mode if brand_mode not explicit
 * @param {object} [input.partner] - required for cobrand/whitelabel
 * @param {string} input.partner.name
 * @param {string} input.partner.primary_color - hex with #
 * @param {string} [input.partner.accent_color]
 * @param {string} [input.partner.secondary_color]
 * @param {string} [input.partner.font_display]
 * @param {string} [input.partner.font_body]
 * @param {string} [input.partner.logo_svg]
 * @returns {object} BrandConfig
 */
function resolveBrand(input) {
  const { brand_mode, service_slug, partner } = input;

  // Infer mode from slug if not explicit (IAC services → whitelabel)
  const inferredMode = (service_slug || '').startsWith('iac/') ? 'whitelabel' : 'own';
  const mode = brand_mode || inferredMode;

  if (mode === 'own') {
    return {
      mode: 'own',
      colors: { ...METODOLOGIA_BRAND.colors },
      hex: { ...METODOLOGIA_BRAND.hex },
      fonts: { ...METODOLOGIA_BRAND.fonts },
      logo: {
        primary_svg: METODOLOGIA_BRAND.logo_svg,
        primary_name: 'MetodologIA',
      },
      show_metodologia: true,
      show_partner: false,
    };
  }

  if (!partner) {
    throw new Error(`brand_mode '${mode}' requires partner config`);
  }

  const partnerPrimary = partner.primary_color || '#333333';
  const partnerAccent  = partner.accent_color  || partnerPrimary;
  const partnerSecond  = partner.secondary_color || partnerPrimary;

  if (mode === 'cobrand') {
    // RULE: partner accent overrides --gold only. Navy, typography, design system unchanged.
    return {
      mode: 'cobrand',
      colors: {
        ...METODOLOGIA_BRAND.colors,
        accent: partnerAccent,   // only gold replaced
      },
      hex: {
        ...METODOLOGIA_BRAND.hex,
        accent: partnerAccent.replace('#', ''),
      },
      fonts: { ...METODOLOGIA_BRAND.fonts },  // never changed in cobrand
      logo: {
        primary_svg: METODOLOGIA_BRAND.logo_svg,
        primary_name: 'MetodologIA',
        secondary_svg: partner.logo_svg || null,
        secondary_name: partner.name,
      },
      show_metodologia: true,
      show_partner: true,
      partner: {
        name: partner.name,
        primary_color: partnerPrimary,
        accent_color: partnerAccent,
      },
    };
  }

  if (mode === 'whitelabel') {
    // RULE: ALL MetodologIA tokens replaced. MetodologIA invisible.
    const displayFont = partner.font_display || 'Arial, sans-serif';
    const bodyFont    = partner.font_body    || 'Arial, sans-serif';
    return {
      mode: 'whitelabel',
      colors: {
        primary:   partnerPrimary,
        accent:    partnerAccent,
        secondary: partnerSecond,
        dark:      partner.dark_color  || '#1F2833',
        lavender:  partner.soft_color  || '#CCCCCC',
        gray:      '#808080',
        white:     '#FFFFFF',
        light:     '#F8F9FC',
      },
      hex: {
        primary:   partnerPrimary.replace('#', ''),
        accent:    partnerAccent.replace('#', ''),
        secondary: partnerSecond.replace('#', ''),
        dark:      (partner.dark_color  || '#1F2833').replace('#', ''),
        gray:      '808080', white: 'FFFFFF', light: 'F8F9FC',
      },
      fonts: {
        display: displayFont,
        body:    bodyFont,
        note:    bodyFont,
        office_display: displayFont.split(',')[0].replace(/['"]/g, '').trim(),
        office_body:    bodyFont.split(',')[0].replace(/['"]/g, '').trim(),
      },
      logo: {
        primary_svg:  partner.logo_svg || '<svg/>',
        primary_name: partner.name,
      },
      show_metodologia: false,   // MetodologIA COMPLETELY invisible
      show_partner: true,
      partner: {
        name: partner.name,
        primary_color: partnerPrimary,
        accent_color:  partnerAccent,
        logo_svg:      partner.logo_svg || null,
      },
    };
  }

  throw new Error(`Unknown brand_mode: ${mode}. Use 'own', 'cobrand', or 'whitelabel'.`);
}

// CLI usage
if (require.main === module) {
  try {
    const input = JSON.parse(process.argv[2] || '{}');
    const result = resolveBrand(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    console.error('Usage: node brand-resolver.js \'{"brand_mode":"own"}\'');
    process.exit(1);
  }
}

module.exports = { resolveBrand, METODOLOGIA_BRAND };
