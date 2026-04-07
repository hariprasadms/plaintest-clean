#!/usr/bin/env node
/**
 * plaintest setup script
 * Run this once after unzipping: node setup.js
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

console.log('\n  plaintest setup\n');

// 1 — npm install
console.log('  [1/3] Installing dependencies...');
try {
  execSync('npm install', { cwd: __dirname, stdio: 'pipe' });
  console.log('        ✓ Done\n');
} catch (e) {
  console.error('        ✕ npm install failed:', e.message);
  process.exit(1);
}

// 2 — Playwright browser
console.log('  [2/3] Installing Playwright Chromium browser...');
try {
  execSync('npx playwright install chromium', { cwd: __dirname, stdio: 'pipe' });
  console.log('        ✓ Done\n');
} catch (e) {
  console.log('        ⚠ Browser install failed — try manually:');
  console.log('          npx playwright install chromium\n');
}

// 3 — chmod on mac/linux
if (!isWin) {
  try {
    execSync('chmod +x bin/plaintest.js', { cwd: __dirname });
  } catch (_) {}
}

// 4 — npm link (optional)
console.log('  [3/3] Linking plaintest globally (needs sudo on some systems)...');
try {
  execSync('npm link', { cwd: __dirname, stdio: 'pipe' });
  console.log('        ✓ plaintest is now available globally\n');
} catch (e) {
  console.log('        ⚠ Global link failed — use local instead:');
  console.log('          node bin/plaintest.js <command>\n');
}

console.log('  ─────────────────────────────────────────');
console.log('  Ready! Try it:\n');
console.log('    plaintest init');
console.log('    plaintest run example.flow');
console.log('    plaintest --help\n');
