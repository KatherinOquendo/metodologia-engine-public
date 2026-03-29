#!/usr/bin/env node
/**
 * input-normalizer.js — Worst-case input → ProposalData JSON
 * Implements 5-pass normalization with confidence scoring.
 * The BLOCK_NEVER principle: always produce output, never throw.
 *
 * Usage:
 *   CLI:    node input-normalizer.js --input "equipo de ventas, 20 personas, IA"
 *   Module: const { normalizeInput } = require('./input-normalizer');
 *           const result = normalizeInput("equipo de ventas, 20 personas, IA");
 */

const path = require('path');

// Import catalog query for service matching
let catalogQuery;
try {
  catalogQuery = require('./catalog-query');
} catch {
  catalogQuery = null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const FILLER_WORDS_ES = /\b(eh|uh|um|mmm|este|bueno|pues|o sea|digamos|como que|verdad|sabes|entonces|básicamente|literalmente|tipo|osea)\b/gi;
const FILLER_WORDS_EN = /\b(uh|um|like|you know|basically|literally|so|well|I mean|kind of|sort of|actually|right)\b/gi;

const CRITICAL_FIELDS   = ['problem', 'segment'];
const IMPORTANT_FIELDS  = ['budget', 'timeline', 'audience'];
const OPTIONAL_FIELDS   = ['company_name', 'contact', 'industry'];

const PROCEED_THRESHOLD = 0.4;
const BLOCK_NEVER = true;

// ── Service keyword map (for fuzzy matching without external deps) ─────────

const SERVICE_KEYWORDS = {
  'workshop-de-ocupado-a-productivo': ['productivo', 'productividad', 'ocupado', 'busy', 'productive', 'workshop', 'taller', '3 horas', '3h'],
  'bootcamp-trabajar-amplificado': ['amplificado', 'amplified', 'trabajar', 'ia', 'ai', 'bootcamp', 'inteligencia artificial', '20 horas', '20h'],
  'consultive-workshop-estrategia': ['estrategia', 'strategy', 'consultivo', 'consultive', 'estratégico', 'c-suite', 'directivos', 'líderes'],
  'programa-digital-champions': ['champions', 'campeones', 'líderes digitales', 'transformación', 'programa largo', '16 semanas'],
  'programa-empoderamiento': ['empoderamiento', 'empowerment', 'personal', 'individual', 'freelancer', 'independiente'],
  'bootcamp-gerencia-proyectos': ['proyectos', 'project management', 'gerencia', 'pmo', 'gestión de proyectos'],
  'bootcamp-ofimatica-google': ['google', 'workspace', 'gemini', 'sheets', 'docs', 'slides', 'gmail', 'ofimática google'],
  'bootcamp-ofimatica-microsoft': ['microsoft', 'office', 'copilot', 'excel', 'word', 'powerpoint', 'teams', '365', 'ofimática microsoft'],
  'bootcamp-ventas-amplificadas': ['ventas', 'sales', 'comercial', 'crm', 'pipeline', 'vender'],
  'bootcamp-amplificacion-ia': ['amplificación ia', 'ia avanzada', 'advanced ai', 'amplification'],
  'bootcamp-ia-comercial': ['ia comercial', 'commercial ai', 'ventas ia', 'sales ai'],
  'bootcamp-introduccion-ia-generativa': ['introducción ia', 'intro ai', 'ia generativa', 'generative ai', 'generativa', 'primeros pasos'],
  'bootcamp-ofimatica-ia-google': ['google ia', 'gemini avanzado', 'google ai office'],
  'bootcamp-ofimatica-ia-microsoft': ['microsoft ia', 'copilot avanzado', 'microsoft ai office'],
  'programa-competencias-digitales-universales': ['competencias digitales', 'digital skills', 'universales', 'digital competencies'],
  'programa-liderazgo-digital': ['liderazgo digital', 'digital leadership', 'liderazgo'],
  'programa-transformacion-digital': ['transformación digital', 'digital transformation']
};

// ── Pass 1: Surface Repair ─────────────────────────────────────────────────

function surfaceRepair(raw) {
  let text = raw.trim();
  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ');
  // Remove filler words
  text = text.replace(FILLER_WORDS_ES, '');
  text = text.replace(FILLER_WORDS_EN, '');
  // Clean up leftover double spaces and punctuation
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/\s+([,.])/g, '$1');
  // Normalize common typos/abbreviations
  text = text.replace(/\bIA\b/gi, 'inteligencia artificial');
  text = text.replace(/\bAI\b/gi, 'artificial intelligence');
  text = text.replace(/\bpersonas\b/gi, 'participantes');
  return text;
}

// ── Pass 2: Field Extraction ───────────────────────────────────────────────

function extractFields(cleanedText, rawText) {
  const lowerClean = cleanedText.toLowerCase();
  const lowerRaw = rawText.toLowerCase();
  const combined = lowerRaw + ' ' + lowerClean;

  const fields = {
    company_name: extractCompany(combined),
    problem: extractProblem(combined),
    segment: inferSegment(combined),
    budget: extractBudget(rawText),
    timeline: extractTimeline(combined),
    audience: extractAudience(combined),
    contact: extractContact(rawText),
    industry: extractIndustry(combined),
    service_hint: matchService(combined),
    participant_count: extractParticipantCount(combined),
    language: detectLanguage(rawText)
  };

  return fields;
}

function extractCompany(text) {
  // Look for patterns like "empresa X", "company X", "para X", "de X S.A.", etc.
  const patterns = [
    /(?:empresa|company|compañía|organización|firma)\s+(?:de\s+)?["']?([A-ZÁ-Ú][A-Za-záéíóúñÁÉÍÓÚÑ\s&.]+)/i,
    /(?:para|for)\s+(?:la\s+)?(?:empresa\s+)?["']?([A-ZÁ-Ú][A-Za-záéíóúñÁÉÍÓÚÑ\s&.]{2,}?)(?:\s*[,.\-]|\s+(?:que|quiere|necesita|want|need))/i,
    /(?:s\.?a\.?s?|ltda|inc|corp|llc|sas)\b/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return { value: m[1].trim(), confidence: 0.7 };
  }
  return { value: '[CLIENT COMPANY]', confidence: 0.0 };
}

function extractProblem(text) {
  const keywords = ['necesita', 'quiere', 'problema', 'reto', 'challenge', 'need', 'want',
    'mejorar', 'improve', 'aprender', 'learn', 'optimizar', 'optimize', 'automatizar',
    'automate', 'capacitar', 'train', 'transformar', 'transform'];
  const hasKeyword = keywords.some(k => text.includes(k));

  if (hasKeyword) {
    // Extract sentence(s) containing the keyword
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const relevant = sentences.filter(s => keywords.some(k => s.includes(k)));
    if (relevant.length > 0) {
      return { value: relevant.join('. ').trim(), confidence: 0.7 };
    }
  }
  // Fallback: use the whole input as a rough problem description
  if (text.length > 10) {
    return { value: text.substring(0, 300), confidence: 0.3 };
  }
  return { value: 'unclear', confidence: 0.0 };
}

function inferSegment(text) {
  const b2bSignals = ['empresa', 'company', 'equipo', 'team', 'corporativo', 'corporate',
    'organización', 'organization', 'departamento', 'department', 'colaboradores',
    'empleados', 'employees', 'staff', 'área', 'gerencia', 'management',
    'boss', 'jefe', 'our', 'nuestro', 'nuestra', 'work in', 'trabajan en'];
  const b2cSignals = ['yo', 'personal', 'individual', 'freelancer', 'independiente',
    'mi carrera', 'my career', 'para mí', 'for me', 'cuenta propia', 'self-employed'];

  const b2bScore = b2bSignals.filter(s => text.includes(s)).length;
  const b2cScore = b2cSignals.filter(s => text.includes(s)).length;

  if (b2bScore > b2cScore) return { value: 'b2b', confidence: Math.min(0.9, 0.5 + b2bScore * 0.1) };
  if (b2cScore > b2bScore) return { value: 'b2c', confidence: Math.min(0.9, 0.5 + b2cScore * 0.1) };
  // Default to B2B (most common case)
  return { value: 'b2b', confidence: 0.3 };
}

function extractBudget(text) {
  // COP patterns: "12 millones", "COP 12M", "12.000.000", "$12,000,000"
  const patterns = [
    /(?:cop|pesos?)\s*\$?\s*([\d.,]+)\s*(?:millones?|M)/i,
    /([\d.,]+)\s*(?:millones?|M)\s*(?:de\s+)?(?:pesos?|cop)/i,
    /([\d]{1,3}(?:[.,]\d{3}){1,3})\s*(?:cop|pesos?)?/i,
    /\$\s*([\d.,]+)\s*(?:cop|pesos?|millones?|M)/i,
    /([\d]+)\s*(?:millones?|M)\b/i,
    /(?:budget|presupuesto|inversión)\s*(?:de\s*)?\$?\s*([\d.,]+)/i
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      let num = m[1].replace(/[.,]/g, '');
      let val = parseInt(num, 10);
      // If number is small (1-100), likely in millions
      if (val > 0 && val <= 100) val *= 1000000;
      // If number is in thousands (100-999), also likely millions
      if (val >= 100 && val <= 999) val *= 1000;
      if (val > 0) return { value: val, confidence: 0.7 };
    }
  }
  return { value: null, confidence: 0.0 };
}

function extractTimeline(text) {
  const patterns = [
    /(?:para|by|before|antes de|start|iniciar?|empezar|comenzar)\s+(?:en\s+)?(\w+\s*\d{0,4})/i,
    /(?:mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|enero|febrero|marzo|abril|may|june|july|august|september|october|november|december|january|february|march|april)\s*\d{0,4}/i,
    /(?:próxima semana|next week|este mes|this month|urgente|urgent|asap|ya|inmediato|immediate)/i,
    /(?:q[1-4]|trimestre\s*[1-4])\s*(?:\d{4})?/i
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { value: m[0].trim(), confidence: 0.6 };
  }
  return { value: 'Flexible — we can start when you\'re ready', confidence: 0.0 };
}

function extractAudience(text) {
  const patterns = [
    /(?:equipo de|team of|grupo de|area de|departamento de)\s+(\w[\w\s]{2,30})/i,
    /(ventas|sales|marketing|logística|logistics|operaciones|operations|it|tecnología|technology|rrhh|hr|finanzas|finance|legal|gerencia|management|líderes|leaders|directivos|executives)/i,
    /(\d+)\s*(?:personas?|people|participantes?|participants)/i
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return { value: m[0].trim(), confidence: 0.6 };
  }
  return { value: 'unclear', confidence: 0.0 };
}

function extractContact(text) {
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
  if (emailMatch) return { value: emailMatch[0], confidence: 0.9 };
  return { value: null, confidence: 0.0 };
}

function extractIndustry(text) {
  const industries = {
    'manufactura': ['manufactura', 'manufacturing', 'producción', 'fábrica', 'factory', 'planta'],
    'tecnología': ['tecnología', 'technology', 'software', 'tech', 'saas', 'startup'],
    'retail': ['retail', 'comercio', 'tienda', 'store', 'ecommerce', 'e-commerce', 'ventas al detalle'],
    'salud': ['salud', 'health', 'hospital', 'clínica', 'clinic', 'médico', 'medical', 'farmacia'],
    'financiero': ['financiero', 'financial', 'banco', 'bank', 'seguros', 'insurance', 'fintech'],
    'educación': ['educación', 'education', 'universidad', 'university', 'colegio', 'school'],
    'logística': ['logística', 'logistics', 'transporte', 'transport', 'cadena de suministro', 'supply chain'],
    'servicios': ['servicios', 'services', 'consultoría', 'consulting', 'asesoría'],
    'gobierno': ['gobierno', 'government', 'público', 'public', 'municipal', 'estatal']
  };

  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some(k => text.includes(k))) {
      return { value: industry, confidence: 0.6 };
    }
  }
  return { value: 'unclear', confidence: 0.0 };
}

function extractParticipantCount(text) {
  const m = text.match(/(\d+)\s*(?:personas?|people|participantes?|participants|colaboradores?|empleados?|members?|integrantes?)/i);
  if (m) return { value: parseInt(m[1], 10), confidence: 0.8 };
  return { value: null, confidence: 0.0 };
}

function detectLanguage(text) {
  const esMarkers = ['empresa', 'equipo', 'necesita', 'quiere', 'para', 'personas', 'presupuesto',
    'millones', 'pesos', 'taller', 'capacitación', 'aprender', 'mejorar'];
  const enMarkers = ['company', 'team', 'need', 'want', 'for', 'people', 'budget',
    'million', 'dollars', 'workshop', 'training', 'learn', 'improve'];

  const lower = text.toLowerCase();
  const esScore = esMarkers.filter(m => lower.includes(m)).length;
  const enScore = enMarkers.filter(m => lower.includes(m)).length;

  if (esScore > enScore + 1) return 'es';
  if (enScore > esScore + 1) return 'en';
  return 'both';
}

// ── Pass 3: Service Matching ───────────────────────────────────────────────

function matchService(text) {
  const scores = {};
  for (const [slug, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score += kw.length; // longer keyword matches = higher score
    }
    if (score > 0) scores[slug] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { value: null, confidence: 0.0, matches: [] };

  const topScore = sorted[0][1];
  const top3 = sorted.slice(0, 3).map(([slug, score]) => ({
    slug,
    score,
    confidence: Math.min(0.9, score / (topScore + 5))
  }));

  return {
    value: top3[0].slug,
    confidence: top3[0].confidence,
    matches: top3
  };
}

// ── Pass 4: Confidence Scoring ─────────────────────────────────────────────

function scoreConfidence(fields) {
  const scores = {};
  let criticalMin = 1.0;
  let overallSum = 0;
  let fieldCount = 0;

  for (const [key, field] of Object.entries(fields)) {
    if (field && typeof field === 'object' && 'confidence' in field) {
      scores[key] = field.confidence;
      overallSum += field.confidence;
      fieldCount++;
      if (CRITICAL_FIELDS.includes(key)) {
        criticalMin = Math.min(criticalMin, field.confidence);
      }
    }
  }

  const overallAvg = fieldCount > 0 ? overallSum / fieldCount : 0;
  const qualityPercent = Math.round(overallAvg * 100);

  let recovery_path;
  if (qualityPercent >= 80) recovery_path = 'direct';
  else if (qualityPercent >= 60) recovery_path = 'proceed_with_flags';
  else if (qualityPercent >= 40) recovery_path = 'smart_defaults_confirm';
  else if (qualityPercent >= 20) recovery_path = 'one_question_plus_defaults';
  else recovery_path = 'blank_input_single_question';

  return {
    overall_percent: qualityPercent,
    critical_minimum: Math.round(criticalMin * 100),
    per_field: scores,
    recovery_path,
    proceed: criticalMin >= PROCEED_THRESHOLD || BLOCK_NEVER
  };
}

// ── Pass 5: Apply Defaults & Build ProposalData ────────────────────────────

function applyDefaults(fields) {
  const result = {};

  for (const [key, field] of Object.entries(fields)) {
    if (field && typeof field === 'object' && 'value' in field) {
      if (field.value === null || field.value === 'unclear' || field.confidence === 0) {
        // Apply smart default
        result[key] = {
          ...field,
          value: getSmartDefault(key, fields),
          is_default: true
        };
      } else {
        result[key] = { ...field, is_default: false };
      }
    }
  }

  return result;
}

function getSmartDefault(key, fields) {
  const defaults = {
    company_name: '[CLIENT COMPANY]',
    segment: 'b2b',
    budget: null,
    timeline: 'Flexible — we can start when you\'re ready',
    audience: 'General team',
    contact: null,
    industry: 'General',
    service_hint: null,
    participant_count: 20,
    language: 'both',
    problem: 'Digital transformation and team productivity improvement'
  };

  // Smart budget inference from service match
  if (key === 'budget' && fields.service_hint && fields.service_hint.value && catalogQuery) {
    try {
      const svc = catalogQuery.findService(fields.service_hint.value);
      if (svc && svc.pricing) {
        const seg = (fields.segment && fields.segment.value) || 'b2b';
        const priceKey = seg === 'b2c' ? 'b2c_cop' : 'b2b_cop';
        if (svc.pricing[priceKey]) return svc.pricing[priceKey];
      }
    } catch { /* ignore */ }
  }

  return defaults[key] !== undefined ? defaults[key] : null;
}

// ── Main normalizer ────────────────────────────────────────────────────────

function normalizeInput(rawText) {
  if (!rawText || rawText.trim().length === 0) {
    return {
      status: 'blank_input',
      fields: {},
      confidence: { overall_percent: 0, recovery_path: 'blank_input_single_question', proceed: true },
      suggested_question: '¿Para quién es esta propuesta? / Who is this proposal for?',
      raw_input: rawText || ''
    };
  }

  // Pass 1: Surface repair
  const cleaned = surfaceRepair(rawText);

  // Pass 2: Field extraction
  const extracted = extractFields(cleaned, rawText);

  // Pass 3: (Service matching already done in extractFields)

  // Pass 4: Confidence scoring
  const confidence = scoreConfidence(extracted);

  // Pass 5: Apply defaults
  const withDefaults = applyDefaults(extracted);

  // Build suggested question based on lowest-confidence critical field
  let suggested_question = null;
  if (confidence.overall_percent < 60) {
    if (!extracted.problem || extracted.problem.confidence < 0.4) {
      suggested_question = '¿Qué necesitan resolver o lograr? / What do they need to solve or achieve?';
    } else if (!extracted.segment || extracted.segment.confidence < 0.4) {
      suggested_question = '¿Es para un equipo de empresa o para una persona? / Is this for a company team or an individual?';
    } else if (!extracted.service_hint || extracted.service_hint.confidence < 0.3) {
      suggested_question = '¿Qué tipo de capacitación buscan? / What type of training are they looking for?';
    }
  }

  // Build assumptions list
  const assumptions = [];
  for (const [key, field] of Object.entries(withDefaults)) {
    if (field.is_default) {
      assumptions.push({
        field: key,
        default_used: field.value,
        reason: `Not found in input — using smart default`
      });
    } else if (field.confidence < 0.5) {
      assumptions.push({
        field: key,
        inferred_value: field.value,
        confidence: field.confidence,
        reason: `Low confidence — inferred from context`
      });
    }
  }

  return {
    status: confidence.recovery_path,
    fields: withDefaults,
    confidence,
    assumptions,
    suggested_question,
    cleaned_input: cleaned,
    raw_input: rawText
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log(`input-normalizer.js — Worst-case input → ProposalData JSON

Usage:
  node input-normalizer.js --input "text"
  echo "text" | node input-normalizer.js --stdin

Options:
  --input <text>   Raw user input to normalize
  --stdin          Read input from stdin
  --json           Output as formatted JSON (default)
  --compact        Output as compact JSON`);
    process.exit(0);
  }

  let rawInput = '';
  if (args.includes('--input')) {
    rawInput = args[args.indexOf('--input') + 1] || '';
  } else if (args.includes('--stdin')) {
    rawInput = require('fs').readFileSync(0, 'utf-8');
  }

  const result = normalizeInput(rawInput);
  const compact = args.includes('--compact');
  console.log(JSON.stringify(result, null, compact ? 0 : 2));
}

module.exports = { normalizeInput, scoreConfidence, applyDefaults, surfaceRepair, matchService };
