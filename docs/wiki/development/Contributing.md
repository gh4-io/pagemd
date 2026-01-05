# Contributing

> **Section:** For Developers

How to contribute to PageMD development.

## Overview

We welcome contributions! This guide covers the process for submitting changes.

## Getting Started

1. [[development/Setup|Set up the development environment]]
2. Read the [[general/Architecture|Architecture]] overview
3. Check [open issues](https://github.com/gh4-io/pagemd/issues) for tasks

## Contribution Process

### 1. Create an Issue

Before starting work, create or find an issue describing the change:

- **Bug fix:** Describe the bug, steps to reproduce, expected behavior
- **Feature:** Describe the feature, use case, proposed implementation

### 2. Fork and Branch

```bash
# Fork via GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/pagemd.git
cd pagemd

# Create a branch
git checkout -b feature/my-feature
```

**Branch naming:**
- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation changes

### 3. Make Changes

- Write code following existing patterns
- Add/update tests for your changes
- Update documentation if behavior changes
- Keep commits focused and atomic

### 4. Test Your Changes

```bash
# Run all tests
npm test

# Run smoke test
pwsh scripts/smoke_test.ps1
```

**All tests must pass before submitting.**

### 5. Submit Pull Request

```bash
git push origin feature/my-feature
```

Then create a PR on GitHub with:

- Clear title describing the change
- Description of what changed and why
- Link to related issue
- Test instructions if applicable

## Code Standards

### JavaScript Style

- Use ES modules (`import`/`export`)
- Use `const` by default, `let` when needed
- Use async/await for promises
- Add JSDoc comments for public functions

```javascript
/**
 * Parse markdown with frontmatter
 * @param {string} content - Markdown content
 * @returns {ParseResult} Parsed result with frontmatter and HTML
 */
export function parseMarkdown(content) {
  // ...
}
```

### Commit Messages

Use conventional commit format:

```
feat: add TOC page numbers
fix: correct profile inheritance order
docs: update CLI reference
test: add frontmatter edge cases
refactor: simplify CSS layer merging
```

### Testing Requirements

- Unit tests for new functions
- Integration tests for feature interactions
- Update existing tests if behavior changes
- Aim for meaningful coverage, not 100%

## Documentation

### When to Update Docs

- New CLI commands or options → [[reference/CLI|CLI Reference]]
- New settings → [[reference/Settings|Settings Reference]]
- New profile fields → [[reference/Profile-Schema|Profile Schema]]
- New features → Relevant guide

### Documentation Location

- User docs → `docs/wiki/`
- API docs → JSDoc in source files
- Architecture → `docs/wiki/general/Architecture.md`

## Review Process

1. **Automated checks:** Tests must pass
2. **Code review:** Maintainer reviews changes
3. **Feedback:** Address any requested changes
4. **Merge:** Maintainer merges when approved

## Types of Contributions

### Bug Fixes

1. Confirm the bug exists (reproduce it)
2. Write a failing test
3. Fix the bug
4. Verify test passes

### New Features

1. Discuss in issue first
2. Get design approval for significant changes
3. Implement with tests
4. Document the feature

### Documentation

- Fix typos, clarify confusing sections
- Add examples
- Update outdated information

### Performance

- Include benchmarks showing improvement
- Ensure no regression in functionality

## Questions?

- Create an issue for questions
- Check existing issues for answers
- Review [[Troubleshooting]] for common problems

## See Also

- [[development/Setup|Development Setup]] - Environment setup
- [[development/Testing|Testing]] - Running and writing tests
- [[general/Architecture|Architecture]] - Project structure
