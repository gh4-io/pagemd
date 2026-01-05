# PageMD Documentation

PageMD is a JavaScript-only pipeline that converts Markdown into HTML, PDF, PNG, and JPEG using profile-driven configuration.

## Table of Contents

- [Quick Start](./quick-start.md)
- [Installation](./installation.md)
- [Configuration](./configuration.md)
- API Reference
  - [@pagemd/core](./api/core.md)
  - [@pagemd/parser](./api/parser.md)
  - [@pagemd/renderer-web](./api/renderer-web.md)
  - [@pagemd/renderer-pdf](./api/renderer-pdf.md) *(pending)*
- [Profiles](./profiles.md)
- [Troubleshooting](./troubleshooting.md)

## Overview

### Architecture

```
Markdown → Parser → HTML Renderer → PDF Renderer → Output
              ↓           ↓              ↓
         Metadata    Templates      Paged.js
         Normalize   + Styles       + Puppeteer
```

### Packages

| Package | Purpose |
|---------|---------|
| `@pagemd/core` | Logger, config, path resolution, profile loading |
| `@pagemd/parser` | Markdown parsing, frontmatter, metadata normalization |
| `@pagemd/theme-kit` | CSS layer management, asset resolution |
| `@pagemd/renderer-web` | HTML template rendering, document assembly |
| `@pagemd/renderer-pdf` | PDF generation via Paged.js + Puppeteer |
| `@pagemd/exporters` | Output packaging, format conversion |
| `@pagemd/cli` | Command-line interface |

### Features

- **Profile-driven:** JSON/YAML manifests control layouts, validation, and outputs
- **Markdown extensions:** Callouts, figures, Obsidian wiki-links
- **Multiple outputs:** PDF, HTML, PNG, JPEG
- **Hybrid PDF:** Paged.js polyfill + Puppeteer rendering
- **Structured logging:** UTC timestamps, module/section/result format

## Current Status

| Phase | Status |
|-------|--------|
| Core infrastructure | ✅ Complete |
| Parser + HTML | ✅ Complete |
| PDF rendering | ⏳ In progress |
| CLI + Exporters | Pending |
| Testing + Polish | Pending |

## Requirements

- Node.js 20+
- Chrome/Chromium (for PDF rendering)
