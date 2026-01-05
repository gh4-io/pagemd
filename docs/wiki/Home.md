# PageMD

**Profile-driven Markdown to PDF/HTML pipeline for Node.js**

PageMD converts Markdown documents into professionally formatted HTML, PDF, PNG, and JPEG outputs using a hybrid Paged.js + Puppeteer renderer. Configuration is profile-driven with JSON/YAML manifests controlling layouts, validation, and outputs.

---

## Quick Links

| Getting Started | Reference | Operations |
|-----------------|-----------|------------|
| [[Installation]] | [[Profiles]] | [[Normal-Operations]] |
| [[Quick-Start]] | [[Settings]] | [[Troubleshooting]] |
| [[Configuration]] | [[Reference]] | [[Operations]] |

---

## What is PageMD?

PageMD is a JavaScript-only pipeline (Node 20+) designed for:

- **Document publishing** - SOPs, reports, technical documentation
- **Paged media output** - Print-ready PDFs with headers, footers, page numbers
- **Profile-driven configuration** - Reusable layout templates and validation rules
- **Multiple output formats** - HTML, PDF, PNG, JPEG from a single source

See [[Introduction]] for goals, non-goals, and scope.

---

## Architecture Overview

```
Markdown → Parser → Renderer-Web → Renderer-PDF → Exporters
              ↓           ↓              ↓            ↓
         Frontmatter   HTML+CSS      Paged.js    PDF/PNG/JPEG
```

See [[Architecture]] for C4 diagrams and detailed data flow.

---

## Current Status

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Core (logger, config, profiles) | Complete |
| 2 | Parser (frontmatter, extensions) | Complete |
| 3 | Renderer-Web (templates, styles) | Complete |
| 4 | Renderer-PDF (Puppeteer, Paged.js) | Complete |
| 5 | Exporters (modes, filenames) | Complete |
| 6 | CLI (build, validate, list-profiles) | Complete |
| 7 | Testing (633 tests passing) | Complete |

---

## See Also

- [[Developer-Guide]] - Repository layout and contribution
- [[Appendix]] - Examples, FAQs, edge cases
- [API Reference](../README.md) - Package documentation
