# @pagemd/exporters Tests

Comprehensive test suite for the exporters package.

**Total: 152 test cases across 2 files**

## Test Files

### modes.test.js
Tests for output mode handling and format selection logic.

**Coverage:**
- `OUTPUT_MODES` constant validation
- `getOutputMode()` - format validation, priority order (options > profile > defaults), edge cases
- `shouldOutput()` - ALWAYS/DISABLED/ACTIVE_ONLY modes, integration with getOutputMode
- `getEnabledFormats()` - empty/ALWAYS/ACTIVE_ONLY formats, combinations, ordering
- `getOutputDir()` - priority (options > profile > default), path resolution, cross-platform

**Test counts:**
- **Total: 44 tests** covering all functions and edge cases

### filename.test.js
Tests for tokenized filename expansion and sanitization.

**Coverage:**
- `FILENAME_TOKENS` constant validation
- `sanitizeFilename()` - invalid chars, whitespace, underscore/dash normalization, edge cases
- `expandFilename()` - basename, metadata tokens, date/timestamp, unreplaced tokens, sanitization
- `getOutputFilename()` - validation, basename extraction, default patterns, profile overrides, metadata
- `getOutputPath()` - path assembly, directory priority, filename integration, resolution, cross-platform

**Test counts:**
- **Total: 108 tests** covering all functions and edge cases

## Running Tests

From project root:

```bash
# Run all exporter tests
npm test -- packages/exporters/tests/

# Run specific test file
npm test -- packages/exporters/tests/modes.test.js
npm test -- packages/exporters/tests/filename.test.js

# Watch mode
npm run test:watch -- packages/exporters/tests/

# Coverage
npm run test:coverage
```

## Test Framework

- **Framework:** vitest with globals enabled
- **Environment:** node
- **Timeout:** 30s (test), 30s (hooks)
- **Reporter:** verbose

## Test Structure

Each test file follows this structure:
- Grouped by function/feature using `describe()`
- Organized by concern (validation, priority, edge cases, etc.)
- Comprehensive edge case coverage
- Real-world scenario tests
- Cross-platform compatibility tests

## Key Testing Patterns

1. **Priority Order Testing:** Options > Profile > Defaults
2. **Input Validation:** Null, undefined, wrong types
3. **Edge Cases:** Empty strings, special characters, missing data
4. **Integration:** Functions working together correctly
5. **Platform Agnostic:** Cross-platform path handling
