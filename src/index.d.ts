/**
 * @promptqa/plaintest — TypeScript type definitions
 */

// ─── Core data shapes ─────────────────────────────────────────────────────────

export interface FlowStep {
  index: number;
  raw: string;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Parsed .flow file — fields that aren't set in YAML are null (defaults applied by mergeConfig). */
export interface Flow {
  name: string;
  url: string | null;
  browser: 'chromium' | 'firefox' | 'webkit' | null;
  headless: boolean | null;
  timeout: number | null;
  retries: number | null;
  on_fail: 'screenshot' | 'continue' | 'stop' | null;
  viewport: Viewport | null;
  tags: string[];
  steps: FlowStep[];
  filePath: string;
}

/** Interpreted action produced by interpretStep(). */
export interface InterpretedStep {
  action: string;
  url?: string;
  target?: string;
  field?: string;
  value?: string;
  option?: string;
  label?: string;
  key?: string;
  text?: string;
  selector?: string;
  ms?: number;
  name?: string | null;
  message?: string;
  raw?: string;
}

/** Per-step result returned by executeFlow(). */
export interface StepResult {
  index: number;
  raw: string;
  interpreted: InterpretedStep;
  passed: boolean;
  error: string | null;
  screenshot: string | null;
  duration: number;
}

/** Full result for one .flow file execution. */
export interface FlowResult {
  name: string;
  filePath: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  steps: StepResult[];
  browser: string;
  tags: string[];
  /** Present only when the file failed to parse before execution. */
  error?: string;
}

/** Aggregated result returned by run(). */
export interface RunResult {
  passed: number;
  failed: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface PlaintestConfig {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  timeout?: number;
  retries?: number;
  on_fail?: 'screenshot' | 'continue' | 'stop';
  outputDir?: string;
  viewport?: Viewport;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a .flow YAML file into a structured Flow object.
 * Config-overridable fields (browser, headless, timeout, retries, on_fail, viewport)
 * are null when not explicitly set — call mergeConfig() to apply defaults.
 */
export function parseFlow(filePath: string): Flow;

/**
 * Execute a parsed Flow against a real Playwright browser.
 * The flow should have been merged with config via mergeConfig() first.
 */
export function executeFlow(
  flow: Flow,
  opts?: { outputDir?: string }
): Promise<FlowResult>;

/**
 * Interpret a single plain-English step string into an action object.
 */
export function interpretStep(raw: string): InterpretedStep;

/**
 * Validate a parsed flow before execution.
 * Returns errors (blocking) and warnings (advisory).
 */
export function validateFlow(flow: Flow): ValidationResult;

/**
 * Format a ValidationResult into a human-readable string for terminal output.
 */
export function formatValidation(flow: Flow, result: ValidationResult): string;

/**
 * Export a parsed Flow to a Playwright .spec.ts file.
 * Returns the path of the generated file.
 */
export function exportToPlaywright(flow: Flow, outputDir?: string): string;

/**
 * Write an HTML test report to disk.
 */
export function renderReport(
  results: FlowResult[],
  outputPath: string,
  suiteDuration: number
): void;

/**
 * Load plaintest.config.js from the given directory (defaults to cwd).
 * Falls back to built-in defaults if no config file is present.
 */
export function loadConfig(cwd?: string): Promise<Required<PlaintestConfig>>;

/**
 * Merge project config with per-flow overrides.
 * Flow values take precedence; null flow values fall back to config values.
 */
export function mergeConfig(
  config: PlaintestConfig,
  flow: Flow
): Required<PlaintestConfig>;

/**
 * Run one or more .flow files from the CLI args array.
 * This is the same function invoked by `plaintest run`.
 */
export function run(
  args: string[],
  opts?: { export?: boolean }
): Promise<RunResult>;
