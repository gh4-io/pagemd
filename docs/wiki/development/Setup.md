# Development Setup

> **Section:** For Developers

Set up the PageMD development environment.

## Overview

This guide walks through cloning the repository, installing dependencies, and verifying the development environment works.

## Prerequisites

Before starting, install:

- **Node.js 20+** - `node --version` should show `v20.x.x` or higher
- **Git** - `git --version` should show version info
- **Chrome or Chromium** - Required for PDF rendering tests

## Clone the Repository

```bash
git clone https://github.com/gh4-io/pagemd.git
cd pagemd
```

**What you'll see:**
```
Cloning into 'pagemd'...
remote: Enumerating objects: 1234, done.
...
```

## Install Dependencies

```bash
npm install
```

**What you'll see:**
```
added 450 packages in 15s
```

**Success indicator:** No errors, packages installed.

## Verify Setup

### Run Tests

```bash
npm test
```

**What you'll see:**
```
 ✓ packages/core/test/config.test.js (15 tests)
 ✓ packages/parser/test/frontmatter.test.js (23 tests)
 ...
 Test Files  25 passed
 Tests       801 passed
 Duration    12.5s
```

**Success:** All tests pass (800+ tests).

### Run Smoke Test

```bash
pwsh scripts/smoke_test.ps1
```

Or on Linux/macOS:
```bash
./scripts/smoke_test.sh
```

**Success:** HTML and PDF outputs generated without errors.

## Project Structure

```
pagemd/
├── apps/
│   └── cli/                 # CLI application
│       └── src/
│           └── index.js     # CLI entry point
├── packages/
│   ├── core/               # Configuration, logging, paths
│   ├── parser/             # Markdown parsing
│   ├── renderer-web/       # HTML generation
│   ├── renderer-pdf/       # PDF rendering
│   ├── exporters/          # Output handling
│   └── theme-kit/          # CSS management
├── profiles/               # Built-in profiles
├── templates/              # HTML templates
├── layouts/                # Layout CSS
├── styles/                 # Global CSS
├── schemas/                # JSON schemas
└── docs/                   # Documentation
```

## Common Development Tasks

### Run Specific Test File

```bash
npm test -- packages/parser/test/frontmatter.test.js
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run with Coverage

```bash
npm run test:coverage
```

### Build a Test Document

```bash
node apps/cli/src/index.js build examples/hello.md -o pdf
```

## Environment Variables for Development

| Variable | Description |
|----------|-------------|
| `PAGEMD_LOG_LEVEL` | Set to `DEBUG` or `TRACE` for verbose logging |
| `PAGEMD_KEEP_CHROME` | Set to `1` to keep browser open (faster iterating) |

**Example:**
```bash
PAGEMD_LOG_LEVEL=DEBUG node apps/cli/src/index.js build test.md -o pdf
```

## Troubleshooting

### Tests fail with "Chrome not found"

**Fix:** Install Chrome or set `CHROME_PATH`:
```bash
export CHROME_PATH="/usr/bin/google-chrome"
npm test
```

### Module not found errors

**Fix:** Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### Permission errors

**Fix:** Check file permissions, don't use `sudo` with npm.

## See Also

- [[development/Testing|Testing]] - Writing and running tests
- [[development/Contributing|Contributing]] - How to contribute
- [[general/Architecture|Architecture]] - Component overview
