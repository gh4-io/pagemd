# Architecture

> **Section:** General - Understanding PageMD

<!-- TODO: Migrate C4 diagrams and detailed content from existing Architecture.md -->

How PageMD components connect to transform Markdown into formatted output.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PageMD CLI                              │
├─────────────────────────────────────────────────────────────────┤
│  Core  │  Parser  │  Renderer-Web  │  Renderer-PDF  │ Exporters │
└─────────────────────────────────────────────────────────────────┘
              │              │               │              │
              ▼              ▼               ▼              ▼
         Frontmatter     HTML+CSS      Paged.js+       PDF/PNG/
         + Metadata      Assembly       Puppeteer        JPEG
```

## Component Responsibilities

### Core
- Configuration management
- Profile loading and inheritance
- Path resolution
- Logging

### Parser
- Markdown to HTML conversion
- Frontmatter extraction
- Extended syntax processing (TOC, Mermaid, Index)
- Metadata generation

### Renderer-Web
- HTML template assembly
- CSS layer merging (6-layer model)
- Token expansion (`${title}`, `${author}`, etc.)
- Static asset handling

### Renderer-PDF
- Puppeteer browser orchestration
- Paged.js print rendering
- Page layout (headers, footers, page numbers)
- Screenshot generation (PNG/JPEG)

### Exporters
- Output file writing
- Output mode handling (`ACTIVE_ONLY`, `ALWAYS`, `DISABLED`)
- Filename generation

## Data Flow

```
Input:     document.md + profile.json
              │
              ▼
Parser:    { html, frontmatter, metadata }
              │
              ▼
Web:       Full HTML document with CSS
              │
              ▼
PDF:       Paged HTML with print layout
              │
              ▼
Export:    document.pdf / document.html / document.png
```

## CSS Layer Model

PageMD uses a 6-layer CSS model (later layers override earlier):

| Priority | Layer | Source | Purpose |
|----------|-------|--------|---------|
| 1 | base | `styles/base.css` | CSS reset, defaults |
| 2 | primary | `styles/primary.css` | Project overrides |
| 3 | layout | `layouts/*.css` | Page structure, `@page` rules |
| 4 | syntax | `styles/syntax/*.css` | Code highlighting |
| 5 | profile | Profile `resources.css[]` | Visual styling |
| 6 | frontmatter | Document `styles[]` | Document-specific |

## See Also

- [[general/Overview|Overview]] - What PageMD does
- [[general/Concepts|Key Concepts]] - Profiles, templates, layers
- [[development/Setup|Development Setup]] - Repository structure
