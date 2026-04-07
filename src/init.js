import fs from 'fs';
import pc from './colors.js';

export async function init() {
  const filename = 'example.flow';

  if (fs.existsSync(filename)) {
    console.log(pc.yellow(`  ${filename} already exists — not overwriting.`));
    return;
  }

  const sample = `# Example plaintest flow file
# Run with: npx plaintest run example.flow

name: Example — search and assert
url: https://playwright.dev
browser: chromium
headless: true
timeout: 30000
retries: 0
on_fail: screenshot
tags: [example, smoke]

steps:
  - navigate to https://playwright.dev
  - assert heading says "Playwright"
  - assert text "enables reliable" is visible
  - assert url contains "playwright.dev"
  - take screenshot "homepage"
`;

  fs.writeFileSync(filename, sample, 'utf8');

  console.log(`
  ${pc.green('✓')} Created ${pc.bold(filename)}

  Run it:
    ${pc.cyan('npx plaintest run example.flow')}

  Supported step patterns:
    ${pc.dim('navigate to https://...')}
    ${pc.dim('fill email with "user@test.com"')}
    ${pc.dim('click Sign in')}
    ${pc.dim('assert heading says "Welcome"')}
    ${pc.dim('assert url contains "/dashboard"')}
    ${pc.dim('take screenshot')}
    ${pc.dim('wait 2 seconds')}
    ${pc.dim('... and many more')}

  Full docs: ${pc.cyan('https://github.com/promptqa/plaintest')}
  `);
}
