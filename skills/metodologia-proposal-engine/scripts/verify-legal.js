#!/usr/bin/env node
/**
 * verify-legal.js — Automated legal + brand verification
 * Runs L1–L10 blockers and W1–W7 warnings on proposal content.
 * 
 * Usage: node verify-legal.js --content "proposal text" --canonical-price 12000000
 *        node verify-legal.js --file proposal.md --config verification-config.json
 */

const fs   = require('fs');
const path = require('path');

// ── Configuration ─────────────────────────────────────────────────────────────

const RED_LIST = [
  'hack', 'truco', 'trick', 'secreto', 'secret',
  'resultados instantáneos', 'instant results',
  'arquitecto', 'architect', 'arquitectura', 'architecture',
  'transformación', 'transformation',
  'revolucionario', 'revolutionary', 'disruptivo', 'disruptive',
  'único en el mercado', 'unique in the market',
  'soluciones innovadoras', 'innovative solutions',
  'equipo de expertos', 'team of experts',
  'resultados garantizados', 'guaranteed results',
  'sin riesgo', 'zero risk',
];

const EXACT_GUARANTEE_ES = 'Devolución del 100% si el servicio no cumple expectativas antes de completar las primeras 4 horas. Única condición: 1 hora de retroalimentación estructurada.';
const EXACT_GUARANTEE_EN_PATTERN = /100% refund.*before completing.*first 4 hours.*1 hour.*structured feedback/i;
const EXACT_CREDIT_ES_PATTERN = /100%.*6 meses.*acumulable.*intransferible|100%.*6 months.*cumulative.*non-transferable/i;

// [POR CONFIRMAR] credit chain slugs — these should never appear as confirmed
const UNCONFIRMED_CREDIT_PHRASES = [
  'crédito hacia estrategia', 'credit toward estrategia',
  'crédito hacia el programa', 'credit toward the program',
  'crédito hacia digital champions', 'credit toward digital champions',
  'crédito hacia empoderamiento', 'credit toward empoderamiento',
  // Bootcamps #6-9 credits
  'crédito del bootcamp de gerencia', 'crédito del bootcamp de ofimática',
];

// ── Core verification ──────────────────────────────────────────────────────────

function verifyContent(content, config = {}) {
  const {
    canonical_price_b2b,
    canonical_price_b2c,
    brand_mode = 'own',
    segment = 'b2b',
    mode = 'STANDARD',
  } = config;

  const report = {
    status: 'APPROVED',
    blockers_found: [],
    blockers_fixed: [],
    warnings_active: [],
    suggestions: [],
    brand_mode,
    mode,
    date: new Date().toISOString().split('T')[0],
  };

  const lower = content.toLowerCase();
  const addBlocker = (id, description, fixApplied) => {
    report.blockers_found.push({ id, description });
    if (fixApplied) report.blockers_fixed.push({ id, fix_applied: fixApplied });
    report.status = 'BLOCKED';
  };
  const addWarning = (id, description) => {
    report.warnings_active.push({ id, description });
    if (report.status === 'APPROVED') report.status = 'APPROVED_WITH_WARNINGS';
  };

  // L1: Price check
  if (canonical_price_b2b && segment !== 'b2c') {
    const prices = [...content.matchAll(/COP\s*([\d.,]+)/g)]
      .map(m => parseFloat(m[1].replace(/[.,]/g, '')))
      .filter(p => p > 1000000); // ignore small amounts
    if (prices.length > 0 && !prices.some(p => Math.abs(p - canonical_price_b2b) < 1000)) {
      addBlocker('L1', `Price found does not match canonical B2B price (COP ${canonical_price_b2b.toLocaleString()})`, null);
    }
  }

  // L2: POR CONFIRMAR stated as confirmed
  const pcMatches = [...content.matchAll(/\[POR CONFIRMAR[^\]]*\]/gi)];
  // Only flag if a POR CONFIRMAR item is referenced WITHOUT the conditional wrapper
  UNCONFIRMED_CREDIT_PHRASES.forEach(phrase => {
    if (lower.includes(phrase.toLowerCase())) {
      // Check for conditional wrappers
      const hasSafety = /sujeto a|subject to|consultar|consult|ask your|bajo confirmación/i.test(
        content.substring(Math.max(0, lower.indexOf(phrase.toLowerCase()) - 100), lower.indexOf(phrase.toLowerCase()) + 200)
      );
      if (!hasSafety) {
        addBlocker('L8', `Unconfirmed credit chain "${phrase}" stated without conditional wrapper`, null);
      }
    }
  });

  // L3: Guarantee clause
  const hasGuarantee = /garantía|guarantee|devolución|refund/i.test(content);
  if (hasGuarantee) {
    const hasExactES = content.includes(EXACT_GUARANTEE_ES);
    const hasExactEN = EXACT_GUARANTEE_EN_PATTERN.test(content);
    if (!hasExactES && !hasExactEN) {
      addBlocker('L3', 'Guarantee mentioned but exact clause not found (4-hour limit + feedback condition required)', null);
    }
  }

  // L4: Workshop→Bootcamp credit
  const hasCreditMention = /crédito.*workshop|workshop.*crédito|credit.*workshop|workshop.*credit/i.test(content);
  if (hasCreditMention && !EXACT_CREDIT_ES_PATTERN.test(content)) {
    addBlocker('L4', 'Workshop→Bootcamp credit mentioned without exact terms: "100%, 6 months, cumulative, non-transferable"', null);
  }

  // L5: Result % promise without wrapper
  const pctMatches = [...content.matchAll(/(\d+)%\s*(de\s+)?(?:mejora|ahorro|reducción|reduction|improvement|savings)/gi)];
  pctMatches.forEach(m => {
    const context = content.substring(Math.max(0, m.index - 150), m.index + 150);
    const hasWrapper = /meta orientativa|indicative target|objetivo orientativo|depende de la adopción|depends on adoption/i.test(context);
    if (!hasWrapper) {
      addBlocker('L5', `Result % "${m[0]}" promised without "indicative target" wrapper`, null);
    }
  });

  // L7: Red list
  const redMatches = RED_LIST.filter(word => lower.includes(word.toLowerCase()));
  if (redMatches.length > 0) {
    addBlocker('L7', `Red list words found: ${redMatches.join(', ')}`, null);
  }

  // L9: IAC B2C price without POR CONFIRMAR
  const hasIACMention = /iac\s*bootcamp|iac\s*programa|linea iac|línea iac/i.test(content);
  if (hasIACMention && /b2c|precio.*persona|price.*person|800\.000|800,000/i.test(content)) {
    addBlocker('L9', 'IAC service with B2C price — these are POR CONFIRMAR and should not be quoted', null);
  }

  // L10: Fixed USD rate
  const hasUSD = /\$\s*\d+\s*(USD|usd)|USD\s*[\d.,]+/i.test(content);
  if (hasUSD) {
    const hasRateNote = /tasa referencial|indicative rate|sujeta? a variación|subject to variation/i.test(content);
    if (!hasRateNote) {
      addBlocker('L10', 'USD amount found without "(indicative rate, subject to variation)" note', null);
    }
  }

  // Warnings
  if (/cobrand|co-brand|white.?label|whitelabel|marca blanca/i.test(content)) {
    addWarning('W1', 'B2B2B branding model mentioned — requires signed master contract + brand use agreement');
  }
  if (/más de 20 participantes|more than 20 participants|40 participants|cofacilitación|co-facilitation/i.test(content)) {
    addWarning('W2', '>20 participants — add co-facilitation (+50% base) or double execution (-20% second)');
  }
  if (/presencial|in.person/i.test(content)) {
    addWarning('W3', 'In-person modality — logistics and travel costs quoted separately');
  }
  if (/chatgpt|gemini|copilot|motor de ia específico|specific ai engine/i.test(content)) {
    addWarning('W4', 'Specific AI engine mentioned — must be validated with client IT ≥3 business days before start');
  }
  if (/certificado de competencia|competence certificate/i.test(content)) {
    addWarning('W5', 'Competence certificate mentioned — requires final project approved by rubric');
  }
  if (/campus|lms|plataforma.*aprendizaje|learning platform/i.test(content) && !/1 mes|1 month/i.test(content)) {
    addWarning('W6', 'LMS/Campus mentioned without "1 month included; continuation COP 20,000/month"');
  }
  if (mode === 'INNOVATION') {
    addWarning('W7', 'Innovation Mode — include disclaimer: prices/scopes marked [POR CONFIRMAR] confirmed before SOW');
  }

  // Brand mode checks
  if (brand_mode === 'whitelabel') {
    const hasMetodologia = /metodolog[ií]a/i.test(content);
    if (hasMetodologia) {
      addBlocker('L7', 'WHITE-LABEL: MetodologIA name appears in content — must be completely invisible', null);
    }
  }

  // Final status
  if (report.blockers_found.length === 0 && report.warnings_active.length === 0) {
    report.status = 'APPROVED';
  } else if (report.blockers_found.length === 0) {
    report.status = 'APPROVED_WITH_WARNINGS';
  } else {
    report.status = 'BLOCKED';
  }

  return report;
}

function formatReport(report) {
  const icon = { APPROVED: '✅', APPROVED_WITH_WARNINGS: '⚠️', BLOCKED: '🔴' }[report.status];
  let out = `VERIFICATION REPORT\n${'='.repeat(20)}\n`;
  out += `Status: ${icon} ${report.status}\n`;
  out += `Brand mode: ${report.brand_mode}\n`;
  out += `Mode: ${report.mode}\n`;
  out += `Date: ${report.date}\n\n`;

  if (report.blockers_found.length > 0) {
    out += `Blockers found (${report.blockers_found.length}):\n`;
    report.blockers_found.forEach(b => out += `  [${b.id}] ${b.description}\n`);
    out += '\n';
  } else {
    out += `Blockers: none\n\n`;
  }

  if (report.warnings_active.length > 0) {
    out += `Active warnings:\n`;
    report.warnings_active.forEach(w => out += `  [${w.id}] ${w.description}\n`);
  } else {
    out += `Warnings: none\n`;
  }

  return out;
}

// ── CLI ────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  let content = '';
  let config = {};

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--content') content = args[++i];
    else if (args[i] === '--file') content = fs.readFileSync(args[++i], 'utf8');
    else if (args[i] === '--config') config = JSON.parse(fs.readFileSync(args[++i], 'utf8'));
    else if (args[i] === '--canonical-price') config.canonical_price_b2b = parseInt(args[++i]);
    else if (args[i] === '--brand-mode') config.brand_mode = args[++i];
    else if (args[i] === '--json') config._json_output = true;
  }

  if (!content) {
    console.error('Usage: node verify-legal.js --content "text" [--canonical-price 12000000] [--brand-mode own]');
    process.exit(1);
  }

  const report = verifyContent(content, config);

  if (config._json_output) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(report));
    process.exit(report.status === 'BLOCKED' ? 1 : 0);
  }
}

module.exports = { verifyContent, formatReport };
