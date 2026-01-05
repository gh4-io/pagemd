# FAQ

> **Section:** Help

Frequently asked questions about PageMD.

---

## General

### What is PageMD?

PageMD is a JavaScript-only pipeline that converts Markdown documents into professionally formatted HTML, PDF, PNG, and JPEG outputs. It uses Puppeteer + Paged.js for print-quality PDF rendering with headers, footers, and page numbers.

See [[general/Overview|Overview]] for more details.

### What makes PageMD different from other Markdown converters?

- **Profile-driven** - Reusable configurations for consistent output
- **Paged media support** - Real headers, footers, page numbers, TOC with page refs
- **JS-only** - No Python, Pandoc, or external tools required
- **Extended syntax** - TOC, Mermaid diagrams, back-of-book index

### What output formats are supported?

- **HTML** - Standalone web page with embedded CSS
- **PDF** - Print-ready with paged media features
- **PNG** - First page as image
- **JPEG** - First page as compressed image

---

## Installation

### What Node.js version do I need?

Node.js 20 or later. Check with `node --version`.

### Do I need to install Chrome?

PageMD works best with system Chrome but will fall back to bundled Chromium if Chrome isn't found. System Chrome is recommended for:
- Faster startup
- Smaller install size
- Latest rendering features

### Can I use PageMD without installing globally?

Yes, use `npx`:
```bash
npx pagemd build document.md -o pdf
```

Or install locally in your project:
```bash
npm install --save-dev pagemd
npx pagemd build document.md -o pdf
```

---

## Usage

### How do I change the page size?

Use a profile with different page size, or create a custom profile:

```json
{
  "id": "a4-profile",
  "extends": "standard_letter",
  "layout": {
    "pageSize": "A4"
  }
}
```

### How do I add a table of contents?

Add the TOC directive in your Markdown:
```markdown
<!-- ::TOC -->
```

Or enable via frontmatter:
```yaml
---
toc: true
---
```

See [[guides/Extended-Syntax|Extended Syntax]] for details.

### How do I add page numbers?

Page numbers are added by the layout CSS. The default profiles include page numbers. To customize:

```css
@page {
  @bottom-center {
    content: counter(page);
  }
}
```

### Can I use custom fonts?

Yes. Add font files and reference in CSS:

```css
@font-face {
  font-family: 'MyFont';
  src: url('./fonts/myfont.woff2') format('woff2');
}

body {
  font-family: 'MyFont', sans-serif;
}
```

See [[guides/Style-Guide|Style Guide]] for details.

### How do I create a custom profile?

1. Create `.pagemd/profiles/my-profile.json`
2. Add profile configuration (can extend existing)
3. Use with `-p my-profile` or `profile: my-profile` in frontmatter

See [[guides/Profiles|Working with Profiles]] for step-by-step guide.

---

## Troubleshooting

### PDF is blank or missing content

1. Check HTML output works: `pagemd build doc.md -o html`
2. Enable debug mode: `pagemd build doc.md --debug`
3. Check for CSS `display: none` rules
4. See [[Troubleshooting#blank-incomplete-pdf|Blank PDF]] for details

### Chrome not found

Set `CHROME_PATH` environment variable:
```bash
export CHROME_PATH="/path/to/chrome"
```

Or let PageMD use bundled Chromium (first PDF will download it).

### Profile not found

1. Check spelling: `pagemd list profiles`
2. Verify file exists in `.pagemd/profiles/`
3. Verify filename matches `id` field

See [[Troubleshooting#profile-not-found|Profile Not Found]] for details.

### Build is slow

For batch builds, enable browser persistence:
```bash
export PAGEMD_KEEP_CHROME=1
pagemd build *.md -o pdf
```

### Images missing in PDF

1. Use relative paths from Markdown file location
2. Verify images load in HTML output first
3. Try absolute paths or data URIs for problematic images

See [[Troubleshooting#images-not-displaying-in-pdf|Images in PDF]] for details.

---

## Development

### How do I run tests?

```bash
npm test
```

### How do I contribute?

See [[development/Contributing|Contributing Guide]].

### Where can I report bugs?

[GitHub Issues](https://github.com/gh4-io/pagemd/issues)

---

## See Also

- [[Quick-Start]] - Get started in 5 minutes
- [[Troubleshooting]] - Detailed problem solutions
- [[reference/CLI|CLI Reference]] - All commands
