import { interpretStep, resolveTarget, resolveField } from './interpreter.js';
import path from 'path';
import fs from 'fs';

/**
 * Execute a parsed .flow test against a real browser.
 * Returns a detailed result object for the reporter.
 *
 * Playwright is loaded lazily via dynamic import — so commands like
 * init / validate / export work without node_modules installed.
 */
export async function executeFlow(flow, opts = {}) {
  // Lazy import — only loads when actually running tests
  let pw;
  try {
    pw = await import('@playwright/test');
  } catch (_) {
    throw new Error(
      'Playwright not found. Run: npm install\n' +
      'Then install a browser: npx playwright install chromium'
    );
  }

  const { chromium, firefox, webkit, expect } = pw;
  const BROWSERS = { chromium, firefox, webkit };

  const browserType = BROWSERS[flow.browser] || chromium;
  const outputDir = path.resolve(opts.outputDir || '.plaintest');
  // Ensure outputDir stays within cwd — basic traversal guard
  if (!outputDir.startsWith(process.cwd())) {
    throw new Error(`outputDir must be within the project directory`);
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await browserType.launch({ headless: flow.headless });
  const context = await browser.newContext({ viewport: flow.viewport });
  const page    = await context.newPage();

  const stepResults = [];
  let   passed = 0;
  let   failed = 0;
  let   screenshotCount = 0;
  const startTime = Date.now();

  // Navigate to base URL first if provided and first step isn't a navigate
  const firstStep = flow.steps[0]?.raw?.toLowerCase() || '';
  if (flow.url && !firstStep.match(/^(?:navigate|go to|open)/)) {
    await page.goto(flow.url, { waitUntil: 'domcontentloaded' });
  }

  for (const step of flow.steps) {
    const stepStart  = Date.now();
    const interpreted = interpretStep(step.raw);
    let   error      = null;
    let   screenshot = null;

    try {
      await executeAction(page, interpreted, flow, {
        outputDir,
        expect,
        screenshotName: () => {
          const name = `step-${step.index + 1}-${++screenshotCount}.png`;
          return path.join(outputDir, name);
        },
      });
      passed++;
    } catch (err) {
      failed++;
      error = err.message;

      // on_fail: screenshot (default)
      if (flow.on_fail !== 'continue') {
        const failPath = path.join(outputDir, `fail-step-${step.index + 1}.png`);
        try {
          await page.screenshot({ path: failPath, fullPage: false });
          screenshot = failPath;
        } catch (_) {}
      }

      if (flow.on_fail === 'stop') break;
    }

    stepResults.push({
      index:       step.index,
      raw:         step.raw,
      interpreted,
      passed:      error === null,
      error,
      screenshot,
      duration:    Date.now() - stepStart,
    });
  }

  await browser.close();

  return {
    name:     flow.name,
    filePath: flow.filePath,
    passed,
    failed,
    total:    stepResults.length,
    duration: Date.now() - startTime,
    steps:    stepResults,
    browser:  flow.browser,
    tags:     flow.tags,
  };
}

async function executeAction(page, step, flow, ctx) {
  const t      = step.action;
  const expect = ctx.expect;

  // NAVIGATION
  if (t === 'navigate') {
    const url = step.url.startsWith('http') ? step.url : `${flow.url || ''}${step.url}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: flow.timeout });
    return;
  }
  if (t === 'reload')   { await page.reload(); return; }
  if (t === 'back')     { await page.goBack(); return; }
  if (t === 'forward')  { await page.goForward(); return; }

  // CLICK
  if (t === 'click') {
    const loc = resolveTarget(page, step.target);
    await loc.waitFor({ state: 'visible', timeout: flow.timeout });
    await loc.click();
    return;
  }
  if (t === 'dblclick') {
    const loc = resolveTarget(page, step.target);
    await loc.waitFor({ state: 'visible', timeout: flow.timeout });
    await loc.dblclick();
    return;
  }

  // FILL
  if (t === 'fill') {
    const loc = resolveField(page, step.field);
    await loc.waitFor({ state: 'visible', timeout: flow.timeout });
    await loc.fill(step.value);
    return;
  }
  if (t === 'clear') {
    const loc = resolveField(page, step.field);
    await loc.clear();
    return;
  }

  // SELECT
  if (t === 'select') {
    const loc = resolveField(page, step.field);
    await loc.selectOption({ label: step.option });
    return;
  }

  // CHECK / UNCHECK
  if (t === 'check') {
    await page.getByLabel(new RegExp(step.label, 'i')).check();
    return;
  }
  if (t === 'uncheck') {
    await page.getByLabel(new RegExp(step.label, 'i')).uncheck();
    return;
  }

  // PRESS
  if (t === 'press') {
    await page.keyboard.press(step.key);
    return;
  }

  // HOVER
  if (t === 'hover') {
    const loc = resolveTarget(page, step.target);
    await loc.hover();
    return;
  }

  // SCROLL
  if (t === 'scroll') {
    const loc = resolveTarget(page, step.target);
    await loc.scrollIntoViewIfNeeded();
    return;
  }

  // ASSERTIONS
  if (t === 'assertHeading') {
    await expect(page.getByRole('heading', { name: new RegExp(step.text, 'i') })).toBeVisible({ timeout: flow.timeout });
    return;
  }
  if (t === 'assertVisible') {
    await expect(page.getByText(new RegExp(step.text, 'i'))).toBeVisible({ timeout: flow.timeout });
    return;
  }
  if (t === 'assertHidden') {
    await expect(page.getByText(new RegExp(step.text, 'i'))).toBeHidden({ timeout: flow.timeout });
    return;
  }
  if (t === 'assertUrlContains') {
    await expect(page).toHaveURL(new RegExp(step.text), { timeout: flow.timeout });
    return;
  }
  if (t === 'assertUrl') {
    await expect(page).toHaveURL(step.url, { timeout: flow.timeout });
    return;
  }
  if (t === 'assertTitle') {
    await expect(page).toHaveTitle(new RegExp(step.text, 'i'), { timeout: flow.timeout });
    return;
  }
  if (t === 'assertValue') {
    const loc = resolveField(page, step.field);
    await expect(loc).toHaveValue(step.value, { timeout: flow.timeout });
    return;
  }
  if (t === 'assertDisabled') {
    const loc = resolveTarget(page, step.target);
    await expect(loc).toBeDisabled({ timeout: flow.timeout });
    return;
  }
  if (t === 'assertEnabled') {
    const loc = resolveTarget(page, step.target);
    await expect(loc).toBeEnabled({ timeout: flow.timeout });
    return;
  }
  if (t === 'assertPageContains') {
    await expect(page.getByText(new RegExp(step.text, 'i')).first()).toBeVisible({ timeout: flow.timeout });
    return;
  }
  if (t === 'assertExists') {
    await expect(page.locator(step.selector)).toBeVisible({ timeout: flow.timeout });
    return;
  }
  if (t === 'assertNotExists') {
    await expect(page.locator(step.selector)).toBeHidden({ timeout: flow.timeout });
    return;
  }

  // WAITS
  if (t === 'wait') {
    await page.waitForTimeout(step.ms);
    return;
  }
  if (t === 'waitForVisible') {
    await page.getByText(new RegExp(step.text, 'i')).waitFor({ state: 'visible', timeout: flow.timeout });
    return;
  }
  if (t === 'waitForHidden') {
    await page.getByText(new RegExp(step.text, 'i')).waitFor({ state: 'hidden', timeout: flow.timeout });
    return;
  }
  if (t === 'waitForNetwork') {
    await page.waitForLoadState('networkidle', { timeout: flow.timeout });
    return;
  }

  // UTILITIES
  if (t === 'screenshot') {
    const p = step.name
      ? path.join(ctx.outputDir, `${step.name}.png`)
      : ctx.screenshotName();
    await page.screenshot({ path: p, fullPage: true });
    return;
  }
  if (t === 'log') {
    console.log(`  [log] ${step.message}`);
    return;
  }

  // UNKNOWN
  if (t === 'unknown') {
    throw new Error(`Step not recognised: "${step.raw}"\n  Run 'plaintest --help' to see supported step patterns.`);
  }

  throw new Error(`Unhandled action: ${t}`);
}
