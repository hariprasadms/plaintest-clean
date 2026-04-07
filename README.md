<div align="center">

# plaintest

**Plain English test framework. Write tests anyone can read. Runs on Playwright.**

```bash
npx plaintest init
npx plaintest run login.flow
```

[![MIT License](https://img.shields.io/badge/licence-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Built with Playwright](https://img.shields.io/badge/engine-Playwright-blueviolet.svg)](https://playwright.dev)
[![by PromptQA](https://img.shields.io/badge/by-PromptQA-purple.svg)](https://promptqa.dev)

</div>

---

## Why plaintest?

Playwright is excellent. But it requires TypeScript, selectors, and async/await knowledge — which means only developers write tests.

`plaintest` lets **anyone on the team** write tests in plain English YAML. The framework handles all the Playwright code generation under the hood.

```yaml
# login.flow
name: User login journey
url: https://myapp.com

steps:
  - navigate to https://myapp.com/login
  - fill email with "user@example.com"
  - fill password with "password123"
  - click Sign in
  - assert heading says "Welcome back"
  - assert url contains "/dashboard"
  - take screenshot
```

```bash
$ plaintest run login.flow

  plaintest v0.1.0
  Running 1 flow file

  User login journey

    ✓ navigate to https://myapp.com/login          812ms
    ✓ fill email with "user@example.com"           204ms
    ✓ fill password with "password123"             118ms
    ✓ click Sign in                                341ms
    ✓ assert heading says "Welcome back"            93ms
    ✓ assert url contains "/dashboard"              41ms
    ✓ take screenshot                              220ms

  ✓ 7 passed  ·  1.8s

  Report → .plaintest/report.html
```

---

## Quick start

```bash
# Requires Node.js 18+

# 1. Install
npm install -g plaintest

# 2. Install Playwright browser (first time only)
npx playwright install chromium

# 3. Create your first test
plaintest init

# 4. Run it
plaintest run example.flow
```

Or use without installing globally:

```bash
npx plaintest init
npx plaintest run example.flow
```

---

## All commands

| Command | What it does |
|---|---|
| `plaintest init` | Create a sample `example.flow` file |
| `plaintest run <file>` | Run a `.flow` test file |
| `plaintest run --dir ./tests` | Run all `.flow` files in a folder |
| `plaintest run <file> --export` | Run and export to `.spec.ts` |
| `plaintest export <file>` | Export `.flow` → Playwright `.spec.ts` |
| `plaintest validate <file>` | Validate a `.flow` file without running |
| `plaintest --help` | Show help |

---

## The `.flow` format

```yaml
# Required
name: My test name
steps:
  - navigate to https://example.com
  - click Sign in
  - assert heading says "Welcome"

# Optional
url: https://myapp.com          # base URL
browser: chromium               # chromium | firefox | webkit
headless: true                  # true | false
timeout: 30000                  # ms per step
retries: 0                      # retry failed tests N times
on_fail: screenshot             # screenshot | continue | stop
tags: [smoke, auth]             # for filtering and reporting
viewport: { width: 1280, height: 720 }
```

---

## Step reference

### Navigation
```
navigate to https://example.com
go to https://example.com/login
reload the page
go back
go forward
```

### Actions
```
click Sign in
click the Submit button
click the Accept link
double click Edit
fill email with "user@example.com"
fill postcode with "SW1A 1AA"
type "hello" into search
clear search
select "Option 1" from Dropdown
check Remember me
uncheck Terms and conditions
press Enter
press Tab
hover over Menu
scroll to Footer
```

### Assertions
```
assert heading says "Welcome back"
assert text "Success" is visible
assert text "Error message" is not visible
assert url contains "/dashboard"
assert url is "https://example.com/home"
assert title is "My App"
assert email has value "user@example.com"
assert button "Submit" is disabled
assert button "Submit" is enabled
assert page contains "Order confirmed"
assert element "#modal" exists
assert element ".error" does not exist
```

### Waits
```
wait 2 seconds
wait for "Loading..." to disappear
wait for "Success" to appear
wait for network
```

### Utilities
```
take screenshot
take screenshot "after-login"
log "reached checkout page"
```

---

## Configuration file

Create `plaintest.config.js` in your project root for shared defaults:

```js
// plaintest.config.js
export default {
  browser:  'chromium',
  headless: true,
  timeout:  30000,
  retries:  1,
  on_fail:  'screenshot',
  outputDir: '.plaintest',
  viewport: { width: 1280, height: 720 },
};
```

Individual `.flow` files override these defaults.

---

## Export to Playwright

Any `.flow` file can be exported as a real Playwright `.spec.ts` file:

```bash
plaintest export login.flow
# → .plaintest/login.spec.ts
```

The exported file runs directly with `npx playwright test`. No plaintest required.

This means you can:
- Start writing tests in `.flow` format
- Export to `.spec.ts` once the tests are stable
- Run them in your existing Playwright/CI setup

---

## CI integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install plaintest
        run: npm install -g plaintest

      - name: Install browser
        run: npx playwright install chromium --with-deps

      - name: Run tests
        run: plaintest run --dir ./tests

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: plaintest-report
          path: .plaintest/report.html
```

### Exit codes

| Code | Meaning |
|---|---|
| `0` | All tests passed |
| `1` | One or more tests failed |

---

## Use with PromptQA

[PromptQA](https://promptqa.dev) generates `.flow` files from natural language and runs them in the cloud.

```
You describe a test in plain English
  → PromptQA generates the .flow file
    → plaintest runs it locally (free, unlimited)
      → PromptQA runs it on cloud browsers (with AI healing)
```

The `.flow` format is the same in both — local and cloud.

---

## Architecture

```
login.flow  →  parser  →  interpreter  →  executor  →  reporter
  (YAML)       (read)    (English→intent)  (Playwright)  (HTML)
```

- **parser** — reads `.flow` YAML, validates structure
- **interpreter** — maps each English step to a typed intent object
- **executor** — runs intents against a real Playwright browser
- **reporter** — generates HTML report with step results and screenshots
- **exporter** — converts `.flow` files to Playwright `.spec.ts`
- **validator** — checks `.flow` files for errors before running

---

## Project structure

```
plaintest/
├── bin/
│   └── plaintest.js        CLI entry point
├── src/
│   ├── colors.js           Inline ANSI colour support (zero deps)
│   ├── yaml.js             Inline YAML parser (zero deps)
│   ├── parser.js           .flow file parser
│   ├── interpreter.js      English → Playwright intent mapper
│   ├── executor.js         Playwright browser runner
│   ├── reporter.js         HTML report generator
│   ├── exporter.js         .flow → .spec.ts exporter
│   ├── validator.js        .flow file validator
│   ├── runner.js           Orchestrator
│   ├── init.js             plaintest init command
│   └── index.js            Public API
├── examples/
│   ├── login.flow
│   └── form.flow
├── tests/
│   └── unit.test.js        66 unit tests (no browser needed)
├── package.json
└── README.md
```

---

## Roadmap

- [ ] AI step resolver — Claude resolves ambiguous steps via live DOM
- [ ] `--filter` flag — run only tests matching a tag (`--filter smoke`)
- [ ] Parallel execution — run multiple `.flow` files simultaneously
- [ ] Watch mode — re-run on file change
- [ ] JUnit XML output — for CI integrations
- [ ] BrowserScript integration — record flows visually, export as `.flow`
- [ ] PromptQA cloud runner — run `.flow` files on remote browsers

---

## Contributing

```bash
git clone https://github.com/promptqa/plaintest
cd plaintest
npm install
node tests/unit.test.js   # run unit tests (no browser needed)
node bin/plaintest.js init
```

Issues, PRs and feature suggestions welcome.

---

## Licence

MIT © [PromptQA](https://promptqa.dev)

