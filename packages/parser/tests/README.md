# Parser Tests

Comprehensive test suite for @pagemd/parser package.

## Test Files

- **metadata.test.js** (50 tests) - Metadata normalization, key conversion, value coercion, defaults
- **extensions.test.js** (44 tests) - Callout and figure plugins
- **wikilinks.test.js** (39 tests) - Obsidian-style wikilink syntax
- **index.test.js** (37 tests) - Main parser, integration tests

## Known Issues

- **frontmatter.test.js.skip** - Temporarily disabled due to esprima dependency compatibility with Vitest/Rollup.
  - The `extractFrontmatter` function is still tested indirectly through index.test.js
  - Issue: Rollup cannot parse esprima (gray-matter dependency) syntax in ESM mode
  - Workaround: Frontmatter functionality verified through integration tests

## Running Tests

```bash
# All parser tests
npm test -- packages/parser/tests

# Specific test file
npm test -- packages/parser/tests/metadata.test.js

# Watch mode
npm run test:watch -- packages/parser/tests
```

## Test Coverage

All major parser functionality is covered:
- Frontmatter extraction (via integration tests)
- Metadata normalization and validation
- Markdown extensions (callouts, figures)
- Wikilink parsing
- Full document parsing workflow
