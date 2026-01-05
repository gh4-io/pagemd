# Overview

> **Section:** General - Understanding PageMD

PageMD is a JavaScript-only pipeline that converts Markdown documents into professionally formatted HTML, PDF, PNG, and JPEG outputs.

## What is PageMD?

PageMD solves the problem of creating print-ready documents from Markdown. Unlike simple Markdown converters, PageMD provides:

- **Paged media output** - Headers, footers, page numbers, table of contents
- **Profile-driven configuration** - Reusable templates for consistent styling
- **Multiple output formats** - HTML, PDF, PNG, JPEG from a single source
- **Extended syntax** - TOC generation, Mermaid diagrams, back-of-book index

## Who is PageMD For?

- **Technical writers** creating SOPs, manuals, and reports
- **Developers** generating documentation from Markdown
- **Teams** needing consistent document formatting across projects
- **Anyone** who wants print-quality output from Markdown

## How It Works

```
Markdown → Parser → Renderer-Web → Renderer-PDF → Exporters
              ↓           ↓              ↓            ↓
         Frontmatter   HTML+CSS      Paged.js    PDF/PNG/JPEG
```

1. **Parser** - Reads Markdown, extracts frontmatter, processes extensions
2. **Renderer-Web** - Assembles HTML with templates and CSS
3. **Renderer-PDF** - Uses Paged.js + Puppeteer for print layout
4. **Exporters** - Outputs final PDF, PNG, or JPEG files

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Profile** | A configuration file (JSON/YAML) that defines templates, styles, layouts, and validation rules |
| **Template** | HTML structure that wraps your document content |
| **Layout** | CSS rules for page structure (`@page` rules, headers, footers) |
| **Style** | CSS for visual appearance (fonts, colors, spacing) |

See [[general/Concepts|Key Concepts]] for detailed explanations.

## What PageMD Doesn't Do

- **Not a Markdown editor** - Use your preferred editor (VS Code, etc.)
- **Not a CMS** - Single-file processing, not site generation
- **Not a replacement for Word/InDesign** - Optimized for technical documents

## See Also

- [[general/Architecture|Architecture]] - Detailed component diagrams
- [[general/Concepts|Key Concepts]] - Profiles, templates, CSS layers
- [[Quick-Start]] - Get started in 5 minutes
