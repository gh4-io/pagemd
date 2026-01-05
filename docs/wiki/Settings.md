# Settings Reference

Complete reference for PageMD CLI flags, config options, profile fields, and path resolution rules.

## Contents

- [CLI Flags](#cli-flags)
- [Config File Options](#config-file-options)
- [Profile Fields Quick Reference](#profile-fields-quick-reference)
- [Path Resolution Rules](#path-resolution-rules)
- [Output Mode Settings](#output-mode-settings)
- [Environment Variables](#environment-variables)
- [See Also](#see-also)

---

## CLI Flags

### Global Options

Available for all commands:

| Flag | Alias | Type | Values | Default | Description |
|------|-------|------|--------|---------|-------------|
| `--log-level` | - | string | TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF | INFO | Set logging verbosity level |
| `--help` | `-h` | boolean | - | - | Display command help |
| `--version` | `-v` | boolean | - | - | Show PageMD version |

**Environment override:** `PAGEMD_LOG_LEVEL` environment variable overrides default. CLI flag takes final precedence.

### build Command

| Flag | Alias | Type | Values | Default | Description |
|------|-------|------|--------|---------|-------------|
| `--output` | `-o` | string | html, pdf, png, jpeg (comma-separated) | html,pdf | Output formats to generate |
| `--profile` | `-p` | string | Profile ID or path | standard_letter | Profile manifest to use |
| `--output-dir` | `-d` | string | Directory path | Same as input | Output directory for generated files |
| `--debug` | - | boolean | - | false | Emit debug artifacts (HTML, CSS, logs) |
| `--pagedjs` | - | string | browser, cli | browser | Paged.js rendering mode |

**Notes:**
- `--output` accepts comma-separated list: `--output html,pdf,png,jpeg`
- Output format validation prevents invalid values (fails with error)
- `--pagedjs cli` runs Paged.js preprocessing via pagedjs-cli before Puppeteer
- `--pagedjs browser` uses in-browser Paged.js polyfill (default)

### validate Command

| Flag | Alias | Type | Values | Default | Description |
|------|-------|------|--------|---------|-------------|
| `--profile` | `-p` | string | Profile ID or path | Auto-detect | Override profile resolution |
| `--strict` | - | boolean | - | false | Treat warnings as errors |

**Validation behavior:**
- Auto-detect: Profile from frontmatter `profile` field, or `standard_letter` fallback
- Strict mode: Warnings fail with exit code 1
- Normal mode: Only errors fail

### list-profiles Command

| Flag | Alias | Type | Values | Default | Description |
|------|-------|------|--------|---------|-------------|
| `--json` | - | boolean | - | false | Output as JSON array |
| `--verbose` | `-v` | boolean | - | false | Show full profile details |

**Aliases:** `profiles`, `lp`

---

## Config File Options

PageMD config files are JSON/YAML manifests for batch processing. Placed alongside Markdown files or in project root.

### Manifest Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | array | Yes | Ordered list of Markdown files to process |
| `profile` | string | No | Default profile for all files |
| `output_dir` | string | No | Default output directory |
| `outputs` | array | No | Default output formats |

### Per-File Overrides

Each `files` entry can be a string (path only) or an object with overrides:

| Field | Type | Description |
|-------|------|-------------|
| `path` | string | Markdown file path (required) |
| `profile` | string | Override profile for this file |
| `styles` | array | Additional CSS files |
| `outputs` | array | Override output formats |
| `output_dir` | string | Override output directory |
| `metadata_overrides` | object | Frontmatter field overrides |

**Example:**
```yaml
files:
  - path: intro.md
  - path: technical.md
    profile: technical_report
    outputs: [pdf, html]
  - path: appendix.md
    metadata_overrides:
      status: Draft
profile: standard_letter
output_dir: ./dist
```

**Path resolution:** All paths resolve from manifest directory.

---

## Profile Fields Quick Reference

Core configuration fields in profile manifests (JSON/YAML). See [Profiles](Profiles.md) for full details.

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Profile identifier (must match filename) |
| `description` | string | No | Human-readable description |
| `extends` | string | No | Parent profile ID for inheritance |

### Layout Block

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `layout.type` | string | Yes | Layout type (use `"html"`) |
| `layout.source` | string | Yes | HTML template path (supports `${projectRoot}`) |

**Template tokens:** `{{content}}`, `{{title}}`, `{{meta.field_name}}`

### Resources Block

| Field | Type | Description |
|-------|------|-------------|
| `resources.css` | array | CSS file paths (load order) |
| `resources.fonts` | array | Font file paths |
| `resources.assets` | array | Image/asset paths |

**Path resolution:** Missing files cause hard failures. Use `${projectRoot}` token for project-relative paths.

### Outputs Block

| Field | Type | Description |
|-------|------|-------------|
| `outputs.pdf.enabled` | boolean | Enable PDF output |
| `outputs.pdf.mode` | string | Output mode (ACTIVE_ONLY, ALWAYS, DISABLED) |
| `outputs.html.enabled` | boolean | Enable HTML output |
| `outputs.html.mode` | string | Output mode |
| `outputs.png.enabled` | boolean | Enable PNG output |
| `outputs.png.mode` | string | Output mode |
| `outputs.jpeg.enabled` | boolean | Enable JPEG output |
| `outputs.jpeg.mode` | string | Output mode |

### Validation Block

| Field | Type | Description |
|-------|------|-------------|
| `validation.required_fields` | array | Required frontmatter fields |

### Metadata Block

| Field | Type | Description |
|-------|------|-------------|
| `metadata.defaults` | object | Default values for missing fields |
| `metadata.aliases` | object | Field name aliases (e.g., `{"doc_id": "document_id"}`) |
| `metadata.date_format` | string | Date format string (e.g., `"MM/DD/YYYY"`) |

---

## Path Resolution Rules

### Profile Discovery

Profiles are searched in order (highest precedence first):

1. **Markdown directory:** `.pagemd/templates/` relative to input Markdown file
2. **Config directory:** Explicit config directory (if specified via `--config`)
3. **Project root:** `project/templates/profiles/`

**Override behavior:** First found profile wins. Lower-precedence locations ignored.

**Filename validation:** Filename must match `profile.id` exactly (e.g., `standard_letter.json` must contain `"id": "standard_letter"`).

### Resource Path Resolution

Resource paths in profiles support these token substitutions:

| Token | Replacement | Example |
|-------|-------------|---------|
| `${projectRoot}` | Detected project root | `${projectRoot}/styles/primary.css` → `/path/to/project/styles/primary.css` |

**Project root detection:**
1. Search upward from input file for `project/templates/profiles/` directory
2. Search upward for `package.json` with `@pagemd/` scoped name
3. Fall back to current working directory

**Absolute paths:** Used as-is, no token substitution.

**Relative paths:** Resolve from:
- Profile directory (for profile-embedded resources)
- Markdown directory (for frontmatter-specified resources)
- Config directory (for manifest-specified resources)

### Output Directory Resolution

| Flag/Config | Behavior |
|-------------|----------|
| No `--output-dir` | Write to same directory as input Markdown file |
| `--output-dir ./dist` | Write all outputs to `./dist` |
| Manifest `output_dir` | Default for all files in manifest |
| Per-file `output_dir` | Override for specific file |

**Precedence:** Per-file override > manifest default > CLI flag > input directory

---

## Output Mode Settings

Control when each format is generated:

| Mode | Behavior |
|------|----------|
| `ACTIVE_ONLY` | Generate only if explicitly requested via `--output` flag |
| `ALWAYS` | Always generate, even if not requested |
| `DISABLED` | Never generate (overrides `--output` flag) |

### Interaction with CLI Flags

**Profile:**
```json
{
  "outputs": {
    "pdf": { "enabled": true, "mode": "ACTIVE_ONLY" },
    "html": { "enabled": true, "mode": "ALWAYS" },
    "png": { "enabled": false, "mode": "DISABLED" }
  }
}
```

**Results:**

| Command | Generated Outputs | Explanation |
|---------|------------------|-------------|
| `pagemd build doc.md` | PDF, HTML | HTML is `ALWAYS`, PDF is default |
| `pagemd build doc.md --output pdf` | PDF only | Explicit `--output` ignores `ALWAYS` |
| `pagemd build doc.md --output html,png` | HTML only | PNG is `DISABLED` (blocked) |
| `pagemd build doc.md --output jpeg` | None | JPEG not enabled, no defaults |

**Key rules:**
- Explicit `--output` flag ignores `ALWAYS` modes
- `DISABLED` blocks output even if explicitly requested
- `ACTIVE_ONLY` requires explicit `--output` flag or default set

---

## Environment Variables

| Variable | Type | Values | Default | Description |
|----------|------|--------|---------|-------------|
| `PAGEMD_LOG_LEVEL` | string | TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF | INFO | Default logging verbosity |

**Precedence:** CLI `--log-level` flag > `PAGEMD_LOG_LEVEL` > default (INFO)

**Usage:**
```bash
# Set globally for session
export PAGEMD_LOG_LEVEL=DEBUG
pagemd build document.md

# Set for single command
PAGEMD_LOG_LEVEL=TRACE pagemd build document.md
```

---

## See Also

- [CLI Reference](../api/cli.md) - Complete CLI command documentation
- [Profiles](Profiles.md) - Profile manifest schema and inheritance
- [Quick Start](Quick-Start.md) - Getting started guide
- [Configuration](Configuration.md) - Config file format and examples
- [@pagemd/core](../api/core.md) - Path resolution API
