# Changelog

All notable changes to `@promptqa/plaintest` will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.1] — 2026-04-07

### Fixed
- `plaintest.config.js` values for `browser`, `headless`, `timeout`, `retries`, `on_fail`, `viewport` were silently ignored — flow files always used built-in defaults instead of config file values
- `plaintest run <file>` always reported "No .flow files found" — `--filter` arg parsing dropped the first argument when `--filter` was not used
- Exporter generated invalid TypeScript for assertions with non-default timeouts (comma expression placed outside function call)
- Exporter called `.toBeVisible()` twice on `assert heading` steps when timeout was non-default
- Exporter silently dropped tags — `tagAnnotation` was computed but never written into the `test()` call; tags are now emitted as `{ tag: ['@smoke'] }` Playwright annotations
- Exporter omitted `waitUntil: 'domcontentloaded'` from `page.goto()` calls when using the default timeout
- `select "..." from <field>` timed out on unlabelled `<select>` elements; now falls back to matching by `id`, `name`, and `title` attributes
- `plaintest.config.js` failed to load on Windows — `import()` of absolute paths requires `pathToFileURL()`
- `upload` step documented in interpreter but never implemented — removed from docs until implemented
- Version string hardcoded in `bin/plaintest.js` and `runner.js` — both now read from `package.json`
- `process.exit(1)` placed mid-file in unit tests caused exporter, validator, YAML, and colours suites to never run on earlier failures

### Added
- TypeScript type definitions (`src/index.d.ts`) for all public API shapes and exported functions
- `--filter` flag documented in `plaintest --help`
- `mergeConfig` test suite covering config-file and flow-file value precedence

---

## [0.1.0] — 2026-04-07

### Added
- Initial release
- `.flow` plain English YAML test format
- `plaintest run` — execute `.flow` files against a real browser
- `plaintest validate` — validate `.flow` files without running
- `plaintest export` — export `.flow` → Playwright `.spec.ts`
- `plaintest init` — scaffold a sample `.flow` file
- `--dir` flag — run all `.flow` files in a directory
- `--export` flag — run and export in one step
- `--filter` flag — run only tests matching a tag
- HTML test report with pass/fail per step and screenshots
- Inline YAML parser — zero external dependencies for CLI commands
- Inline ANSI colour support — zero external dependencies for CLI commands
- `plaintest.config.js` project-level configuration support
- 66 unit tests covering parser, interpreter, exporter, validator, YAML, and colours
- GitHub Actions workflow for automated npm publish on tag push

### Supported step types
- Navigation: `navigate to`, `go to`, `reload`, `go back`, `go forward`
- Actions: `click`, `double click`, `fill`, `type`, `clear`, `select`, `check`, `uncheck`, `press`, `hover`, `scroll`
- Assertions: `assert heading`, `assert text visible/hidden`, `assert url`, `assert title`, `assert value`, `assert enabled/disabled`, `assert page contains`, `assert element exists`
- Waits: `wait N seconds`, `wait for text to appear/disappear`, `wait for network`
- Utilities: `take screenshot`, `log`
