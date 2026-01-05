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
| `${manifestDir}` | Directory containing the profile manifest | `/project/templates/profiles` |
| `${projectRoot}` | Project root (package.json, .git, .pagemrc) | `/project` |
| `${workspaceFolder}` | VS Code workspace folder | `/workspace` |
| `${markdownDir}` | Directory of source markdown file | `/docs` |

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
