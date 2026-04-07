# Changelog

All notable changes to `@promptqa/plaintest` will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
