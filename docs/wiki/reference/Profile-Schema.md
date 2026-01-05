# Profile Schema Reference

> **Section:** Reference

Complete field reference for profile configuration files.

## Overview

Profiles are JSON or YAML files that configure how PageMD processes documents. This reference documents all available fields.

## Profile Structure

```json
{
  "id": "profile-name",
  "extends": "parent-profile",
  "description": "Human-readable description",
  "resources": { },
  "layout": { },
  "outputs": { },
  "validation": { },
  "pagedjs": { }
}
```

## Top-Level Fields

### id

**Type:** `string` (required)

**Description:** Unique identifier for the profile. Must match the filename (without extension).

**Example:**
```json
{ "id": "my-report" }
```

**File must be named:** `my-report.json` or `my-report.yaml`

---

### extends

**Type:** `string`

**Description:** Parent profile to inherit settings from. Child values override parent values.

**Example:**
```json
{ "extends": "standard_letter" }
```

**Note:** Cannot create circular inheritance (A extends B extends A).

---

### description

**Type:** `string`

**Description:** Human-readable description shown in `pagemd list profiles`.

**Example:**
```json
{ "description": "Monthly report template with cover page" }
```

---

## resources

Resources used for rendering.

### resources.template

**Type:** `string`

**Description:** HTML template ID or path.

**Example:**
```json
{
  "resources": {
    "template": "report"
  }
}
```

**Built-in templates:** `standard`, `report`

---

### resources.layout

**Type:** `string`

**Description:** Layout CSS file (contains `@page` rules).

**Example:**
```json
{
  "resources": {
    "layout": "letter-margins.css"
  }
}
```

---

### resources.css

**Type:** `string[]`

**Description:** Array of CSS files for styling. Applied in order listed.

**Example:**
```json
{
  "resources": {
    "css": ["typography.css", "colors.css", "tables.css"]
  }
}
```

**Note:** Arrays are replaced, not merged, during inheritance.

---

### resources.highlight_theme

**Type:** `string`

**Description:** Syntax highlighting theme for code blocks.

**Example:**
```json
{
  "resources": {
    "highlight_theme": "github-dark"
  }
}
```

**Available themes:** `github-light`, `github-dark`, `monokai`, `nord`, `one-dark-pro`, etc.

---

## layout

Page layout settings.

### layout.pageSize

**Type:** `string`

**Description:** Page size for PDF output.

**Values:** `Letter`, `A4`, `Legal`, `Tabloid`, custom (e.g., `8.5in 11in`)

**Example:**
```json
{
  "layout": {
    "pageSize": "A4"
  }
}
```

---

### layout.orientation

**Type:** `string`

**Description:** Page orientation.

**Values:** `portrait`, `landscape`

**Default:** `portrait`

---

### layout.margins

**Type:** `object`

**Description:** Page margins.

**Example:**
```json
{
  "layout": {
    "margins": {
      "top": "1in",
      "right": "1in",
      "bottom": "1in",
      "left": "1in"
    }
  }
}
```

---

## outputs

Output format configuration.

### outputs.[format].mode

**Type:** `string`

**Description:** When to generate this format.

**Values:**
- `ACTIVE_ONLY` - Only when explicitly requested via `-o`
- `ALWAYS` - Always generate
- `DISABLED` - Never generate

**Example:**
```json
{
  "outputs": {
    "pdf": { "mode": "ALWAYS" },
    "html": { "mode": "ACTIVE_ONLY" },
    "png": { "mode": "DISABLED" }
  }
}
```

---

### outputs.[format].filename

**Type:** `string`

**Description:** Output filename pattern. Supports tokens.

**Tokens:** `${name}`, `${date}`, `${profile}`

**Example:**
```json
{
  "outputs": {
    "pdf": {
      "filename": "${name}-${date}.pdf"
    }
  }
}
```

---

## validation

Document validation rules.

### validation.required_fields

**Type:** `string[]`

**Description:** Frontmatter fields that must be present.

**Example:**
```json
{
  "validation": {
    "required_fields": ["title", "document_id", "revision"]
  }
}
```

---

### validation.schema

**Type:** `string`

**Description:** JSON Schema file for frontmatter validation.

**Example:**
```json
{
  "validation": {
    "schema": "sop-frontmatter.schema.json"
  }
}
```

---

### validation.strict

**Type:** `boolean`

**Description:** Fail on warnings, not just errors.

**Default:** `false`

---

## pagedjs

Paged.js renderer settings.

### pagedjs.timeout

**Type:** `number`

**Description:** Render timeout in milliseconds.

**Default:** `30000`

**Example:**
```json
{
  "pagedjs": {
    "timeout": 60000
  }
}
```

---

### pagedjs.waitForFonts

**Type:** `boolean`

**Description:** Wait for fonts to load before rendering.

**Default:** `true`

---

## Complete Example

```json
{
  "id": "corporate-report",
  "extends": "standard_letter",
  "description": "Corporate report with branding",

  "resources": {
    "template": "report",
    "layout": "corporate-layout.css",
    "css": ["corporate-branding.css", "tables.css"],
    "highlight_theme": "github-light"
  },

  "layout": {
    "pageSize": "Letter",
    "orientation": "portrait",
    "margins": {
      "top": "1.25in",
      "right": "1in",
      "bottom": "1in",
      "left": "1in"
    }
  },

  "outputs": {
    "pdf": { "mode": "ALWAYS" },
    "html": { "mode": "ACTIVE_ONLY" }
  },

  "validation": {
    "required_fields": ["title", "document_id", "author", "date"],
    "strict": false
  },

  "pagedjs": {
    "timeout": 45000
  }
}
```

## YAML Format

Same fields work in YAML:

```yaml
id: corporate-report
extends: standard_letter
description: Corporate report with branding

resources:
  template: report
  layout: corporate-layout.css
  css:
    - corporate-branding.css
    - tables.css
  highlight_theme: github-light

validation:
  required_fields:
    - title
    - document_id
```

## See Also

- [[guides/Profiles|Working with Profiles]] - How-to guide
- [[guides/Style-Guide|Style Guide]] - CSS customization
- [[reference/Settings|Settings]] - Environment configuration
