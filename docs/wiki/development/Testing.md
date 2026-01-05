# Testing

> **Section:** For Developers

Running and writing tests for PageMD.

## Overview

PageMD uses Vitest for unit and integration testing. The test suite includes 800+ tests covering all packages.

## Running Tests

### All Tests

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

### Specific Package

```bash
npm test -- packages/parser
```

### Specific Test File

```bash
npm test -- packages/parser/test/frontmatter.test.js
```

### Watch Mode

Automatically re-run tests when files change:

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

**What you'll see:** HTML coverage report generated in `coverage/`.

## Test Structure

Tests are located next to the code they test:

```
packages/
├── parser/
│   ├── src/
│   │   └── index.js
│   └── test/
│       ├── frontmatter.test.js
│       └── extensions.test.js
```

## Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/index.js';

describe('parseMarkdown', () => {
  it('should extract frontmatter', () => {
    const input = `---
title: Test
---
# Content`;

    const result = parseMarkdown(input);

    expect(result.frontmatter.title).toBe('Test');
    expect(result.html).toContain('<h1>Content</h1>');
  });

  it('should handle missing frontmatter', () => {
    const input = '# Just content';

    const result = parseMarkdown(input);

    expect(result.frontmatter).toEqual({});
  });
});
```

### Testing Async Functions

```javascript
import { describe, it, expect } from 'vitest';
import { renderPdf } from '../src/index.js';

describe('renderPdf', () => {
  it('should generate PDF buffer', async () => {
    const html = '<html><body>Test</body></html>';

    const result = await renderPdf(html);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

### Mocking

```javascript
import { describe, it, expect, vi } from 'vitest';
import { loadProfile } from '../src/index.js';
import * as fs from 'fs';

vi.mock('fs');

describe('loadProfile', () => {
  it('should load profile from file', () => {
    fs.readFileSync.mockReturnValue('{"id": "test"}');

    const profile = loadProfile('test');

    expect(profile.id).toBe('test');
  });
});
```

## Test Categories

### Unit Tests

Test individual functions in isolation.

**Location:** `packages/*/test/*.test.js`

**Example:** Testing frontmatter parsing, config loading, path resolution.

### Integration Tests

Test component interactions.

**Location:** `packages/*/test/integration/*.test.js`

**Example:** Testing full build pipeline, profile inheritance.

### Smoke Tests

End-to-end tests verifying CLI functionality.

**Location:** `scripts/smoke_test.ps1`

**Run:** `pwsh scripts/smoke_test.ps1`

## Best Practices

### Test Naming

Use descriptive names that explain the scenario:

```javascript
// Good
it('should throw error when profile file is missing')
it('should merge parent and child profile CSS arrays')

// Bad
it('works')
it('test 1')
```

### Arrange-Act-Assert

Structure tests clearly:

```javascript
it('should generate PDF with correct page count', async () => {
  // Arrange
  const markdown = '# Page 1\n\n---\n\n# Page 2';
  const profile = { id: 'test' };

  // Act
  const result = await build(markdown, profile);

  // Assert
  expect(result.pageCount).toBe(2);
});
```

### Test One Thing

Each test should verify one behavior:

```javascript
// Good - separate tests
it('should extract title from frontmatter')
it('should use default title when frontmatter missing')

// Bad - testing multiple things
it('should handle frontmatter')
```

## Debugging Tests

### Run Single Test

```bash
npm test -- --run -t "should extract frontmatter"
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug Mode

Add `debugger` statement and run:

```bash
node --inspect-brk node_modules/.bin/vitest run
```

Then open Chrome DevTools.

## See Also

- [[development/Setup|Development Setup]] - Environment setup
- [[development/Contributing|Contributing]] - How to contribute
