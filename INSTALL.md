# Installing plaintest

## Option A — Run setup script (recommended)

```bash
cd plaintest-clean
node setup.js
```

This installs dependencies, downloads the Chromium browser, and links `plaintest` globally.

---

## Option B — Manual setup

```bash
cd plaintest-clean

# 1. Install dependencies
npm install

# 2. Install Playwright browser
npx playwright install chromium

# 3. Link globally so you can run 'plaintest' from anywhere
npm link
```

---

## Option C — Use without global install

If `npm link` fails (permissions issue), run plaintest directly:

```bash
cd plaintest-clean
node bin/plaintest.js init
node bin/plaintest.js run example.flow
```

Or add a shell alias to your `~/.zshrc` or `~/.bashrc`:

```bash
alias plaintest="node /path/to/plaintest-clean/bin/plaintest.js"
```

---

## Verify it works

```bash
plaintest --help
plaintest init
plaintest run example.flow
```

---

## Requirements

- Node.js 18 or higher
- macOS, Linux, or Windows

---

## Troubleshooting

**`Cannot find package 'picocolors'`**  
You haven't run `npm install` yet. Run `node setup.js` or `npm install` first.

**`npx playwright install chromium` fails**  
You may be behind a firewall or proxy. Try:
```bash
PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net npx playwright install chromium
```

**`npm link` requires sudo**  
Either use `sudo npm link` or use Option C above.
