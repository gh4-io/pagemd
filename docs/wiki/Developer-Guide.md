# Developer Guide

Step-by-step guide for contributing to PageMD development.

## Table of Contents

- [Repository Layout](#repository-layout)
- [Local Development Setup](#local-development-setup)
- [Testing](#testing)
- [Build Commands](#build-commands)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Contribution Workflow](#contribution-workflow)
- [Code Style](#code-style)
- [See Also](#see-also)

## Repository Layout

PageMD separates AI/dev context from shipping code:

```
REPO_ROOT/
  context/           # AI prompts, PRPs, research, workflow rules (source of truth)
  progress/          # Handovers, decision logs, prompt outputs
  examples/          # Sample inputs (non-product)
  scripts/           # Dev helpers (setup, build, smoke_test)
  project/           # Product root (only shipping code)
    apps/cli/        # CLI entry (build/validate/list-profiles)
    packages/        # Modular pipeline components
      parser/        # Markdown + frontmatter parsing
      renderer-web/  # HTML assembly
      renderer-pdf/  # Paged.js + Puppeteer orchestration
      exporters/     # Output packaging
      theme-kit/     # Shared styles
    templates/
      profiles/      # Profile manifests (JSON/YAML)
      layouts/       # HTML/CSS layout artifacts
    styles/          # Global CSS (primary.css)
    schemas/         # Validation schemas
    docs/            # User and developer documentation
```

**Key principles:**
- `context/` - AI agent prompts, PRPs (Product Requirement Packet), research notes
- `progress/` - Handover state, decision logs, task status
- `project/` - All shipping code, no dev artifacts
- `scripts/` - PowerShell helpers for build/test/smoke

## Local Development Setup

**Requirements:**
- Node.js 20+
- npm 9+

**Install dependencies:**

```bash
cd project
npm install
```

**Environment:**
- System Chrome preferred; falls back to bundled Chromium
- No additional environment variables required for basic dev

**Performance tip:** Set `PAGEMD_KEEP_CHROME=1` to keep browser alive between PDF renders:
```bash
export PAGEMD_KEEP_CHROME=1  # Linux/macOS
$env:PAGEMD_KEEP_CHROME="1"  # PowerShell
```
Saves ~2-3s per render after the first (browser reuse within same process).

## Testing

PageMD uses Vitest for unit and integration testing.

**Test structure:**
```
project/
  packages/*/tests/    # Package-level unit tests
  tests/integration/   # Cross-package integration tests
```

**Run all tests:**

```bash
npm test
```

**Watch mode (auto-rerun on changes):**

```bash
npm run test:watch
```

**Coverage report:**

```bash
npm run test:coverage
```

**Test conventions:**
- Place tests in `tests/` subdirectory of each package
- Name test files `*.test.js`
- Integration tests go in `project/tests/integration/`
- Always add tests for new features before implementation

## Build Commands

PageMD is a pure JS monorepo with no build step. Packages use source directly (`"main": "src/index.js"`).

**Smoke test:**

```bash
pwsh scripts/smoke_test.ps1
```

**Before committing:**
- Run `npm test` to verify tests pass
- Run `pwsh scripts/smoke_test.ps1` when touching pipeline/CLI/renderer
- Remove dev artifacts: `spike-output/`, experiments

## Branch Naming

Use `gh4-io/<type>/<short-summary>` format:

**Branch types:**
- `gh4-io/feature/...` - new functionality or major refactor
- `gh4-io/bugfix/...` - non-urgent bug fixes
- `gh4-io/hotfix/...` - urgent production patches
- `gh4-io/chore/...` - tooling, deps, CI config
- `gh4-io/docs/...` - documentation-only changes

**Examples:**
```bash
git checkout -b gh4-io/feature/add-yaml-profiles
git checkout -b gh4-io/bugfix/fix-path-resolution
git checkout -b gh4-io/chore/update-dependencies
```

**Push branch:**

```bash
git push -u origin gh4-io/feature/add-yaml-profiles
```

## Commit Messages

Use conventional commit prefixes:

**Format:**

```
<type>: <short summary>

[optional body]
```

**Types:**
- `feat:` - new features
- `fix:` - bug fixes
- `docs:` - documentation
- `chore:` - tooling, deps
- `refactor:` - code restructure
- `test:` - test additions/changes

**Examples:**

```bash
git commit -m "feat: add YAML profile parsing"
git commit -m "fix: resolve template path lookup order"
git commit -m "docs: update wiki Developer-Guide"
git commit -m "chore: bump puppeteer to 24.15.0"
```

## Contribution Workflow

**1. Create feature branch:**

```bash
git checkout -b gh4-io/feature/my-feature
```

**2. Make changes:**
- Read files before editing (never assume contents)
- Edit existing stubs; don't create duplicates
- Max 2 consecutive edits without re-reading
- Update tests for behavior changes

**3. Test and verify:**

```bash
npm test
pwsh scripts/build.ps1
pwsh scripts/smoke_test.ps1
```

**4. Update docs:**

Any change affecting behavior must update:
- `README.md` (if project dynamics change)
- `context/overview.md` (if scope/constraints change)
- `context/prp/PRP_Core.md` (if requirements change)
- `progress/handover.md` (handover state)
- Relevant wiki pages in `project/docs/wiki/`

**5. Clean artifacts:**

Remove before commit:
- `dist/`
- `spike-output/`
- `node_modules/` (gitignored, but verify)
- Any experimental folders

**6. Commit:**

```bash
git add .
git commit -m "feat: add my feature"
```

**7. Push and create PR:**

```bash
git push -u origin gh4-io/feature/my-feature
gh pr create
```

**PR description must include:**
- **What changed** - concise overview
- **Why** - context/motivation
- **How to test** - exact commands (e.g., `npm test`, `pwsh scripts/smoke_test.ps1`)

**Example PR template:**

```markdown
## What changed
Added YAML profile parsing support to match JSON profiles.

## Why
Users prefer YAML for config readability; extends profile manifest format.

## How to test
1. `cd project && npm install`
2. `npm test` - verify new tests pass
3. `pwsh scripts/smoke_test.ps1` - verify end-to-end
```

## Code Style

**General principles:**
- Match existing patterns in codebase
- Keep functions small and modular
- Prefer clarity over cleverness
- Validate inputs at boundaries

**JavaScript conventions:**
- Use JSDoc typedefs for function signatures
- Prefer ES modules (`import`/`export`)
- No semicolons (match existing style)
- Use descriptive variable names

**File organization:**
- Group related functions in single module
- Export public API explicitly
- Keep internal helpers private
- One primary export per file

**Example:**

```javascript
/**
 * Parses profile manifest from JSON or YAML
 * @param {string} filePath - Absolute path to profile manifest
 * @returns {Promise<Object>} Parsed profile object
 */
export async function parseProfile(filePath) {
  // Validate input
  if (!filePath) {
    throw new Error('filePath required')
  }

  // Implementation
  // ...
}
```

## See Also

- [[Quick-Start]] - Quick start guide
- [[Architecture]] - System design and components
- [[Troubleshooting]] - Common issues and solutions
- [API Reference](../api/core.md) - Core API documentation
