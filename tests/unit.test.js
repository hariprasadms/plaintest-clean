/**
 * plaintest unit tests
 * Tests parser and interpreter without needing a browser or network.
 * Run: node tests/unit.test.js
 */

import { parseFlow }              from '../src/parser.js';
import { interpretStep }          from '../src/interpreter.js';
import { renderReport }           from '../src/reporter.js';
import { loadConfig, mergeConfig } from '../src/config.js';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✕ ${name}`);
    console.log(`    ${e.message}`);
    failed++;
  }
}

function expect(val) {
  return {
    toBe: (expected) => {
      if (val !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toEqual: (expected) => {
      const a = JSON.stringify(val);
      const b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
    },
    toContain: (sub) => {
      if (!String(val).includes(sub)) throw new Error(`Expected "${val}" to contain "${sub}"`);
    },
    toBeDefined: () => {
      if (val === undefined || val === null) throw new Error(`Expected defined value, got ${val}`);
    },
    not: {
      toBe: (expected) => {
        if (val === expected) throw new Error(`Expected not to be ${JSON.stringify(expected)}`);
      },
    },
  };
}

// ─── PARSER TESTS ─────────────────────────────────────────────────────────────

console.log('\n  Parser\n');

test('parses basic flow file', () => {
  const flow = parseFlow(path.join(__dirname, '../examples/login.flow'));
  expect(flow.name).toBe('User login journey');
  expect(flow.browser).toBe('chromium');
  expect(flow.headless).toBe(true);
  expect(flow.timeout).toBe(30000);
  expect(flow.retries).toBe(1);
  expect(flow.steps.length).toBe(8);
});

test('parses tags correctly', () => {
  const flow = parseFlow(path.join(__dirname, '../examples/login.flow'));
  expect(flow.tags).toEqual(['auth', 'smoke']);
});

test('steps have index and raw fields', () => {
  const flow = parseFlow(path.join(__dirname, '../examples/login.flow'));
  const first = flow.steps[0];
  expect(first.index).toBe(0);
  expect(first.raw).toContain('navigate to');
});

test('returns null for unset config fields (defaults applied by mergeConfig)', () => {
  const tmp = '/tmp/test-defaults.flow';
  fs.writeFileSync(tmp, 'steps:\n  - navigate to https://example.com\n');
  const flow = parseFlow(tmp);
  // Parser intentionally returns null so mergeConfig can apply config-file values
  expect(flow.browser).toBe(null);
  expect(flow.headless).toBe(null);
  expect(flow.timeout).toBe(null);
  fs.unlinkSync(tmp);
});

test('throws on missing steps', () => {
  const tmp = '/tmp/test-nosteps.flow';
  fs.writeFileSync(tmp, 'name: no steps\nurl: https://example.com\n');
  let threw = false;
  try { parseFlow(tmp); } catch (_) { threw = true; }
  if (!threw) throw new Error('Expected parse error');
  fs.unlinkSync(tmp);
});

// ─── MERGECONFIG TESTS ────────────────────────────────────────────────────────

console.log('\n  mergeConfig\n');

test('mergeConfig applies config values when flow has no overrides', () => {
  // loadConfig() always returns the full defaults object — mergeConfig is never called with {}
  const flow   = { browser: null, headless: null, timeout: null, retries: null, on_fail: null, viewport: null };
  const config = { browser: 'chromium', headless: true, timeout: 30000, retries: 0, on_fail: 'screenshot', viewport: { width: 1280, height: 720 } };
  const merged = mergeConfig(config, flow);
  expect(merged.browser).toBe('chromium');
  expect(merged.headless).toBe(true);
  expect(merged.timeout).toBe(30000);
  expect(merged.retries).toBe(0);
  expect(merged.on_fail).toBe('screenshot');
});

test('mergeConfig uses config file values over defaults when flow is unset', () => {
  const flow   = { browser: null, headless: null, timeout: null, retries: null, on_fail: null, viewport: null };
  const config = { browser: 'firefox', headless: false, timeout: 15000, retries: 2, on_fail: 'stop', viewport: { width: 1440, height: 900 } };
  const merged = mergeConfig(config, flow);
  expect(merged.browser).toBe('firefox');
  expect(merged.headless).toBe(false);
  expect(merged.timeout).toBe(15000);
  expect(merged.retries).toBe(2);
  expect(merged.on_fail).toBe('stop');
});

test('mergeConfig: flow values override config values', () => {
  const flow   = { browser: 'webkit', headless: false, timeout: null, retries: null, on_fail: null, viewport: null };
  const config = { browser: 'firefox', headless: true, timeout: 15000, retries: 2, on_fail: 'stop', viewport: null };
  const merged = mergeConfig(config, flow);
  expect(merged.browser).toBe('webkit');
  expect(merged.headless).toBe(false);
  expect(merged.timeout).toBe(15000); // from config, flow didn't set it
});

// ─── INTERPRETER TESTS ────────────────────────────────────────────────────────

console.log('\n  Interpreter — navigation\n');

test('navigate to URL', () => {
  const r = interpretStep('navigate to https://example.com');
  expect(r.action).toBe('navigate');
  expect(r.url).toBe('https://example.com');
});

test('go to URL', () => {
  const r = interpretStep('go to https://myapp.com/login');
  expect(r.action).toBe('navigate');
  expect(r.url).toBe('https://myapp.com/login');
});

test('open URL', () => {
  const r = interpretStep('open https://example.com');
  expect(r.action).toBe('navigate');
});

test('reload the page', () => {
  const r = interpretStep('reload the page');
  expect(r.action).toBe('reload');
});

test('go back', () => {
  expect(interpretStep('go back').action).toBe('back');
});

test('go forward', () => {
  expect(interpretStep('go forward').action).toBe('forward');
});

console.log('\n  Interpreter — actions\n');

test('click button', () => {
  const r = interpretStep('click Sign in');
  expect(r.action).toBe('click');
  expect(r.target).toBe('Sign in');
});

test('click the button', () => {
  const r = interpretStep('click the Submit button');
  expect(r.action).toBe('click');
  expect(r.target).toBe('Submit');
});

test('double click', () => {
  const r = interpretStep('double click Edit');
  expect(r.action).toBe('dblclick');
  expect(r.target).toBe('Edit');
});

test('fill field with value', () => {
  const r = interpretStep('fill email with "user@test.com"');
  expect(r.action).toBe('fill');
  expect(r.field).toBe('email');
  expect(r.value).toBe('user@test.com');
});

test('fill password field', () => {
  const r = interpretStep('fill password with "SecretPass123!"');
  expect(r.action).toBe('fill');
  expect(r.field).toBe('password');
  expect(r.value).toBe('SecretPass123!');
});

test('type value into field', () => {
  const r = interpretStep('type "hello world" into search');
  expect(r.action).toBe('fill');
  expect(r.field).toBe('search');
  expect(r.value).toBe('hello world');
});

test('clear field', () => {
  const r = interpretStep('clear search');
  expect(r.action).toBe('clear');
  expect(r.field).toBe('search');
});

test('select option from dropdown', () => {
  const r = interpretStep('select "Option 1" from Dropdown');
  expect(r.action).toBe('select');
  expect(r.option).toBe('Option 1');
  expect(r.field).toBe('Dropdown');
});

test('check checkbox', () => {
  const r = interpretStep('check Remember me');
  expect(r.action).toBe('check');
  expect(r.label).toBe('Remember me');
});

test('uncheck checkbox', () => {
  const r = interpretStep('uncheck Terms and conditions');
  expect(r.action).toBe('uncheck');
  expect(r.label).toBe('Terms and conditions');
});

test('press key', () => {
  const r = interpretStep('press Enter');
  expect(r.action).toBe('press');
  expect(r.key).toBe('Enter');
});

test('press Tab', () => {
  const r = interpretStep('press Tab');
  expect(r.action).toBe('press');
  expect(r.key).toBe('Tab');
});

test('hover over element', () => {
  const r = interpretStep('hover over Menu');
  expect(r.action).toBe('hover');
  expect(r.target).toBe('Menu');
});

test('scroll to element', () => {
  const r = interpretStep('scroll to Footer');
  expect(r.action).toBe('scroll');
  expect(r.target).toBe('Footer');
});

console.log('\n  Interpreter — assertions\n');

test('assert heading', () => {
  const r = interpretStep('assert heading says "Welcome back"');
  expect(r.action).toBe('assertHeading');
  expect(r.text).toBe('Welcome back');
});

test('assert text visible', () => {
  const r = interpretStep('assert text "Success" is visible');
  expect(r.action).toBe('assertVisible');
  expect(r.text).toBe('Success');
});

test('assert text not visible', () => {
  const r = interpretStep('assert text "Error" is not visible');
  expect(r.action).toBe('assertHidden');
  expect(r.text).toBe('Error');
});

test('assert url contains', () => {
  const r = interpretStep('assert url contains "/dashboard"');
  expect(r.action).toBe('assertUrlContains');
  expect(r.text).toBe('/dashboard');
});

test('assert url is', () => {
  const r = interpretStep('assert url is "https://example.com/home"');
  expect(r.action).toBe('assertUrl');
  expect(r.url).toBe('https://example.com/home');
});

test('assert title', () => {
  const r = interpretStep('assert title is "My App"');
  expect(r.action).toBe('assertTitle');
  expect(r.text).toBe('My App');
});

test('assert field value', () => {
  const r = interpretStep('assert email has value "user@test.com"');
  expect(r.action).toBe('assertValue');
  expect(r.field).toBe('email');
  expect(r.value).toBe('user@test.com');
});

test('assert button disabled', () => {
  const r = interpretStep('assert button "Submit" is disabled');
  expect(r.action).toBe('assertDisabled');
  expect(r.target).toBe('Submit');
});

test('assert button enabled', () => {
  const r = interpretStep('assert button "Submit" is enabled');
  expect(r.action).toBe('assertEnabled');
  expect(r.target).toBe('Submit');
});

test('assert page contains', () => {
  const r = interpretStep('assert page contains "Confirmation"');
  expect(r.action).toBe('assertPageContains');
  expect(r.text).toBe('Confirmation');
});

test('assert element exists', () => {
  const r = interpretStep('assert element "#modal" exists');
  expect(r.action).toBe('assertExists');
  expect(r.selector).toBe('#modal');
});

test('assert element does not exist', () => {
  const r = interpretStep('assert element ".error" does not exist');
  expect(r.action).toBe('assertNotExists');
  expect(r.selector).toBe('.error');
});

console.log('\n  Interpreter — waits\n');

test('wait N seconds', () => {
  const r = interpretStep('wait 2 seconds');
  expect(r.action).toBe('wait');
  expect(r.ms).toBe(2000);
});

test('wait 0.5 seconds', () => {
  const r = interpretStep('wait 0.5 seconds');
  expect(r.action).toBe('wait');
  expect(r.ms).toBe(500);
});

test('wait for text to appear', () => {
  const r = interpretStep('wait for "Loading..." to disappear');
  expect(r.action).toBe('waitForHidden');
  expect(r.text).toBe('Loading...');
});

test('wait for network', () => {
  const r = interpretStep('wait for network');
  expect(r.action).toBe('waitForNetwork');
});

console.log('\n  Interpreter — utilities\n');

test('take screenshot (unnamed)', () => {
  const r = interpretStep('take screenshot');
  expect(r.action).toBe('screenshot');
  expect(r.name).toBe(null);
});

test('take screenshot (named)', () => {
  const r = interpretStep('take screenshot "after-login"');
  expect(r.action).toBe('screenshot');
  expect(r.name).toBe('after-login');
});

test('log message', () => {
  const r = interpretStep('log "reached checkout"');
  expect(r.action).toBe('log');
  expect(r.message).toBe('reached checkout');
});

test('unknown step returns unknown action', () => {
  const r = interpretStep('do something completely unrecognised');
  expect(r.action).toBe('unknown');
  expect(r.raw).toBeDefined();
});

// ─── REPORTER TESTS ───────────────────────────────────────────────────────────

console.log('\n  Reporter\n');

test('generates valid HTML report', () => {
  const mockResults = [{
    name: 'Login test',
    filePath: 'login.flow',
    passed: 3,
    failed: 1,
    total: 4,
    duration: 1234,
    browser: 'chromium',
    tags: ['smoke'],
    steps: [
      { index: 0, raw: 'navigate to https://example.com', interpreted: { action: 'navigate' }, passed: true,  error: null, screenshot: null, duration: 500 },
      { index: 1, raw: 'click Sign in',                   interpreted: { action: 'click'    }, passed: true,  error: null, screenshot: null, duration: 200 },
      { index: 2, raw: 'assert heading says "Welcome"',   interpreted: { action: 'assert'   }, passed: false, error: 'TimeoutError: waiting for heading', screenshot: null, duration: 10000 },
      { index: 3, raw: 'take screenshot',                 interpreted: { action: 'screenshot'}, passed: true,  error: null, screenshot: null, duration: 100 },
    ],
  }];

  const outPath = '/tmp/plaintest-test-report.html';
  renderReport(mockResults, outPath, 1234);

  const html = fs.readFileSync(outPath, 'utf8');
  expect(html).toContain('plaintest');
  expect(html).toContain('Login test');
  expect(html).toContain('navigate to https://example.com');
  expect(html).toContain('TimeoutError');
  expect(html).toContain('smoke');
  fs.unlinkSync(outPath);
});

// ─── EXPORTER TESTS ───────────────────────────────────────────────────────────

console.log('\n  Exporter\n');

import { exportToPlaywright } from '../src/exporter.js';

test('exports .flow to valid .spec.ts', () => {
  const flow = parseFlow(path.join(__dirname, '../examples/login.flow'));
  const out  = exportToPlaywright(flow, '/tmp');
  const src  = fs.readFileSync(out, 'utf8');
  expect(src).toContain("import { test, expect } from '@playwright/test'");
  expect(src).toContain("test('User login journey'");
  expect(src).toContain("waitUntil: 'domcontentloaded'");
  expect(src).toContain('getByLabel(/username/i)');
  expect(src).toContain('getByLabel(/password/i)');
  expect(src).toContain("toHaveURL(//secure/");
  expect(src).toContain("page.screenshot(");
  // Tags written as Playwright annotation
  expect(src).toContain("tag: ['@auth', '@smoke']");
  fs.unlinkSync(out);
});

test('exported file has correct step count', () => {
  const flow = parseFlow(path.join(__dirname, '../examples/login.flow'));
  const out  = exportToPlaywright(flow, '/tmp');
  const src  = fs.readFileSync(out, 'utf8');
  // 8 steps = 8 comment lines starting with "  // "
  const commentLines = src.split('\n').filter(l => l.match(/^  \/\/ .+/));
  expect(commentLines.length).toBe(8);
  fs.unlinkSync(out);
});

// ─── VALIDATOR TESTS ──────────────────────────────────────────────────────────

console.log('\n  Validator\n');

import { validateFlow } from '../src/validator.js';

test('valid flow passes validation', () => {
  const flow   = parseFlow(path.join(__dirname, '../examples/login.flow'));
  const result = validateFlow(flow);
  expect(result.valid).toBe(true);
  expect(result.errors.length).toBe(0);
});

test('invalid browser caught', () => {
  const flow   = parseFlow(path.join(__dirname, '../examples/login.flow'));
  flow.browser = 'safari';
  const result = validateFlow(flow);
  expect(result.valid).toBe(false);
  expect(result.errors[0]).toContain('Invalid browser');
});

test('invalid on_fail caught', () => {
  const flow    = parseFlow(path.join(__dirname, '../examples/login.flow'));
  flow.on_fail  = 'explode';
  const result  = validateFlow(flow);
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.includes('on_fail'))).toBe(true);
});

test('unknown step caught as error', () => {
  const flow = parseFlow(path.join(__dirname, '../examples/login.flow'));
  flow.steps.push({ index: 99, raw: 'do something completely nonsense' });
  const result = validateFlow(flow);
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.includes('unrecognised'))).toBe(true);
});

test('low timeout triggers warning not error', () => {
  const flow   = parseFlow(path.join(__dirname, '../examples/login.flow'));
  flow.timeout = 100;
  const result = validateFlow(flow);
  expect(result.warnings.some(w => w.includes('timeout'))).toBe(true);
});

test('long wait triggers warning', () => {
  const flow = parseFlow(path.join(__dirname, '../examples/login.flow'));
  flow.steps.push({ index: 99, raw: 'wait 10 seconds' });
  const result = validateFlow(flow);
  expect(result.warnings.some(w => w.includes('long wait'))).toBe(true);
});

// ─── YAML PARSER TESTS ────────────────────────────────────────────────────────

console.log('\n  YAML parser\n');

import { parseYaml } from '../src/yaml.js';

test('parses string values', () => {
  const r = parseYaml('name: My Test\nurl: https://example.com');
  expect(r.name).toBe('My Test');
  expect(r.url).toBe('https://example.com');
});

test('parses boolean true/false', () => {
  const r = parseYaml('headless: true\ndebug: false');
  expect(r.headless).toBe(true);
  expect(r.debug).toBe(false);
});

test('parses numbers', () => {
  const r = parseYaml('timeout: 30000\nretries: 2');
  expect(r.timeout).toBe(30000);
  expect(r.retries).toBe(2);
});

test('parses inline arrays', () => {
  const r = parseYaml('tags: [smoke, auth, regression]');
  expect(r.tags).toEqual(['smoke', 'auth', 'regression']);
});

test('parses inline objects', () => {
  const r = parseYaml('viewport: { width: 1280, height: 720 }');
  expect(r.viewport).toEqual({ width: 1280, height: 720 });
});

test('parses block sequences as steps array', () => {
  const yaml = 'steps:\n  - navigate to https://example.com\n  - click Login\n  - assert heading says "Welcome"';
  const r = parseYaml(yaml);
  expect(r.steps.length).toBe(3);
  expect(r.steps[0]).toBe('navigate to https://example.com');
  expect(r.steps[2]).toBe('assert heading says "Welcome"');
});

test('ignores comments and blank lines', () => {
  const yaml = '# comment\nname: Test\n\n# another comment\nbrowser: chromium';
  const r = parseYaml(yaml);
  expect(r.name).toBe('Test');
  expect(r.browser).toBe('chromium');
});

test('parses quoted string values', () => {
  const r = parseYaml('name: "My Quoted Test"');
  expect(r.name).toBe('My Quoted Test');
});

test('parses full .flow file correctly', () => {
  const yaml = `
name: Full flow test
url: https://example.com
browser: firefox
headless: false
timeout: 15000
retries: 1
on_fail: stop
tags: [smoke, auth]
viewport: { width: 1440, height: 900 }

steps:
  - navigate to https://example.com/login
  - fill email with "test@example.com"
  - click Sign in
  - assert heading says "Dashboard"
`.trim();
  const r = parseYaml(yaml);
  expect(r.name).toBe('Full flow test');
  expect(r.browser).toBe('firefox');
  expect(r.headless).toBe(false);
  expect(r.timeout).toBe(15000);
  expect(r.tags).toEqual(['smoke', 'auth']);
  expect(r.viewport.width).toBe(1440);
  expect(r.steps.length).toBe(4);
});

// ─── COLORS MODULE TESTS ──────────────────────────────────────────────────────

console.log('\n  Colors module\n');

import pc2 from '../src/colors.js';

test('colors module exports expected functions', () => {
  const fns = ['bold', 'dim', 'red', 'green', 'yellow', 'magenta', 'cyan', 'white'];
  for (const fn of fns) {
    if (typeof pc2[fn] !== 'function') throw new Error(`Missing: pc.${fn}`);
  }
});

test('colors wrap string correctly (or pass through when disabled)', () => {
  const result = pc2.green('hello');
  if (typeof result !== 'string') throw new Error('Expected string');
  if (!result.includes('hello')) throw new Error('Expected "hello" in output');
});

// ─── SUMMARY ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n  ${'─'.repeat(40)}`);
console.log(`  ${failed === 0 ? '✓' : '✕'} ${passed}/${total} tests passed\n`);

if (failed > 0) process.exit(1);
