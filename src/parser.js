import fs from 'fs';
import path from 'path';
import { parseYaml } from './yaml.js';

/**
 * Parse a .flow file into a structured test definition
 * 
 * .flow file format:
 *   url: https://example.com
 *   name: My test name
 *   tags: [smoke, auth]
 *   browser: chromium | firefox | webkit
 *   headless: true | false
 *   timeout: 30000
 *   retries: 0
 *   viewport: { width: 1280, height: 720 }
 *   on_fail: screenshot | continue | stop
 *   steps:
 *     - navigate to the login page
 *     - fill email with "user@test.com"
 *     - click Sign in
 *     - assert heading says "Welcome"
 */
export function parseFlow(filePath) {
  // Validate the path is a real .flow file before reading
  const resolved = path.resolve(filePath);
  if (!resolved.endsWith('.flow')) {
    throw new Error(`Invalid file: "${filePath}" — must be a .flow file`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: "${filePath}"`);
  }

  const raw  = fs.readFileSync(resolved, 'utf8');
  const data = parseYaml(raw);

  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid .flow file: ${filePath}`);
  }

  if (!data.steps || !Array.isArray(data.steps)) {
    throw new Error(`Missing "steps" array in: ${filePath}`);
  }

  return {
    name:     data.name     || path.basename(filePath, '.flow'),
    url:      data.url      || null,
    browser:  data.browser  || 'chromium',
    headless: data.headless !== false,
    timeout:  data.timeout  || 30000,
    retries:  data.retries  || 0,
    tags:     data.tags     || [],
    viewport: data.viewport || { width: 1280, height: 720 },
    on_fail:  data.on_fail  || 'screenshot',
    steps:    data.steps.map((s, i) => ({
      index: i,
      raw:   String(s).trim(),
    })),
    filePath,
  };
}
