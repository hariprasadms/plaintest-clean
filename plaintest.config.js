// plaintest.config.js — project-level defaults for all .flow files
// Place this in your project root. Individual .flow files override these.

export default {
  // Browser to use: chromium | firefox | webkit
  browser: 'chromium',

  // Run headless (no visible browser window)
  headless: true,

  // Timeout per step in milliseconds
  timeout: 30000,

  // Retry failed tests N times before marking as failed
  retries: 0,

  // What to do when a step fails: screenshot | continue | stop
  on_fail: 'screenshot',

  // Output directory for reports and screenshots
  outputDir: '.plaintest',

  // Default viewport size
  viewport: { width: 1280, height: 720 },
};
