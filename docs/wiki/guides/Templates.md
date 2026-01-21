# Working with Templates

> **Section:** Usage Guide

Customize document structure using HTML templates with dynamic content tokens.

## Overview

A **template** is an HTML file that defines the structure of your rendered document. PageMD inserts your Markdown content, styles, and metadata into the template using a token replacement system.

Templates can:
- Define HTML structure (head, body, article layout)
- Include dynamic values from frontmatter metadata
- Use conditional logic for different document states
- Access profile settings for advanced customization

## Prerequisites

- [ ] PageMD installed (see [[guides/Installation|Installation Guide]])
- [ ] Basic understanding of HTML structure
- [ ] Familiarity with [[general/Concepts#Frontmatter|frontmatter]] syntax

## Template Token Syntax

Templates use `{{token}}` syntax for dynamic content replacement. PageMD supports four token patterns:

### 1. Direct Replacement

Replace a token with its value directly.

**Syntax:** `{{key}}`

```html
<main>{{content}}</main>
```

**Result:** The `content` token is replaced with your rendered Markdown HTML.

### 2. Nested Access

Access values within nested objects using dot notation.

**Syntax:** `{{object.property}}` or `{{object.nested.property}}`

```html
<title>{{metadata.title}}</title>
<span>Author: {{metadata.author}}</span>
<span>ID: {{metadata.document.id}}</span>
```

**What happens:**
- `{{metadata.title}}` → looks up `metadata` object, then `title` property
- `{{metadata.document.id}}` → traverses multiple levels: `metadata` → `document` → `id`

**If path doesn't exist:** Returns empty string (no error thrown).

### 3. Default Values

Provide a fallback value when the token is missing or null.

**Syntax:** `{{key ?? "default value"}}`

```html
<span>Author: {{metadata.author ?? "Unknown"}}</span>
<span>Version: {{metadata.version ?? "1.0"}}</span>
<span>Status: {{metadata.status ?? "Draft"}}</span>
```

**How it works:**
- If `metadata.author` exists and is not `null` → use its value
- If `metadata.author` is missing or `null` → use `"Unknown"`

**Quote styles:** Both double and single quotes work:
```html
{{metadata.author ?? "Unknown"}}
{{metadata.author ?? 'Unknown'}}
```

**Special characters:** Default values can include spaces and special characters:
```html
{{metadata.note ?? "N/A - To Be Determined"}}
```

### 4. Ternary Conditionals

Choose between two values based on a condition's truthiness.

**Syntax:** `{{key ? "truthy value" : "falsy value"}}`

```html
<span>{{metadata.is_draft ? "DRAFT" : "FINAL"}}</span>
<span>{{metadata.controlled ? "Controlled" : "Uncontrolled"}} Document</span>
<span>{{metadata.confidential ? "CONFIDENTIAL" : "PUBLIC"}}</span>
```

**How it works:**
- If value is **truthy** → returns the first string
- If value is **falsy** → returns the second string

**Truthy values:** `true`, non-empty strings, non-zero numbers, objects, arrays

**Falsy values:** `false`, `0`, `""` (empty string), `null`, `undefined`

**Examples:**

| Frontmatter | Template | Output |
|-------------|----------|--------|
| `controlled: true` | `{{metadata.controlled ? "Controlled" : "Uncontrolled"}}` | `Controlled` |
| `controlled: false` | `{{metadata.controlled ? "Controlled" : "Uncontrolled"}}` | `Uncontrolled` |
| *(missing)* | `{{metadata.controlled ? "Controlled" : "Uncontrolled"}}` | `Uncontrolled` |
| `count: 5` | `{{metadata.count ? "Has Items" : "Empty"}}` | `Has Items` |
| `count: 0` | `{{metadata.count ? "Has Items" : "Empty"}}` | `Empty` |
| `status: "active"` | `{{metadata.status ? "Active" : "Inactive"}}` | `Active` |
| `status: ""` | `{{metadata.status ? "Active" : "Inactive"}}` | `Inactive` |

**Nested keys work too:**
```html
{{metadata.document.is_controlled ? "Controlled" : "Uncontrolled"}}
```

## Available Token Objects

Templates have access to these top-level objects:

### `content`

Your rendered Markdown as HTML.

```html
<article class="document">
  {{content}}
</article>
```

### `styles`

The complete CSS style block (all layers combined).

```html
<head>
  {{styles}}
</head>
```

### `metadata`

All frontmatter fields from your document, plus profile defaults.

**Standard fields:**
```html
<title>{{metadata.title}}</title>
<meta name="author" content="{{metadata.author}}">
<span>{{metadata.date}}</span>
```

**Custom fields:** Any field you define in frontmatter is accessible:
```yaml
---
title: My Document
document_id: DOC-2025-001
revision: 3
department: Engineering
controlled_doc: true
---
```

```html
<span>ID: {{metadata.document_id}}</span>
<span>Rev: {{metadata.revision}}</span>
<span>Dept: {{metadata.department}}</span>
<span>{{metadata.controlled_doc ? "Controlled" : "Uncontrolled"}}</span>
```

### `profile`

The active profile object (useful for advanced templates).

```html
<meta name="profile" content="{{profile.id}}">
<span>Profile: {{profile.description}}</span>
```

## Using Custom Frontmatter Fields

You can define **any** custom field in your document's frontmatter and access it in templates.

### Step 1: Define Fields in Frontmatter

```yaml
---
title: Safety Procedures Manual
document_id: SAF-2025-001
revision: 4
department: Safety & Compliance
owner: Jane Smith
controlled_doc: true
confidentiality: Internal Use Only
review_date: 2026-01-15
---
```

### Step 2: Access in Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{metadata.title}}</title>
  {{styles}}
</head>
<body>
  <article class="document">
    <header class="document-header">
      <h1>{{metadata.title}}</h1>
      <div class="document-meta">
        <span class="doc-id">{{metadata.document_id}}</span>
        <span class="revision">Rev {{metadata.revision}}</span>
        <span class="status">{{metadata.controlled_doc ? "Controlled" : "Uncontrolled"}}</span>
      </div>
      <div class="document-info">
        <span>Department: {{metadata.department ?? "General"}}</span>
        <span>Owner: {{metadata.owner ?? "Unassigned"}}</span>
        <span>Classification: {{metadata.confidentiality ?? "Public"}}</span>
      </div>
    </header>
    <main class="document-content">
      {{content}}
    </main>
    <footer class="document-footer">
      <span>Review Date: {{metadata.review_date ?? "Not scheduled"}}</span>
    </footer>
  </article>
</body>
</html>
```

### Common Custom Field Patterns

**Document control:**
```yaml
---
document_id: DOC-001
revision: 2
status: Approved
controlled: true
---
```
```html
<span>{{metadata.document_id}} | Rev {{metadata.revision}}</span>
<span>{{metadata.controlled ? "CONTROLLED DOCUMENT" : "REFERENCE ONLY"}}</span>
```

**Workflow status:**
```yaml
---
draft: true
approved_by: null
approval_date: null
---
```
```html
<div class="status-banner">
  {{metadata.draft ? "DRAFT - NOT FOR DISTRIBUTION" : "APPROVED"}}
</div>
<span>Approved by: {{metadata.approved_by ?? "Pending"}}</span>
```

**Confidentiality:**
```yaml
---
confidential: true
classification: Internal
---
```
```html
<header class="{{metadata.confidential ? 'confidential' : 'public'}}">
  <span>{{metadata.classification ?? "Unclassified"}}</span>
</header>
```

**Versioning:**
```yaml
---
major_version: 2
minor_version: 1
patch: 0
---
```
```html
<span>v{{metadata.major_version}}.{{metadata.minor_version}}.{{metadata.patch ?? "0"}}</span>
```

## Creating Custom Templates

### Step 1: Create Template Directory

In your project root:

```bash
mkdir -p .pagemd/templates
```

### Step 2: Create Template File

Create `.pagemd/templates/my-template.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{metadata.title ?? "Untitled Document"}}</title>
  {{styles}}
</head>
<body>
  <article class="document">
    <!-- Header with document metadata -->
    <header class="document-header">
      <h1 class="document-title">{{metadata.title}}</h1>

      <div class="document-metadata">
        <span class="document-id">{{metadata.document_id ?? ""}}</span>
        <span class="document-status">{{metadata.status ?? "Draft"}}</span>
        <span class="document-revision">Rev {{metadata.revision ?? "0"}}</span>
      </div>

      <div class="document-control">
        <span>{{metadata.controlled ? "CONTROLLED DOCUMENT" : "UNCONTROLLED"}}</span>
      </div>
    </header>

    <!-- Main content area -->
    <main class="document-content">
      {{content}}
    </main>

    <!-- Footer -->
    <footer class="document-footer">
      <span class="author">{{metadata.author ?? "Unknown Author"}}</span>
      <span class="date">{{metadata.date ?? ""}}</span>
    </footer>
  </article>
</body>
</html>
```

### Step 3: Reference in Profile

Create or update a profile to use your template.

`.pagemd/profiles/my-profile.json`:
```json
{
  "id": "my-profile",
  "description": "Custom profile with my template",
  "extends": "standard_letter",
  "resources": {
    "template": "${workspaceFolder}/.pagemd/templates/my-template.html"
  }
}
```

### Step 4: Use the Profile

```bash
pagemd build document.md -o pdf -p my-profile
```

Or set in frontmatter:
```yaml
---
title: My Document
profile: my-profile
---
```

## Template Examples

### Minimal Template

The simplest possible template:

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{metadata.title}}</title>
  {{styles}}
</head>
<body>
  {{content}}
</body>
</html>
```

### Report Template with Title Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{metadata.title}}</title>
  {{styles}}
</head>
<body>
  <!-- Title page -->
  <section class="title-page">
    <h1 class="report-title">{{metadata.title}}</h1>
    <p class="report-subtitle">{{metadata.subtitle ?? ""}}</p>
    <div class="report-meta">
      <p>{{metadata.author ?? ""}}</p>
      <p>{{metadata.department ?? ""}}</p>
      <p>{{metadata.date ?? ""}}</p>
    </div>
    <div class="report-status">
      {{metadata.draft ? "DRAFT" : ""}}
    </div>
  </section>

  <!-- Document content -->
  <article class="report-body">
    {{content}}
  </article>
</body>
</html>
```

### SOP (Standard Operating Procedure) Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{metadata.title}} - {{metadata.document_id}}</title>
  {{styles}}
</head>
<body>
  <article class="sop-document">
    <!-- Document control header -->
    <header class="sop-header">
      <div class="sop-title-block">
        <h1>{{metadata.title}}</h1>
        <span class="sop-type">Standard Operating Procedure</span>
      </div>

      <table class="sop-control-table">
        <tr>
          <th>Document ID</th>
          <td>{{metadata.document_id ?? "TBD"}}</td>
          <th>Revision</th>
          <td>{{metadata.revision ?? "0"}}</td>
        </tr>
        <tr>
          <th>Status</th>
          <td>{{metadata.status ?? "Draft"}}</td>
          <th>Effective Date</th>
          <td>{{metadata.effective_date ?? "TBD"}}</td>
        </tr>
        <tr>
          <th>Owner</th>
          <td>{{metadata.owner ?? "Unassigned"}}</td>
          <th>Approver</th>
          <td>{{metadata.approver ?? "Pending"}}</td>
        </tr>
      </table>

      <div class="sop-control-notice">
        {{metadata.controlled ? "CONTROLLED DOCUMENT - Do not copy without authorization" : "REFERENCE COPY - Uncontrolled"}}
      </div>
    </header>

    <!-- Main content -->
    <main class="sop-content">
      {{content}}
    </main>

    <!-- Footer -->
    <footer class="sop-footer">
      <span>{{metadata.confidentiality ?? "Internal Use Only"}}</span>
      <span>Last Review: {{metadata.last_review ?? "N/A"}}</span>
      <span>Next Review: {{metadata.next_review ?? "N/A"}}</span>
    </footer>
  </article>
</body>
</html>
```

**Matching frontmatter:**
```yaml
---
title: Equipment Calibration Procedure
document_id: SOP-CAL-001
revision: 3
status: Approved
effective_date: 2026-01-15
owner: Quality Manager
approver: Operations Director
controlled: true
confidentiality: Internal Use Only
last_review: 2025-12-01
next_review: 2026-12-01
---
```

### Memo Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Memo: {{metadata.subject}}</title>
  {{styles}}
</head>
<body>
  <article class="memo">
    <header class="memo-header">
      <h1>MEMORANDUM</h1>

      <table class="memo-info">
        <tr><th>TO:</th><td>{{metadata.to ?? ""}}</td></tr>
        <tr><th>FROM:</th><td>{{metadata.from ?? ""}}</td></tr>
        <tr><th>DATE:</th><td>{{metadata.date ?? ""}}</td></tr>
        <tr><th>RE:</th><td>{{metadata.subject ?? ""}}</td></tr>
      </table>

      <hr class="memo-divider">
    </header>

    <main class="memo-body">
      {{content}}
    </main>

    <footer class="memo-footer">
      {{metadata.confidential ? "CONFIDENTIAL - Internal Distribution Only" : ""}}
    </footer>
  </article>
</body>
</html>
```

## Combining Tokens

You can use multiple token types together:

```html
<!-- Default + ternary in same element -->
<div class="header {{metadata.draft ? 'draft-mode' : 'final-mode'}}">
  <span>{{metadata.title ?? "Untitled"}}</span>
</div>

<!-- Multiple tokens in one line -->
<span>{{metadata.document_id ?? "N/A"}} | Rev {{metadata.revision ?? "0"}} | {{metadata.status ?? "Draft"}}</span>

<!-- Ternary with nested access -->
<span>{{metadata.approval.granted ? "Approved" : "Pending Approval"}}</span>
```

## Path Tokens

Templates can also use path tokens for resource references:

| Token | Description |
|-------|-------------|
| `{{PROJECT_ROOT}}` | PageMD installation directory |
| `{{MARKDOWN_DIR}}` | Directory containing the source Markdown |
| `{{WORKSPACE_FOLDER}}` | Project root (workspace) |

```html
<link rel="stylesheet" href="{{WORKSPACE_FOLDER}}/assets/custom.css">
<img src="{{MARKDOWN_DIR}}/images/logo.png" alt="Logo">
```

## Token Behavior Reference

| Scenario | Token | Result |
|----------|-------|--------|
| Value exists | `{{metadata.title}}` | Value as string |
| Value is `null` | `{{metadata.title}}` | Empty string |
| Value is `undefined` | `{{metadata.title}}` | Empty string |
| Value is `0` | `{{metadata.count}}` | `"0"` |
| Value is `false` | `{{metadata.active}}` | `"false"` |
| Value is empty string | `{{metadata.note}}` | Empty string |
| Missing with default | `{{metadata.title ?? "Untitled"}}` | `"Untitled"` |
| Present with default | `{{metadata.title ?? "Untitled"}}` | Value |
| `null` with default | `{{metadata.title ?? "Untitled"}}` | `"Untitled"` |
| `0` with default | `{{metadata.count ?? "N/A"}}` | `"0"` (0 is not null) |
| Ternary with `true` | `{{metadata.flag ? "Yes" : "No"}}` | `"Yes"` |
| Ternary with `false` | `{{metadata.flag ? "Yes" : "No"}}` | `"No"` |
| Ternary with `0` | `{{metadata.count ? "Has" : "None"}}` | `"None"` (0 is falsy) |
| Ternary with `""` | `{{metadata.text ? "Has" : "None"}}` | `"None"` (empty is falsy) |

## Styling Considerations

### Multiline Frontmatter Values

YAML supports multiline strings using the literal block scalar (`|`). However, HTML collapses whitespace by default, so line breaks won't display without CSS.

**Frontmatter with multiline title:**
```yaml
---
title: |
  Mandatory Training
  Paycor
doc_id: 001
rev: 0
---
```

**Template:**
```html
<h1 class="document-title">{{metadata.title}}</h1>
```

**Problem:** The newline character exists in the data, but HTML renders it as:
```
Mandatory Training Paycor
```

**Solution:** Add `white-space: pre-line` to preserve line breaks:

```css
.document-title {
  white-space: pre-line;
}
```

**Result:** Now renders with the line break preserved:
```
Mandatory Training
Paycor
```

### White-space CSS Property Reference

| Value | Line Breaks | Spaces | Text Wrap |
|-------|-------------|--------|-----------|
| `normal` | Collapsed | Collapsed | Yes |
| `nowrap` | Collapsed | Collapsed | No |
| `pre` | Preserved | Preserved | No |
| `pre-wrap` | Preserved | Preserved | Yes |
| `pre-line` | Preserved | Collapsed | Yes |

**Recommended:** Use `pre-line` for most cases - it preserves intentional line breaks while still collapsing multiple spaces and allowing text to wrap naturally.

### YAML Multiline String Syntax

| Indicator | Name | Behavior |
|-----------|------|----------|
| `\|` | Literal block | Preserves line breaks exactly |
| `>` | Folded block | Joins lines with spaces |
| `\|-` | Literal strip | Preserves breaks, strips trailing newline |
| `>-` | Folded strip | Joins lines, strips trailing newline |

**Literal block (`|`)** - Use when you want line breaks:
```yaml
title: |
  Line One
  Line Two
```
Result: `Line One\nLine Two\n`

**Folded block (`>`)** - Use when you want a single line:
```yaml
description: >
  This is a long description
  that spans multiple lines
  but renders as one paragraph.
```
Result: `This is a long description that spans multiple lines but renders as one paragraph.\n`

### Example: Two-Line Document Title

**Complete example with frontmatter, template, and CSS:**

**Frontmatter:**
```yaml
---
title: |
  Safety Procedures Manual
  Quarterly Update 2026
profile: my-profile
---
```

**Template snippet:**
```html
<header class="document-header">
  <h1 class="document-title">{{metadata.title}}</h1>
</header>
```

**CSS (in profile or frontmatter styles):**
```css
.document-title {
  white-space: pre-line;
  text-align: center;
  line-height: 1.3;
}
```

**Rendered output:**
```
       Safety Procedures Manual
       Quarterly Update 2026
```

## Troubleshooting

### Token not replaced (shows `{{...}}` in output)

**Possible causes:**

1. **Typo in token name** - Check spelling matches frontmatter field exactly (case-sensitive)
2. **Missing object prefix** - Frontmatter fields need `metadata.` prefix:
   ```html
   <!-- Wrong -->
   {{title}}

   <!-- Correct -->
   {{metadata.title}}
   ```
3. **Path token in wrong context** - Path tokens (`PROJECT_ROOT`, etc.) are only expanded when `pathContext` is available

### Default value not working

**Check these:**

1. **Quote style** - Default values must be quoted:
   ```html
   <!-- Wrong -->
   {{metadata.author ?? Unknown}}

   <!-- Correct -->
   {{metadata.author ?? "Unknown"}}
   ```

2. **Falsy vs null** - `??` only triggers for `null`/`undefined`, not falsy values:
   ```yaml
   count: 0  # This is 0, not null
   ```
   ```html
   {{metadata.count ?? "N/A"}}  <!-- Shows "0", not "N/A" -->
   ```

### Ternary not working as expected

**Common issues:**

1. **Syntax errors** - Must have exact format with quotes:
   ```html
   <!-- Wrong -->
   {{metadata.flag ? Yes : No}}
   {{metadata.flag ? "Yes" "No"}}

   <!-- Correct -->
   {{metadata.flag ? "Yes" : "No"}}
   ```

2. **Truthy/falsy confusion** - Remember what's falsy:
   - `false`, `0`, `""`, `null`, `undefined` → falsy
   - Everything else → truthy

   ```yaml
   count: 0  # Falsy!
   status: ""  # Falsy!
   ```

3. **Missing colon** - Both branches required:
   ```html
   <!-- Wrong -->
   {{metadata.flag ? "Yes"}}

   <!-- Correct -->
   {{metadata.flag ? "Yes" : "No"}}
   ```

### Template not found

**Check:**

1. **Profile reference** - Verify `resources.template` path in profile
2. **Path tokens** - Ensure path tokens expand correctly
3. **File exists** - Verify template file is at expected location

Enable debug logging for details:
```bash
PAGEMD_LOG_LEVEL=DEBUG pagemd build document.md -o pdf -p my-profile
```

## See Also

- [[general/Concepts#Templates|Concepts: Templates]] - Template overview
- [[guides/Profiles|Working with Profiles]] - Profile configuration
- [[reference/Profile-Schema|Profile Schema]] - Complete profile reference
- [[guides/Style-Guide|Style Guide]] - CSS customization
- [[reference/Glossary|Glossary]] - Term definitions
