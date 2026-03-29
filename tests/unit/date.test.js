/**
 * date.test.js — Unit tests for scripts/utils/date.js
 * Tests: formatDisplay, formatISO, calcExpiry, generateProposalId, buildDateMeta
 */
'use strict';

const path = require('path');
const os   = require('os');
const fs   = require('fs');
const { describe, test, expect, runAll } = require('../harness');
const {
  formatDisplay,
  formatISO,
  calcExpiry,
  generateProposalId,
  buildDateMeta,
} = require(
  path.resolve(__dirname, '../../skills/metodologia-proposal-engine/scripts/utils/date')
);

// ─── formatDisplay() ──────────────────────────────────────────────────────────

describe('formatDisplay() — Spanish', () => {
  test('March 29 → "29 de marzo de 2026"', () => {
    expect(formatDisplay('2026-03-29', 'es')).toBe('29 de marzo de 2026');
  });
  test('January 1 → "1 de enero de 2026"', () => {
    expect(formatDisplay('2026-01-01', 'es')).toBe('1 de enero de 2026');
  });
  test('December 31 → "31 de diciembre de 2025"', () => {
    expect(formatDisplay('2025-12-31', 'es')).toBe('31 de diciembre de 2025');
  });
  test('all 12 months have Spanish names', () => {
    const months_es = ['enero','febrero','marzo','abril','mayo','junio',
                       'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    months_es.forEach((m, i) => {
      const mm = String(i + 1).padStart(2, '0');
      expect(formatDisplay(`2026-${mm}-15`, 'es')).toContain(m);
    });
  });
});

describe('formatDisplay() — English', () => {
  test('March 29 → "March 29, 2026"', () => {
    expect(formatDisplay('2026-03-29', 'en')).toBe('March 29, 2026');
  });
  test('January 1 → "January 1, 2026"', () => {
    expect(formatDisplay('2026-01-01', 'en')).toBe('January 1, 2026');
  });
  test('contains comma after day number', () => {
    expect(formatDisplay('2026-06-15', 'en')).toMatch(/\d+,\s+\d{4}/);
  });
  test('all 12 months have English names', () => {
    const months_en = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
    months_en.forEach((m, i) => {
      const mm = String(i + 1).padStart(2, '0');
      expect(formatDisplay(`2026-${mm}-15`, 'en')).toContain(m);
    });
  });
});

// ─── formatISO() ──────────────────────────────────────────────────────────────

describe('formatISO()', () => {
  test('returns YYYY-MM-DD format', () => {
    expect(formatISO('2026-03-29')).toBe('2026-03-29');
  });
  test('single-digit month/day padded', () => {
    expect(formatISO('2026-01-05')).toBe('2026-01-05');
  });
  test('accepts Date object', () => {
    const d = new Date(2026, 2, 29); // March = index 2
    expect(formatISO(d)).toBe('2026-03-29');
  });
});

// ─── calcExpiry() ─────────────────────────────────────────────────────────────

describe('calcExpiry()', () => {
  test('30 days from 2026-03-29 → 2026-04-28', () => {
    const r = calcExpiry('2026-03-29', 30);
    expect(r.iso).toBe('2026-04-28');
  });
  test('result includes ES and EN display forms', () => {
    const r = calcExpiry('2026-03-29', 30);
    expect(r.es).toContain('abril');
    expect(r.en).toContain('April');
  });
  test('15-day window', () => {
    const r = calcExpiry('2026-03-29', 15);
    expect(r.iso).toBe('2026-04-13');
  });
  test('crosses year boundary: Dec 31 + 5 days = Jan 5', () => {
    const r = calcExpiry('2025-12-31', 5);
    expect(r.iso).toBe('2026-01-05');
  });
  test('default validity is 30 days', () => {
    const r1 = calcExpiry('2026-03-29');
    const r2 = calcExpiry('2026-03-29', 30);
    expect(r1.iso).toBe(r2.iso);
  });
});

// ─── generateProposalId() ─────────────────────────────────────────────────────

describe('generateProposalId()', () => {
  let tmpDir;

  // Use a fresh temp dir for each test group to avoid counter contamination
  test('format: PRO-YYYY-NNN', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mao-test-'));
    const id = generateProposalId(tmpDir);
    expect(id).toMatch(/^PRO-\d{4}-\d{3}$/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('year matches current year', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mao-test-'));
    const id = generateProposalId(tmpDir);
    const year = String(new Date().getFullYear());
    expect(id).toContain(`PRO-${year}-`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('sequential: first call = NNN=001, second = 002', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mao-test-'));
    const id1 = generateProposalId(tmpDir);
    const id2 = generateProposalId(tmpDir);
    const seq1 = parseInt(id1.split('-')[2]);
    const seq2 = parseInt(id2.split('-')[2]);
    expect(seq2).toBe(seq1 + 1);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('works with non-writable dir (no crash — just no persistence)', () => {
    // Pass a fake non-existent dir — should not throw, just returns an ID
    let threw = false;
    let id;
    try { id = generateProposalId('/nonexistent/path/xyz'); } catch { threw = true; }
    expect(threw).toBe(false);
    expect(id).toMatch(/^PRO-\d{4}-\d{3}$/);
  });

  test('sequence is zero-padded to 3 digits', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mao-test-'));
    const id = generateProposalId(tmpDir);
    // seq part must be exactly 3 digits
    expect(id.split('-')[2]).toMatch(/^\d{3}$/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ─── buildDateMeta() ──────────────────────────────────────────────────────────

describe('buildDateMeta()', () => {
  let tmpDir;

  test('returns id, date, valid_days, valid_until, display', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mao-test-'));
    const meta = buildDateMeta({ issueDate: '2026-03-29', validDays: 30, counterDir: tmpDir });
    expect(meta.id).toMatch(/^PRO-/);
    expect(meta.date).toBe('2026-03-29');
    expect(meta.valid_days).toBe(30);
    expect(meta.valid_until.iso).toBe('2026-04-28');
    expect(meta.display.es).toContain('marzo');
    expect(meta.display.en).toContain('March');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('default validDays = 30', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mao-test-'));
    const meta = buildDateMeta({ issueDate: '2026-03-29', counterDir: tmpDir });
    expect(meta.valid_days).toBe(30);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('no issueDate → uses today, does not crash', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mao-test-'));
    const meta = buildDateMeta({ counterDir: tmpDir });
    expect(meta.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

module.exports = { runAll };
