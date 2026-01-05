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
| `--log-level` | - | string | TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF | WARN | Set logging verbosity level |
| `--help` | `-h` | boolean | - | - | Display command help |
| `--version` | `-v` | boolean | - | - | Show PageMD version |

**Environment override:** `PAGEMD_LOG_LEVEL` environment variable overrides default. CLI flag takes final precedence.

### build Command

| Flag | Alias | Type | Values | Default | Description |
|------|-------|------|--------|---------|-------------|
| `--output` | `-o` | string | html, pdf, png, jpeg (comma-separated) | html,pdf | Output formats to generate |
| `--profile` | `-p` | string | Profile ID or path | standard_letter | Profile manifest to use |
| `--output-dir` | `-d` | string | Directory path | Same as input | Output directory for generated files |
| `--debug` | - | boolean | - | false | Emit debug artifacts (HTML, CSS, logs) and enhanced build summary |
| `--pagedjs` | - | string | browser, cli | browser | Paged.js rendering mode |

**Notes:**
- `--output` accepts comma-separated list: `--output html,pdf,png,jpeg`
- Output format validation prevents invalid values (fails with error)
- `--pagedjs cli` runs Paged.js preprocessing via pagedjs-cli before Puppeteer
- `--pagedjs browser` uses in-browser Paged.js polyfill (default)

#### Debug Summary Output

When `--debug` is enabled, the build command outputs an integrated summary showing build results, active overrides, directory context, loaded resources organized by category, and per-file breakdown:

```
======================================================================
  DEBUG MODE ACTIVE
======================================================================

Build Summary:
  Total files: 1
  Successful: 1
  Failed: 0
  Total outputs: 2
  Duration: 1.85s

Overrides:
  PAGEMD_DEBUG: true (cli)
  PAGEMD_PROFILE: technical_report (env)

Directory Context:
  Project Root:  /path/to/project
  Output Dir:    /path/to/output
  Debug Dir:     /path/to/output/debug
  Markdown Dir:  /path/to/docs

Loaded Resources:
  Styles:
    [css] styles/base.css (base)
          /path/to/project/styles/base.css (8.8 KB)
    [css] styles/primary.css (primary)
          /path/to/project/styles/primary.css (649 B)
  Layouts:
    [css] ${projectRoot}/templates/layouts/standard_letter.css (profile)
          /path/to/project/templates/layouts/standard_letter.css (447 B)
  Templates:
    [template] ${projectRoot}/templates/layouts/standard_letter.html
          /path/to/project/templates/layouts/standard_letter.html (689 B)

Per-File Breakdown:
  document.md
    Profile: standard_letter
    Duration: 1820ms
    Outputs: html, pdf
    Debug artifacts:
      - document.paged.html
      - document.screenshot.png

----------------------------------------------------------------------
```

This integrated summary helps diagnose path resolution, active configuration overrides, missing resources, and performance issues. The Overrides section only displays when non-default values are in effect.

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
| `${manifestDir}` | Directory containing the profile file | `${manifestDir}/styles/custom.css` → `/path/to/profiles/styles/custom.css` |
| `${configDir}` | Directory containing the markdown file | `${configDir}/images/logo.png` → `/path/to/docs/images/logo.png` |

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

### Output Directory Validation

When `--output-dir` specifies a directory that does not exist:

**Interactive mode (TTY):** Prompts with options:
- `[E] Exit` (default) - Cancel build
- `[C] Create` - Create directory and continue

**Non-interactive mode (piped/CI):** Build is cancelled automatically with exit code 0.

This prevents accidental directory creation in scripts and provides explicit control.

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

PageMD supports universal environment variables (Linux/Windows) prefixed with `PAGEMD_`. These act as configuration overrides.

### Precedence Order (highest to lowest)

1. CLI flags
2. **Environment variables**
3. Frontmatter
4. Profile manifest
5. Defaults

### Quick Reference

#### Core Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PAGEMD_PROFILE` | string | `standard_letter` | Default profile ID or path |
| `PAGEMD_OUTPUT_DIR` | path | (alongside input) | Default output directory |
| `PAGEMD_OUTPUT_FORMAT` | string | `html,pdf` | Comma-separated output formats |
| `PAGEMD_LOG_LEVEL` | enum | `WARN` | Logging verbosity |
| `PAGEMD_LOG_COLOR` | boolean | (auto) | Force colored log output on/off |
| `PAGEMD_DEBUG` | boolean | `false` | Enable debug artifact generation |

#### Browser/PDF Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PAGEMD_BROWSER_PATH` | path | (auto-detect) | Explicit Chrome/Chromium path |
| `PAGEMD_KEEP_CHROME` | boolean | `false` | Keep browser alive between renders |
| `PAGEMD_HEADLESS` | boolean | `true` | Browser headless mode |
| `PAGEMD_PAGEDJS_MODE` | enum | `browser` | Paged.js mode: `browser` or `cli` |
| `PAGEMD_TIMEOUT` | number | `30000` | Rendering timeout (ms) |

#### Output Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PAGEMD_JPEG_QUALITY` | number | `90` | JPEG output quality (1-100) |

#### Path Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PAGEMD_PROJECT_ROOT` | path | (auto-detect) | Override project root detection |
| `PAGEMD_CONFIG_DIR` | path | (none) | Additional config/profile search path |

### Boolean Values

Boolean env vars accept:
- **Enabled:** `1`, `true`, `yes`
- **Disabled:** `0`, `false`, `no`, or unset

### Detailed Reference

#### PAGEMD_PROFILE

Default profile for rendering when no `--profile` flag or frontmatter `pipeline_profile` specified.

**Precedence:** CLI `--profile` > `PAGEMD_PROFILE` > frontmatter > defaults

```bash
export PAGEMD_PROFILE=technical_report
pagemd build document.md
```

#### PAGEMD_OUTPUT_DIR

Default output directory for generated files.

**Precedence:** CLI `--output-dir` > `PAGEMD_OUTPUT_DIR` > alongside input

```bash
export PAGEMD_OUTPUT_DIR=/tmp/pagemd-output
pagemd build document.md  # outputs to /tmp/pagemd-output/
```

#### PAGEMD_OUTPUT_FORMAT

Comma-separated list of output formats when `--output` not specified.

**Precedence:** CLI `--output` > `PAGEMD_OUTPUT_FORMAT` > profile > defaults

```bash
export PAGEMD_OUTPUT_FORMAT=pdf,html,png
pagemd build document.md  # generates PDF, HTML, and PNG
```

#### PAGEMD_LOG_LEVEL

Logging verbosity level.

**Values:** `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `OFF`

**Precedence:** CLI `--log-level` > `PAGEMD_LOG_LEVEL` > default (WARN)

```bash
export PAGEMD_LOG_LEVEL=DEBUG
pagemd build document.md

# Single command override
PAGEMD_LOG_LEVEL=TRACE pagemd build document.md
```

#### PAGEMD_DEBUG

Enable debug artifact generation (HTML snapshots, screenshots, logs).

**Precedence:** CLI `--debug` > `PAGEMD_DEBUG` > profile > default

```bash
export PAGEMD_DEBUG=1
pagemd build document.md  # emits debug/ artifacts
```

#### PAGEMD_LOG_COLOR

Control colored log output for terminal display.

**Values:**
- `1`, `true`, `yes`: Force colors ON (even when piped)
- `0`, `false`, `no`: Force colors OFF
- Unset: Auto-detect based on TTY

**Default behavior:** Colors are automatically enabled when outputting to a terminal (TTY), and disabled when piped or redirected to a file.

**Color scheme:**
- Timestamp: Green
- Level: Red (ERROR/FATAL), Yellow (WARN), Cyan (INFO), Gray (DEBUG/TRACE)
- Result: Green (success/ok), Red (fail/failure), Yellow (warn/skip)

```bash
# Force colors when piping to less
PAGEMD_LOG_COLOR=1 pagemd build document.md | less -R

# Disable colors for log parsing
PAGEMD_LOG_COLOR=0 pagemd build document.md > build.log
```

#### PAGEMD_BROWSER_PATH

Explicit path to Chrome/Chromium executable. Bypasses auto-detection.

**Precedence:** `PAGEMD_BROWSER_PATH` > system Chrome > bundled Chromium

```bash
# Linux
export PAGEMD_BROWSER_PATH=/usr/bin/google-chrome-stable

# Windows
$env:PAGEMD_BROWSER_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

#### PAGEMD_KEEP_CHROME

Keep Chrome/Chromium browser instance alive between PDF renders. Saves ~2-3s per render after the first.

**When to use:**
- Batch builds (multiple files in one command)
- Programmatic API with repeated `renderPdf()` calls
- Watch mode / dev server scenarios

```bash
export PAGEMD_KEEP_CHROME=1
pagemd build *.md -o pdf
```

**Behavior:**
- First render: Launches Chrome (~2-3s cold start)
- Subsequent renders: Reuses existing browser (~0s overhead)
- Process exit: Browser cleaned up automatically

**Note:** Browser persistence works within a single Node.js process. Separate CLI invocations cannot share browser instances.

#### PAGEMD_HEADLESS

Run browser in headless mode (no visible window).

**Precedence:** `PAGEMD_DEBUG=true` forces visible > `PAGEMD_HEADLESS` > default (true)

```bash
export PAGEMD_HEADLESS=false  # show browser window for debugging
```

#### PAGEMD_PAGEDJS_MODE

Paged.js execution mode for PDF rendering.

**Values:** `browser` (in-browser polyfill), `cli` (pagedjs-cli prepass)

**Precedence:** CLI `--pagedjs` > `PAGEMD_PAGEDJS_MODE` > profile > default

```bash
export PAGEMD_PAGEDJS_MODE=cli
pagemd build document.md -o pdf
```

#### PAGEMD_TIMEOUT

Browser/rendering timeout in milliseconds.

**Precedence:** Profile timeout > `PAGEMD_TIMEOUT` > default (30000)

```bash
export PAGEMD_TIMEOUT=60000  # 60 seconds for large documents
```

#### PAGEMD_JPEG_QUALITY

JPEG output quality for screenshot exports.

**Values:** 1-100

**Precedence:** Profile quality > `PAGEMD_JPEG_QUALITY` > default (90)

```bash
export PAGEMD_JPEG_QUALITY=95
pagemd build document.md -o jpeg
```

#### PAGEMD_PROJECT_ROOT

Override automatic project root detection.

```bash
export PAGEMD_PROJECT_ROOT=/path/to/my/project
```

#### PAGEMD_CONFIG_DIR

Additional directory to search for profiles and configs.

```bash
export PAGEMD_CONFIG_DIR=/shared/pagemd-configs
```

### Cross-Platform Examples

```bash
# Linux/macOS
export PAGEMD_PROFILE=technical_report
export PAGEMD_OUTPUT_DIR=/tmp/pagemd-output
export PAGEMD_LOG_LEVEL=DEBUG
export PAGEMD_DEBUG=1
pagemd build document.md

# Windows PowerShell
$env:PAGEMD_PROFILE = "technical_report"
$env:PAGEMD_OUTPUT_DIR = "C:\temp\pagemd-output"
$env:PAGEMD_LOG_LEVEL = "DEBUG"
$env:PAGEMD_DEBUG = "1"
pagemd build document.md

# Windows CMD
set PAGEMD_PROFILE=technical_report
set PAGEMD_OUTPUT_DIR=C:\temp\pagemd-output
set PAGEMD_LOG_LEVEL=DEBUG
set PAGEMD_DEBUG=1
pagemd build document.md
```

### Path Handling

- Paths are normalized cross-platform (forward slashes internally)
- Relative paths resolve from current working directory
- `~` expansion supported on Linux; `%USERPROFILE%` on Windows

---

## See Also

- [CLI Reference](../api/cli.md) - Complete CLI command documentation
- [Profiles](Profiles.md) - Profile manifest schema and inheritance
- [Quick Start](Quick-Start.md) - Getting started guide
- [Configuration](Configuration.md) - Config file format and examples
- [@pagemd/core](../api/core.md) - Path resolution API
