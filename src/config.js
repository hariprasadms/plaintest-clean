import path from 'path';
import fs from 'fs';

const DEFAULTS = {
  browser:   'chromium',
  headless:  true,
  timeout:   30000,
  retries:   0,
  on_fail:   'screenshot',
  outputDir: '.plaintest',
  viewport:  { width: 1280, height: 720 },
};

/**
 * Load plaintest.config.js from the current working directory.
 * Falls back to defaults if no config file found.
 * Individual .flow file settings always override config.
 */
export async function loadConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, 'plaintest.config.js');

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULTS };
  }

  try {
    const mod = await import(configPath);
    const cfg = mod.default || mod;
    return { ...DEFAULTS, ...cfg };
  } catch (err) {
    console.warn(`  [config] Failed to load plaintest.config.js: ${err.message}`);
    return { ...DEFAULTS };
  }
}

/**
 * Merge config with .flow file settings.
 * .flow file values take precedence over config.
 */
export function mergeConfig(config, flow) {
  return {
    ...config,
    browser:  flow.browser  ?? config.browser,
    headless: flow.headless ?? config.headless,
    timeout:  flow.timeout  ?? config.timeout,
    retries:  flow.retries  ?? config.retries,
    on_fail:  flow.on_fail  ?? config.on_fail,
    viewport: flow.viewport ?? config.viewport,
  };
}
