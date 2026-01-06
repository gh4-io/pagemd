# Inline Attributes Reference

> **Section:** Reference

Complete reference for inline attribute syntax using markdown-it-attrs.

---

## What Are Inline Attributes?

**Inline attributes** let you add HTML attributes (classes, IDs, data attributes, etc.) to markdown elements without writing raw HTML. This gives you precise styling control while keeping your markdown clean and readable.

**Example:**
```markdown
This paragraph has custom styling. {.highlight #intro}
```

**Renders as:**
```html
<p class="highlight" id="intro">This paragraph has custom styling.</p>
```

**Why use inline attributes?**
- Apply CSS classes for styling specific elements
- Add IDs for internal linking and anchoring
- Include data attributes for JavaScript or metadata
- Control layout without breaking markdown syntax
- Keep page-break control inline with content

---

## Quick Reference

| Syntax | What It Does | Example |
|--------|-------------|---------|
| `{.class-name}` | Adds CSS class | `Text {.highlight}` |
| `{#id-name}` | Adds HTML ID | `Heading {#section-1}` |
| `{data-foo="bar"}` | Adds data attribute | `Link {data-track="click"}` |
| `{.class1 .class2}` | Multiple classes | `Text {.red .bold}` |
| `{.class #id}` | Combined attributes | `Text {.alert #warning}` |
| `{attr="value"}` | Any HTML attribute | `Link {target="_blank"}` |
| `{style="..."}` | Inline CSS | `Text {style="color: red;"}` |

---

## Syntax Rules

### Basic Format

Attributes go **after** the element in curly braces:

```markdown
Element content {.class #id attribute="value"}
```

### Spacing

- **Space before `{`** - Required for paragraphs, optional for others
- **Spaces inside `{}`** - Separate multiple attributes with spaces
- **No spaces around `=`** - Use `data-foo="bar"` not `data-foo = "bar"`

### Valid Attribute Types

| Type | Syntax | Example |
|------|--------|---------|
| Class | `.classname` | `{.important}` |
| ID | `#idname` | `{#section-2}` |
| Data attribute | `data-key="value"` | `{data-section="intro"}` |
| Standard HTML | `attr="value"` | `{target="_blank"}` |
| Inline CSS | `style="..."` | `{style="color: blue;"}` |

### Combining Attributes

Multiple attributes in one block:

```markdown
This has three attributes. {.highlight .centered #key-point}
```

Renders as:
```html
<p class="highlight centered" id="key-point">This has three attributes.</p>
```

---

## Supported Elements

Inline attributes work on most markdown elements. Here's the complete list:

### Headings

```markdown
# Main Title {#main-title .page-header}

## Subsection {.accent-heading #subsection-1}

### Technical Details {.monospace data-section="technical"}
```

**Use cases:**
- Add IDs for internal linking: `[Jump to intro](#intro)`
- Apply custom heading styles per-section
- Add data attributes for table of contents generation

---

### Paragraphs

```markdown
This is a highlighted paragraph. {.highlight}

This paragraph has multiple classes. {.important .centered #key-point}

Keep this section together on one page. {style="page-break-inside: avoid;"}
```

**Use cases:**
- Style specific paragraphs differently
- Control page breaks for print/PDF output
- Add semantic classes for accessibility

---

### Links

```markdown
[External Link](https://example.com){.external target="_blank" rel="noopener"}

[Jump to section](#intro){.internal-link data-scroll="smooth"}

[Download PDF](./report.pdf){.download-link data-track="download"}
```

**Use cases:**
- Open external links in new tabs
- Add tracking attributes for analytics
- Style different link types (external, download, internal)

**Common patterns:**

| Link Type | Attributes |
|-----------|------------|
| External link | `{target="_blank" rel="noopener"}` |
| Download link | `{download}` or `{download="filename.pdf"}` |
| Tracked link | `{data-track="click" data-label="signup"}` |

---

### Images

```markdown
![Screenshot](./screenshot.png){.rounded .shadow width="600"}

![Diagram](./diagram.svg){#fig-architecture .full-width}

![Photo](./photo.jpg){.thumbnail data-fullsize="./photo-full.jpg"}
```

**Use cases:**
- Apply border styles (rounded corners, shadows)
- Control image dimensions
- Add lightbox/gallery attributes
- Set alignment classes

**Common image classes:**

| Class | Purpose |
|-------|---------|
| `.rounded` | Rounded corners |
| `.shadow` | Drop shadow effect |
| `.thumbnail` | Small preview size |
| `.full-width` | Span full page width |
| `.centered` | Center-aligned |
| `.float-left` | Text wraps around right |
| `.float-right` | Text wraps around left |

---

### Lists

#### Unordered Lists

```markdown
- First item
- Second item
- Third item
{.compact-list #features}
```

**Note:** Attributes apply to the **entire list** (`<ul>` tag), not individual items.

#### Ordered Lists

```markdown
1. Step one
2. Step two
3. Step three
{.numbered-steps .tutorial}
```

#### Task Lists

```markdown
- [ ] Not done
- [x] Completed
{.task-list data-project="website"}
```

**Use cases:**
- Compact spacing for long lists
- Numbered step styling for tutorials
- Custom bullet styles

---

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data A   | Data B   | Data C   |
| Data D   | Data E   | Data F   |
{.styled-table #data-table}
```

**Use cases:**
- Zebra striping (alternating row colors)
- Compact or expanded spacing
- Border styles
- Fixed column widths
- Sticky headers

**Common table classes:**

| Class | Purpose |
|-------|---------|
| `.striped` | Alternating row colors |
| `.bordered` | Cell borders |
| `.compact` | Reduced padding |
| `.fixed-layout` | Fixed column widths |
| `.hover-highlight` | Highlight row on hover |

---

### Code Blocks

````markdown
```javascript {.line-numbers data-filename="app.js"}
function greet(name) {
    return `Hello, ${name}!`;
}
```
````

**Use cases:**
- Add line numbers
- Show filename in header
- Highlight specific lines
- Add copy-to-clipboard button class

**Common code block attributes:**

| Attribute | Purpose |
|-----------|---------|
| `.line-numbers` | Show line numbers |
| `data-filename="..."` | Display filename |
| `.highlight-lines="2-4"` | Highlight specific lines |
| `.no-copy` | Disable copy button |

---

### Inline Code

```markdown
Use the `npm install` command to install dependencies. {.terminal-command}
```

**Note:** Inline code attributes are **limited**. Most markdown parsers only support attributes on block-level elements.

---

### Blockquotes

```markdown
> This is an important quote that needs emphasis.
{.emphasized-quote .border-left}

> **Warning:** This action cannot be undone.
{.warning-box #deletion-warning}
```

**Use cases:**
- Style different quote types (pull quotes, warnings, notes)
- Add border accents
- Control page breaks (keep quotes together)

---

### Horizontal Rules

```markdown
---
{.section-break}

---
{.thick-line}
```

**Use cases:**
- Different line styles (thin, thick, dotted)
- Spacing control
- Decorative dividers

---

## Page Break Control

One of the most powerful uses of inline attributes is **controlling page breaks** in PDF output.

### Keep Content Together

Prevent an element from splitting across pages:

```markdown
This entire section must stay on one page. {style="page-break-inside: avoid;"}

| Large Table |
|-------------|
| Row 1       |
| Row 2       |
{style="page-break-inside: avoid;"}
```

### Force Page Breaks

Force a page break before or after an element:

```markdown
# New Chapter {style="page-break-before: always;"}

End of section. {style="page-break-after: always;"}
```

### Common Page Break Patterns

| Goal | CSS Property | Example |
|------|-------------|---------|
| Keep element together | `page-break-inside: avoid;` | Tables, figures, code blocks |
| New page before | `page-break-before: always;` | Chapter headings |
| New page after | `page-break-after: always;` | Section endings |
| Avoid break after | `page-break-after: avoid;` | Headings (keep with content) |

**Best practice:** Use the `<!-- ::BREAK -->` directive for standalone page breaks. Use inline attributes for element-specific control.

---

## CSS Styling with Attributes

### Using Custom Classes

**Step 1:** Define classes in your CSS file (`.pagemd/styles/custom.css`):

```css
.highlight {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 0.5rem 1rem;
}

.keep-together {
  page-break-inside: avoid;
}

.accent-heading {
  color: #0066cc;
  border-bottom: 2px solid #0066cc;
}
```

**Step 2:** Apply classes via inline attributes:

```markdown
This paragraph is highlighted. {.highlight}

## Important Section {.accent-heading}

| Critical Data |
|---------------|
| Value 1       |
{.keep-together}
```

**Step 3:** Reference the CSS file in your profile or frontmatter:

```yaml
---
styles:
  - custom.css
---
```

---

## Data Attributes for Metadata

Data attributes (`data-*`) let you embed custom metadata without affecting rendering:

```markdown
## User Guide {data-version="2.1" data-status="draft"}

[API Reference](./api.html){data-track="click" data-category="docs"}

![Diagram](./flow.svg){data-generated="2026-01-05" data-source="mermaid"}
```

**Use cases:**
- Version tracking for sections
- Analytics and event tracking
- JavaScript hooks for interactivity
- Build pipeline metadata

**Accessing in JavaScript:**
```javascript
const heading = document.querySelector('[data-version]');
console.log(heading.dataset.version); // "2.1"
```

---

## Accessibility Attributes

Improve accessibility with ARIA attributes:

```markdown
## Navigation {role="navigation" aria-label="Main navigation"}

[Skip to content](#main){.skip-link aria-label="Skip to main content"}

![Complex diagram](./diagram.png){alt="System architecture showing..." role="img"}
```

**Common ARIA attributes:**

| Attribute | Purpose |
|-----------|---------|
| `role="..."` | Define semantic role |
| `aria-label="..."` | Accessible label for screen readers |
| `aria-describedby="id"` | Link to description element |
| `aria-hidden="true"` | Hide decorative elements from screen readers |

---

## Limitations and Edge Cases

### What Doesn't Work

1. **Inline code** - Limited support, block-level only
   ```markdown
   Use `npm install` {.command} ❌ Doesn't work
   ```

2. **Inside other attributes** - Can't nest attribute blocks
   ```markdown
   ![Image](url){.class {.nested}} ❌ Invalid syntax
   ```

3. **Raw HTML** - Attributes don't work on HTML tags in markdown
   ```markdown
   <div>Content</div>{.class} ❌ Use HTML attributes instead
   ```

### Parser-Specific Behavior

- **Paragraph detection:** Some parsers require a blank line before `{.class}` on standalone lines
- **Escaping:** Use backslash to escape curly braces: `\{not an attribute\}`
- **Whitespace sensitivity:** Extra spaces inside `{}` are ignored, but spacing around attributes matters

### PDF vs HTML Output

- **Page break styles** (`page-break-*`) only work in PDF output
- **Print-specific CSS** (orphans, widows) ignored in HTML
- **Interactive attributes** (like `onclick`) work in HTML, not PDF

---

## Troubleshooting

### Attributes Not Applying

**Symptom:** Attribute syntax appears in output as literal text.

**Diagnosis:**
1. **Check spacing:** Ensure space before `{` for paragraphs
   ```markdown
   Text{.class} ❌
   Text {.class} ✅
   ```

2. **Check syntax:** Quotes required for attribute values
   ```markdown
   {data-foo=bar} ❌
   {data-foo="bar"} ✅
   ```

3. **Verify element type:** Not all elements support attributes
   ```markdown
   `inline code` {.class} ❌ Limited support
   ```

4. **Inspect HTML output:** Check if attributes rendered
   ```bash
   pagemd build doc.md -o html
   # Open output HTML, inspect element in DevTools
   ```

### CSS Not Styling Attributed Elements

**Symptom:** Attributes appear in HTML, but styling doesn't apply.

**Fix:**
1. **Define the CSS class:**
   ```css
   .highlight {
     background: yellow;
   }
   ```

2. **Load the CSS file:**
   ```yaml
   ---
   styles:
     - custom.css
   ---
   ```

3. **Check layer precedence:** See [[guides/Style-Guide#CSS-Layer-Model|CSS Layer Model]]

### Page Breaks Ignored

**Symptom:** `page-break-inside: avoid` doesn't prevent splitting.

**Causes and fixes:**
- **HTML output:** Page breaks only work in PDF
- **Element too large:** Can't avoid break if content larger than one page
- **Nested elements:** Try applying to parent element
- **Use alternative:** Try `<!-- ::BREAK -->` directive before element

---

## Examples by Use Case

### Documentation Website

```markdown
# API Reference {#api-reference .api-docs}

## Authentication {#auth .section-auth data-category="security"}

The `login()` function authenticates users. {.method-description}

[View source code](./auth.js){.source-link target="_blank"}
```

### Technical Manual (PDF)

```markdown
# Chapter 1: Installation {style="page-break-before: always;"}

Follow these steps carefully. {.warning-box style="page-break-inside: avoid;"}

| System Requirements |
|---------------------|
| OS: Linux/Windows   |
| RAM: 8GB minimum    |
{.requirements-table style="page-break-inside: avoid;"}
```

### Academic Paper

```markdown
# Abstract {.abstract #abstract}

This paper examines... {.justified}

## Introduction {#intro data-section="1"}

![Research methodology](./fig1.png){#fig-1 .figure width="80%"}
```

### Tutorial/Guide

```markdown
## Step 1: Setup {.tutorial-step #step-1}

Run the following command:

```bash {.copy-code data-lang="bash"}
npm install pagemd
```

> **Note:** Requires Node.js 20+
{.info-box .highlighted}
```

---

## See Also

- [[guides/Style-Guide|Style Guide]] - CSS customization and layers
- [[guides/Extended-Syntax|Extended Syntax]] - Comment directives and special syntax
- [[reference/Profile-Schema|Profile Schema]] - Profile configuration
- [[reference/Settings|Settings]] - Frontmatter and environment variables
- [markdown-it-attrs Documentation](https://github.com/arve0/markdown-it-attrs) - Plugin source and advanced usage
