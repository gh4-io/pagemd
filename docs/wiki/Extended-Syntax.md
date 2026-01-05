# Extended Markdown Syntax

Comprehensive reference for PageMD's extended markdown syntax, enabling clean paged media authoring without raw HTML.

## Overview

PageMD extends standard markdown with three mechanisms:

| Mechanism | Syntax | Purpose |
|-----------|--------|---------|
| **Comment Directives** | `<!-- ::KEYWORD -->` | Structural controls (page breaks, sections) |
| **GFM Alerts** | `> [!NOTE]` | Visible callout blocks |
| **Inline Attributes** | `{.class #id}` | Element styling |
| **Container Blocks** | `:::name` | Custom wrapper blocks |

These extensions replace raw HTML with intent-based syntax that renders cleanly in standard markdown viewers while providing precise control for PDF output.

## Contents

- [Comment Directives](#comment-directives)
  - [PAGEBREAK](#pagebreak)
  - [TOC](#toc)
  - [FIGURE](#figure)
  - [SECTION_START / SECTION_END](#section_start--section_end)
  - [COVER_START / COVER_END](#cover_start--cover_end)
  - [LAYOUT](#layout)
  - [INCLUDE](#include)
- [GFM Alerts](#gfm-alerts)
- [Custom Callouts](#custom-callouts)
- [Container Blocks](#container-blocks)
- [Inline Attributes](#inline-attributes)
- [Wikilinks](#wikilinks)
- [CSS Styling Reference](#css-styling-reference)
- [Implementation Details](#implementation-details)
- [See Also](#see-also)

---

## Comment Directives

Comment directives use HTML comment syntax with a `::` prefix. They're invisible in standard markdown viewers but processed by PageMD.

**General Pattern:**
```markdown
<!-- ::KEYWORD param="value" -->
```

### PAGEBREAK

Force a page break in PDF output.

**Syntax:**
```markdown
<!-- ::PAGEBREAK -->
```

**Output:**
```html
<div class="break-page"></div>
```

**Usage:**
```markdown
# Chapter 1

Content for chapter 1...

<!-- ::PAGEBREAK -->

# Chapter 2

Content for chapter 2...
```

**How it works:** The break uses a two-pronged CSS approach for Paged.js compatibility:
1. The `.break-page` element has `break-after: always`
2. The adjacent sibling selector `.break-page + *` applies `break-before: page` to the next element

This ensures reliable page breaks even with empty marker elements.

### TOC

Insert a table of contents placeholder.

**Syntax:**
```markdown
<!-- ::TOC -->
<!-- ::TOC levels=2 -->
<!-- ::TOC levels="4" -->
```

**Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `levels` | `3` | Heading depth to include (1-6) |

**Output:**
```html
<div class="toc-placeholder" data-levels="3"></div>
```

**Note:** The placeholder is styled with a dashed border and message. Actual TOC generation requires additional processing (see [[Appendix]] for future plans).

### FIGURE

Create a numbered figure with caption and optional cross-reference ID.

**Syntax:**
```markdown
<!-- ::FIGURE src="image.png" caption="Description" -->
<!-- ::FIGURE src="diagram.png" caption="System Architecture" id="fig-arch" width="full" -->
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `src` | Yes* | Image source path |
| `caption` | Yes | Figure caption text |
| `id` | No | Cross-reference ID |
| `width` | No | Size class: `full`, `half`, `third`, `quarter` |

*`src` can be omitted if image is on the next line (legacy syntax).

**Output:**
```html
<figure id="fig-arch" class="width-full">
  <img src="diagram.png" alt="System Architecture">
  <figcaption>Figure <span class="fig-num">1</span>: System Architecture</figcaption>
</figure>
```

**Auto-numbering:** Figures are numbered sequentially (Figure 1, Figure 2, etc.) within each document. Counter resets per render.

**Legacy Syntax (still supported):**
```markdown
<!-- ::FIGURE caption="Description" -->
![](image.png)
```

### SECTION_START / SECTION_END

Wrap content in a styled `<div>` container.

**Syntax:**
```markdown
<!-- ::SECTION_START class="sidebar" -->

Sidebar content here...

<!-- ::SECTION_END -->
```

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `class` | CSS class(es) for the div |
| `id` | HTML id attribute |

**Output:**
```html
<div class="sidebar">
Sidebar content here...
</div>
```

**Multi-column Example:**
```markdown
<!-- ::SECTION_START class="cols-2" id="two-col" -->

This content flows into two columns using CSS `column-count: 2`.

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

<!-- ::SECTION_END -->
```

**CSS for columns:**
```css
.cols-2 {
  column-count: 2;
  column-gap: 2rem;
}
```

### COVER_START / COVER_END

Wrap content as a cover page section.

**Syntax:**
```markdown
<!-- ::COVER_START -->

# Document Title

**Author Name**
December 2024

<!-- ::COVER_END -->
```

**Output:**
```html
<div class="cover">
<h1>Document Title</h1>
<p><strong>Author Name</strong><br>December 2024</p>
</div>
```

**Typical CSS for cover:**
```css
.cover {
  page: cover;
  break-after: page;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

@page cover {
  margin: 0;
  @bottom-center { content: none; }
}
```

### LAYOUT

Switch to a named page layout mid-document.

**Syntax:**
```markdown
<!-- ::LAYOUT(landscape) -->

Wide table or diagram here...

<!-- ::LAYOUT(default) -->
```

**Alternative syntax:**
```markdown
<!-- ::LAYOUT name="landscape" -->
```

**Output:**
```html
</div>
<div class="page-landscape">
```

**Warning:** This directive closes the previous section and opens a new one. Ensure your CSS defines the named page:

```css
@page landscape {
  size: letter landscape;
}

.page-landscape {
  page: landscape;
}
```

### INCLUDE

Include content from another markdown file.

**Syntax:**
```markdown
<!-- ::INCLUDE path="chapters/intro.md" -->
```

**Note:** This is processed by `markdown-it-include` plugin. The directive syntax is a fallback that outputs a placeholder if the include plugin isn't configured.

**Alternative syntax (plugin native):**
```markdown
!!!include(chapters/intro.md)!!!
```

---

## GFM Alerts

GitHub-Flavored Markdown alerts for callout blocks. Supported by GitHub, VS Code, and many markdown renderers.

**Syntax:**
```markdown
> [!NOTE]
> Additional context or helpful information.

> [!TIP]
> Optional advice to help users be more successful.

> [!IMPORTANT]
> Key information users need to know.

> [!WARNING]
> Urgent info that needs immediate attention.

> [!CAUTION]
> Advises about risks or negative outcomes.
```

**Supported Types:**

| Type | Color | Use Case |
|------|-------|----------|
| `NOTE` | Blue | Supplementary information |
| `TIP` | Green | Helpful suggestions |
| `IMPORTANT` | Purple | Critical information |
| `WARNING` | Yellow | Potential issues |
| `CAUTION` | Red | Dangerous actions |

**Output Structure:**
```html
<div class="markdown-alert markdown-alert-note">
  <p class="markdown-alert-title">Note</p>
  <p>Additional context or helpful information.</p>
</div>
```

---

## Custom Callouts

PageMD's native callout syntax for inline and block callouts.

**Block Syntax:**
```markdown
[[WARNING]]
This is a warning message.
[[/WARNING]]

[[DANGER]]
Critical safety information!
[[/DANGER]]
```

**Single-line Syntax:**
```markdown
[[WARNING]] Brief warning message [[/WARNING]]
```

**Inline Syntax:**
```markdown
This action is [!WARNING] risky.
Handle with [!DANGER] extreme care.
```

**Supported Types:** `WARNING`, `DANGER`

**Output:**
```html
<div class="callout callout-warning">
  <span class="callout-label">WARNING</span>
  <div class="callout-content">This is a warning message.</div>
</div>
```

**Note:** For NOTE, TIP, IMPORTANT, use GFM Alerts instead.

---

## Container Blocks

Fenced container blocks using `:::` syntax (markdown-it-container).

**Syntax:**
```markdown
:::details
Collapsible or detailed content here.
:::

:::aside
Sidebar content.
:::

:::columns
Content that flows into two columns.
:::

:::spoiler Movie ending
The butler did it.
:::
```

**Supported Containers:**

| Container | CSS Class | Purpose |
|-----------|-----------|---------|
| `details` | `.container-details` | Detailed/collapsible content |
| `aside` | `.container-aside` | Sidebar/margin notes |
| `columns` | `.container-columns` | Two-column layout |
| `spoiler` | `.container-spoiler` | Hidden content with title |
| `summary` | `.container-summary` | Summary blocks |

**With Title:**
```markdown
:::spoiler Ending revealed
The butler did it.
:::
```

**Output:**
```html
<div class="container container-spoiler" data-title="Ending revealed">
The butler did it.
</div>
```

**Nested Content:**
Containers support full markdown inside:

```markdown
:::details

## Nested Heading

- List item 1
- List item 2

> Blockquote inside container

:::
```

---

## Inline Attributes

Add classes, IDs, or custom attributes to any element using `markdown-it-attrs`.

**Syntax:**
```markdown
# Heading {.custom-class #heading-id}

Paragraph text. {.highlight}

![Image](path.png){.full-width}

| Table | Data | {.data-table}
```

**Attribute Types:**

| Syntax | Result |
|--------|--------|
| `{.class}` | `class="class"` |
| `{#id}` | `id="id"` |
| `{attr=value}` | `attr="value"` |
| `{.a .b #c}` | Multiple combined |

**Running Headers Example:**
```markdown
# Chapter 1: Introduction {data-header="Introduction"}
```

CSS uses:
```css
h1[data-header] {
  string-set: header-text attr(data-header);
}

@page chapter {
  @top-center {
    content: string(header-text);
  }
}
```

---

## Wikilinks

Obsidian-style wikilinks for internal navigation and image embeds.

**Link Syntax:**
```markdown
[[Page Name]]
[[Page Name|Display Text]]
```

**Image Embed:**
```markdown
![[image.png]]
![[diagrams/architecture.svg]]
```

**Output:**
```html
<a href="Page Name" class="wikilink">Page Name</a>
<img src="image.png" alt="image" class="wikilink-embed">
```

**Configuration:** Set `baseUrl` and `imageBaseUrl` in parser options.

---

## CSS Styling Reference

All extended syntax elements have default styling in `styles/base.css`. Override in profile CSS or frontmatter.

### Page Breaks
```css
.break-page {
  display: block;
  height: 0;
  break-after: always;
  page-break-after: always;
}

/* Fallback: force next element to new page */
.break-page + * {
  break-before: page;
  page-break-before: always;
}
```

### TOC Placeholder
```css
.toc-placeholder {
  padding: 1rem;
  border: 1px dashed #9ca3af;
  border-radius: 4px;
  background: #f9fafb;
  text-align: center;
}
```

### GFM Alerts
```css
.markdown-alert {
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  border-left: 4px solid;
  border-radius: 0 6px 6px 0;
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

.width-full { width: 100%; }
.width-half { width: 50%; margin: 0 auto; }
.width-third { width: 33.333%; margin: 0 auto; }
.width-quarter { width: 25%; margin: 0 auto; }
```

### Custom Callouts
```css
.callout {
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 6px;
  border-left: 4px solid;
}

.callout-warning {
  background: #fff8e6;
  border-color: #f59e0b;
}

.callout-danger {
  background: #fef2f2;
  border-color: #ef4444;
}
```

### Containers
```css
.container {
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 6px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.container-aside {
  border-left: 4px solid #f59e0b;
}

.container-columns {
  column-count: 2;
  column-gap: 2rem;
}
```

---

## Implementation Details

### Parser Plugin Order

Plugins are registered in this order (important for syntax conflicts):

1. `markdown-it-attrs` - `{.class}` syntax
2. `markdown-it-github-alerts` - `> [!NOTE]`
3. `markdown-it-include` - File inclusion
4. `markdown-it-container` - `:::block` syntax
5. PageMD extensions - Callouts, figures
6. PageMD directives - Comment directives
7. Wikilinks (last, due to `[[...]]` conflicts)

### Security

All directive attributes are HTML-escaped to prevent XSS:
- `class`, `id`, `levels`, `path` parameters sanitized
- Figure captions escaped
- Container titles escaped

### Source Files

| File | Purpose |
|------|---------|
| `packages/parser/src/directives.js` | Comment directive plugin |
| `packages/parser/src/extensions.js` | Callouts and figures |
| `packages/parser/src/wikilinks.js` | Wikilink plugin |
| `packages/parser/src/index.js` | Plugin registration |
| `styles/base.css` | Default styling |

### Tests

739 tests covering extended syntax:
- `packages/parser/tests/directives.test.js` - Directive parsing
- `packages/parser/tests/extensions.test.js` - Callouts, figures
- `packages/parser/tests/wikilinks.test.js` - Wikilinks

---

## See Also

- [[Reference]] - Template tokens, metadata normalization
- [[Profiles]] - Profile configuration for styles
- [[Configuration]] - Template anatomy
- [[Appendix]] - Future TOC generation plans
