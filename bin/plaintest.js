#!/usr/bin/env node
import { run }                            from '../src/runner.js';
import { init }                           from '../src/init.js';
import { exportToPlaywright }             from '../src/exporter.js';
import { validateFlow, formatValidation } from '../src/validator.js';
import { parseFlow }                      from '../src/parser.js';
import pc                                 from '../src/colors.js';
import path                               from 'path';
import fs                                 from 'fs';
import { fileURLToPath }                  from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

const args = process.argv.slice(2);
const cmd  = args[0];
const rest = args.slice(1);

const BANNER = `
  ${pc.bold(pc.magenta('plaintest'))} ${pc.dim(`v${version}`)} — plain English test runner
  ${pc.dim('by PromptQA · MIT licence · github.com/promptqa/plaintest')}
`;

if (!cmd || cmd === '--help' || cmd === '-h') {
  console.log(BANNER);
  console.log(`  ${pc.bold('Usage:')}
    ${pc.cyan('plaintest run')} ${pc.dim('[file.flow | --dir ./tests]')}            Run .flow test files
    ${pc.cyan('plaintest run')} ${pc.dim('--filter <tag>')}                          Run only flows matching a tag
    ${pc.cyan('plaintest run')} ${pc.dim('--export')}                                Run and export .spec.ts
    ${pc.cyan('plaintest export')} ${pc.dim('[file.flow ...]')}                      Export .flow to Playwright .spec.ts
    ${pc.cyan('plaintest validate')} ${pc.dim('[file.flow ...]')}                    Validate .flow files
    ${pc.cyan('plaintest init')}                                          Create a sample .flow file
    ${pc.cyan('plaintest --help')}                                        Show this help

  ${pc.bold('Examples:')}
    ${pc.dim('$')} plaintest run login.flow
    ${pc.dim('$')} plaintest run --dir ./tests
    ${pc.dim('$')} plaintest run --filter smoke
    ${pc.dim('$')} plaintest export login.flow
    ${pc.dim('$')} plaintest validate *.flow
    ${pc.dim('$')} plaintest init
  `);
  process.exit(0);
}

if (cmd === 'init') {
  await init();
  process.exit(0);
}

if (cmd === 'run') {
  const exportFlag = rest.includes('--export');
  const runArgs    = rest.filter(a => a !== '--export');
  const result     = await run(runArgs, { export: exportFlag });
  process.exit(result.failed > 0 ? 1 : 0);
}

if (cmd === 'export') {
  const files = resolveGlob(rest);
  if (!files.length) { console.error(pc.red('No .flow files found.')); process.exit(1); }
  console.log('\n  ' + pc.bold(pc.magenta('plaintest')) + ' ' + pc.dim('export') + '\n');
  for (const f of files) {
    try {
      const flow = parseFlow(f);
      const out  = exportToPlaywright(flow);
      console.log('  ' + pc.green('✓') + ' ' + pc.white(flow.name));
      console.log('    ' + pc.dim('→ ' + out));
    } catch (err) {
      console.log('  ' + pc.red('✕') + ' ' + f + ' — ' + err.message);
    }
  }
  console.log();
  process.exit(0);
}

if (cmd === 'validate') {
  const files = resolveGlob(rest);
  if (!files.length) { console.error(pc.red('No .flow files found.')); process.exit(1); }
  console.log('\n  ' + pc.bold(pc.magenta('plaintest')) + ' ' + pc.dim('validate') + '\n');
  let anyInvalid = false;
  for (const f of files) {
    try {
      const flow   = parseFlow(f);
      const result = validateFlow(flow);
      const lines  = formatValidation(flow, result).split('\n');
      if (!result.valid) anyInvalid = true;
      console.log('  ' + (result.valid ? pc.green(lines[0]) : pc.red(lines[0])));
      for (const l of lines.slice(1)) {
        const c = l.includes('[error]') ? pc.red : l.includes('[warning]') ? pc.yellow : pc.dim;
        console.log('  ' + c(l));
      }
      console.log();
    } catch (err) {
      console.log('  ' + pc.red('✕') + ' ' + f + ' — ' + err.message + '\n');
      anyInvalid = true;
    }
  }
  process.exit(anyInvalid ? 1 : 0);
}

console.error(pc.red('Unknown command: ' + cmd));
console.error('Run ' + pc.cyan('plaintest --help') + ' for usage');
process.exit(1);

function resolveGlob(args) {
  const files = [];
  const plain = args.filter(a => !a.startsWith('-'));
  for (const p of plain) {
    if (p.includes('*')) {
      const dir = path.dirname(p) === '.' ? '.' : path.dirname(p);
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).sort().filter(e => e.endsWith('.flow'))
          .forEach(e => files.push(path.join(dir, e)));
      }
    } else if (fs.existsSync(p)) {
      files.push(p);
    }
  }
  if (!files.length) {
    fs.readdirSync('.').filter(e => e.endsWith('.flow')).sort()
      .forEach(e => files.push(e));
  }
  return [...new Set(files)];
}
