# Quick Start

## Installation

```bash
cd project
npm install
```

## Basic Usage

### Render Markdown to HTML

```javascript
import { renderDocument } from '@pagemd/renderer-web';

const result = await renderDocument('./document.md', {
  profile: 'standard_letter'
});

console.log(result.html);      // Complete HTML document
console.log(result.metadata);  // Extracted frontmatter
```

### Parse Markdown Only

```javascript
import { parse, parseFile } from '@pagemd/parser';

// From string
const { html, metadata } = parse(`---
title: My Document
document_id: DOC-001
---
# Hello World
`);

// From file
const result = await parseFile('./document.md');
```

### Load Profile

```javascript
import { loadProfileSync, createPathContext } from '@pagemd/core';

const profile = loadProfileSync('standard_letter', process.cwd(), process.cwd());
console.log(profile.id);           // 'standard_letter'
console.log(profile.layout.source); // Path to HTML template
```

## Markdown Extensions

### Callouts

```markdown
[[WARNING]] This is a warning message.

[!DANGER] This is a danger alert.

[[WARNING]]
Multi-line warning content here.
[[/WARNING]]
```

### Figures

```markdown
<!-- ::FIGURE caption="My Caption" -->
![Alt text](image.png)
```

### Wiki-Links (Obsidian)

```markdown
[[Page Name]]
[[Target Page|Display Text]]
![[embedded-image.png]]
```

## Frontmatter

```yaml
---
title: Document Title
document_id: DOC-001
revision: 1
status: Draft
owner: John Doe
pipeline_profile: standard_letter
---
```

### Supported Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Document title |
| `document_id` | string | Unique identifier |
| `revision` | number | Version number |
| `status` | string | Draft, Review, Approved |
| `owner` | string | Document owner |
| `approver` | string | Document approver |
| `effective_date` | date | Effective date |
| `pipeline_profile` | string | Profile to use |
| `tags` | array | Document tags |

## Profiles

Profiles are JSON/YAML files that control layout and behavior:

```json
{
  "id": "standard_letter",
  "layout": {
    "type": "html",
    "source": "${projectRoot}/templates/layouts/standard_letter.html"
  },
  "resources": {
    "css": ["${projectRoot}/styles/primary.css"]
  },
  "validation": {
    "required_fields": ["document_id", "title"]
  }
}
```

See [Profiles](./profiles.md) for full documentation.
