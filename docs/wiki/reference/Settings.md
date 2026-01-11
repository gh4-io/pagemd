# Settings Reference

> **Section:** Reference

Environment variables and configuration options for PageMD.

## Overview

PageMD behavior can be configured through environment variables and configuration files.

## Environment Variables

All `PAGEMD_*` environment variables are read once at startup and cached. CLI flags take precedence over environment variables.

### Core Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PAGEMD_PROFILE` | Default profile ID or path | `standard_letter` |
| `PAGEMD_OUTPUT_DIR` | Default output directory | Same as input |
| `PAGEMD_OUTPUT_FORMAT` | Comma-separated output formats | `html,pdf` |

**Example:**
```bash
export PAGEMD_PROFILE=technical_report
export PAGEMD_OUTPUT_FORMAT=pdf,html
pagemd build document.md
```

### Browser Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PAGEMD_BROWSER_PATH` | Path to Chrome/Chromium executable | Auto-detected |
| `PAGEMD_KEEP_CHROME` | Keep browser open between renders | `0` (false) |
| `PAGEMD_HEADLESS` | Run browser in headless mode | `1` (true) |
| `CHROME_PATH` | Alternative to `PAGEMD_BROWSER_PATH` | Auto-detected |

**Example:**
```bash
export PAGEMD_BROWSER_PATH="/usr/bin/google-chrome"
pagemd build document.md -o pdf
```

**Debug with visible browser (non-headless mode):**
```bash
# Browser window stays open for inspection after PDF generation
PAGEMD_HEADLESS=0 pagemd build document.md -o pdf
```

**Non-headless mode behavior:**
- PDF renders normally
- Tab stays open (can use DevTools F12)
- Browser window remains visible (orphaned process)
- CLI process exits cleanly (no timeout)
- Message: `📋 Browser left open for inspection. Close it manually when done.`

This is useful for debugging CSS layout issues, Paged.js rendering, and margin/page-break behavior.

See [[Troubleshooting#non-headless-mode-for-inspection]] for details.

### Rendering Settings

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `PAGEMD_TIMEOUT` | PDF render timeout (ms) | `30000` | 1000-600000 |
| `PAGEMD_PAGEDJS_MODE` | Paged.js execution mode | `browser` | `browser`, `cli` |
| `PAGEMD_COLOR_SCHEME` | Color scheme for rendering | `light` | `light`, `dark`, `auto` |
| `PAGEMD_MERMAID` | Enable Mermaid diagrams | `1` (true) | `0`, `1` |
| `PAGEMD_SYNTAX_HIGHLIGHT` | Enable syntax highlighting | `1` (true) | `0`, `1` |

**Color scheme control:**

The `PAGEMD_COLOR_SCHEME` variable controls whether documents render in light or dark mode:

- `light` - Force light mode (default for PDF, print-friendly)
- `dark` - Force dark mode
- `auto` - Follow system preference (default for HTML)

**Example - dark mode PDF:**
```bash
PAGEMD_COLOR_SCHEME=dark pagemd build document.md -o pdf
```

**Override priority:** frontmatter > profile > environment > default

**In profile:**
```json
{
  "rendering": {
    "colorScheme": "light"
  }
}
```

**In frontmatter:**
```yaml
---
colorScheme: dark
---
```

**Disable Mermaid:**
```bash
PAGEMD_MERMAID=0 pagemd build document.md -o pdf
```

### Output Settings

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `PAGEMD_JPEG_QUALITY` | JPEG output quality | `90` | 1-100 |
| `PAGEMD_DEBUG` | Enable debug artifacts | `0` (false) | `0`, `1` |

**Enable debug artifacts:**
```bash
PAGEMD_DEBUG=1 pagemd build document.md -o pdf
# Creates debug/ folder with .paged.html and .screenshot.png
```

### Logging Settings

| Variable | Description | Default | Values |
|----------|-------------|---------|--------|
| `PAGEMD_LOG_LEVEL` | Logging verbosity + build output format | `OFF` (production) | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `OFF` |
| `PAGEMD_LOG_COLOR` | Colored log output | Auto | `0` (off), `1` (on) |

**Log levels control two things:**

1. **Internal diagnostic messages** - Logger verbosity (TRACE/DEBUG/INFO/WARN/ERROR/FATAL)
2. **Build output format** - How processing progress is displayed

**Build output by log level:**

| Level | Build Output | Description |
|-------|--------------|-------------|
| `OFF` or unset | Silent | No build progress output (production default) |
| `FATAL`-`INFO` | Compact | `timestamp [PageMD-CLI] Processing: filename.md` with indented sub-items |
| `DEBUG`-`TRACE` | Full report | Compact header + DEBUG MODE ACTIVE banner + Loaded Resources + Directory Context |

**Compact output format (WARN level recommended for clean output):**
```
2026-01-11 13:57:38.440 [PageMD-CLI] Processing: 01-basic-document.md
	✓ Success: 1 outputs created
2026-01-11 13:57:38.682 [PageMD-CLI] Build Summary:
	Total files: 1
	Successful: 1
	Failed: 0
	Total outputs: 1
	Duration: 0.25s
```

**DEBUG output format:**
```
2026-01-11 13:57:38.440 [PageMD-CLI] Processing: 01-basic-document.md
	✓ Success: 1 outputs created
2026-01-11 13:57:38.682 [PageMD-CLI] Build Summary:
======================================================================
  DEBUG MODE ACTIVE
======================================================================

Build Summary:
  Total files: 1
  ...

Loaded Resources:
  Styles (merge order):
     [base] styles/base.css
           /path/to/styles/base.css (29.5 KB)
  ...
----------------------------------------------------------------------
```

**Recommendation:**
- **For clean build output:** Use `PAGEMD_LOG_LEVEL=WARN` (shows only build progress, no internal diagnostics)
- **For debugging issues:** Use `PAGEMD_LOG_LEVEL=DEBUG` (shows full resource loading report)

**Enable debug logging:**
```bash
PAGEMD_LOG_LEVEL=DEBUG pagemd build document.md -o pdf
```

### Advanced Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PAGEMD_PROJECT_ROOT` | Override project root detection | Auto-detected |
| `PAGEMD_CONFIG_DIR` | Additional config search path | - |

These are rarely needed - PageMD auto-detects project structure.

## Configuration Files

### Project Configuration

Create `.pagemd/config.json` in your project root:

```json
{
  "defaultProfile": "my-profile",
  "outputDir": "./dist",
  "outputs": {
    "pdf": { "mode": "ACTIVE_ONLY" },
    "html": { "mode": "ALWAYS" }
  }
}
```

### User Configuration

Create `~/.pagemd/config.json` for user-wide defaults:

```json
{
  "defaultProfile": "standard_a4",
  "browser": {
    "executablePath": "/usr/bin/chromium"
  }
}
```

## Output Modes

Control which formats are generated:

| Mode | Behavior |
|------|----------|
| `ACTIVE_ONLY` | Output only when explicitly requested via `-o` |
| `ALWAYS` | Always output this format |
| `DISABLED` | Never output this format |

**In profile:**
```json
{
  "outputs": {
    "pdf": { "mode": "ALWAYS" },
    "html": { "mode": "ACTIVE_ONLY" },
    "png": { "mode": "DISABLED" }
  }
}
```

## Frontmatter Settings

These frontmatter fields override profile settings:

| Field | Type | Description |
|-------|------|-------------|
| `profile` | string | Profile ID to use |
| `title` | string | Document title |
| `author` | string | Document author |
| `date` | string | Document date |
| `toc` | boolean | Generate table of contents |
| `toc_levels` | string | TOC heading levels (e.g., `"2-3"`) |
| `toc_title` | string | TOC section title |
| `colorScheme` | string | Color scheme (`light`, `dark`, `auto`) |
| `highlight_theme` | string | Syntax highlighting theme |
| `styles` | array | Additional CSS files |

**Example frontmatter:**
```yaml
---
title: My Document
profile: report
toc: true
toc_levels: "2-4"
highlight_theme: github-dark
styles:
  - custom.css
---
```

## Profile Settings

See [[reference/Profile-Schema|Profile Schema]] for complete profile field reference.

## Precedence Order

Settings are applied in this order (later overrides earlier):

1. Built-in defaults
2. User config (`~/.pagemd/config.json`)
3. Project config (`.pagemd/config.json`)
4. Profile settings
5. Frontmatter
6. CLI flags

## See Also

- [[reference/Profile-Schema|Profile Schema]] - All profile fields
- [[reference/CLI|CLI Reference]] - Command-line options
- [[Troubleshooting]] - Configuration issues
