import { interpretStep } from './interpreter.js';

/**
 * Validate a parsed flow object.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateFlow(flow) {
  const errors   = [];
  const warnings = [];

  // Required
  if (!flow.steps || flow.steps.length === 0) {
    errors.push('No steps defined — add at least one step.');
  }

  // URL check
  if (flow.url) {
    try { new URL(flow.url); }
    catch (_) { errors.push(`Invalid base url: "${flow.url}"`); }
  }

  // Browser check — null means "inherit from config", so only validate explicit values
  const validBrowsers = ['chromium', 'firefox', 'webkit'];
  if (flow.browser !== null && !validBrowsers.includes(flow.browser)) {
    errors.push(`Invalid browser "${flow.browser}" — must be one of: ${validBrowsers.join(', ')}`);
  }

  // on_fail check — null means "inherit from config"
  const validOnFail = ['screenshot', 'continue', 'stop'];
  if (flow.on_fail !== null && !validOnFail.includes(flow.on_fail)) {
    errors.push(`Invalid on_fail "${flow.on_fail}" — must be: screenshot | continue | stop`);
  }

  // Timeout — null means "inherit from config"
  if (flow.timeout !== null && flow.timeout < 1000) {
    warnings.push(`timeout is very low (${flow.timeout}ms) — steps may fail. Recommended: 15000+`);
  }

  // Check first step navigates if no url set
  const firstRaw = flow.steps[0]?.raw?.toLowerCase() || '';
  if (!flow.url && !firstRaw.match(/^(?:navigate|go to|open)/)) {
    warnings.push(`No "url" set and first step is not a navigation — browser will start on about:blank`);
  }

  // Validate each step
  for (const step of flow.steps) {
    const interpreted = interpretStep(step.raw);

    if (interpreted.action === 'unknown') {
      errors.push(`Step ${step.index + 1}: unrecognised step — "${step.raw}"`);
    }

    // Check navigate URLs are valid
    if (interpreted.action === 'navigate') {
      const url = interpreted.url;
      if (!url.startsWith('http')) {
        warnings.push(`Step ${step.index + 1}: URL "${url}" has no protocol — did you mean https://${url}?`);
      }
    }

    // Check fill steps have a value
    if (interpreted.action === 'fill' && !interpreted.value) {
      warnings.push(`Step ${step.index + 1}: fill step has empty value — "${step.raw}"`);
    }

    // Warn on hardcoded waits
    if (interpreted.action === 'wait' && interpreted.ms > 3000) {
      warnings.push(`Step ${step.index + 1}: long wait (${interpreted.ms / 1000}s) — consider "wait for network" or "wait for \\"text\\" to appear" instead`);
    }
  }

  return {
    valid:    errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation result for terminal output.
 */
export function formatValidation(flow, result) {
  const lines = [];
  const icon  = result.valid ? '✓' : '✕';
  lines.push(`${icon} ${flow.name}`);

  for (const e of result.errors) {
    lines.push(`  [error]   ${e}`);
  }
  for (const w of result.warnings) {
    lines.push(`  [warning] ${w}`);
  }
  if (result.valid && result.warnings.length === 0) {
    lines.push(`  All ${flow.steps.length} steps valid`);
  }

  return lines.join('\n');
}
