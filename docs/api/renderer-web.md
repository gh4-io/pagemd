# @pagemd/renderer-web API

HTML template rendering and document assembly for PageMD.

## Installation

```bash
npm install @pagemd/renderer-web
```

## Main Functions

### renderDocument(markdownPath, options)

Render markdown file to complete HTML document.

```javascript
import { renderDocument } from '@pagemd/renderer-web';

const result = await renderDocument('./document.md', {
  profile: 'standard_letter'
});

console.log(result.html);      // Complete HTML document
console.log(result.metadata);  // Extracted frontmatter
console.log(result.profile);   // Profile object used
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `options` (object):
  - `profile` (string): Profile ID (default: 'standard_letter')
  - `outputPath` (string): Output path (optional)
  - `projectRoot` (string): Project root (auto-detected if not provided)

**Returns:** `Promise<{ html, metadata, profile }>`

**Pipeline Steps:**
1. Parse markdown file (via @pagemd/parser)
2. Create render context (load profile, path context)
3. Load HTML template
4. Build CSS style block
5. Render template with content, styles, metadata

### renderMarkdown(markdown, options)

Render markdown string (not from file).

```javascript
import { renderMarkdown } from '@pagemd/renderer-web';

const result = await renderMarkdown(`---
title: My Document
---
# Hello World
`, {
  profile: 'standard_letter',
  metadata: { document_id: 'DOC-001' }  // Merge with parsed
});
```

**Parameters:**
- `markdown` (string): Raw markdown content
- `options` (object):
  - `profile` (string): Profile ID (default: 'standard_letter')
  - `metadata` (object): Additional metadata to merge
  - `projectRoot` (string): Project root (default: cwd)

**Returns:** `Promise<{ html, metadata }>`

### createRenderContext(options)

Create rendering context manually.

```javascript
import { createRenderContext } from '@pagemd/renderer-web';

const context = createRenderContext({
  markdownPath: './doc.md',
  profile: 'standard_letter',
  projectRoot: '/project'
});

console.log(context.profile);      // Loaded profile object
console.log(context.pathContext);  // Path resolution context
```

---

## Template Functions

### loadTemplate(profile, pathContext)

Load HTML template from profile's `layout.source` path.

```javascript
import { loadTemplate, createRenderContext } from '@pagemd/renderer-web';

const context = createRenderContext({ profile: 'standard_letter' });
const template = await loadTemplate(context.profile, context.pathContext);
```

**Returns:** HTML template string

### renderTemplate(template, context)

Render template with content and metadata.

```javascript
import { renderTemplate } from '@pagemd/renderer-web';

const html = renderTemplate(template, {
  content: '<h1>Hello</h1>',
  styles: '<style>...</style>',
  metadata: { title: 'My Doc' },
  profile: { id: 'standard_letter' },
  pathContext: { projectRoot: '/project' }
});
```

**Token Replacement:**
- `{{content}}` - Rendered HTML content
- `{{styles}}` - CSS style block
- `{{metadata.title}}` - Nested metadata access
- `{{metadata.document_id}}` - Any metadata field
- `${projectRoot}` - Path token expansion

### processTokens(template, data, pathContext)

Process `{{token}}` patterns in template string.

```javascript
import { processTokens } from '@pagemd/renderer-web';

const result = processTokens(
  'Title: {{metadata.title}} by {{metadata.owner}}',
  { metadata: { title: 'Test', owner: 'John' } }
);
// Result: 'Title: Test by John'
```

**Features:**
- Nested object access: `{{metadata.title}}`
- Missing tokens replaced with empty string
- Warning logged for missing tokens
- Path token expansion with pathContext

---

## Style Functions

### buildStyleBlock(profile, context, options)

Build complete `<style>` block for HTML templates.

```javascript
import { buildStyleBlock, createRenderContext } from '@pagemd/renderer-web';

const ctx = createRenderContext({ profile: 'standard_letter' });
const styles = await buildStyleBlock(ctx.profile, ctx.pathContext, {
  minify: true,
  frontmatterCSS: '.custom { color: red; }'
});
```

**Parameters:**
- `profile` (object): Profile manifest
- `context` (object): Path resolution context
- `options` (object):
  - `minify` (boolean): Minify CSS output (default: false)
  - `frontmatterCSS` (string): Optional inline CSS from frontmatter

**Returns:** HTML string with `<style>` tags

**CSS Layer Order:**
1. `base` - CSS reset/normalize
2. `primary` - project/styles/primary.css
3. `profile` - Profile-specific CSS
4. `frontmatter` - Inline styles from frontmatter

### formatStyleTag(css, layer)

Wrap CSS in `<style>` tag with data-layer attribute.

```javascript
import { formatStyleTag } from '@pagemd/renderer-web';

const tag = formatStyleTag('body { margin: 0; }', 'base');
// <style data-layer="base">
// body { margin: 0; }
// </style>
```

### minifyCSS(css)

Basic CSS minification.

```javascript
import { minifyCSS } from '@pagemd/renderer-web';

const min = minifyCSS(`
  body {
    margin: 0;  /* reset */
    padding: 0;
  }
`);
// 'body{margin:0;padding:0}'
```

**Removes:**
- CSS comments
- Extra whitespace
- Trailing semicolons before `}`

### inlineStyles(html, styles)

Inject styles by replacing `{{css}}` token.

```javascript
import { inlineStyles } from '@pagemd/renderer-web';

const html = inlineStyles(
  '<head>{{css}}</head>',
  '<style>body{margin:0}</style>'
);
```

---

## Template Tokens

Templates support `{{token}}` syntax:

| Token | Description |
|-------|-------------|
| `{{content}}` | Rendered markdown HTML |
| `{{styles}}` | CSS style block |
| `{{metadata.title}}` | Document title |
| `{{metadata.document_id}}` | Document ID |
| `{{metadata.revision}}` | Revision number |
| `{{metadata.status}}` | Document status |
| `{{metadata.owner}}` | Document owner |
| `{{metadata.effective_date}}` | Effective date |
| `{{profile.id}}` | Profile ID |

**Path Tokens** (expanded via @pagemd/core):
- `${projectRoot}` - Project root directory
- `${markdownDir}` - Markdown file directory
- `${manifestDir}` - Profile manifest directory

---

## Example Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{metadata.title}}</title>
  {{styles}}
</head>
<body>
  <header>
    <span class="doc-id">{{metadata.document_id}}</span>
    <span class="revision">Rev. {{metadata.revision}}</span>
  </header>
  <main>
    {{content}}
  </main>
  <footer>
    <span class="status">{{metadata.status}}</span>
  </footer>
</body>
</html>
```
