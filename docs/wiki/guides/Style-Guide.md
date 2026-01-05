# Style Guide

> **Section:** Styling & Syntax

CSS customization for fonts, colors, layouts, and print-specific styling.

---

## Key Terms

Before diving in, understand these terms:

| Term | What It Is | File Type |
|------|------------|-----------|
| **Profile** | Configuration bundle that selects templates, layouts, CSS files, and validation rules | JSON or YAML |
| **Style (CSS file)** | Visual styling—fonts, colors, spacing, typography | CSS |
| **Layout (CSS file)** | Page structure—margins, headers, footers, page size via `@page` rules | CSS |
| **Template** | HTML structure that wraps your rendered content | HTML |

**The key distinction:** A profile is a *configuration file* that *references* CSS files. CSS files contain the actual styling rules. You edit profiles to select which CSS files to use; you edit CSS files to change visual appearance.

For hands-on profile creation, see [[guides/Profiles|Working with Profiles]].

---

## Overview

PageMD uses CSS for all visual styling. This guide explains:

1. **How CSS layers work** - Which styles override which
2. **Where to put custom styles** - Profile vs frontmatter
3. **Built-in presets** - Ready-to-use style sets
4. **CSS custom properties** - Variables you can override
5. **Paged.js features** - Headers, footers, page numbers
6. **Extended syntax styling** - TOC, callouts, figures

**Prerequisites:** Basic CSS knowledge. If unfamiliar with CSS, see [MDN CSS Basics](https://developer.mozilla.org/en-US/docs/Learn/CSS/First_steps).

---

## CSS Layer Model

PageMD loads CSS files in a specific order. Later files override earlier ones—no `!important` hacks needed.

| Priority | Layer | Source | What It Controls |
|----------|-------|--------|------------------|
| 1 (lowest) | base | `styles/base.css` | CSS reset, element defaults, extended syntax classes |
| 2 | primary | `styles/primary.css` | Project-wide colors and spacing |
| 3 | layout | `layouts/*.css` | Page size, margins, headers/footers (`@page` rules) |
| 4 | syntax | `styles/syntax/shiki-base.css` | Code block structure |
| 5 | profile-css | CSS files from profile `resources.css[]` | Visual styling selected by the active profile |
| 6 (highest) | frontmatter | CSS files from document `styles[]` | Document-specific overrides |

> **Note:** Layer 5 ("profile-css") contains CSS files *referenced by* a profile—not the profile itself. The profile (JSON/YAML) selects which CSS files load; the CSS files provide the actual rules.

### Practical Example

If you want to change heading colors:

| Goal | What to Do |
|------|------------|
| All documents in project | Edit `styles/primary.css` (layer 2) |
| All documents using a profile | Create a CSS file and add it to profile `resources.css[]` (layer 5) |
| One specific document | Add a CSS file via frontmatter `styles:` (layer 6) |
| Code blocks only | Edit `styles/syntax/shiki-base.css` (layer 4) |
| Page margins/headers/footers | Edit a layout file in `layouts/` (layer 3) |

---

## Adding Custom Styles

There are two ways to add custom CSS. Choose based on scope:

| Method | Scope | Best For |
|--------|-------|----------|
| Profile `resources.css[]` | All documents using that profile | Branding, corporate styles, reusable themes |
| Frontmatter `styles:` | Single document only | One-off styling, document-specific overrides |

### Method 1: Via Profile (Recommended for Reuse)

Create a custom CSS file and reference it in your profile. The profile is a JSON/YAML configuration file; the CSS file contains actual style rules.

**Step 1:** Create your CSS file at `.pagemd/styles/my-company.css`:

```css
/* .pagemd/styles/my-company.css */
:root {
  --color-primary: #0066cc;
}

body {
  font-family: "Arial", sans-serif;
}

h1 {
  color: var(--color-primary);
}
```

**Step 2:** Create or modify a profile at `.pagemd/profiles/company.json` to reference your CSS file:

```json
{
  "id": "company",
  "extends": "standard_letter",
  "resources": {
    "css": ["my-company.css"]
  }
}
```

**What this does:**
- `"id": "company"` — Profile name (must match filename)
- `"extends": "standard_letter"` — Inherits settings from the built-in `standard_letter` profile
- `"resources.css"` — Lists CSS files to load at layer 5 (profile-css)

**Step 3:** Use the profile (which loads your CSS):

```bash
pagemd build document.md -p company
```

### Method 2: Via Frontmatter (For Single Documents)

Add document-specific styles directly in the markdown file:

```yaml
---
title: Special Report
styles:
  - special-report.css
---
```

Place `special-report.css` in the same directory as your markdown file, or in `.pagemd/styles/`.

**Note:** Frontmatter styles load last and override all other layers.

---

## Built-In Style Presets

PageMD includes ready-to-use style presets in `styles/presets/`. Use them directly or as starting points.

### modern-clean.css

Clean sans-serif aesthetic with generous whitespace.

```yaml
---
styles:
  - styles/presets/modern-clean.css
---
```

**Features:**
- Font: Inter/Segoe UI/Roboto sans-serif stack
- Subtle gray bullets, rounded code blocks
- Blue accent color (#2563eb)
- Soft blockquotes with blue left border

### technical-docs.css

Monospace-heavy styling for code and technical content.

```yaml
---
styles:
  - styles/presets/technical-docs.css
---
```

**Features:**
- Font: IBM Plex Mono for body text
- GitHub-style colors and spacing
- Enhanced table styling with zebra striping
- Keyboard shortcut styling (`<kbd>` elements)

### print-friendly.css

Optimized for physical printing with high contrast.

```yaml
---
styles:
  - styles/presets/print-friendly.css
---
```

---

## CSS Custom Properties (Variables)

PageMD defines CSS custom properties you can override in your styles.

### From primary.css

These control basic colors and are used throughout the base styles:

```css
:root {
  --color-primary: #2563eb;  /* Links, accent elements */
  --color-text: #1f2937;     /* Body text */
  --color-gray: #6b7280;     /* Muted text, captions */
}
```

**Override example:**

```css
/* Your custom CSS file */
:root {
  --color-primary: #dc2626;  /* Change accent to red */
}
```

### From layouts/letter.css

Page margin content (headers/footers) is controlled via CSS variables. All default to `none` (hidden).

| Variable | Position | Default |
|----------|----------|---------|
| `--page-header-left` | Top left | none |
| `--page-header-center` | Top center | none |
| `--page-header-right` | Top right | none |
| `--page-footer-left` | Bottom left | none |
| `--page-footer-center` | Bottom center | none |
| `--page-footer-right` | Bottom right | none |
| `--page-margin-font-size` | Header/footer text size | 9pt |

**Book binding variables** (flip on left/right pages):

| Variable | Left Pages | Right Pages |
|----------|------------|-------------|
| `--page-header-inside` | Right side | Left side |
| `--page-header-outside` | Left side | Right side |

**Enable page numbers example:**

```css
:root {
  --page-footer-center: counter(page);
}
```

---

## Syntax Highlighting

PageMD uses [shiki](https://shiki.style/) for code block highlighting.

### Setting the Theme

**Via frontmatter:**

```yaml
---
highlight_theme: github-dark
---
```

**Via profile:**

```json
{
  "resources": {
    "highlight_theme": "github-dark"
  }
}
```

### Available Themes

Default themes loaded: `github-light` (default), `github-dark`

Any [shiki bundled theme](https://shiki.style/themes) works:

| Theme | Description |
|-------|-------------|
| `github-light` | GitHub's light theme (default) |
| `github-dark` | GitHub's dark theme |
| `monokai` | Classic dark theme |
| `nord` | Arctic color palette |
| `one-dark-pro` | Atom One Dark inspired |
| `dracula` | Dracula theme |
| `vitesse-light` | Vitesse light variant |
| `vitesse-dark` | Vitesse dark variant |

### Supported Languages

24 languages pre-loaded: JavaScript, TypeScript, JSON, Bash, Shell, Python, CSS, HTML, Markdown, YAML, SQL, XML, Java, C, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, PowerShell.

### Disabling Syntax Highlighting

Set environment variable:

```bash
PAGEMD_SYNTAX_HIGHLIGHT=0 pagemd build document.md
```

---

## Paged.js Features (PDF/Print)

PageMD uses [Paged.js](https://pagedjs.org/) for CSS paged-media features. These work in PDF output.

### Page Size and Margins

```css
@page {
  size: Letter;        /* or: A4, Legal, 8.5in 11in */
  margin: 1in;         /* or: 1in 0.75in (top/bottom, left/right) */
}
```

### Page Counters

```css
@page {
  @bottom-center {
    content: counter(page);           /* Current page: "5" */
  }
  @bottom-right {
    content: counter(page) " of " counter(pages);  /* "5 of 12" */
  }
}
```

### Running Headers (String Sets)

Capture text from headings and display in margins:

```css
/* Capture the h1 text */
h1 {
  string-set: doctitle content(text);
}

/* Display it in the header */
@page {
  @top-center {
    content: string(doctitle);
    font-size: 9pt;
    color: #666;
  }
}
```

### First Page Different

Suppress headers/footers on the first page:

```css
@page :first {
  @top-center { content: none; }
  @bottom-center { content: none; }
}
```

### Left/Right Pages (Book Layout)

Different styles for even (left) and odd (right) pages:

```css
@page :left {
  margin-left: 1.25in;   /* Wider gutter margin */
  margin-right: 0.75in;
}

@page :right {
  margin-left: 0.75in;
  margin-right: 1.25in;
}
```

### Page Breaks

```css
/* Force break before each h1 */
h1 {
  break-before: page;
}

/* Prevent break after heading (keep with content) */
h2, h3 {
  break-after: avoid;
}

/* Prevent element from splitting across pages */
table, figure, pre {
  break-inside: avoid;
}

/* Control widows and orphans */
p {
  orphans: 3;  /* Min lines at bottom of page */
  widows: 3;   /* Min lines at top of page */
}
```

### Named Pages (Landscape Sections)

Create landscape pages in a portrait document:

```css
@page landscape {
  size: Letter landscape;
  margin: 0.75in 1in;
}

.page-landscape {
  page: landscape;
}
```

Use with the `::LAYOUT` directive:

```markdown
<!-- ::LAYOUT(landscape) -->

Wide content here (table, chart, etc.)

<!-- ::LAYOUT(default) -->
```

> **Known Limitation:** Landscape orientation doesn't work in HTML preview due to Paged.js polyfill limitations. Works in PDF output.

---

## Extended Syntax Styling

Base styles include CSS for extended syntax features. Override these in your custom CSS.

### Table of Contents (.toc)

```css
.toc {
  margin: 1.5rem 0;
  padding: 1rem 1.5rem;
}

.toc-title {
  font-size: 1.25em;
  font-weight: 600;
  border-bottom: 2px solid #e5e7eb;
}

.toc a {
  display: flex;
  text-decoration: none;
}

/* Leader dots (when page numbers present) */
.toc a:has(.toc-page)::after {
  content: "";
  flex: 1;
  border-bottom: 2px dotted #9ca3af;
  margin: 0 0.5rem;
}

.toc-page {
  color: #6b7280;
}
```

### GFM Alerts

```css
.markdown-alert {
  padding: 1rem 1.25rem;
  border-left: 4px solid;
  border-radius: 0 6px 6px 0;
  background: #f6f8fa;
}

.markdown-alert-note { border-color: #0969da; }
.markdown-alert-tip { border-color: #1a7f37; }
.markdown-alert-important { border-color: #8250df; }
.markdown-alert-warning { border-color: #9a6700; }
.markdown-alert-caution { border-color: #cf222e; }
```

### Figures

```css
figure {
  margin: 1.5rem 0;
  text-align: center;
  break-inside: avoid;
}

figcaption {
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

/* Width classes */
.width-full { width: 100%; }
.width-half { width: 50%; margin: 0 auto; }
.width-third { width: 33.333%; margin: 0 auto; }
```

### Mermaid Diagrams

```css
.mermaid-diagram {
  margin: 1.5rem 0;
  text-align: center;
  break-inside: avoid;
}

.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}
```

---

## Typography Examples

### Font Stacks

**Professional documents (serif):**

```css
body {
  font-family: "Georgia", "Times New Roman", "Palatino", serif;
}
```

**Modern/clean (sans-serif):**

```css
body {
  font-family: "Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif;
}
```

**Technical/code-heavy (monospace):**

```css
body {
  font-family: "IBM Plex Mono", "Menlo", "Monaco", "Consolas", monospace;
}
```

### Print-Optimized Sizing

```css
body {
  font-size: 11pt;      /* Standard body text for print */
  line-height: 1.5;     /* Comfortable reading */
}

h1 { font-size: 24pt; }
h2 { font-size: 18pt; }
h3 { font-size: 14pt; }

code {
  font-size: 9pt;       /* Slightly smaller for code */
}
```

---

## Troubleshooting

### Styles Not Applying

**Symptom:** Your CSS changes don't appear in the output.

**Diagnosis steps:**

1. **Check file path:** Verify the CSS file exists at the path specified
   ```bash
   ls .pagemd/styles/my-styles.css
   ```

2. **Check layer precedence:** Frontmatter CSS overrides profile CSS
   - If profile CSS isn't working, check if frontmatter `styles:` is set

3. **Inspect in browser:** Open the HTML output in a browser, use DevTools (F12) → Elements → Computed to see which styles are applied

4. **Check for syntax errors:** Invalid CSS silently fails
   ```bash
   # Use a CSS validator
   npx stylelint .pagemd/styles/my-styles.css
   ```

### Page Breaks in Wrong Places

**Symptom:** Tables, figures, or headings split across pages.

**Fix:**

```css
/* Prevent splitting */
table, figure, pre, .keep-together {
  break-inside: avoid;
  page-break-inside: avoid;  /* Legacy fallback */
}

/* Keep heading with following content */
h1, h2, h3 {
  break-after: avoid;
}
```

### Fonts Not Rendering in PDF

**Symptom:** Specified fonts show as fallback fonts in PDF.

**Causes and fixes:**

1. **Font not installed:** Puppeteer uses system fonts. Install the font on your system.

2. **Web font not loading:** Embed fonts in CSS:
   ```css
   @font-face {
     font-family: "CustomFont";
     src: url("./fonts/CustomFont.woff2") format("woff2");
   }
   ```

3. **Use web-safe fonts:** These work everywhere:
   - Serif: Georgia, Times New Roman, Palatino
   - Sans: Arial, Helvetica, Verdana, Tahoma
   - Mono: Courier New, Monaco, Consolas

### Headers/Footers Not Appearing

**Symptom:** `@page` margin content is blank.

**Fix:** Set the CSS variables (they default to `none`):

```css
:root {
  --page-footer-center: counter(page);
  --page-header-center: "My Document Title";
}
```

Or use traditional `@page` content directly in a layout CSS file.

---

## See Also

- [[guides/Extended-Syntax|Extended Syntax]] - TOC, callouts, figures, mermaid
- [[guides/Profiles|Working with Profiles]] - Profile configuration
- [[reference/Profile-Schema|Profile Schema]] - Full profile options
- [[reference/Settings|Settings]] - Environment variables and frontmatter
- [[reference/Glossary|Glossary]] - Term definitions
