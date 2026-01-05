# Profiles

JSON/YAML manifests controlling layouts, validation, and output generation for PageMD documents.

## Overview

Profiles are configuration manifests that define how PageMD processes Markdown files. They specify page layouts, CSS resources, output formats, validation rules, and Paged.js rendering behavior. Profiles support single-parent inheritance with deep-merge semantics, enabling reusable configurations and organizational standards.

## Contents

- [Profile Manifest Schema](#profile-manifest-schema)
- [Inheritance](#inheritance)
- [Path Resolution Order](#path-resolution-order)
- [Output Modes](#output-modes)
- [Validation Rules](#validation-rules)
- [Paged.js Configuration](#pagedjs-configuration)
- [Example: standard_letter](#example-standard_letter)
- [See Also](#see-also)

---

## Profile Manifest Schema

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Profile identifier. Must match filename exactly. |
| `description` | string | No | Human-readable profile description. |
| `extends` | string | No | Parent profile to inherit from. Single parent only. |

### Resources Block

The `resources` block consolidates all external file references:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resources.template` | string | Yes | Path to HTML template file. |
| `resources.layout` | string | No | Path to layout CSS (Paged.js @page rules). |
| `resources.css` | array | No | CSS file paths (loaded in order). |
| `resources.fonts` | array | No | Font file paths. |
| `resources.assets` | array | No | Image/asset paths. |

**HTML Template Tokens:**
- `{{content}}` - Rendered Markdown content
- `{{title}}` - Document title
- `{{meta.document_id}}` - Metadata fields (use `{{meta.field_name}}`)

**Path Resolution:** Missing files hard-fail. Paths support `${projectRoot}` and `${manifestDir}` tokens.

**Legacy Support:** The old `layout` object structure (`layout.type`, `layout.source`, `layout.css`) is deprecated but still supported via internal fallback. New profiles should use `resources.template` and `resources.layout` instead.

### Outputs Block

| Field | Type | Description |
|-------|------|-------------|
| `outputs.pdf` | object | PDF output configuration. |
| `outputs.html` | object | HTML output configuration. |
| `outputs.png` | object | PNG output configuration. |
| `outputs.jpeg` | object | JPEG output configuration. |

**Per-Output Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable output format. |
| `mode` | string | Output mode: `ACTIVE_ONLY`, `ALWAYS`, `DISABLED`. |
| `options` | object | Format-specific options (placeholder). |

### Validation Block

| Field | Type | Description |
|-------|------|-------------|
| `validation.required_fields` | array | Frontmatter fields that must be present. |

### Metadata Block

| Field | Type | Description |
|-------|------|-------------|
| `metadata.defaults` | object | Default values for missing frontmatter fields. |
| `metadata.aliases` | object | Field name aliases (e.g., `{"doc_id": "document_id"}`). |
| `metadata.date_format` | string | Date format string (e.g., `"MM/DD/YYYY"`). |

---

## Inheritance

### Mechanism

Profiles support single-parent inheritance via the `extends` field:

```json
{
  "id": "company_letter",
  "extends": "standard_letter",
  "resources": {
    "css": ["company.css"]
  }
}
```

### Merge Rules

1. **Objects:** Deep-merge recursively (nested properties merged)
2. **Arrays:** Child replaces parent entirely (no merge)
3. **Primitives:** Child value wins
4. **`null` values:** Delete inherited field

**Circular References:** Error. Inheritance chains are validated on load.

### Deep Merge Example

**Parent:**
```json
{
  "metadata": {
    "defaults": { "status": "Draft", "revision": 0 },
    "date_format": "MM/DD/YYYY"
  }
}
```

**Child:**
```json
{
  "metadata": {
    "defaults": { "status": "Review" }
  }
}
```

**Result:**
```json
{
  "metadata": {
    "defaults": { "status": "Review", "revision": 0 },
    "date_format": "MM/DD/YYYY"
  }
}
```

### Array Replacement Example

**Parent:**
```json
{
  "resources": {
    "css": ["base.css", "parent.css"]
  }
}
```

**Child:**
```json
{
  "resources": {
    "css": ["custom.css"]
  }
}
```

**Result:**
```json
{
  "resources": {
    "css": ["custom.css"]
  }
}
```

---

## Path Resolution Order

Profiles are searched in this order (highest precedence first):

1. **Markdown directory:** `.pagemd/templates/` relative to input Markdown file
2. **Config directory:** Explicit config directory (if specified via `--config`)
3. **Project root:** `project/templates/profiles/`

**Override Behavior:** If a profile exists in multiple locations, only the highest-precedence version is used.

**Filename Validation:** Filename must match `profile.id` exactly (e.g., `standard_letter.json` must contain `"id": "standard_letter"`).

---

## Output Modes

Output modes control when each format is generated:

| Mode | Behavior |
|------|----------|
| `ACTIVE_ONLY` | Generate only if explicitly requested via `--output` flag. |
| `ALWAYS` | Always generate, even if not requested. |
| `DISABLED` | Never generate (overrides `--output`). |

**CLI Override:** `--output pdf,html` forces only those outputs (ignores `ALWAYS` on other formats).

**Example:**
```json
{
  "outputs": {
    "pdf": { "enabled": true, "mode": "ACTIVE_ONLY" },
    "html": { "enabled": true, "mode": "ALWAYS" },
    "png": { "enabled": false, "mode": "DISABLED" }
  }
}
```

**Result:**
- `pagemd build doc.md` → PDF + HTML (HTML is `ALWAYS`)
- `pagemd build doc.md --output pdf` → PDF only (ignores `ALWAYS` HTML)
- `pagemd build doc.md --output png` → No output (PNG is `DISABLED`)

---

## Validation Rules

### Required Fields

Validation fails if required frontmatter fields are missing:

```json
{
  "validation": {
    "required_fields": ["document_id", "title", "revision"]
  }
}
```

### Aliases

Map alternative field names to canonical names:

```json
{
  "metadata": {
    "aliases": {
      "doc_id": "document_id",
      "rev": "revision"
    }
  }
}
```

**Behavior:** Frontmatter with `doc_id: "SOP-001"` is treated as `document_id: "SOP-001"`.

### Date Format

Specify expected date format for validation and parsing:

```json
{
  "metadata": {
    "date_format": "MM/DD/YYYY"
  }
}
```

---

## Paged.js Configuration

### Mode Selection

| Mode | Description |
|------|-------------|
| `browser` | Paged.js polyfill runs in-browser (default). |
| `cli` | Paged.js CLI prepass before Puppeteer. |

**Override Priority:** CLI flag > frontmatter > profile > default (`browser`).

### Configuration Block

```json
{
  "pagedjs": {
    "mode": "browser",
    "save_paged_html": "debug",
    "handlers": ["handlers/figures.js"],
    "styles": ["paged-overrides.css"],
    "browser_options": {
      "auto": true,
      "config_script": "handlers/paged-config.js"
    },
    "cli_options": {
      "debug": false,
      "media": "print",
      "timeout_ms": 30000,
      "page_size": "Letter",
      "landscape": false,
      "block_local": false,
      "block_remote": false,
      "allowed_paths": [],
      "allowed_domains": [],
      "outline_tags": ["h1", "h2"],
      "output_html": true
    }
  }
}
```

### Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `browser` or `cli`. |
| `save_paged_html` | string | When to save paged HTML: `debug`, `always`, `never`. |
| `handlers` | array | JS handler files to inject (maps to `--additional-script`). |
| `styles` | array | CSS files to inject. |
| `browser_options.auto` | boolean | Auto-run Paged.js polyfill. |
| `browser_options.config_script` | string | Script to set `window.PagedConfig`. |
| `cli_options.*` | various | CLI-specific flags (see table below). |

### CLI Options

| Field | Type | Description |
|-------|------|-------------|
| `debug` | boolean | Enable debug mode. |
| `media` | string | CSS media type (e.g., `print`). |
| `timeout_ms` | number | Rendering timeout in milliseconds. |
| `page_size` | string | Page size (e.g., `Letter`, `A4`). |
| `landscape` | boolean | Use landscape orientation. |
| `block_local` | boolean | Block local file access. |
| `block_remote` | boolean | Block remote URLs. |
| `allowed_paths` | array | Allowed file paths. |
| `allowed_domains` | array | Allowed remote domains. |
| `outline_tags` | array | Tags for PDF outline (e.g., `["h1", "h2"]`). |
| `output_html` | boolean | Output paged HTML. |

---

## Example: standard_letter

Default profile for US Letter documents (8.5" x 11").

**File:** `project/profiles/standard_letter.json`

```json
{
  "id": "standard_letter",
  "description": "Standard US Letter layout for SOPs and documentation",

  "resources": {
    "template": "${projectRoot}/templates/standard_letter.html",
    "layout": "${projectRoot}/layouts/letter.css",
    "css": [
      "${projectRoot}/styles/primary.css",
      "${projectRoot}/templates/standard_letter.css"
    ],
    "fonts": [],
    "assets": []
  },

  "pagedjs": {
    "mode": "browser",
    "save_paged_html": "debug"
  },

  "outputs": {
    "pdf": { "enabled": true, "mode": "ACTIVE_ONLY" },
    "html": { "enabled": false, "mode": "DISABLED" },
    "png": { "enabled": false, "mode": "DISABLED" },
    "jpeg": { "enabled": false, "mode": "DISABLED" }
  },

  "validation": {
    "required_fields": ["document_id", "title"]
  },

  "metadata": {
    "defaults": {
      "status": "Draft",
      "revision": 0
    },
    "date_format": "MM/DD/YYYY"
  }
}
```

---

## See Also

- [[Configuration]] - Config file structure and CLI options
- [[Reference]] - Full API and schema reference
