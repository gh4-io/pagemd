# Operations

Build verification, testing, and release procedures for PageMD.

## Overview

Operations covers build verification, test execution, smoke testing, and release preparation. All procedures use standard npm scripts and PowerShell automation. The test suite includes ~600 tests across all packages with unit and integration coverage.

## Contents

- [Build Verification](#build-verification)
- [Smoke Test Procedure](#smoke-test-procedure)
- [Test Suite Execution](#test-suite-execution)
- [Release Checklist](#release-checklist)
- [CI/CD Considerations](#cicd-considerations)
- [See Also](#see-also)

## Build Verification

Pre-flight checks before running tests or builds.

### Checklist

- [ ] Node 20+ installed (`node --version`)
- [ ] Working directory is `project/` root
- [ ] Dependencies installed (`npm install` completed)
- [ ] `node_modules/` exists in `project/`
- [ ] No uncommitted changes blocking test execution
- [ ] Git branch is clean or stashed

### Commands

```bash
# Verify Node version
node --version

# Install dependencies
cd project && npm install

# Confirm packages linked
npm ls --depth=0
```

## Smoke Test Procedure

Validates core functionality via automated smoke test script.

### Running Smoke Tests

```bash
# From repository root
pwsh scripts/smoke_test.ps1

# Skip CLI tests
pwsh scripts/smoke_test.ps1 -SkipCLI

# Verbose output
pwsh scripts/smoke_test.ps1 -Verbose
```

### What Gets Tested

1. **Dependency Check**
   - Validates `node_modules/` exists
   - Fails fast if `npm install` not run

2. **Vitest Tests**
   - Runs full test suite via `npm test`
   - Reports pass/fail status
   - Shows verbose output if `-Verbose` flag used

3. **CLI Commands** (unless `-SkipCLI`)
   - Tests `pagemd list-profiles`
   - Tests `pagemd validate` (no args, should show usage)
   - Confirms CLI entry point functional

### Expected Output

```
[Info] PageMD Smoke Test
─────────────────────────────────────

[Info] Running vitest tests...
[Success] All tests passed

[Info] Testing CLI commands...
[Info] Testing: pagemd list-profiles
[Info] Testing: pagemd validate (no args)
[Success] CLI commands functional

─────────────────────────────────────
[Success] Smoke test PASSED
```

### Exit Codes

- **0:** All checks passed
- **1:** Test failures or missing dependencies

## Test Suite Execution

Full test coverage across all packages.

### Run All Tests

```bash
cd project
npm test
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Per-Package Tests

```bash
# Core package
npm test -w @pagemd/core

# Parser package
npm test -w @pagemd/parser

# Renderer-web package
npm test -w @pagemd/renderer-web

# Renderer-pdf package
npm test -w @pagemd/renderer-pdf

# Exporters package
npm test -w @pagemd/exporters

# CLI package
npm test -w @pagemd/cli
```

### Integration Tests

```bash
# Run integration tests only
npm test -- tests/integration/
```

### Test Coverage Summary

| Package | Tests | Coverage Focus |
|---------|-------|----------------|
| `@pagemd/core` | ~105 | Logger, config, path resolution, profile loading |
| `@pagemd/parser` | ~150 | Markdown parsing, frontmatter, metadata, extensions |
| `@pagemd/renderer-web` | ~93 | HTML assembly, templates, CSS injection |
| `@pagemd/renderer-pdf` | ~67 | Puppeteer, Paged.js, browser detection |
| `@pagemd/exporters` | ~152 | Output modes, filename tokens, screenshots |
| Integration | ~35 | End-to-end pipeline, profile inheritance |
| **Total** | **~600** | Full pipeline coverage |

## Release Checklist

Steps for preparing and publishing releases.

### Pre-Release Verification

- [ ] All tests passing (`npm test`)
- [ ] Smoke test passing (`pwsh scripts/smoke_test.ps1`)
- [ ] Integration tests verified
- [ ] No uncommitted changes
- [ ] Documentation updated (if behavior changed)
- [ ] `CHANGELOG.md` updated with release notes

### Version Bump

```bash
# Patch release (0.0.x)
npm version patch

# Minor release (0.x.0)
npm version minor

# Major release (x.0.0)
npm version major
```

### Changelog Update

Update `CHANGELOG.md` with:
- Release version and date
- New features
- Bug fixes
- Breaking changes
- Migration notes (if needed)

### Git Tagging

```bash
# Commit version bump
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release v0.1.0"

# Create annotated tag
git tag -a v0.1.0 -m "Release v0.1.0"

# Push tag to origin
git push origin v0.1.0
git push origin gh4-io/feature/pagemd-core
```

### Publish Workflow

1. Merge feature branch to main
2. Create GitHub release from tag
3. Attach build artifacts (if applicable)
4. Publish npm packages (when ready for npm registry)

### Post-Release

- [ ] Verify GitHub release created
- [ ] Update documentation site (if exists)
- [ ] Announce release (if public)
- [ ] Archive release artifacts

## CI/CD Considerations

Future automation targets for continuous integration and deployment.

### Planned CI Workflows

1. **Pull Request Checks**
   - Run full test suite
   - Run smoke tests
   - Lint check
   - Coverage report

2. **Main Branch Deploy**
   - Version bump automation
   - Changelog generation
   - Tag creation
   - npm publish (when public)

3. **Release Automation**
   - GitHub release creation
   - Asset uploads
   - Documentation deployment

### Environment Requirements

- **Node:** 20+
- **OS:** Linux, macOS, Windows (WSL2)
- **Browser:** Chrome/Chromium for PDF tests
- **PowerShell:** 7+ for smoke tests

### Secret Management

- npm registry tokens (for publish)
- GitHub deploy keys (for docs)
- Browser automation credentials (if needed)

### Build Artifacts

Exclude from tracking:
- `dist/`
- `spike-output/`
- `node_modules/`
- `.tmp/` (retired, do not recreate)

---

## Performance Baseline

Typical render times on mid-range hardware (4-core CPU, 16GB RAM):

| Document Size | HTML Render | PDF Render | Total |
|---------------|-------------|------------|-------|
| Small (1-5 pages) | ~50ms | ~500ms | ~600ms |
| Medium (10-20 pages) | ~100ms | ~1.5s | ~1.7s |
| Large (50+ pages) | ~250ms | ~4s | ~4.5s |

**Notes:**
- First PDF render includes browser launch (~1s overhead)
- Subsequent renders reuse browser instance
- Paged.js polyfill is ~180KB inline (cached in memory)
- System Chrome preferred over bundled Chromium for performance

---

## Release Checklist

### Pre-Release Verification

- [ ] All tests pass: `npm test` (633+ tests)
- [ ] Smoke test passes: `pwsh scripts/smoke_test.ps1`
- [ ] No uncommitted changes: `git status`
- [ ] No stray dev artifacts in project root
- [ ] Node 20+ compatibility verified

### Release Steps

1. **Version bump**
   ```bash
   npm version patch|minor|major
   ```

2. **Update changelog** (when created)

3. **Run full verification**
   ```bash
   npm test
   pwsh scripts/build.ps1
   pwsh scripts/smoke_test.ps1
   ```

4. **Create release commit**
   ```bash
   git add -A
   git commit -m "chore: release vX.Y.Z"
   git tag vX.Y.Z
   ```

5. **Push with tags**
   ```bash
   git push origin main --tags
   ```

### Post-Release

- [ ] Verify GitHub release created
- [ ] Update documentation if needed
- [ ] Announce release (if public)

## See Also

- [[Architecture]] - System design and package structure
- [[Developer-Guide]] - Contributing and extending PageMD
- [[Reference]] - API documentation for all packages
