# Developer Guide

Step-by-step guide for contributing to PageMD development.

## Table of Contents

- [Repository Layout](#repository-layout)
- [Local Development Setup](#local-development-setup)
- [Environment Variables for Development](#environment-variables-for-development)
- [Testing](#testing)
- [Build Commands](#build-commands)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Contribution Workflow](#contribution-workflow)
- [CSS Layering System](#css-layering-system)
- [Logger and Color Utilities](#logger-and-color-utilities)
- [Debug Mode Development](#debug-mode-development)
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

## Environment Variables for Development

PageMD supports `PAGEMD_*` environment variables for configuration. These are especially useful during development for debugging and testing different configurations.

**Recommended dev environment:**

```bash
# Linux/macOS
export PAGEMD_LOG_LEVEL=DEBUG    # Verbose logging
export PAGEMD_LOG_COLOR=1        # Force colored output (optional)
export PAGEMD_DEBUG=1            # Emit debug artifacts
export PAGEMD_KEEP_CHROME=1      # Browser reuse

# Windows PowerShell
$env:PAGEMD_LOG_LEVEL = "DEBUG"
$env:PAGEMD_LOG_COLOR = "1"
$env:PAGEMD_DEBUG = "1"
$env:PAGEMD_KEEP_CHROME = "1"
```

**Log colors:** Logs are automatically colored when outputting to a terminal. Use `PAGEMD_LOG_COLOR=0` to disable, or `PAGEMD_LOG_COLOR=1` to force colors when piping.

**All available env vars:** See [Settings > Environment Variables](Settings.md#environment-variables) for complete reference.

**Testing env var handling:**

When implementing new env var support, follow these patterns:

1. **Centralized handling** - Use `project/packages/core/src/env.js` for all env var parsing
2. **Type coercion** - Use `parseBoolean()` for boolean vars, handle edge cases
3. **Cross-platform paths** - Normalize path separators, handle `~` and `%USERPROFILE%`
4. **Precedence** - CLI flags > env vars > frontmatter > profile > defaults
5. **Validation** - Log warnings for invalid values, fall back to defaults

**Example test cases:**

```javascript
// Test boolean parsing
process.env.PAGEMD_DEBUG = '1'       // should be true
process.env.PAGEMD_DEBUG = 'true'    // should be true
process.env.PAGEMD_DEBUG = 'yes'     // should be true
process.env.PAGEMD_DEBUG = '0'       // should be false
process.env.PAGEMD_DEBUG = ''        // should be false (unset equivalent)
delete process.env.PAGEMD_DEBUG      // should use default

// Test path normalization
process.env.PAGEMD_OUTPUT_DIR = 'C:\\Users\\test\\output'  // should normalize to forward slashes
process.env.PAGEMD_OUTPUT_DIR = '/tmp/output'               // should work as-is
```

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

## CSS Layering System

PageMD uses a 4-layer additive CSS system for styling consistency and extensibility.

**Layer order (additive):**

1. **Base CSS** (`project/styles/base.css`) - Engine-provided markdown defaults
   - Core element styling (headings, paragraphs, lists, tables, blockquotes)
   - VS Code theming classes (`.vscode-light`, `.vscode-dark`, `.vscode-high-contrast`)
   - Always loaded first

2. **Primary CSS** (`project/styles/primary.css`) - Global project styles
   - Brand colors, typography, spacing
   - Page layout defaults
   - Always loaded second

3. **Layout CSS** - Paged.js structure (optional)
   - From `profile.resources.layout` or `profile.layout.css`
   - @page rules, margins, page size
   - Loaded third when profile specifies layout

4. **Syntax CSS** (`project/styles/syntax/shiki-base.css`) - Code block styling
   - Shiki syntax highlighter structural styles
   - Only loaded when `PAGEMD_SYNTAX_HIGHLIGHT` enabled (default: true)
   - Loaded fourth

5. **Profile CSS** - Profile-specific styles
   - From `profile.resources.css[]` or `profile.styles.profile`
   - Layout-specific overrides
   - Loaded fifth

6. **Frontmatter CSS** - Document-level overrides
   - From markdown frontmatter `styles: [...]`
   - Document-specific styling
   - Loaded last (highest priority)

**Implementation:**

```javascript
// theme-kit aggregateStyles() always loads:
const baseCss = path.join(projectRoot, 'styles/base.css')
const primaryCss = path.join(projectRoot, 'styles/primary.css')
// ...then profile CSS, then frontmatter CSS
```

**Key principles:**
- Each layer adds to previous layers (not replaces)
- Missing CSS files hard-fail (strict validation)
- VS Code theming prepared for future extension support

## Logger and Color Utilities

PageMD includes a universal logger with semantic color support.

**Logger module:** `project/packages/core/src/logger.js`

```javascript
import { createLogger, setLogLevel } from '@pagemd/core/logger.js'

const logger = createLogger('cli')
logger.info('build', 'success', 'Build complete', { files: 5 })
```

**Color module:** `project/packages/core/src/colors.js`

Colors are automatically applied based on:
- **Timestamp:** Green
- **Level:** Red (ERROR/FATAL), Yellow (WARN), Cyan (INFO), Gray (DEBUG/TRACE)
- **Result:** Green (success/ok), Red (fail/failure), Yellow (warn/skip)

**Extending colors:**

```javascript
import { colors, colorLevel, colorResult, isColorsEnabled } from '@pagemd/core/colors.js'

// Check if colors are enabled
if (isColorsEnabled()) {
  console.log(colors.timestamp('2025-01-01'))
}

// Add custom result colors
const myResult = lowerResult === 'custom' ? colors.resultSuccess(result) : colorResult(result)
```

**Implementation:** Uses raw ANSI escape codes (no external dependencies) to avoid ES module import hoisting issues with color libraries.

## Debug Mode Development

When developing or troubleshooting PageMD, debug mode provides enhanced visibility into the build process.

**Enable debug mode:**
```bash
pagemd build document.md --debug
# Or via environment
PAGEMD_DEBUG=1 pagemd build document.md
```

### Debug Artifacts

Debug mode emits additional files alongside outputs:

| Artifact | Description |
|----------|-------------|
| `*-debug.html` | Final HTML before PDF generation (with all CSS inlined) |
| `*-debug.css` | Merged CSS from all sources (base, primary, profile, frontmatter) |
| Browser window | Visible (not headless) for interactive inspection |

### Enhanced Build Summary

Debug mode outputs an integrated summary that replaces the standard build summary:

```
======================================================================
  DEBUG MODE ACTIVE
======================================================================

Build Summary:
  Total files: 1
  Successful: 1
  Failed: 0
  Total outputs: 2
  Duration: 1.85s

Overrides:
  PAGEMD_DEBUG: true (cli)

Directory Context:
  Project Root:  /path/to/project
  Output Dir:    /path/to/output
  Debug Dir:     /path/to/output/debug
  Markdown Dir:  /path/to/docs

Loaded Resources:
  Styles:
    [css] styles/base.css (base)
          /path/to/project/styles/base.css (8.8 KB)
    [css] styles/primary.css (primary)
          /path/to/project/styles/primary.css (649 B)
  Layouts:
    [css] ${projectRoot}/templates/layouts/standard_letter.css (profile)
          /path/to/project/templates/layouts/standard_letter.css (447 B)
  Templates:
    [template] ${projectRoot}/templates/layouts/standard_letter.html
          /path/to/project/templates/layouts/standard_letter.html (689 B)

Per-File Breakdown:
  doc1.md
    Profile: standard_letter
    Duration: 820ms
    Outputs: html, pdf
    Debug artifacts:
      - doc1.paged.html
      - doc1.screenshot.png

----------------------------------------------------------------------
```

**Summary sections:**

1. **Build Summary** - Aggregate statistics for the entire build
2. **Overrides** - Active non-default configuration (CLI, env, or frontmatter sources)
3. **Directory Context** - Shows resolved project root, output, debug, and markdown directories
4. **Loaded Resources** - CSS and templates organized by category (Styles, Layouts, Templates)
5. **Per-File Breakdown** - Profile used, render duration, outputs, and debug artifacts for each input file

### Using Debug for Development

**Path resolution issues:**
- Check "Directory Context" for unexpected project root
- Verify "Loaded Resources" shows expected files
- Missing resources appear as warnings in logs

**Performance profiling:**
- "Per-File Breakdown" shows duration per file
- Compare times across profiles
- Identify slow renders for optimization

**CSS debugging:**
- Inspect `*-debug.css` for merged styles
- Open `*-debug.html` in browser DevTools
- Check layer order (base -> primary -> profile -> frontmatter)

**Browser debugging:**
- Debug mode shows browser window
- Open DevTools (F12) for console errors
- Inspect Paged.js layout directly

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
