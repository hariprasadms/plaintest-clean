import { parseFlow } from './parser.js';
import { executeFlow } from './executor.js';
import { renderReport } from './reporter.js';
import { exportToPlaywright } from './exporter.js';
import { loadConfig, mergeConfig } from './config.js';
import pc from './colors.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

export async function run(args, opts = {}) {
  const projectConfig = await loadConfig();
  const outputDir = projectConfig.outputDir || '.plaintest';
  fs.mkdirSync(outputDir, { recursive: true });

  // Extract --filter tag
  const filterIdx = args.indexOf('--filter');
  const filterTag = filterIdx > -1 ? args[filterIdx + 1] : null;
  const cleanArgs = filterIdx > -1
    ? args.filter((_, i) => i !== filterIdx && i !== filterIdx + 1)
    : [...args];

  // Resolve file list from args
  const files = await resolveFiles(cleanArgs);

  if (files.length === 0) {
    console.error(pc.red('No .flow files found.'));
    console.error(`Usage: ${pc.cyan('plaintest run <file.flow | --dir ./tests>')}`);
    return { passed: 0, failed: 1 };
  }

  console.log(`\n  ${pc.bold(pc.magenta('plaintest'))} ${pc.dim(`v${version}`)}`);
  if (filterTag) console.log(`  ${pc.dim(`Filter: tag=${filterTag}`)}`);
  console.log(`  ${pc.dim(`Running ${files.length} flow file${files.length > 1 ? 's' : ''}`)}\n`);

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;
  const suiteStart = Date.now();

  for (const filePath of files) {
    let flow;
    try {
      const rawFlow = parseFlow(filePath);
      flow = { ...rawFlow, ...mergeConfig(projectConfig, rawFlow) };
    } catch (err) {
      console.error(`  ${pc.red('✕')} ${pc.dim(filePath)}`);
      console.error(`    ${pc.red(`Parse error: ${err.message}`)}\n`);
      totalFailed++;
      results.push({ name: filePath, filePath, passed: 0, failed: 1, total: 0, steps: [], duration: 0, error: err.message });
      continue;
    }

    // Skip flows that don't match the tag filter
    if (filterTag && flow.tags?.length) {
      if (!flow.tags.includes(filterTag)) {
        console.log(`  ${pc.dim(`⊘ ${flow.name} — skipped (tag=${filterTag} not matched)`)}\n`);
        continue;
      }
    } else if (filterTag && !flow.tags?.length) {
      console.log(`  ${pc.dim(`⊘ ${flow.name} — skipped (no tags defined)`)}\n`);
      continue;
    }

    console.log(`  ${pc.bold(pc.white(flow.name))}`);
    if (flow.tags.length) console.log(`  ${pc.dim(`tags: [${flow.tags.join(', ')}]`)}`);
    console.log();

    const retries = flow.retries || 0;
    let result;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        console.log(`  ${pc.yellow(`↻ Retry ${attempt}/${retries}`)}`);
      }

      result = await executeFlow(flow, { outputDir });

      // Print step results live
      for (const step of result.steps) {
        const icon = step.passed ? pc.green('✓') : pc.red('✕');
        const name = step.passed ? pc.white(step.raw) : pc.red(step.raw);
        const time = pc.dim(`${step.duration}ms`);
        console.log(`    ${icon} ${name}  ${time}`);
        if (step.error) {
          const shortErr = step.error.split('\n')[0].slice(0, 120);
          console.log(`      ${pc.dim(shortErr)}`);
        }
      }

      if (result.failed === 0) break;
    }

    const statusLine = result.failed === 0
      ? pc.green(`  ✓ ${result.passed} passed`)
      : pc.red(`  ✕ ${result.failed} failed`) + pc.dim(`, ${result.passed} passed`);

    console.log(`\n  ${statusLine}  ${pc.dim(`${result.duration}ms`)}\n`);

    // Playwright export if --export flag set
    if (opts.export) {
      try {
        const specPath = exportToPlaywright(flow, outputDir);
        console.log(`  ${pc.dim(`Exported → ${specPath}`)}`);
      } catch (err) {
        console.log(`  ${pc.yellow(`Export warning: ${err.message}`)}`);
      }
    }

    totalPassed += result.passed;
    totalFailed += result.failed;
    results.push(result);
  }

  const suiteDuration = Date.now() - suiteStart;

  // Summary
  const line = totalFailed === 0
    ? pc.green(`  Tests: ${totalPassed} passed`)
    : pc.red(`  Tests: ${totalFailed} failed`) + pc.dim(`, ${totalPassed} passed`);

  console.log(`${'─'.repeat(50)}`);
  console.log(line + pc.dim(`  ·  ${suiteDuration}ms`));

  // HTML report
  const reportPath = path.join(outputDir, 'report.html');
  renderReport(results, reportPath, suiteDuration);
  console.log(`\n  ${pc.dim(`Report → ${reportPath}`)}`);

  // Playwright export hint
  console.log(`  ${pc.dim(`Exports → ${outputDir}/*.spec.ts  (run with --export flag)`)}\n`);

  return { passed: totalPassed, failed: totalFailed };
}

async function resolveFiles(args) {
  const files = [];

  let dirMode = false;
  let dirPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' || args[i] === '-d') {
      dirMode = true;
      dirPath = args[++i];
    }
  }

  if (dirMode && dirPath) {
    files.push(...findFlowFiles(dirPath));
    return files;
  }

  // Remaining args — files or simple glob patterns (*.flow)
  const patterns = args.filter(a => !a.startsWith('--') && !a.startsWith('-'));

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      // Simple *.flow glob in a directory
      const dir  = path.dirname(pattern) === '.' ? '.' : path.dirname(pattern);
      const ext  = '.flow';
      files.push(...findFlowFiles(dir, false));
    } else {
      files.push(pattern);
    }
  }

  // Default: look for *.flow in current directory
  if (files.length === 0) {
    files.push(...findFlowFiles('.', false));
  }

  return [...new Set(files)].sort();
}

function findFlowFiles(dir, recursive = true) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && recursive && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      found.push(...findFlowFiles(full, recursive));
    } else if (entry.isFile() && entry.name.endsWith('.flow')) {
      found.push(full);
    }
  }
  return found.sort();
}
