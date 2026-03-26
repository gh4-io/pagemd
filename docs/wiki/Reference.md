# Reference

Technical lookup for PageMD tokens, metadata, logging, and output modes.

## Overview

This page provides precise definitions for all tokens, metadata normalization rules, logging format specifications, and output mode behaviors used across PageMD profiles, templates, and pipeline operations.

## Contents

- [Template Tokens](#template-tokens)
- [Path Tokens](#path-tokens)
- [Filename Tokens](#filename-tokens)
- [Metadata Normalization](#metadata-normalization)
- [Logging Specification](#logging-specification)
  - [Debug Summary Output](#debug-summary-output)
- [Output Modes](#output-modes)
- [See Also](#see-also)

---

## Template Tokens

Template tokens control content insertion in HTML layouts.

| Token | Description | Example Value |
|-------|-------------|---------------|
| `{{content}}` | Rendered markdown body as HTML | `<h1>Title</h1><p>Body...</p>` |
| `{{styles}}` | Inline CSS content | `body { margin: 0; }` |
| `{{metadata.title}}` | Document title from frontmatter | `SOP-001 Maintenance Checklist` |
| `{{metadata.document_id}}` | Unique document identifier | `SOP-001` |
| `{{metadata.revision}}` | Document revision number | `3` |
| `{{metadata.status}}` | Document status | `APPROVED` |
| `{{metadata.effective_date}}` | Effective date | `2025-12-28` |
| `{{metadata.*}}` | Any frontmatter field | Custom metadata values |

**Usage:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>{{metadata.title}}</title>
  <style>{{styles}}</style>
</head>
<body>
  <header>{{metadata.document_id}} Rev {{metadata.revision}}</header>
  <main>{{content}}</main>
</body>
</html>
```

---

## Path Tokens

Path tokens resolve filesystem locations in profile manifests.

| Token | Description | Example Value |
|-------|-------------|---------------|
| `${manifestDir}` | Directory containing the profile manifest | `/project/profiles` |
| `${projectRoot}` | Project root (package.json, .git, .pagemrc) | `/project` |
| `${workspaceFolder}` | VS Code workspace folder | `/workspace` |
| `${markdownDir}` | Directory of source markdown file | `/docs` |

**Path Configuration Module:**

Path configuration is centralized in `packages/core/src/paths.js`. This module defines:
- `RESOURCE_PATHS` - Folder locations for profiles, templates, layouts, styles
- `DEFAULT_FILES` - Default file names for base/primary CSS
- Path resolution helpers

To restructure project folders, update the constants in `paths.js`.

**Resolution Priority:**

Relative paths resolve in this order:
1. Markdown directory
2. Config directory
3. Project root

Absolute paths use the exact value provided.

**Usage in Profile:**
```json
{
  "layout": {
    "source": "${manifestDir}/layouts/standard_letter.html"
  },
  "styles": {
    "primary": "${projectRoot}/styles/primary.css"
  }
}
```

---

## Filename Tokens

Filename tokens control output file naming.

| Token | Description | Example Value |
|-------|-------------|---------------|
| `{basename}` | Source filename without extension | `work-package-123` |
| `{document_id}` | From metadata | `SOP-001` |
| `{revision}` | From metadata | `3` |
| `{title}` | From metadata or first H1 | `Maintenance_Checklist` |
| `{status}` | From metadata | `APPROVED` |
| `{date}` | Current date (YYYY-MM-DD) | `2025-12-28` |
| `{timestamp}` | Current UTC timestamp | `20251228223000` |

**Allowlist:**

Only these tokens are recognized. Invalid tokens are removed during expansion.

**Sanitization Rules:**
- Replaces `/ \ : * ? " < > |` with `_`
- Trims whitespace
- Collapses multiple underscores/dashes
- Returns `untitled` if empty after sanitization

**Default Patterns:**
- HTML: `{basename}.html`
- PDF: `{basename}.pdf`
- PNG: `{basename}.png`
- JPEG: `{basename}.jpg`

**Usage in Profile:**
```json
{
  "outputs": {
    "pdf": {
      "filename": "{document_id}_rev{revision}_{title}.pdf"
    }
  }
}
```

**Example Expansion:**
```
Pattern: {document_id}_rev{revision}_{basename}.pdf
Metadata: { document_id: "SOP-001", revision: 3 }
Basename: work-package
Result: SOP-001_rev3_work-package.pdf
```

---

## Metadata Normalization

Normalization occurs after frontmatter parsing and before template expansion.

### Aliases

Common metadata aliases are automatically mapped:

| Alias | Canonical Field |
|-------|-----------------|
| `doc_id` | `document_id` |
| `rev` | `revision` |
| `ver` | `revision` |
| `version` | `revision` |
| `eff_date` | `effective_date` |

### Date Formats

Supported output formats:

| Format | Example |
|--------|---------|
| `MM/DD/YYYY` | `12/28/2025` |
| `MM/DD/YY` | `12/28/25` |
| `DD MMM YYYY` | `28 Dec 2025` |
| `MM-DD-YYYY` | `12-28-2025` |
| ISO 8601 | `2025-12-28` |

**Input Parsing:**
- US formats (MM/DD/YYYY)
- ISO formats (YYYY-MM-DD)
- Timestamp strings

**Configuration:**

Date format is profile-configurable. Default: `MM/DD/YYYY`

### Coercion Rules

- Numeric fields: convert to int/float without failing
- String fields: trim whitespace
- Boolean fields: accept `true`, `false`, `1`, `0`, `yes`, `no`
- Missing fields: omit from output, do not fail

### Required Fields

Base schema validates shape only. Required fields are enforced by profile configuration.

**Profile Example:**
```json
{
  "validation": {
    "required_metadata": ["document_id", "title", "revision"]
  }
}
```

---

## Logging Specification

Unified logging format across CLI, core, and extensions.

### Levels

In descending verbosity:

| Level | Description |
|-------|-------------|
| `TRACE` | Detailed operation traces |
| `DEBUG` | Debugging information |
| `INFO` | General informational messages |
| `WARN` | Non-fatal warnings |
| `ERROR` | Errors that block operations |
| `FATAL` | Critical failures |
| `OFF` | Disable all logging |

### Timestamp Format

UTC timestamps in ISO 8601 with milliseconds:

```
YYYY-MM-DDTHH:mm:ss.SSSZ
```

Example: `2025-12-28T23:59:59.123Z`

### Required Fields

Every log line includes these fields in order:

1. **Timestamp** - UTC, exact format above
2. **Level** - One of TRACE, DEBUG, INFO, WARN, ERROR, FATAL
3. **Module** - Logical subsystem
4. **Section** - Step or phase within module
5. **Result** - One of OK, SKIP, WARN, FAIL
6. **Message** - Human-readable text

### Line Format

Semicolon-delimited, CSV-friendly:

```
<timestamp>;level=<level>;module=<module>;section=<section>;result=<result>;msg="<message>"
```

With structured data:

```
<timestamp>;level=<level>;module=<module>;section=<section>;result=<result>;msg="<message>";data=<json>
```

### Field Conventions

**Module Identifiers:**
- `cli` - Command-line interface
- `profiles` - Profile loading/resolution
- `layout` - Layout management
- `parser` - Markdown parsing
- `validation` - Schema validation
- `renderer.web` - HTML rendering
- `renderer.pdf` - PDF rendering
- `exporter` - Output generation
- `io` - File I/O operations
- `assets` - Asset management
- `logging` - Logging subsystem

**Section Identifiers:**
- `resolveProfile` - Profile resolution
- `loadManifest` - Manifest loading
- `resolvePath` - Path resolution
- `parseFrontmatter` - Frontmatter extraction
- `normalizeMetadata` - Metadata normalization
- `applyTemplate` - Template expansion
- `renderHtml` - HTML generation
- `renderPdf` - PDF generation
- `writeOutput` - File writing
- `emitDebugArtifacts` - Debug output

**Result Values:**
- `OK` - Successful completion
- `SKIP` - Intentionally skipped
- `WARN` - Non-fatal issue
- `FAIL` - Error blocking operation

**Message Guidelines:**
- Short sentence
- No newlines
- Descriptive without additional context

### Examples

```
2026-01-04T16:01:22.004Z;level=INFO;module=profiles;section=resolveProfile;result=OK;msg="Selected profile standard_letter"
2026-01-04T16:01:22.017Z;level=DEBUG;module=layout;section=resolvePath;result=OK;msg="Resolved layout source";data={"path":"project/templates/layouts/standard_letter.html"}
2026-01-04T16:01:22.125Z;level=WARN;module=assets;section=loadCss;result=WARN;msg="Missing CSS asset";data={"path":"extras.css"}
2026-01-04T16:01:25.330Z;level=ERROR;module=renderer.pdf;section=launchBrowser;result=FAIL;msg="Chrome launch failed"
```

### Output Targets

- **Console** - Default in dev environments
- **Internal log** - Stored locally when enabled
- **External log** - Stored with outputs when enabled

### Behavior Defaults

- Production: logging disabled
- Development: TRACE to console
- File logs: plain text with optional JSON data field

### Color Output

Logs are colorized for terminal display when `stdout` is a TTY.

**Color Scheme:**

| Component | Color | Condition |
|-----------|-------|-----------|
| Timestamp | Green | Always |
| Level FATAL/ERROR | Red | - |
| Level WARN | Yellow | - |
| Level INFO | Cyan | - |
| Level DEBUG/TRACE | Gray | - |
| Result success/ok/done | Green | - |
| Result fail/failure/error | Red | - |
| Result warn/warning/skip/partial | Yellow | - |
| Module, Section, Message | White | - |
| Data (JSON) | Gray | - |

**Environment Control:**

| `PAGEMD_LOG_COLOR` | Behavior |
|--------------------|----------|
| `1`, `true`, `yes` | Force colors ON (even when piped) |
| `0`, `false`, `no` | Force colors OFF |
| Unset | Auto-detect based on TTY |

**Examples:**
```bash
# Force colors when piping
PAGEMD_LOG_COLOR=1 pagemd build doc.md | less -R

# Disable colors for log parsing
PAGEMD_LOG_COLOR=0 pagemd build doc.md > build.log
```

### Debug Summary Output

When debug mode is enabled (`--debug` flag or `PAGEMD_DEBUG=1`), the CLI outputs an integrated summary after the build completes. The debug summary replaces the standard build summary with enhanced diagnostic information.

#### Format Specification

```
======================================================================
  DEBUG MODE ACTIVE
======================================================================

Build Summary:
  Total files: <count>
  Successful: <count>
  Failed: <count>
  Total outputs: <count>
  Duration: <seconds>s

Overrides:
  <ENV_VAR>: <value> (<source>)
  ...

Directory Context:
  Project Root:  <absolute-path>
  Output Dir:    <absolute-path>
  Debug Dir:     <absolute-path>
  Markdown Dir:  <absolute-path>

Loaded Resources:
  Styles:
    [css] <source-path> (<layer>)
          <resolved-absolute-path> (<size>)
  Layouts:
    [css] <source-path> (<layer>)
          <resolved-absolute-path> (<size>)
  Templates:
    [template] <source-path>
          <resolved-absolute-path> (<size>)

Per-File Breakdown:
  <input-filename>
    Profile: <profile-id>
    Duration: <milliseconds>ms
    Outputs: <format1>, <format2>, ...
    Debug artifacts:
      - <artifact-filename>
      ...

----------------------------------------------------------------------
```

#### Field Definitions

| Field | Description | Format |
|-------|-------------|--------|
| Build Summary | Aggregate build statistics | Counts and duration |
| Overrides | Active non-default settings | `ENV_VAR: value (source)` |
| Override source | Where override came from | `cli`, `env`, or `meta` |
| Project Root | Resolved project root directory | Absolute path |
| Output Dir | Target directory for generated files | Absolute path |
| Debug Dir | Directory for debug artifacts | Absolute path |
| Markdown Dir | Source markdown file directory | Absolute path |
| Resource category | Grouped by purpose | `Styles`, `Layouts`, `Templates` |
| Source path | Original path from profile (may include tokens) | String |
| Layer | CSS cascade layer | `base`, `primary`, `profile` |
| Resolved path | Full resolved absolute path | Absolute path |
| Resource size | File size | `X.X KB` or `X.X MB` |
| Input filename | Source markdown file | Basename only |
| Profile | Profile ID used for rendering | String |
| Duration | Render time for this file | Integer milliseconds |
| Outputs | Generated output formats | Comma-separated list |
| Debug artifacts | Files created in debug directory | Basename list |

#### Section Semantics

**Build Summary:**
- Shows aggregate statistics for the entire build
- Replaces the standard summary when debug mode is active
- Duration shows total wall-clock time

**Overrides:**
- Only shown when non-default values are in effect
- Source indicates where the override came from: `cli` (command line), `env` (environment variable), or `meta` (frontmatter)
- Helps diagnose unexpected behavior from configuration

**Directory Context:**
- Shows the resolved project root (detected or overridden via `PAGEMD_PROJECT_ROOT`)
- Shows the output directory (CLI flag, env var, or default to input directory)
- Debug Dir shows where debug artifacts are saved
- Markdown Dir shows the source file location

**Loaded Resources:**
- Resources organized by category: Styles, Layouts, Templates
- Styles: Base and primary CSS (non-profile layers)
- Layouts: Profile-specific CSS (profile layer)
- Templates: HTML layout templates
- Each resource shows original source path (with tokens) and resolved absolute path
- Size shown in human-readable format

**Per-File Breakdown:**
- One entry per input markdown file
- Profile shows the resolved profile ID
- Duration measures total render time including all outputs
- Outputs lists only successfully generated formats
- Debug artifacts lists files saved to debug directory

#### Example Output

```
======================================================================
  DEBUG MODE ACTIVE
======================================================================

Build Summary:
  Total files: 2
  Successful: 2
  Failed: 0
  Total outputs: 4
  Duration: 2.07s

Overrides:
  PAGEMD_DEBUG: true (cli)
  PAGEMD_PROFILE: technical_report (env)

Directory Context:
  Project Root:  /home/user/project
  Output Dir:    /home/user/project/dist
  Debug Dir:     /home/user/project/dist/debug
  Markdown Dir:  /home/user/project/docs

Loaded Resources:
  Styles:
    [css] styles/base.css (base)
          /home/user/project/styles/base.css (8.8 KB)
    [css] styles/primary.css (primary)
          /home/user/project/styles/primary.css (649 B)
  Layouts:
    [css] ${projectRoot}/templates/layouts/technical_report.css (profile)
          /home/user/project/templates/layouts/technical_report.css (1.2 KB)
  Templates:
    [template] ${projectRoot}/templates/layouts/technical_report.html
          /home/user/project/templates/layouts/technical_report.html (892 B)

Per-File Breakdown:
  introduction.md
    Profile: technical_report
    Duration: 820ms
    Outputs: html, pdf
    Debug artifacts:
      - introduction.paged.html
      - introduction.screenshot.png
  technical-spec.md
    Profile: technical_report
    Duration: 1240ms
    Outputs: html, pdf

----------------------------------------------------------------------
```

---

## Output Modes

Control which outputs are generated.

| Mode | Description | Behavior |
|------|-------------|----------|
| `ACTIVE_ONLY` | Generate only if explicitly configured | Default; requires profile configuration |
| `ALWAYS` | Always generate this output | Overrides profile settings |
| `DISABLED` | Never generate this output | Skips generation regardless of profile |

**Usage in Profile:**

```json
{
  "outputs": {
    "html": {
      "mode": "ACTIVE_ONLY",
      "filename": "{basename}.html"
    },
    "pdf": {
      "mode": "ALWAYS",
      "filename": "{document_id}_v{revision}.pdf"
    },
    "png": {
      "mode": "DISABLED"
    }
  }
}
```

**Priority:**

CLI flags override profile modes:
- `--html-only` - Enable HTML, disable others
- `--pdf-only` - Enable PDF, disable others
- `--all` - Enable all outputs

**Default Output Location:**

Alongside source markdown file unless `target_directory` is specified.

**Subfolder Generation:**

When `target_directory` is set, outputs organize into:
- `PDF/`
- `HTML/`
- `IMAGES/` (PNG, JPEG)

---

## See Also

- [[Profiles]] - Profile manifest structure and inheritance
- [[Settings]] - Configuration file format and search order
- [[Configuration]] - Template anatomy and token expansion
- [CLI Reference](../api/cli.md) - Command-line interface usage
