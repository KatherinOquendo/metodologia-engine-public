#!/usr/bin/env node
/**
 * i18n.js — Language detection and bilingual utilities
 * Detects user language from input, applies correct tone/substitutions.
 */

const ES_MARKERS = ['¿', 'á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü',
  'propuesta', 'cotización', 'oferta', 'presupuesto',
  'para', 'que', 'los', 'las', 'del', 'con', 'una', 'por'];

const EN_MARKERS = ['proposal', 'quote', 'offer', 'budget',
  'the', 'for', 'with', 'and', 'that', 'this', 'your'];

/**
 * Detect language from input text (returns 'es', 'en', or 'both')
 */
function detectLanguage(text) {
  const lower = text.toLowerCase();
  let esScore = 0, enScore = 0;
  ES_MARKERS.forEach(m => { if (lower.includes(m)) esScore++; });
  EN_MARKERS.forEach(m => { if (lower.includes(m)) enScore++; });
  if (esScore > enScore * 1.5) return 'es';
  if (enScore > esScore * 1.5) return 'en';
  return 'both';  // bilingual input or ambiguous → produce both
}

/**
 * Apply novice user substitutions (replaces technical terms in plain text)
 */
const NOVICE_SUBS_ES = {
  'meta-prompt': 'instrucciones personalizadas para la IA',
  'playbook': 'guía paso a paso',
  'asistente IA': 'herramienta de IA configurada para ti',
  'bootcamp': 'curso intensivo práctico',
  'facilitador': 'instructor',
  'embajador': 'tu contacto personal',
  'artefacto': 'documento o resultado que produces',
  'campus': 'plataforma de materiales',
  'LMS': 'plataforma de materiales',
};

const NOVICE_SUBS_EN = {
  'meta-prompt': 'personalized instructions for the AI',
  'playbook': 'step-by-step guide',
  'AI assistant': 'AI tool configured for you',
  'bootcamp': 'intensive practical course',
  'facilitator': 'instructor',
  'ambassador': 'your personal contact',
  'artifact': 'document or result you produce',
  'campus': 'materials platform',
  'LMS': 'materials platform',
};

function applyNoviceSubs(text, lang = 'es') {
  const subs = lang === 'es' ? NOVICE_SUBS_ES : NOVICE_SUBS_EN;
  let result = text;
  Object.entries(subs).forEach(([term, replacement]) => {
    const regex = new RegExp(term, 'gi');
    result = result.replace(regex, replacement);
  });
  return result;
}

/**
 * Get the right audience label for a document version
 */
function getAudienceLabel(version, lang) {
  const labels = {
    'ejecutiva-b2b': { es: 'Versión Ejecutiva B2B', en: 'B2B Executive Version' },
    'ejecutiva-b2c': { es: 'Versión Ejecutiva B2C', en: 'B2C Executive Version' },
    'comercial-cliente-b2b': { es: 'Comercial B2B', en: 'B2B Commercial' },
    'comercial-cliente-b2c': { es: 'Comercial B2C', en: 'B2C Commercial' },
    'comercial-compras': { es: 'Área de Compras', en: 'Procurement' },
    'usuario-inexperto': { es: 'Usuario Principiante', en: 'Novice User' },
  };
  return labels[version]?.[lang] || version;
}

/**
 * Format COP amount per audience
 * Novice: "800 mil pesos" | Technical: "COP 800.000" | EN: "COP 800,000"
 */
function formatPrice(amount, currency = 'COP', lang = 'es', audience = 'standard') {
  if (audience === 'inexperto' && lang === 'es') {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.0', '')} millones de pesos`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)} mil pesos`;
    return `${amount} pesos`;
  }
  if (lang === 'es') {
    return `${currency} ${amount.toLocaleString('es-CO')}`;
  }
  return `${currency} ${amount.toLocaleString('en-US')}`;
}

/**
 * Get section label for a proposal section
 */
function getSectionLabel(section, lang) {
  const labels = {
    problem:    { es: 'El Desafío', en: 'The Challenge' },
    solution:   { es: 'La Solución Propuesta', en: 'The Proposed Solution' },
    scope:      { es: 'Alcance y Entregables', en: 'Scope & Deliverables' },
    plan:       { es: 'Plan de Trabajo', en: 'Work Plan' },
    investment: { es: 'Inversión', en: 'Investment' },
    why:        { es: 'Por Qué Nosotros', en: 'Why Us' },
    next_steps: { es: 'Próximos Pasos', en: 'Next Steps' },
    not_included: { es: 'No Incluye', en: 'Not Included' },
    guarantee:  { es: 'Garantía', en: 'Guarantee' },
    continuity: { es: 'Ruta de Continuidad', en: 'Continuity Path' },
  };
  return labels[section]?.[lang] || section;
}

module.exports = {
  detectLanguage,
  applyNoviceSubs,
  getAudienceLabel,
  formatPrice,
  getSectionLabel,
};

// Quick test
if (require.main === module) {
  console.log('detectLanguage("¿para qué empresa es la propuesta?"):', detectLanguage('¿para qué empresa es la propuesta?'));
  console.log('detectLanguage("proposal for enterprise client"):', detectLanguage('proposal for enterprise client'));
  console.log('formatPrice(800000, "COP", "es", "inexperto"):', formatPrice(800000, 'COP', 'es', 'inexperto'));
  console.log('formatPrice(12000000, "COP", "en"):', formatPrice(12000000, 'COP', 'en'));
}
