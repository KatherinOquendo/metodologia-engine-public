#!/usr/bin/env node
/**
 * generate-all.js — Multi-format proposal generator
 * Produces: HTML, DOCX, XLSX, PPTX, MD (x2 languages) + verification report
 *
 * Usage:
 *   CLI:    node generate-all.js --data proposal.json --output ./outputs/
 *   Module: const { generateAll } = require('./generate-all');
 *
 * Graceful degradation: if a format's package is missing, skip and warn.
 */

const fs   = require('fs');
const path = require('path');

// ── Dependencies (all optional — graceful degradation) ─────────────────────

let Handlebars;
try { Handlebars = require('handlebars'); } catch { Handlebars = null; }

let docxLib;
try { docxLib = require('docx'); } catch { docxLib = null; }

let PptxGenJS;
try { PptxGenJS = require('pptxgenjs'); } catch { PptxGenJS = null; }

// Local deps (always available)
const brandResolver = require('./brand-resolver');
const i18n          = require('./i18n');

const SKILL_DIR     = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(SKILL_DIR, 'templates');

// ── Handlebars helpers ───────────────���─────────────────────────────────────

if (Handlebars) {
  Handlebars.registerHelper('index_plus_one', function (index) {
    return index + 1;
  });
}

// ── Template loading ───────���───────────────────────────────────────────────

function loadTemplate(name) {
  if (!Handlebars) return null;
  const tplPath = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(tplPath)) return null;
  const source = fs.readFileSync(tplPath, 'utf-8');
  return Handlebars.compile(source);
}

// ── Section labels by language ─────────────────────────────────────────────

function getLabels(lang) {
  const labels = {
    es: {
      challenge: 'El Desafio', solution: 'La Solucion Propuesta',
      scope: 'Alcance', exclusions: 'Exclusiones', plan: 'Plan de Trabajo',
      investment: 'Inversion', service: 'Servicio', description: 'Descripcion',
      price: 'Precio', total: 'Total', why: 'Por Que Nosotros',
      next_step: 'Siguiente Paso', valid: 'Valido por', days: 'dias',
      phase: 'Fase', duration: 'Duracion', milestone: 'Entregable',
      verification: 'Reporte de Verificacion'
    },
    en: {
      challenge: 'The Challenge', solution: 'Proposed Solution',
      scope: 'Scope', exclusions: 'Exclusions', plan: 'Work Plan',
      investment: 'Investment', service: 'Service', description: 'Description',
      price: 'Price', total: 'Total', why: 'Why Us',
      next_step: 'Next Step', valid: 'Valid for', days: 'days',
      phase: 'Phase', duration: 'Duration', milestone: 'Deliverable',
      verification: 'Verification Report'
    }
  };
  return labels[lang] || labels.en;
}

// ─�� Template data builder ───���──────────────────────────────────────────────

function buildTemplateData(proposalData, lang) {
  const content = proposalData.i18n && proposalData.i18n[lang]
    ? proposalData.i18n[lang]
    : proposalData.i18n
      ? (proposalData.i18n.es || proposalData.i18n.en || {})
      : {};

  const labels = getLabels(lang);
  const currency = proposalData.currency || 'COP';

  // Format prices
  const servicesFormatted = (proposalData.services || []).map(s => ({
    ...s,
    price_formatted: i18n.formatPrice
      ? i18n.formatPrice(s.price, currency, lang === 'es' ? 'es' : 'en')
      : `${currency} ${(s.price || 0).toLocaleString()}`
  }));

  const totalPrice = (proposalData.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
  const totalFormatted = i18n.formatPrice
    ? i18n.formatPrice(totalPrice, currency, lang === 'es' ? 'es' : 'en')
    : `${currency} ${totalPrice.toLocaleString()}`;

  return {
    // Identity
    id: proposalData.id || `PRO-${new Date().getFullYear()}-001`,
    date: proposalData.date || new Date().toISOString().split('T')[0],
    valid_days: proposalData.valid_days || 30,

    // Client
    client_company: proposalData.client ? proposalData.client.company : '[CLIENT COMPANY]',

    // Service
    service_slug: proposalData.service_slug || '',
    segment: proposalData.segment || 'b2b',

    // Brand
    brand: proposalData.brand || brandResolver.METODOLOGIA_BRAND,

    // Content
    lang,
    title: content.title || `${labels.solution} — ${proposalData.client ? proposalData.client.company : ''}`,
    hook: content.hook || '',
    problem: content.problem || '',
    solution: content.solution || '',
    scope: content.scope || [],
    exclusions: content.exclusions || '',
    plan: content.plan || [],
    why: content.why || [],
    cta_text: content.cta_text || (lang === 'es' ? 'Agenda tu sesion' : 'Schedule your session'),

    // Commercial
    services: servicesFormatted,
    total_formatted: totalFormatted,
    payment_terms: proposalData.payment_terms || '',
    currency,

    // Provider
    provider_email: proposalData.provider ? proposalData.provider.email : '',

    // CTA
    cta_date: proposalData.cta ? proposalData.cta.suggested_date : '',

    // Labels
    labels
  };
}

// ── Format generators ───��──────────────────────────────────────────────────

function generateHTML(proposalData, lang, outputDir) {
  const template = loadTemplate('proposal-html.hbs');
  if (!template) {
    console.warn('[WARN] Handlebars not available or template missing — skipping HTML');
    return null;
  }
  const data = buildTemplateData(proposalData, lang);
  const html = template(data);
  const filename = `propuesta_${slugify(data.client_company)}_${data.date.substring(0, 7)}_${lang}.html`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, html, 'utf-8');
  return filepath;
}

function generateMarkdown(proposalData, lang, outputDir) {
  const template = loadTemplate('proposal-md.hbs');
  if (!template) {
    // Fallback: generate markdown without Handlebars
    const data = buildTemplateData(proposalData, lang);
    const md = buildMarkdownFallback(data);
    const filename = `propuesta_${slugify(data.client_company)}_${data.date.substring(0, 7)}_${lang}.md`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, md, 'utf-8');
    return filepath;
  }
  const data = buildTemplateData(proposalData, lang);
  const md = template(data);
  const filename = `propuesta_${slugify(data.client_company)}_${data.date.substring(0, 7)}_${lang}.md`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, md, 'utf-8');
  return filepath;
}

function buildMarkdownFallback(data) {
  let md = `---\nid: "${data.id}"\ndate: "${data.date}"\nclient: "${data.client_company}"\n`;
  md += `lang: "${data.lang}"\nvalid_days: ${data.valid_days}\n---\n\n`;
  md += `# ${data.title}\n\n**${data.hook}**\n\n---\n\n`;
  md += `## ${data.labels.challenge}\n\n${data.problem}\n\n---\n\n`;
  md += `## ${data.labels.solution}\n\n${data.solution}\n\n---\n\n`;
  md += `## ${data.labels.scope}\n\n`;
  (data.scope || []).forEach(s => { md += `- ${s}\n`; });
  if (data.exclusions) md += `\n> **${data.labels.exclusions}:** ${data.exclusions}\n`;
  md += `\n---\n\n## ${data.labels.plan}\n\n`;
  md += `| ${data.labels.phase} | ${data.labels.duration} | ${data.labels.milestone} |\n|---|---|---|\n`;
  (data.plan || []).forEach(p => { md += `| ${p.name} | ${p.duration} | ${p.milestone} |\n`; });
  md += `\n---\n\n## ${data.labels.investment}\n\n`;
  md += `| ${data.labels.service} | ${data.labels.description} | ${data.labels.price} |\n|---|---|---|\n`;
  (data.services || []).forEach(s => { md += `| ${s.name} | ${s.description} | ${s.price_formatted} |\n`; });
  md += `| **${data.labels.total}** | | **${data.total_formatted}** |\n\n`;
  md += `${data.payment_terms}\n\n---\n\n`;
  md += `## ${data.labels.why}\n\n`;
  (data.why || []).forEach((w, i) => { md += `${i + 1}. ${w}\n`; });
  md += `\n---\n\n## ${data.labels.next_step}\n\n**${data.cta_text}**\n\n`;
  md += `---\n\n*${data.brand.logo.primary_name} — ${data.id} — ${data.date}*\n`;
  return md;
}

function generateVerificationReport(verificationData, outputDir) {
  const template = loadTemplate('verification-report.hbs');
  let content;
  if (template) {
    content = template(verificationData);
  } else {
    // Fallback
    content = `# Verification Report\n\n`;
    content += `**Status:** ${verificationData.status}\n`;
    content += `**Mode:** ${verificationData.mode}\n`;
    content += `**Brand Mode:** ${verificationData.brand_mode}\n\n`;
    if (verificationData.blockers_found && verificationData.blockers_found.length) {
      content += `## Blockers\n`;
      verificationData.blockers_found.forEach(b => { content += `- **${b.id}**: ${b.description}\n`; });
    }
    if (verificationData.warnings_active && verificationData.warnings_active.length) {
      content += `\n## Warnings\n`;
      verificationData.warnings_active.forEach(w => { content += `- **${w.id}**: ${w.description}\n`; });
    }
  }
  const filename = `verification-report_${verificationData.date || new Date().toISOString().split('T')[0]}.md`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  return filepath;
}

function generateDOCX(proposalData, lang, outputDir) {
  if (!docxLib) {
    console.warn('[WARN] docx package not available — skipping DOCX. Install with: npm install -g docx');
    return null;
  }

  const data = buildTemplateData(proposalData, lang);
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          WidthType, AlignmentType, HeadingLevel, ShadingType, BorderStyle } = docxLib;

  const brandColors = data.brand.colors || {};
  const primaryHex = (brandColors.primary || '#122562').replace('#', '');
  const accentHex  = (brandColors.accent || '#FFD700').replace('#', '');

  const children = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: data.title, bold: true, font: 'Arial', size: 56, color: primaryHex })]
  }));
  children.push(new Paragraph({ children: [new TextRun({ text: data.hook, italics: true, font: 'Trebuchet MS', size: 24 })] }));
  children.push(new Paragraph({ text: '' }));

  // Problem section
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: data.labels.challenge, bold: true, font: 'Arial', color: primaryHex })]
  }));
  children.push(new Paragraph({ children: [new TextRun({ text: data.problem, font: 'Trebuchet MS', size: 22 })] }));
  children.push(new Paragraph({ text: '' }));

  // Solution section
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: data.labels.solution, bold: true, font: 'Arial', color: primaryHex })]
  }));
  children.push(new Paragraph({ children: [new TextRun({ text: data.solution, font: 'Trebuchet MS', size: 22 })] }));
  children.push(new Paragraph({ text: '' }));

  // Scope
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: data.labels.scope, bold: true, font: 'Arial', color: primaryHex })]
  }));
  (data.scope || []).forEach(item => {
    children.push(new Paragraph({
      bullet: { level: 0 },
      children: [new TextRun({ text: item, font: 'Trebuchet MS', size: 22 })]
    }));
  });
  children.push(new Paragraph({ text: '' }));

  // Investment table
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: data.labels.investment, bold: true, font: 'Arial', color: primaryHex })]
  }));

  const tableRows = [];
  // Header row
  tableRows.push(new TableRow({
    children: [data.labels.service, data.labels.description, data.labels.price].map(text =>
      new TableCell({
        width: { size: 3000, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: primaryHex },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })]
      })
    )
  }));
  // Service rows
  (data.services || []).forEach(svc => {
    tableRows.push(new TableRow({
      children: [svc.name, svc.description, svc.price_formatted].map(text =>
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: String(text), font: 'Trebuchet MS', size: 20 })] })]
        })
      )
    }));
  });
  // Total row
  tableRows.push(new TableRow({
    children: [
      new TableCell({
        width: { size: 6000, type: WidthType.DXA },
        columnSpan: 2,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: accentHex },
        children: [new Paragraph({ children: [new TextRun({ text: data.labels.total, bold: true, color: primaryHex, font: 'Arial', size: 22 })] })]
      }),
      new TableCell({
        width: { size: 3000, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: accentHex },
        children: [new Paragraph({ children: [new TextRun({ text: data.total_formatted, bold: true, color: primaryHex, font: 'Arial', size: 22 })] })]
      })
    ]
  }));

  children.push(new Table({ rows: tableRows, width: { size: 9000, type: WidthType.DXA } }));
  children.push(new Paragraph({ text: '' }));

  // CTA
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: data.cta_text, bold: true, font: 'Arial', size: 28, color: primaryHex })]
  }));

  // Footer
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({
    children: [new TextRun({
      text: `${data.brand.logo.primary_name} — ${data.id} — ${data.date} — ${data.labels.valid} ${data.valid_days} ${data.labels.days}`,
      font: 'Trebuchet MS', size: 18, color: '808080'
    })]
  }));

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 } } },
      children
    }]
  });

  const filename = `propuesta_${slugify(data.client_company)}_${data.date.substring(0, 7)}_${lang}.docx`;
  const filepath = path.join(outputDir, filename);

  // Packer.toBuffer is async
  return Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(filepath, buffer);
    return filepath;
  });
}

function generateXLSX(proposalData, lang, outputDir) {
  const data = buildTemplateData(proposalData, lang);
  const filename = `propuesta_${slugify(data.client_company)}_${data.date.substring(0, 7)}_${lang}.xlsx`;
  const filepath = path.join(outputDir, filename);

  // Generate via Python openpyxl
  const pyScript = `
import sys
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
except ImportError:
    print("[WARN] openpyxl not available — skipping XLSX. Install with: pip install openpyxl")
    sys.exit(0)

import json

data = json.loads(sys.argv[1])
wb = Workbook()
ws = wb.active
ws.title = data.get("sheet_title", "Proposal")

# Colors
primary_hex = data.get("primary_color", "122562")
accent_hex = data.get("accent_color", "FFD700")
header_font = Font(name="Arial", bold=True, color="FFFFFF", size=11)
header_fill = PatternFill(start_color=primary_hex, end_color=primary_hex, fill_type="solid")
total_font = Font(name="Arial", bold=True, color=primary_hex, size=12)
total_fill = PatternFill(start_color=accent_hex, end_color=accent_hex, fill_type="solid")
body_font = Font(name="Trebuchet MS", size=11)
thin_border = Border(bottom=Side(style="thin", color="CCCCCC"))

# Title
ws.merge_cells("A1:D1")
ws["A1"] = data.get("title", "Proposal")
ws["A1"].font = Font(name="Arial", bold=True, color=primary_hex, size=16)
ws["A2"] = data.get("hook", "")
ws["A2"].font = Font(name="Trebuchet MS", italic=True, size=11)

# Header row
row = 4
headers = data.get("headers", ["Service", "Description", "Price"])
for col, h in enumerate(headers, 1):
    cell = ws.cell(row=row, column=col, value=h)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center")

# Data rows
services = data.get("services", [])
for i, svc in enumerate(services):
    r = row + 1 + i
    ws.cell(row=r, column=1, value=svc.get("name", "")).font = body_font
    ws.cell(row=r, column=2, value=svc.get("description", "")).font = body_font
    price_cell = ws.cell(row=r, column=3, value=svc.get("price", 0))
    price_cell.font = body_font
    price_cell.number_format = '#,##0'
    for c in range(1, 4):
        ws.cell(row=r, column=c).border = thin_border

# Total row with formula
total_row = row + 1 + len(services)
ws.cell(row=total_row, column=1, value=data.get("total_label", "TOTAL")).font = total_font
ws.cell(row=total_row, column=1).fill = total_fill
ws.cell(row=total_row, column=2).fill = total_fill
price_col_letter = "C"
formula = f"=SUM({price_col_letter}{row+1}:{price_col_letter}{total_row-1})"
total_cell = ws.cell(row=total_row, column=3, value=formula if len(services) > 0 else 0)
total_cell.font = total_font
total_cell.fill = total_fill
total_cell.number_format = '#,##0'

# Column widths
ws.column_dimensions["A"].width = 30
ws.column_dimensions["B"].width = 45
ws.column_dimensions["C"].width = 20

# Footer
footer_row = total_row + 2
ws.cell(row=footer_row, column=1, value=data.get("footer", "")).font = Font(color="808080", size=9)

wb.save(data.get("filepath", "output.xlsx"))
print(data.get("filepath", "output.xlsx"))
`;

  const pyData = JSON.stringify({
    sheet_title: lang === 'es' ? 'ES - Propuesta' : 'EN - Proposal',
    title: data.title,
    hook: data.hook,
    primary_color: (data.brand.colors.primary || '#122562').replace('#', ''),
    accent_color: (data.brand.colors.accent || '#FFD700').replace('#', ''),
    headers: [data.labels.service, data.labels.description, data.labels.price],
    services: (data.services || []).map(s => ({ name: s.name, description: s.description, price: s.price || 0 })),
    total_label: data.labels.total,
    footer: `${data.brand.logo.primary_name} — ${data.id} — ${data.date}`,
    filepath: filepath
  });

  // Try python3 first, then python
  const { execSync } = require('child_process');
  const pyCommands = ['python3', 'python'];
  for (const cmd of pyCommands) {
    try {
      execSync(`${cmd} -c ${JSON.stringify(pyScript)} ${JSON.stringify(pyData)}`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000
      });
      if (fs.existsSync(filepath)) return filepath;
    } catch { /* try next */ }
  }

  console.warn('[WARN] Python/openpyxl not available — skipping XLSX.');
  return null;
}

function generatePPTX(proposalData, lang, outputDir) {
  if (!PptxGenJS) {
    console.warn('[WARN] pptxgenjs not available — skipping PPTX. Install with: npm install -g pptxgenjs');
    return null;
  }

  const data = buildTemplateData(proposalData, lang);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const colors = data.brand.colors || {};
  const primary = (colors.primary || '#122562').replace('#', '');
  const accent  = (colors.accent || '#FFD700').replace('#', '');
  const white   = 'FFFFFF';

  // Slide 1: Cover
  const slide1 = pptx.addSlide();
  slide1.background = { color: primary };
  slide1.addText(data.title, { x: 0.8, y: 1.5, w: 8, h: 1.5, fontSize: 28, bold: true, color: white, fontFace: 'Arial' });
  slide1.addText(data.hook, { x: 0.8, y: 3.2, w: 8, h: 1, fontSize: 16, color: white, fontFace: 'Trebuchet MS' });
  slide1.addShape('rect', { x: 7.5, y: 4.8, w: 2.5, h: 0.15, fill: { color: accent } });
  slide1.addText(`${data.brand.logo.primary_name} | ${data.id}`, { x: 0.3, y: 5.1, w: 9.4, h: 0.4, fontSize: 8, color: white, fontFace: 'Trebuchet MS' });

  // Slide 2: Problem
  const slide2 = pptx.addSlide();
  slide2.addText(data.labels.challenge.toUpperCase(), { x: 0.8, y: 0.4, w: 4, h: 0.4, fontSize: 9, charSpacing: 4, color: primary, fontFace: 'Trebuchet MS' });
  slide2.addText(data.labels.challenge, { x: 0.8, y: 0.9, w: 8, h: 0.6, fontSize: 22, bold: true, color: primary, fontFace: 'Arial' });
  slide2.addShape('rect', { x: 0.8, y: 1.55, w: 1.2, h: 0.04, fill: { color: accent } });
  slide2.addText(data.problem, { x: 0.8, y: 1.8, w: 8.4, h: 3.2, fontSize: 14, color: '1F2833', fontFace: 'Trebuchet MS', valign: 'top' });

  // Slide 3: Solution
  const slide3 = pptx.addSlide();
  slide3.addText(data.labels.solution.toUpperCase(), { x: 0.8, y: 0.4, w: 4, h: 0.4, fontSize: 9, charSpacing: 4, color: primary, fontFace: 'Trebuchet MS' });
  slide3.addText(data.labels.solution, { x: 0.8, y: 0.9, w: 8, h: 0.6, fontSize: 22, bold: true, color: primary, fontFace: 'Arial' });
  slide3.addShape('rect', { x: 0.8, y: 1.55, w: 1.2, h: 0.04, fill: { color: accent } });
  slide3.addText(data.solution, { x: 0.8, y: 1.8, w: 8.4, h: 3.2, fontSize: 14, color: '1F2833', fontFace: 'Trebuchet MS', valign: 'top' });

  // Slide 4: Scope
  const slide4 = pptx.addSlide();
  slide4.addText(data.labels.scope.toUpperCase(), { x: 0.8, y: 0.4, w: 4, h: 0.4, fontSize: 9, charSpacing: 4, color: primary, fontFace: 'Trebuchet MS' });
  slide4.addText(data.labels.scope, { x: 0.8, y: 0.9, w: 8, h: 0.6, fontSize: 22, bold: true, color: primary, fontFace: 'Arial' });
  slide4.addShape('rect', { x: 0.8, y: 1.55, w: 1.2, h: 0.04, fill: { color: accent } });
  const scopeText = (data.scope || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  slide4.addText(scopeText, { x: 0.8, y: 1.8, w: 8.4, h: 3.2, fontSize: 13, color: '1F2833', fontFace: 'Trebuchet MS', valign: 'top' });

  // Slide 5: Investment
  const slide5 = pptx.addSlide();
  slide5.addText(data.labels.investment.toUpperCase(), { x: 0.8, y: 0.4, w: 4, h: 0.4, fontSize: 9, charSpacing: 4, color: primary, fontFace: 'Trebuchet MS' });
  slide5.addText(data.labels.investment, { x: 0.8, y: 0.9, w: 8, h: 0.6, fontSize: 22, bold: true, color: primary, fontFace: 'Arial' });
  slide5.addShape('rect', { x: 0.8, y: 1.55, w: 1.2, h: 0.04, fill: { color: accent } });

  const tableData = [[data.labels.service, data.labels.description, data.labels.price]];
  (data.services || []).forEach(s => { tableData.push([s.name, s.description || '', s.price_formatted]); });
  tableData.push([data.labels.total, '', data.total_formatted]);

  slide5.addTable(tableData, {
    x: 0.8, y: 1.8, w: 8.4,
    fontSize: 11, fontFace: 'Trebuchet MS',
    border: { type: 'solid', pt: 0.5, color: 'CCCCCC' },
    colW: [3, 3.4, 2],
    autoPage: false
  });

  // Slide 6: CTA
  const slide6 = pptx.addSlide();
  slide6.background = { color: primary };
  slide6.addText(data.cta_text, { x: 1, y: 2, w: 8, h: 1.5, fontSize: 28, bold: true, color: accent, fontFace: 'Arial', align: 'center' });
  if (data.cta_date) {
    slide6.addText(data.cta_date, { x: 1, y: 3.5, w: 8, h: 0.5, fontSize: 14, color: white, fontFace: 'Trebuchet MS', align: 'center' });
  }
  slide6.addText(`${data.brand.logo.primary_name} | ${data.id} | ${data.date}`, { x: 0.3, y: 5.1, w: 9.4, h: 0.4, fontSize: 8, color: white, fontFace: 'Trebuchet MS' });

  const filename = `propuesta_${slugify(data.client_company)}_${data.date.substring(0, 7)}_${lang}.pptx`;
  const filepath = path.join(outputDir, filename);

  return pptx.writeFile({ fileName: filepath }).then(() => filepath);
}

// ── Utilities ──────────────────────────────────────────────────────────────

function slugify(text) {
  return (text || 'client')
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
}

// ── Main orchestrator ─��────────────────────────────────────────────────────

async function generateAll(proposalData, outputDir, options = {}) {
  const formats = options.formats || ['html', 'docx', 'xlsx', 'pptx', 'md'];
  const languages = options.languages || ['es', 'en'];

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results = { generated: [], skipped: [], errors: [] };

  for (const lang of languages) {
    for (const fmt of formats) {
      try {
        let filepath = null;
        switch (fmt) {
          case 'html':
            filepath = generateHTML(proposalData, lang, outputDir);
            break;
          case 'md':
          case 'markdown':
            filepath = generateMarkdown(proposalData, lang, outputDir);
            break;
          case 'docx':
            filepath = await generateDOCX(proposalData, lang, outputDir);
            break;
          case 'xlsx':
            filepath = generateXLSX(proposalData, lang, outputDir);
            break;
          case 'pptx':
            filepath = await generatePPTX(proposalData, lang, outputDir);
            break;
        }
        if (filepath) {
          results.generated.push({ format: fmt, lang, path: filepath });
        } else {
          results.skipped.push({ format: fmt, lang, reason: 'Package not available or template missing' });
        }
      } catch (err) {
        results.errors.push({ format: fmt, lang, error: err.message });
      }
    }
  }

  // Generate verification report
  if (proposalData.verification) {
    try {
      const vPath = generateVerificationReport(proposalData.verification, outputDir);
      if (vPath) results.generated.push({ format: 'verification', lang: 'both', path: vPath });
    } catch (err) {
      results.errors.push({ format: 'verification', lang: 'both', error: err.message });
    }
  }

  return results;
}

// ── CLI ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`generate-all.js — Multi-format proposal generator

Usage:
  node generate-all.js --data <proposal.json> --output <dir>
  node generate-all.js --data <proposal.json> --output <dir> --format html
  node generate-all.js --data <proposal.json> --output <dir> --lang es

Options:
  --data <file>      Path to ProposalData JSON file
  --output <dir>     Output directory (created if needed)
  --format <fmt>     Generate only this format: html|docx|xlsx|pptx|md (default: all)
  --lang <lang>      Generate only this language: es|en (default: both)
  --json             Output results as JSON

Available packages:
  Handlebars: ${Handlebars ? 'YES' : 'NO (install: npm install handlebars)'}
  docx:       ${docxLib ? 'YES' : 'NO (install: npm install docx)'}
  pptxgenjs:  ${PptxGenJS ? 'YES' : 'NO (install: npm install pptxgenjs)'}`);
    process.exit(0);
  }

  const dataPath = args[args.indexOf('--data') + 1];
  const outputPath = args[args.indexOf('--output') + 1] || './outputs';

  if (!dataPath || !fs.existsSync(dataPath)) {
    console.error(`Error: --data file not found: ${dataPath}`);
    process.exit(1);
  }

  const proposalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const options = {};
  if (args.includes('--format')) options.formats = [args[args.indexOf('--format') + 1]];
  if (args.includes('--lang')) options.languages = [args[args.indexOf('--lang') + 1]];

  generateAll(proposalData, outputPath, options).then(results => {
    if (args.includes('--json')) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\nGeneration complete:`);
      console.log(`  Generated: ${results.generated.length} files`);
      results.generated.forEach(f => console.log(`    [${f.format}/${f.lang}] ${f.path}`));
      if (results.skipped.length) {
        console.log(`  Skipped: ${results.skipped.length}`);
        results.skipped.forEach(s => console.log(`    [${s.format}/${s.lang}] ${s.reason}`));
      }
      if (results.errors.length) {
        console.log(`  Errors: ${results.errors.length}`);
        results.errors.forEach(e => console.log(`    [${e.format}/${e.lang}] ${e.error}`));
      }
    }
  });
}

module.exports = { generateAll, generateHTML, generateMarkdown, generateDOCX, generateXLSX, generatePPTX, generateVerificationReport, buildTemplateData, slugify };
