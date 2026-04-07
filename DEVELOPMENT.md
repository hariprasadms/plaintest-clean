# Development Guide — @promptqa/plaintest

Everything you need to go from unzip → develop → test → publish, all from VS Code.

---

## 1. First-time setup

### Unzip and open in VS Code

```bash
cd ~/Downloads
unzip plaintest-v0.1.0.zip
mv plaintest-clean plaintest
code plaintest
```

VS Code opens. You'll see a notification **"Do you want to install recommended extensions?"** — click **Install All**. This installs GitLens, Prettier, ESLint, and YAML support.

### Install dependencies

Open the integrated terminal (`Ctrl+` `` ` `` on Mac: `Cmd+` `` ` ``):

```bash
npm install
```

This installs `@playwright/test` — the only dependency.

### Install Playwright browser (once only)

```bash
npx playwright install chromium
```

Downloads ~130MB Chromium. Only needed to run `.flow` tests against a real browser.

### Verify everything works

```bash
npm test
```

Expected output: `✓ 66/66 tests passed`

---

## 2. Project structure

```
plaintest/
│
├── bin/
│   └── plaintest.js          ← CLI entry point — the command users run
│
├── src/
│   ├── colors.js             ← ANSI terminal colours (inlined, zero deps)
│   ├── config.js             ← loads plaintest.config.js from project root
│   ├── executor.js           ← drives Playwright — the browser runner
│   ├── exporter.js           ← converts .flow → Playwright .spec.ts
│   ├── index.js              ← public API — what gets imported by users
│   ├── init.js               ← plaintest init command
│   ├── interpreter.js        ← maps English steps → typed intent objects ← main logic
│   ├── parser.js             ← reads .flow YAML files
│   ├── reporter.js           ← generates HTML test report
│   ├── runner.js             ← orchestrates: parse → execute → report
│   ├── validator.js          ← checks .flow files for errors pre-run
│   └── yaml.js               ← YAML parser (inlined, zero deps)
│
├── examples/
│   ├── login.flow            ← demo test — login journey
│   └── form.flow             ← demo test — form inputs
│
├── tests/
│   └── unit.test.js          ← 66 unit tests (no browser, no network)
│
├── .github/
│   └── workflows/
│       └── ci.yml            ← GitHub Actions: test on push, publish on tag
│
├── .vscode/
│   ├── extensions.json       ← recommended extensions
│   ├── launch.json           ← debug run configurations
│   └── settings.json         ← editor settings
│
├── .gitignore                ← excludes node_modules, .plaintest, .env
├── .npmignore                ← excludes tests/, setup.js from npm publish
├── CHANGELOG.md              ← version history
├── LICENSE                   ← MIT
├── README.md                 ← public documentation
├── SECURITY.md               ← how to report vulnerabilities
├── package.json              ← package config + npm scripts
└── plaintest.config.js       ← example project-level config
```

**Start here when adding a new feature:** `src/interpreter.js` is where new step patterns go. `tests/unit.test.js` is where you write the test for it first.

---

## 3. Running and debugging in VS Code

### Run tests (no browser needed)

```bash
npm test
```

Or use the **Run and Debug panel** (`Cmd+Shift+D`):
- Select **"Run unit tests"** from the dropdown → press `F5`
- Output appears in the integrated terminal
- Set breakpoints in any `src/*.js` file — they'll be hit

### Run a specific command

From the terminal:

```bash
node bin/plaintest.js --help
node bin/plaintest.js init
node bin/plaintest.js validate examples/login.flow
node bin/plaintest.js export examples/login.flow
node bin/plaintest.js run examples/login.flow     # needs Playwright installed
```

Or use the **Run and Debug panel** — all five commands are pre-configured as launch configs in `.vscode/launch.json`.

### NPM Scripts panel

In the Explorer sidebar, scroll down to **NPM SCRIPTS** — you'll see:

| Script | What it runs |
|---|---|
| `test` | `node tests/unit.test.js` — 66 unit tests |
| `validate` | validates both example .flow files |
| `export` | exports login.flow → .spec.ts |
| `setup` | installs deps + Playwright browser |

Click the ▶ play button next to any script to run it.

---

## 4. Adding a new step type

This is the most common development task. Example: adding `"hover and click {target}"`.

**Step 1 — Write the test first** (`tests/unit.test.js`):

```javascript
test('hover and click element', () => {
  const r = interpretStep('hover and click Menu');
  expect(r.action).toBe('hoverClick');
  expect(r.target).toBe('Menu');
});
```

Run `npm test` — it will fail (red). That's expected.

**Step 2 — Add the pattern** (`src/interpreter.js`):

Find the `// ─── HOVER ───` section and add below it:

```javascript
// hover and click
{
  const m = s.match(/^hover\s+and\s+click\s+(?:the\s+)?(.+)$/i);
  if (m) return { action: 'hoverClick', target: m[1].trim() };
}
```

**Step 3 — Add the executor action** (`src/executor.js`):

Find the `if (t === 'hover')` block and add:

```javascript
if (t === 'hoverClick') {
  const loc = resolveTarget(page, step.target);
  await loc.hover();
  await loc.click();
  return;
}
```

**Step 4 — Add the exporter** (`src/exporter.js`):

In the `stepToTs` switch statement:

```javascript
case 'hoverClick':
  return `await ${resolveLocatorTs('page', s.target)}.hover();\nawait ${resolveLocatorTs('page', s.target)}.click();`;
```

**Step 5 — Run tests again:**

```bash
npm test
```

Should now show green. All 67 tests passing.

**Step 6 — Update the README** — add the new step to the step reference table.

---

## 5. Git version control in VS Code

### Initialise the repo

In the integrated terminal:

```bash
git init
git add .
git commit -m "feat: initial release @promptqa/plaintest v0.1.0"
```

Or in VS Code:
- Click the **Source Control icon** in the left sidebar (looks like a branch)
- Click **"Initialize Repository"**
- Type a commit message → click **✓ Commit**

### Connect to GitHub

1. Create a new **public** repo on github.com named `plaintest`
2. In VS Code terminal:

```bash
git remote add origin https://github.com/YOUR_USERNAME/plaintest.git
git branch -M main
git push -u origin main
```

Or use the VS Code **Source Control** panel → **Publish to GitHub** (requires GitHub extension).

### Daily workflow in VS Code

```
Make changes to src/*.js or tests/
         ↓
Source Control panel shows changed files (blue M badges)
         ↓
Click + to stage files (or "Stage All Changes")
         ↓
Type commit message in the text box
         ↓
Cmd+Enter  to commit
         ↓
Click ↑ (sync button) to push to GitHub
```

### Commit message conventions

```bash
feat: add hoverClick step type
fix: handle empty value in fill step
test: add tests for assertPageContains
docs: update README step reference
chore: bump @playwright/test to 1.53.0
```

---

## 6. Publishing a new version

### Bump version and publish

```bash
# Choose one based on what changed:
npm version patch    # bug fix:     0.1.0 → 0.1.1
npm version minor    # new feature: 0.1.0 → 0.2.0
npm version major    # breaking:    0.1.0 → 1.0.0
```

This automatically:
- Updates `version` in `package.json`
- Creates a git commit: `"1.1.0"`
- Creates a git tag: `"v1.1.0"`

Then push:

```bash
git push && git push --tags
```

**GitHub Actions takes over from here:**
- Runs tests on Node 18, 20, 22
- If all pass AND it's a version tag → publishes to npm automatically
- You can watch it live at: `github.com/YOUR_USERNAME/plaintest/actions`

### Manual publish (if needed)

```bash
npm publish --access public
```

`prepublishOnly` in `package.json` runs `npm test` automatically before publish — if tests fail, publish is blocked.

---

## 7. Setting up npm token in GitHub (one time)

### Create the token

1. Go to **npmjs.com** → profile picture → **Access Tokens**
2. Click **Generate New Token** → **Granular Access Token**
3. Settings:
   ```
   Name:        github-actions-promptqa
   Expiry:      1 year
   Packages:    Read and write
   Scope:       Only @promptqa
   Orgs:        No access
   ```
4. Click **Generate Token** — copy it immediately

### Add to GitHub

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `NPM_TOKEN` / Value: paste your token
4. Save

---

## 8. VS Code extensions installed

| Extension | Why |
|---|---|
| **GitLens** | See who changed each line, commit history inline |
| **Prettier** | Auto-formats JS files on save |
| **ESLint** | Highlights code issues as you type |
| **GitHub Pull Requests** | Manage PRs without leaving VS Code |
| **YAML** | Syntax highlighting for `.flow` and `.yml` files |
| **Code Spell Checker** | Catches typos in comments and strings |

---

## 9. Useful keyboard shortcuts

| Shortcut (Mac) | Action |
|---|---|
| `Cmd+` `` ` `` | Open/close integrated terminal |
| `Cmd+Shift+D` | Open Run and Debug panel |
| `Cmd+Shift+G` | Open Source Control panel |
| `Cmd+Shift+X` | Open Extensions panel |
| `F5` | Run selected debug config |
| `Cmd+Shift+P` | Command palette (search all commands) |
| `Cmd+P` | Quick open file |
| `Cmd+Enter` | Commit (in Source Control panel) |
| `Cmd+Shift+`\` | New terminal |

---

## 10. Quick reference — what each file does

| File | Edit when you want to... |
|---|---|
| `src/interpreter.js` | Add or fix a step pattern |
| `src/executor.js` | Change how a step runs in the browser |
| `src/exporter.js` | Change how a step exports to `.spec.ts` |
| `src/validator.js` | Add a new validation rule for `.flow` files |
| `src/reporter.js` | Change the HTML report design |
| `src/parser.js` | Change how `.flow` files are parsed |
| `src/yaml.js` | Fix a YAML parsing edge case |
| `src/config.js` | Add new config options |
| `src/runner.js` | Change how multiple files are run |
| `bin/plaintest.js` | Add a new CLI command |
| `tests/unit.test.js` | Add tests for any of the above |
| `README.md` | Update public documentation |
| `CHANGELOG.md` | Document changes before each release |
| `package.json` | Update version, deps, or scripts |

---

## 11. Common issues

**`Cannot find package '@playwright/test'`**
```bash
npm install
```

**`Playwright browser not found`**
```bash
npx playwright install chromium
```

**`Tests failing after changes`**
```bash
npm test
# Read the ✕ lines — they show exactly which assertion failed
```

**`npm publish fails`**
```bash
npm login              # re-authenticate
npm test               # make sure tests pass first
npm publish --access public
```

**Port or permission errors on Mac**
```bash
sudo npm link          # if npm link fails
```

---

## 12. Roadmap — what to build next

These are the planned features in priority order:

- [ ] **AI step resolver** — when a step is ambiguous, call Claude API with the live DOM to find the right selector
- [ ] **`--filter` by tag** — `plaintest run --filter smoke`
- [ ] **Parallel execution** — run multiple `.flow` files simultaneously
- [ ] **Watch mode** — `plaintest run --watch` re-runs on file save
- [ ] **JUnit XML output** — for Jenkins / Azure DevOps CI integration
- [ ] **BrowserScript integration** — record browser flows, export as `.flow`
- [ ] **PromptQA cloud runner** — `plaintest run --cloud` sends to PromptQA grid

---

*Built by [PromptQA](https://promptqa.dev) · MIT licence*
