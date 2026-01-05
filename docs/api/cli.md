# @pagemd/cli API

Command-line interface for PageMD pipeline. Converts markdown to HTML, PDF, PNG, and JPEG with profile-driven layouts.

## Installation

```bash
npm install @pagemd/cli
```

**Global installation:**

```bash
npm install -g @pagemd/cli
pagemd --version
```

**Local usage (npx):**

```bash
npx @pagemd/cli build document.md
```

---

## Global Options

Available for all commands:

| Option | Description | Choices | Default |
|--------|-------------|---------|---------|
| `--log-level` | Set log level | TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF | INFO |
| `--help, -h` | Show help | - | - |
| `--version, -v` | Show version | - | - |

**Environment Variables:**

- `PAGEMD_LOG_LEVEL` - Override default log level (same values as `--log-level`)

---

## Commands

### build

Build markdown to output formats (HTML, PDF, PNG, JPEG).

```bash
pagemd build <input> [options]
```

**Arguments:**

| Argument | Type | Description | Required |
|----------|------|-------------|----------|
| `<input>` | string | Markdown file or directory | Yes |

**Options:**

| Option | Alias | Type | Description | Default |
|--------|-------|------|-------------|---------|
| `--output` | `-o` | string | Output formats (comma-separated) | html,pdf |
| `--profile` | `-p` | string | Profile ID to use | standard_letter |
| `--output-dir` | `-d` | string | Output directory | Same as input |
| `--debug` | - | boolean | Enable debug artifacts | false |
| `--pagedjs` | - | string | Paged.js mode (browser or cli) | browser |

**Output Formats:**
- `html` - Complete HTML document
- `pdf` - PDF via Puppeteer + Paged.js
- `png` - PNG screenshot (first page)
- `jpeg` - JPEG screenshot (first page)

**Examples:**

```bash
# Build single file to HTML and PDF
pagemd build document.md

# Build to all formats
pagemd build document.md --output html,pdf,png,jpeg

# Build with custom profile
pagemd build document.md --profile technical_report

# Build directory to specific output folder
pagemd build ./docs --output-dir ./output

# Build with debug artifacts
pagemd build document.md --debug

# Build with CLI Paged.js preprocessing
pagemd build document.md --pagedjs cli
```

**Directory Processing:**
- Scans for `.md` files (non-recursive)
- Processes each file independently
- Outputs to same directory by default

**Pipeline:**
1. Parse markdown + frontmatter
2. Load profile manifest
3. Render HTML (via @pagemd/renderer-web)
4. Generate PDF if requested (via @pagemd/renderer-pdf)
5. Capture PNG/JPEG screenshots if requested (via @pagemd/exporters)

**Exit Codes:**
- `0` - Success (all files built)
- `1` - Failure (one or more files failed)

---

### validate

Validate markdown file(s) without rendering. Checks metadata, profile validity, and resource paths.

```bash
pagemd validate <input> [options]
```

**Arguments:**

| Argument | Type | Description | Required |
|----------|------|-------------|----------|
| `<input>` | string | Markdown file or directory | Yes |

**Options:**

| Option | Alias | Type | Description | Default |
|--------|-------|------|-------------|---------|
| `--profile` | `-p` | string | Profile ID override | Auto-detect |
| `--strict` | - | boolean | Fail on warnings (not just errors) | false |

**Validation Checks:**

1. **Profile Resolution**
   - Profile exists and loads correctly
   - No circular inheritance in profile chain
   - Profile manifest valid

2. **Required Metadata**
   - All fields from `profile.validation.required_fields` present
   - Fields not empty

3. **Resource Paths**
   - Layout file exists (`profile.layout.source`)
   - CSS files exist (`profile.resources.css`)
   - Font files exist (`profile.resources.fonts`) - warning only
   - Custom CSS from frontmatter exists

4. **Markdown Syntax**
   - File parses without errors
   - Frontmatter YAML valid

**Examples:**

```bash
# Validate single file
pagemd validate document.md

# Validate with specific profile
pagemd validate document.md --profile technical_report

# Validate directory
pagemd validate ./docs

# Strict mode (warnings are errors)
pagemd validate document.md --strict
```

**Output Format:**

```
Validation Summary:
  Total files: 3
  Valid: 2
  Invalid: 1

✓ document1.md

✗ document2.md
  Errors:
    - Missing required field: document_id (required by profile standard_letter)
    - Layout file not found: ${projectRoot}/templates/layouts/custom.html

✓ document3.md
  Warnings:
    - Required field 'title' is present but empty
```

**Exit Codes:**
- `0` - All files valid
- `1` - One or more files invalid (or warnings in strict mode)

---

### list-profiles

List available profile manifests from project and workspace.

```bash
pagemd list-profiles [options]
```

**Aliases:** `profiles`, `lp`

**Options:**

| Option | Alias | Type | Description | Default |
|--------|-------|------|-------------|---------|
| `--json` | - | boolean | Output as JSON array | false |
| `--verbose` | `-v` | boolean | Show full profile details | false |

**Discovery Locations:**

Profiles are scanned from these directories (workspace overrides project):

1. `{projectRoot}/.pagemd/profiles/` - Workspace overrides
2. `{projectRoot}/project/templates/profiles/` - Project defaults

**Supported Formats:**
- `.json` - JSON manifest
- `.yaml`, `.yml` - YAML manifest

**Profile Naming:**
- Filename must match `profile.id` field
- Mismatch logged as warning

**Examples:**

```bash
# List profiles (human-readable)
pagemd list-profiles

# List with full details
pagemd list-profiles --verbose

# JSON output
pagemd list-profiles --json

# Short alias
pagemd lp
```

**Output (Default):**

```
Available profiles:
  standard_letter
    Standard letter-size layout with headers/footers
    Source: project

  technical_report
    Technical documentation with code highlighting
    (extends: standard_letter)
    Source: workspace
```

**Output (Verbose):**

```
Available profiles:
  standard_letter
    Standard letter-size layout with headers/footers
    Source: project
    File: /project/templates/profiles/standard_letter.json
    Layout: paged
    Outputs: html, pdf
    Required fields: title, document_id, revision
```

**Output (JSON):**

```json
[
  {
    "id": "standard_letter",
    "description": "Standard letter-size layout with headers/footers",
    "extends": null,
    "source": "project",
    "filePath": "/project/templates/profiles/standard_letter.json"
  },
  {
    "id": "technical_report",
    "description": "Technical documentation with code highlighting",
    "extends": "standard_letter",
    "source": "workspace",
    "filePath": "/.pagemd/profiles/technical_report.yaml"
  }
]
```

**Exit Codes:**
- `0` - Success
- `1` - Discovery failed

---

## Environment Variables

| Variable | Description | Values | Default |
|----------|-------------|--------|---------|
| `PAGEMD_LOG_LEVEL` | Global log level | TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF | INFO |

**Precedence:**

Command-line `--log-level` flag overrides environment variable.

---

## Exit Codes

| Code | Condition | Commands |
|------|-----------|----------|
| `0` | Success | All |
| `1` | Error (input not found, parse failure, validation failure) | All |
| `1` | Build failed (one or more files) | build |
| `1` | Validation failed (errors or warnings in strict mode) | validate |

---

## Example Workflows

### Basic Document Build

```bash
# Create markdown file
cat > document.md << 'EOF'
---
title: My Document
document_id: DOC-001
revision: 1.0
status: Draft
---
# Hello World

This is my document.
EOF

# Build to HTML and PDF
pagemd build document.md

# Outputs:
#   document.html
#   document.pdf
```

### Multi-Format Export

```bash
# Build to all formats with custom profile
pagemd build report.md \
  --output html,pdf,png,jpeg \
  --profile technical_report

# Outputs:
#   report.html
#   report.pdf
#   report.png
#   report.jpeg
```

### Batch Processing

```bash
# Build all markdown files in directory
pagemd build ./docs --output-dir ./output

# Validate before building
pagemd validate ./docs --strict && \
  pagemd build ./docs --output-dir ./output
```

### Custom Profile Development

```bash
# List available profiles
pagemd list-profiles --verbose

# Create custom profile (in .pagemd/profiles/my_profile.yaml)
# Test validation
pagemd validate test.md --profile my_profile

# Build with custom profile
pagemd build test.md --profile my_profile --debug
```

### Continuous Integration

```bash
#!/bin/bash
# ci-build.sh

set -e

echo "Validating documentation..."
pagemd validate ./docs --strict

echo "Building documentation..."
pagemd build ./docs \
  --output html,pdf \
  --output-dir ./dist \
  --log-level WARN

echo "Build complete!"
```

---

## Logging

Structured logging with contextual metadata:

```bash
# Enable debug logging
pagemd build document.md --log-level DEBUG

# Trace all operations
export PAGEMD_LOG_LEVEL=TRACE
pagemd build document.md

# Suppress all output except errors
pagemd build document.md --log-level ERROR
```

**Log Levels:**
- `TRACE` - All operations (very verbose)
- `DEBUG` - Development diagnostics
- `INFO` - Progress indicators (default)
- `WARN` - Warnings only
- `ERROR` - Errors only
- `FATAL` - Fatal errors only
- `OFF` - No logging

**Log Format:**

```
[INFO] cli:build:start - Building markdown: document.md
[DEBUG] build.html:start - Generating HTML: document.html
[INFO] build.html:success - HTML generated: document.html
[DEBUG] build.pdf:start - Generating PDF: document.pdf
[INFO] build.pdf:success - PDF generated: document.pdf (2 pages)
```

---

## Error Handling

All commands use consistent error reporting:

```bash
# Input not found
$ pagemd build missing.md
Error: Input not found: /path/to/missing.md
# Exit code: 1

# Invalid format
$ pagemd build document.md --output xml
Error: No valid output formats. Use: html, pdf, png, jpeg
# Exit code: 1

# Validation failure
$ pagemd validate invalid.md
Error: Missing required field: document_id
# Exit code: 1
```

**Debug Mode:**

```bash
# Enable stack traces
pagemd build document.md --log-level DEBUG

# Capture debug artifacts (HTML, CSS, logs)
pagemd build document.md --debug
```

---

## Project Root Detection

CLI automatically detects project root by searching upward for:

1. `project/templates/profiles/` directory
2. `package.json` with `@pagemd/` scoped name

Falls back to current working directory if not found.

**Manual Override:**

```bash
# Use specific project root
cd /path/to/project
pagemd build ./docs/document.md

# Or use absolute paths
pagemd build /path/to/project/docs/document.md
```

---

## Related Documentation

- **@pagemd/renderer-web** - HTML rendering API
- **@pagemd/renderer-pdf** - PDF generation API
- **@pagemd/exporters** - Image export API
- **@pagemd/parser** - Markdown parsing API
- **@pagemd/core** - Profile and path resolution

---

## Version

Current version: 0.1.0

```bash
pagemd --version
```
