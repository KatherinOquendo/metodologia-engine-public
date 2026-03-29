/**
 * harness.js — Minimal zero-dependency test harness
 * MetodologIA Proposal Engine — test infrastructure
 *
 * No external packages required. Uses Node.js built-in `assert`.
 * Output format: TAP-compatible + color summary.
 *
 * API:
 *   describe(label, fn)          — group tests
 *   test(label, fn)              — individual test (sync or async)
 *   expect(actual).toBe(exp)     — strict equality
 *   expect(actual).toEqual(exp)  — deep equality
 *   expect(actual).toContain(v)  — string contains or array includes
 *   expect(actual).toMatch(re)   — regex match
 *   expect(actual).toBeNull()
 *   expect(actual).toBeDefined()
 *   expect(actual).toBeGreaterThan(n)
 *   expect(actual).toBeLessThanOrEqual(n)
 *   expect(fn).toThrow()         — sync function throws
 *   expect(actual).not.toBe(exp) — negation wrapper
 *
 * Usage:
 *   const { describe, test, expect, runAll } = require('../harness');
 *   // ... define tests ...
 *   module.exports = { runAll };
 *   // runner calls: require('./suite').runAll()
 */

'use strict';

const assert = require('assert');

// ─── State ────────────────────────────────────────────────────────────────────
const suites  = [];
let   current = null; // current suite

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  gray:   s => `\x1b[90m${s}\x1b[0m`,
};

// ─── describe / test ──────────────────────────────────────────────────────────
function describe(label, fn) {
  const suite = { label, tests: [] };
  suites.push(suite);
  current = suite;
  fn();
  current = null;
}

function test(label, fn) {
  const entry = { label, fn, suite: current?.label ?? '(root)' };
  if (current) {
    current.tests.push(entry);
  } else {
    // Top-level test — create implicit suite
    let root = suites.find(s => s.label === '(root)');
    if (!root) { root = { label: '(root)', tests: [] }; suites.push(root); }
    root.tests.push(entry);
  }
}

// ─── expect ───────────────────────────────────────────────────────────────────
function expect(actual) {
  const make = (negate) => ({
    toBe(expected) {
      const pass = actual === expected;
      if (negate ? pass : !pass) {
        throw new assert.AssertionError({
          message: negate
            ? `Expected NOT ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`
            : `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`,
          actual,
          expected,
        });
      }
    },
    toEqual(expected) {
      try {
        if (negate) {
          // Deep equality — invert
          let threw = false;
          try { assert.deepStrictEqual(actual, expected); } catch { threw = true; }
          if (!threw) throw new assert.AssertionError({ message: `Expected values NOT to deep-equal` });
        } else {
          assert.deepStrictEqual(actual, expected);
        }
      } catch (e) {
        if (e instanceof assert.AssertionError) throw e;
        throw new assert.AssertionError({ message: e.message });
      }
    },
    toContain(value) {
      const pass = typeof actual === 'string'
        ? actual.includes(value)
        : Array.isArray(actual) && actual.includes(value);
      if (negate ? pass : !pass) {
        throw new assert.AssertionError({
          message: negate
            ? `Expected ${JSON.stringify(actual)} NOT to contain ${JSON.stringify(value)}`
            : `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(value)}`,
        });
      }
    },
    toMatch(pattern) {
      const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      const pass = re.test(actual);
      if (negate ? pass : !pass) {
        throw new assert.AssertionError({
          message: negate
            ? `Expected "${actual}" NOT to match ${re}`
            : `Expected "${actual}" to match ${re}`,
        });
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (negate ? pass : !pass) {
        throw new assert.AssertionError({
          message: negate ? `Expected value NOT to be null` : `Expected null, got ${JSON.stringify(actual)}`,
        });
      }
    },
    toBeDefined() {
      const pass = actual !== undefined;
      if (negate ? pass : !pass) {
        throw new assert.AssertionError({
          message: negate ? `Expected value to be undefined` : `Expected defined value, got undefined`,
        });
      }
    },
    toBeGreaterThan(n) {
      const pass = actual > n;
      if (negate ? pass : !pass) {
        throw new assert.AssertionError({
          message: negate
            ? `Expected ${actual} NOT to be greater than ${n}`
            : `Expected ${actual} to be greater than ${n}`,
        });
      }
    },
    toBeLessThanOrEqual(n) {
      const pass = actual <= n;
      if (negate ? pass : !pass) {
        throw new assert.AssertionError({
          message: negate
            ? `Expected ${actual} NOT to be ≤ ${n}`
            : `Expected ${actual} to be ≤ ${n}`,
        });
      }
    },
    toThrow() {
      if (typeof actual !== 'function') {
        throw new assert.AssertionError({ message: 'toThrow() requires a function' });
      }
      let threw = false;
      try { actual(); } catch { threw = true; }
      if (negate ? threw : !threw) {
        throw new assert.AssertionError({
          message: negate ? 'Expected function NOT to throw' : 'Expected function to throw',
        });
      }
    },
    get not() { return make(true); },
  });
  return make(false);
}

// ─── Runner ───────────────────────────────────────────────────────────────────
async function runAll() {
  let total = 0, passed = 0, failed = 0;
  const failures = [];

  for (const suite of suites) {
    if (suite.tests.length === 0) continue;
    console.log(`\n${C.bold(C.cyan(suite.label))}`);

    for (const t of suite.tests) {
      total++;
      try {
        const result = t.fn();
        if (result && typeof result.then === 'function') await result;
        console.log(`  ${C.green('✓')} ${C.gray(t.label)}`);
        passed++;
      } catch (e) {
        failed++;
        const msg = e.message || String(e);
        console.log(`  ${C.red('✗')} ${t.label}`);
        console.log(`    ${C.red(msg)}`);
        failures.push({ suite: suite.label, test: t.label, message: msg });
      }
    }
  }

  // Summary
  console.log(`\n${C.bold('Results')} — ${total} tests`);
  console.log(`  ${C.green(`✓ ${passed} passed`)}`);
  if (failed > 0) {
    console.log(`  ${C.red(`✗ ${failed} failed`)}`);
    console.log(`\n${C.bold('Failures:')}`);
    failures.forEach((f, i) =>
      console.log(`  ${i + 1}. [${f.suite}] ${f.test}\n     ${C.red(f.message)}`)
    );
  }
  console.log('');

  return { total, passed, failed };
}

module.exports = { describe, test, expect, runAll };
