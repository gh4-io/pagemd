---
document_id: DOC-001
title: PageMD Basic Document Example
revision: 1
status: Draft
effective_date: 2026-01-03
author: Documentation Team
---

# Introduction

This document demonstrates the core features of PageMD, a Markdown-to-PDF pipeline built on Paged.js and Puppeteer. It serves as both a reference example and a test fixture for the rendering pipeline.

## Document Metadata

PageMD extracts frontmatter metadata and makes it available throughout the rendering process:

| Field | Value | Description |
|-------|-------|-------------|
| `document_id` | DOC-001 | Unique identifier |
| `revision` | 1 | Document version |
| `status` | Draft | Current state |

## Text Formatting

PageMD supports standard Markdown formatting:

- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- `inline code` for technical terms
- ~~Strikethrough~~ for deprecated content
- [Links](https://example.com) to external resources

### Blockquotes

> Blockquotes are useful for calling out important information or quoting external sources.

### Lists

Ordered lists:

1. First item
2. Second item
3. Third item

Unordered lists:

- Configuration options
- Feature capabilities
- System requirements

## Code Blocks

PageMD uses Shiki for syntax highlighting.

### JavaScript Example

```javascript
async function parseFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data, content: body } = matter(content);
  return { metadata: data, content: body };
}
```

### JSON Configuration

```json
{
  "id": "standard_letter",
  "outputs": {
    "pdf": { "enabled": true }
  }
}
```

## Tables

| Feature | Status | Notes |
|:--------|:------:|------:|
| HTML Output | Complete | Primary format |
| PDF Output | Complete | Via Puppeteer |
| PNG Export | Complete | Screenshot mode |

## Alerts

> [!NOTE]
> Notes provide additional context.

> [!WARNING]
> Warnings highlight potential issues.

> [!TIP]
> Tips offer suggestions for better usage.

## Conclusion

This example demonstrates core PageMD rendering capabilities.

---

*Generated with PageMD*
