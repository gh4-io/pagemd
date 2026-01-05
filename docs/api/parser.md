# @pagemd/parser API

Markdown parsing with frontmatter extraction, metadata normalization, and custom extensions.

## Installation

```bash
npm install @pagemd/parser
```

## Main Functions

### parse(markdown, options)

Parse markdown string with frontmatter extraction.

```javascript
import { parse } from '@pagemd/parser';

const result = parse(`---
title: My Document
document_id: DOC-001
---
# Hello World
`);

console.log(result.html);      // Rendered HTML
console.log(result.metadata);  // { title: 'My Document', document_id: 'DOC-001', ... }
console.log(result.content);   // Markdown without frontmatter
console.log(result.raw);       // Raw frontmatter YAML string
```

**Parameters:**
- `markdown` (string): Raw markdown content
- `options` (object): Parser configuration
  - `normalizeMetadata` (boolean): Apply normalization (default: true)
  - `html` (boolean): Enable HTML tags (default: true)
  - `linkify` (boolean): Auto-convert URLs (default: true)
  - `typographer` (boolean): Smart quotes (default: true)
  - `wikilinks` (object): Wiki-link plugin options

**Returns:** `{ content, html, metadata, raw }`

### parseFile(filePath, options)

Parse markdown file (async).

```javascript
import { parseFile } from '@pagemd/parser';

const result = await parseFile('./document.md');
```

### createParser(options)

Create configured markdown-it instance.

```javascript
import { createParser } from '@pagemd/parser';

const md = createParser({
  html: true,
  wikilinks: { baseUrl: '/pages' }
});

const html = md.render('# Hello');
```

---

## Frontmatter

### extractFrontmatter(markdown)

Extract YAML frontmatter from markdown.

```javascript
import { extractFrontmatter } from '@pagemd/parser';

const { content, metadata, raw } = extractFrontmatter(`---
title: Test
---
# Content
`);
```

**Returns:**
- `content`: Markdown without frontmatter
- `metadata`: Parsed YAML as object
- `raw`: Raw YAML string

---

## Metadata Normalization

### normalizeMetadata(raw, options)

Normalize metadata object (keys, types, defaults).

```javascript
import { normalizeMetadata } from '@pagemd/parser';

const normalized = normalizeMetadata({
  docId: 'DOC-001',       // Aliased to document_id
  revision: '2',           // Coerced to number
  effectiveDate: '01/15/2025'  // Parsed and formatted
});

// Result: { document_id: 'DOC-001', revision: 2, effective_date: '01/15/2025', ... }
```

**Normalization Rules:**
- Keys converted to snake_case
- Aliases resolved (see FIELD_ALIASES)
- Numbers coerced from strings
- Dates parsed from multiple formats
- Arrays normalized (single values wrapped)
- Default values applied for missing fields

### normalizeKey(key)

Convert key to snake_case.

```javascript
import { normalizeKey } from '@pagemd/parser';

normalizeKey('documentId');    // 'document_id'
normalizeKey('effective-date'); // 'effective_date'
```

### normalizeValue(key, value)

Normalize value based on field type.

```javascript
import { normalizeValue } from '@pagemd/parser';

normalizeValue('revision', '5');        // 5 (number)
normalizeValue('tags', 'single');       // ['single'] (array)
normalizeValue('effective_date', '01/15/2025'); // '01/15/2025' (formatted)
```

### applyDefaults(metadata, defaults)

Apply default values for missing fields.

```javascript
import { applyDefaults } from '@pagemd/parser';

const result = applyDefaults({ title: 'Test' });
// Adds: document_id, revision, status, etc.
```

### FIELD_ALIASES

Mapping of alternate field names to canonical names.

```javascript
import { FIELD_ALIASES } from '@pagemd/parser';

// docId -> document_id
// rev -> revision
// date -> effective_date
// profile -> pipeline_profile
```

---

## Markdown Extensions

### Callouts

Block callouts with `[[WARNING]]` and `[[DANGER]]` syntax:

```markdown
[[WARNING]] This is a warning message.

[[DANGER]]
Multi-line danger content.
More content here.
[[/DANGER]]
```

Inline callouts with `[!WARNING]` and `[!DANGER]`:

```markdown
This is [!WARNING] an inline warning.
```

**Output HTML:**
```html
<div class="callout callout-warning">
  <span class="callout-label">WARNING</span>
  <div class="callout-content">This is a warning message.</div>
</div>
```

### Figures

Auto-numbered figures with caption:

```markdown
<!-- ::FIGURE caption="System Architecture" -->
![Architecture diagram](arch.png)
```

**Output HTML:**
```html
<figure>
  <img src="arch.png" alt="Architecture diagram">
  <figcaption>Figure 1: System Architecture</figcaption>
</figure>
```

Figures are numbered sequentially within each parse.

### Wiki-Links (Obsidian)

```markdown
[[Page Name]]               <!-- Link to page -->
[[Target Page|Display]]     <!-- Link with display text -->
![[image.png]]              <!-- Embedded image -->
```

**Output HTML:**
```html
<a href="Page Name" class="wikilink">Page Name</a>
<a href="Target Page" class="wikilink">Display</a>
<img src="image.png" alt="image.png" class="embedded-image">
```

**Wiki-link Options:**
```javascript
const md = createParser({
  wikilinks: {
    baseUrl: '/wiki',           // Prepended to link hrefs
    imageBaseUrl: '/assets',    // Prepended to image srcs
    linkClass: 'wiki-link',     // CSS class for links
    imageClass: 'wiki-image'    // CSS class for images
  }
});
```

---

## Extension Plugins

### calloutPlugin(md)

Register callout extension with markdown-it.

```javascript
import MarkdownIt from 'markdown-it';
import { calloutPlugin } from '@pagemd/parser';

const md = new MarkdownIt();
md.use(calloutPlugin);
```

### figurePlugin(md)

Register figure extension with markdown-it.

```javascript
import { figurePlugin } from '@pagemd/parser';

md.use(figurePlugin);
```

### wikilinkPlugin(md, options)

Register wiki-link extension.

```javascript
import { wikilinkPlugin } from '@pagemd/parser';

md.use(wikilinkPlugin, {
  baseUrl: '/pages',
  imageBaseUrl: '/images'
});
```

### registerExtensions(md)

Register all PageMD extensions (callouts + figures).

```javascript
import { registerExtensions } from '@pagemd/parser';

registerExtensions(md);
```

---

## Supported Date Formats

The metadata normalizer accepts these date formats:
- ISO 8601: `2025-01-15`
- US format: `01/15/2025`, `1/15/25`
- Dash format: `01-15-2025`
- Text format: `15 Jan 2025`

All dates are normalized to `MM/DD/YYYY` output format.
