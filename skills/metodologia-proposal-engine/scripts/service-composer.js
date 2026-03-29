#!/usr/bin/env node
/**
 * service-composer.js — Compose new services from canonical building blocks.
 * Used in INNOVATION MODE to generate a Type B/C service definition
 * that traces every element back to an existing canonical or marks it [POR CONFIRMAR].
 *
 * Usage: node service-composer.js --from bootcamp-trabajar-amplificado --adapt adapt.json
 */

const { findService } = require('./catalog-query');

/**
 * Compose a new service definition from a base canonical + adaptation spec
 * @param {string} baseSlug - canonical to build from
 * @param {object} adaptation - what to change
 * @param {string} [adaptation.name] - new tentative name
 * @param {number} [adaptation.duration_hours] - override duration
 * @param {string[]} [adaptation.add_deliverables] - new deliverables
 * @param {string[]} [adaptation.remove_deliverables] - deliverables to exclude
 * @param {string[]} [adaptation.add_modules] - new module names
 * @param {number} [adaptation.price_delta_cop] - pricing delta from base
 * @param {string} [adaptation.target_audience] - e.g. "high school teachers"
 * @param {string} [adaptation.reason] - why this adaptation exists
 */
function composeService(baseSlug, adaptation = {}) {
  const base = findService(baseSlug);
  
  if (!base) {
    return {
      error: `Base service '${baseSlug}' not found in catalog`,
      suggestion: 'Run catalog-query.js --list to see available services'
    };
  }

  const composed = {
    // Identity
    slug: `custom/${slugify(adaptation.name || base.canonical_name + '-variant')}`,
    tentative_name: adaptation.name || `${base.canonical_name} — Custom Variant`,
    type: base.type,
    base_canonical: baseSlug,
    innovation_type: determineInnovationType(base, adaptation),
    status: 'PROPOSAL',
    
    // Timing
    duration_hours: adaptation.duration_hours || base.duration_hours,
    duration_note: adaptation.duration_hours && adaptation.duration_hours !== base.duration_hours
      ? `[POR CONFIRMAR: adjusted from standard ${base.duration_hours}h]`
      : null,

    // Pricing
    pricing: buildPricing(base, adaptation),

    // Deliverables
    deliverables: buildDeliverables(base, adaptation),
    
    // Scope boundaries
    what_it_is_not: buildExclusions(base, adaptation),
    
    // Traceability
    deviations: buildDeviations(base, adaptation),
    
    // Items requiring confirmation before SOW
    por_confirmar_items: buildPorConfirmar(base, adaptation),
    
    // Metadata
    target_audience: adaptation.target_audience || null,
    adaptation_reason: adaptation.reason || null,
    created_date: new Date().toISOString().split('T')[0],
    
    // Required disclaimer
    disclaimer: {
      es: 'Este documento es una propuesta de diseño de servicio personalizado. Los precios, alcances y condiciones marcados como [POR CONFIRMAR] se definen antes de la firma del SOW. Este documento no constituye compromiso de entrega ni contrato.',
      en: 'This document is a custom service design proposal. Prices, scopes, and conditions marked [POR CONFIRMAR] are confirmed before SOW signing. This document does not constitute a delivery commitment or contract.'
    }
  };

  return composed;
}

function determineInnovationType(base, adaptation) {
  // Type A: only context changes (audience, examples, sector)
  if (!adaptation.duration_hours && !adaptation.add_modules && !adaptation.add_deliverables) {
    return 'A-high-contextualization';
  }
  // Type C: no suitable base
  if (!base) return 'C-new';
  // Type B: structural changes with a base
  return 'B-variant';
}

function buildPricing(base, adaptation) {
  const baseB2B  = base.pricing?.b2b_cop;
  const baseB2C  = base.pricing?.b2c_cop;
  const delta    = adaptation.price_delta_cop || 0;

  return {
    b2b_indicative_cop:  baseB2B  ? baseB2B  + delta : null,
    b2c_indicative_cop:  baseB2C  ? baseB2C  + delta : null,
    base_reference:      baseSlugRef(base.slug),
    delta_cop:           delta,
    delta_justification: adaptation.price_delta_justification || (delta !== 0 ? '[POR CONFIRMAR]' : null),
    status:              delta !== 0 ? 'POR_CONFIRMAR' : 'INDICATIVE',
    note: 'Prices are indicative — confirmed with detailed scope before contract signing'
  };
}

function buildDeliverables(base, adaptation) {
  const standard = (base.deliverables || []).filter(d =>
    !(adaptation.remove_deliverables || []).some(r => d.toLowerCase().includes(r.toLowerCase()))
  ).map(d => ({ item: d, status: 'standard', trace: base.slug }));

  const added = (adaptation.add_deliverables || []).map(d => ({
    item: d,
    status: 'new',
    trace: '[POR CONFIRMAR — scope confirmation required]'
  }));

  return [...standard, ...added];
}

function buildExclusions(base, adaptation) {
  return [
    ...(base.what_it_is_not || []),
    ...(adaptation.add_exclusions || [])
  ];
}

function buildDeviations(base, adaptation) {
  const devs = [];
  if (adaptation.duration_hours && adaptation.duration_hours !== base.duration_hours) {
    devs.push({ field: 'duration', base: `${base.duration_hours}h`, adapted: `${adaptation.duration_hours}h`, reason: adaptation.reason || 'client constraint' });
  }
  if (adaptation.add_modules?.length) {
    devs.push({ field: 'modules', type: 'added', items: adaptation.add_modules, trace: '[POR CONFIRMAR]' });
  }
  if (adaptation.add_deliverables?.length) {
    devs.push({ field: 'deliverables', type: 'added', items: adaptation.add_deliverables, trace: '[POR CONFIRMAR]' });
  }
  if (adaptation.remove_deliverables?.length) {
    devs.push({ field: 'deliverables', type: 'removed', items: adaptation.remove_deliverables });
  }
  return devs;
}

function buildPorConfirmar(base, adaptation) {
  const items = [];
  if (adaptation.price_delta_cop) {
    items.push({ id: 'PC-PRICE', description: `Custom pricing delta of COP ${adaptation.price_delta_cop} requires JM confirmation`, owner: 'JM' });
  }
  if (adaptation.add_modules?.length) {
    items.push({ id: 'PC-MODULES', description: `New modules not in canonical: ${adaptation.add_modules.join(', ')}`, owner: 'JM + Facilitator' });
  }
  if (adaptation.add_deliverables?.length) {
    items.push({ id: 'PC-DELIVERABLES', description: `New deliverables not in canonical: ${adaptation.add_deliverables.join(', ')}`, owner: 'JM' });
  }
  if (adaptation.duration_hours && adaptation.duration_hours < (base.duration_hours * 0.6)) {
    items.push({ id: 'PC-DURATION', description: `Duration ${adaptation.duration_hours}h is <60% of standard ${base.duration_hours}h — validate which modules can be dropped without losing value`, owner: 'JM + Facilitator' });
  }
  return items;
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function baseSlugRef(slug) { return `catalog: ${slug}`; }

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from');
  const adaptIdx = args.indexOf('--adapt');

  if (fromIdx < 0) {
    console.log('Usage: node service-composer.js --from <slug> [--adapt adapt.json]');
    console.log('Example adapt.json: {"name":"AI Bootcamp for Teachers","duration_hours":16,"target_audience":"high school teachers","reason":"academic context requires slower pace"}');
    process.exit(1);
  }

  const baseSlug = args[fromIdx + 1];
  let adaptation = {};
  if (adaptIdx >= 0) {
    const fs = require('fs');
    adaptation = JSON.parse(fs.readFileSync(args[adaptIdx + 1], 'utf8'));
  }

  console.log(JSON.stringify(composeService(baseSlug, adaptation), null, 2));
}

module.exports = { composeService };
