# Settings Reference

> **Section:** Reference

Environment variables and configuration options for PageMD.

## Overview

PageMD behavior can be configured through environment variables and configuration files.

## Environment Variables

### Browser Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `CHROME_PATH` | Path to Chrome/Chromium executable | Auto-detected |
| `PAGEMD_KEEP_CHROME` | Keep browser open between renders | `0` |
| `PUPPETEER_EXECUTABLE_PATH` | Alternative to `CHROME_PATH` | - |

**Example:**
```bash
export CHROME_PATH="/usr/bin/google-chrome"
pagemd build document.md -o pdf
```

### Rendering Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PAGEMD_TIMEOUT` | PDF render timeout (ms) | `30000` |
| `PAGEMD_MERMAID` | Enable Mermaid diagrams | `1` |
| `PAGEMD_SYNTAX_HIGHLIGHT` | Enable syntax highlighting | `1` |

**Disable Mermaid:**
```bash
PAGEMD_MERMAID=0 pagemd build document.md -o pdf
```

### Logging Settings

| Variable | Description | Default | Values |
|----------|-------------|---------|--------|
| `PAGEMD_LOG_LEVEL` | Logging verbosity | `OFF` | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `OFF` |
| `PAGEMD_LOG_COLOR` | Colored log output | `1` | `0`, `1` |

**Enable debug logging:**
```bash
PAGEMD_LOG_LEVEL=DEBUG pagemd build document.md -o pdf
```

### Path Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `PAGEMD_PROFILES_PATH` | Additional profiles directory | - |
| `PAGEMD_TEMPLATES_PATH` | Additional templates directory | - |
| `PAGEMD_STYLES_PATH` | Additional styles directory | - |

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
