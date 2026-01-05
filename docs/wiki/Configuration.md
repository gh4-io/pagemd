# Configuration

Config files, precedence rules, and environment variables controlling PageMD behavior.

## Overview

PageMD supports multiple configuration sources with a clear precedence hierarchy. Configuration can be specified via config files (`.pagemrc`, `.pagemrc.json`, `pagemd.config.js`), CLI flags, frontmatter overrides, profile manifests, and environment variables. This page documents config file discovery, precedence order, and workspace vs project configuration.

## Contents

- [Config File Discovery](#config-file-discovery)
- [Precedence Order](#precedence-order)
- [Config File Format](#config-file-format)
- [Environment Variables](#environment-variables)
- [Workspace vs Project Config](#workspace-vs-project-config)
- [Path Resolution](#path-resolution)
- [Examples](#examples)
- [See Also](#see-also)

---

## Config File Discovery

PageMD searches for configuration files in this order (highest precedence first):

1. **CLI `--config` flag:** Explicit path overrides all discovery.
2. **Current directory:** Starting from markdown file location, walk up to project root.
3. **Project root:** Detected by `.git`, `package.json`, or `.pagemrc`.

### Supported Filenames

| Filename | Format | Notes |
|----------|--------|-------|
| `.pagemrc` | JSON | Preferred for JSON configs |
| `.pagemrc.json` | JSON | Explicit JSON extension |
| `pagemd.config.js` | JavaScript | Module export (CommonJS or ESM) |

**Discovery Logic:**

1. Start from markdown file directory
2. Walk up to project root
3. Check for config files in order: `.pagemrc`, `.pagemrc.json`, `pagemd.config.js`
4. Use first match found
5. Stop at project root (`.git`, `package.json`, or `.pagemrc`)

**Example Directory Tree:**
```
/project/
  .pagemrc                    # Project-level config
  package.json
  docs/
    sop/
      .pagemrc                # SOP-specific config (highest precedence)
      SOP-001.md
```

**Resolution:** When processing `/project/docs/sop/SOP-001.md`, PageMD finds `/project/docs/sop/.pagemrc` first (highest precedence).

---

## Precedence Order

Configuration sources merge with this priority (highest to lowest):

1. **CLI flags** - Override all other sources
2. **Environment variables** - Cross-platform overrides (`PAGEMD_*`)
3. **Frontmatter** - Per-document overrides in markdown files
4. **Profile manifest** - Profile-specific defaults
5. **Config file** - `.pagemrc`, `.pagemrc.json`, `pagemd.config.js`
6. **Built-in defaults** - Hardcoded fallbacks

### Override Examples

**Scenario 1: Profile Selection**
- Built-in default: `standard_letter`
- Config file: `"profile": "company_letter"`
- Frontmatter: `pipeline_profile: custom_layout`
- CLI flag: `--profile standard_letter`
- **Result:** CLI wins (`standard_letter`)

**Scenario 2: Output Modes**
- Profile: `"pdf": { "mode": "ALWAYS" }`
- CLI: `--output html`
- **Result:** CLI wins (HTML only; PDF disabled despite `ALWAYS`)

**Scenario 3: Paged.js Mode**
- Profile: `"pagedjs": { "mode": "browser" }`
- Frontmatter: `pagedjs: { mode: cli }`
- CLI: `--pagedjs browser`
- **Result:** CLI wins (`browser`)

### Field-Level Merging

Objects deep-merge; arrays replace:

**Config file:**
```json
{
  "metadata": {
    "defaults": {
      "status": "Draft",
      "revision": 0
    }
  }
}
```

**Frontmatter:**
```yaml
metadata:
  defaults:
    status: "Review"
```

**Result (deep merge):**
```json
{
  "metadata": {
    "defaults": {
      "status": "Review",
      "revision": 0
    }
  }
}
```

---

## Config File Format

### JSON Format (.pagemrc, .pagemrc.json)

```json
{
  "profile": "standard_letter",
  "outputDir": "./output",
  "debugArtifacts": false,
  "validation": {
    "strict": true,
    "requiredFields": ["document_id", "title"]
  },
  "pagedjs": {
    "mode": "browser",
    "save_paged_html": "debug"
  },
  "logging": {
    "enabled": true,
    "level": "INFO",
    "targets": ["console"]
  }
}
```

### JavaScript Format (pagemd.config.js)

**CommonJS:**
```javascript
module.exports = {
  profile: 'standard_letter',
  outputDir: './output',
  debugArtifacts: false,
  validation: {
    strict: true,
    requiredFields: ['document_id', 'title']
  }
};
```

**ESM:**
```javascript
export default {
  profile: 'standard_letter',
  outputDir: './output',
  debugArtifacts: false
};
```

### Supported Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `profile` | string | Default profile ID or path | `standard_letter` |
| `outputDir` | string | Base output directory | Markdown directory |
| `debugArtifacts` | boolean | Enable debug outputs | `false` |
| `validation.strict` | boolean | Fail on validation errors | `true` |
| `validation.requiredFields` | array | Required frontmatter fields | `[]` |
| `pagedjs.mode` | string | Paged.js mode (`browser` or `cli`) | `browser` |
| `pagedjs.save_paged_html` | string | Save paged HTML (`debug`, `always`, `never`) | `debug` |
| `logging.enabled` | boolean | Enable logging | `false` |
| `logging.level` | string | Log level (TRACE/DEBUG/INFO/WARN/ERROR) | `INFO` |
| `logging.targets` | array | Output targets (`console`, `file`) | `['console']` |

---

## Environment Variables

PageMD supports `PAGEMD_*` environment variables for cross-platform configuration overrides.

**Precedence:** CLI flags > env vars > frontmatter > profile > defaults

### Quick Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PAGEMD_PROFILE` | string | `standard_letter` | Default profile |
| `PAGEMD_OUTPUT_DIR` | path | (alongside input) | Output directory |
| `PAGEMD_OUTPUT_FORMAT` | string | `html,pdf` | Comma-separated formats |
| `PAGEMD_LOG_LEVEL` | enum | `INFO` | TRACE/DEBUG/INFO/WARN/ERROR/FATAL/OFF |
| `PAGEMD_DEBUG` | boolean | `false` | Enable debug artifacts |
| `PAGEMD_BROWSER_PATH` | path | (auto-detect) | Chrome/Chromium path |
| `PAGEMD_KEEP_CHROME` | boolean | `false` | Browser persistence |
| `PAGEMD_HEADLESS` | boolean | `true` | Browser headless mode |
| `PAGEMD_PAGEDJS_MODE` | enum | `browser` | `browser` or `cli` |
| `PAGEMD_TIMEOUT` | number | `30000` | Render timeout (ms) |
| `PAGEMD_JPEG_QUALITY` | number | `90` | JPEG quality (1-100) |
| `PAGEMD_PROJECT_ROOT` | path | (auto-detect) | Project root override |
| `PAGEMD_CONFIG_DIR` | path | (none) | Additional config search path |

**Boolean values:** `1`, `true`, `yes` (enabled) or `0`, `false`, `no`, unset (disabled)

See [Settings > Environment Variables](Settings.md#environment-variables) for complete reference.

### Usage Examples

**Linux/macOS:**
```bash
export PAGEMD_PROFILE=company_letter
export PAGEMD_LOG_LEVEL=DEBUG
export PAGEMD_DEBUG=1
pagemd build SOP-001.md
```

**Windows (PowerShell):**
```powershell
$env:PAGEMD_PROFILE = "company_letter"
$env:PAGEMD_LOG_LEVEL = "DEBUG"
$env:PAGEMD_DEBUG = "1"
pagemd build SOP-001.md
```

**Windows (CMD):**
```cmd
set PAGEMD_PROFILE=company_letter
set PAGEMD_LOG_LEVEL=DEBUG
set PAGEMD_DEBUG=1
pagemd build SOP-001.md
```

---

## Workspace vs Project Config

PageMD distinguishes between workspace-level and project-level configuration.

### Project Config

**Location:** `project/` directory (product root)

**Contains:**
- Default profiles (`project/templates/profiles/`)
- Default layouts (`project/templates/layouts/`)
- Global styles (`project/styles/primary.css`)
- Schemas (`project/schemas/`)

**Purpose:** Shared defaults for all projects, shipped with PageMD.

### Workspace Config

**Location:** `.pagemd/` directory (workspace root)

**Contains:**
- Override profiles (`.pagemd/templates/profiles/`)
- Override layouts (`.pagemd/templates/layouts/`)
- Workspace-specific config (`.pagemd/config.json`)

**Purpose:** User-specific or org-specific customizations without modifying product files.

### Override Behavior

When profiles exist in both locations, workspace wins:

**Project profile:** `project/templates/profiles/standard_letter.json`
**Workspace profile:** `.pagemd/templates/profiles/standard_letter.json`

**Result:** Workspace version used; project version ignored.

**CLI `list-profiles` output:** Shows workspace version only (no duplicates).

### Directory Structure

```
/workspace/
  .pagemd/                    # Workspace config (highest precedence)
    templates/
      profiles/
        custom.json
        standard_letter.json  # Overrides project version
      layouts/
        custom.html
    config.json               # Workspace settings
  project/                    # Product root
    templates/
      profiles/
        standard_letter.json  # Default shipped profile
      layouts/
        standard_letter.html
    styles/
      primary.css
```

---

## Path Resolution

All referenced files resolve in this order:

1. **Markdown directory** - Directory containing source `.md` file
2. **Config directory** - Directory containing config file
3. **Project root** - Detected by `.git`, `package.json`, or `.pagemrc`

### Path Tokens

| Token | Description | Example Value |
|-------|-------------|---------------|
| `${markdownDir}` | Markdown file directory | `/project/docs/sop` |
| `${manifestDir}` | Profile manifest directory | `/project/templates/profiles` |
| `${projectRoot}` | Project root | `/project` |
| `${workspaceFolder}` | Workspace root | `/workspace` |

### Resolution Examples

**Scenario:** Processing `/project/docs/sop/SOP-001.md`

**Relative Path:** `assets/logo.png`

**Resolution order:**
1. `/project/docs/sop/assets/logo.png` (markdown dir) - **Found**
2. `/project/templates/assets/logo.png` (config dir)
3. `/project/assets/logo.png` (project root)

**Absolute Path:** `/shared/assets/logo.png`

**Result:** Use exact path (no resolution).

---

## Examples

### Minimal Config (.pagemrc)

```json
{
  "profile": "standard_letter"
}
```

### Full Config (.pagemrc)

```json
{
  "profile": "company_letter",
  "outputDir": "./published",
  "debugArtifacts": true,
  "validation": {
    "strict": true,
    "requiredFields": ["document_id", "title", "revision"]
  },
  "pagedjs": {
    "mode": "browser",
    "save_paged_html": "always"
  },
  "logging": {
    "enabled": true,
    "level": "DEBUG",
    "targets": ["console", "file"]
  },
  "outputs": {
    "pdf": { "mode": "ALWAYS" },
    "html": { "mode": "DISABLED" }
  }
}
```

### JavaScript Config (pagemd.config.js)

```javascript
const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  profile: isDev ? 'dev_letter' : 'standard_letter',
  debugArtifacts: isDev,
  logging: {
    enabled: isDev,
    level: isDev ? 'DEBUG' : 'WARN'
  }
};
```

---

## See Also

- [[Profiles]] - Profile manifest structure and inheritance
- [[Reference]] - Full API and schema reference
- [CLI Reference](../api/cli.md) - Command-line interface usage
