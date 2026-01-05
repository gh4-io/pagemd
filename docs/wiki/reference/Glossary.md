# Glossary

> **Section:** Reference

Definitions of terms used throughout PageMD documentation.

---

## A

### ACTIVE_ONLY
An output mode where a format is generated only when explicitly requested via the `-o` CLI flag. This is the default behavior for most formats. See also: [[#Output Mode]].

### @page rule
A CSS at-rule that defines page-level properties for printed/PDF output: size, margins, headers, footers. Part of the CSS Paged Media specification, implemented via Paged.js.

```css
@page {
  size: Letter;
  margin: 1in;
  @bottom-center {
    content: counter(page);
  }
}
```

### ALWAYS
An output mode where a format is always generated, regardless of CLI flags. Useful for profiles that should always produce PDF. See also: [[#Output Mode]].

---

## B

### Base layer
CSS layer 1 (lowest priority). Contains CSS reset, element defaults, and extended syntax class definitions. Source: `styles/base.css`. See also: [[#CSS Layer Model]].

---

## C

### CSS Layer Model
PageMD's 6-layer CSS cascade that determines style precedence. Later layers override earlier ones without needing `!important`.

| Priority | Layer | Source |
|----------|-------|--------|
| 1 (lowest) | base | `styles/base.css` |
| 2 | primary | `styles/primary.css` |
| 3 | layout | `layouts/*.css` |
| 4 | syntax | `styles/syntax/*.css` |
| 5 | profile-css | Profile `resources.css[]` |
| 6 (highest) | frontmatter | Document `styles[]` |

---

## D

### Directive
An HTML comment with special syntax that PageMD processes during rendering. Format: `<!-- ::NAME(params) -->`.

| Directive | Purpose |
|-----------|---------|
| `<!-- ::TOC -->` | Insert table of contents |
| `<!-- ::INDEX term="..." -->` | Mark index entry |
| `<!-- ::LAYOUT(name) -->` | Switch page layout |

See [[guides/Extended-Syntax|Extended Syntax]] for full documentation.

### DISABLED
An output mode where a format is never generated, even if requested. Useful for disabling formats in specific profiles. See also: [[#Output Mode]].

---

## E

### Extended syntax
Markdown extensions beyond standard CommonMark that PageMD supports: GFM tables, GFM alerts, figures with captions, Mermaid diagrams, TOC generation, back-of-book index, and layout switching.

### extends
Profile field that specifies a parent profile to inherit settings from. Child values override parent values; arrays are replaced, not merged.

```json
{
  "id": "child",
  "extends": "standard_letter"
}
```

---

## F

### Frontmatter
YAML metadata block at the top of a Markdown file, delimited by `---`. Sets document properties, selects profiles, and configures rendering options.

```yaml
---
title: My Document
author: Jane Doe
profile: standard_letter
toc: true
---
```

### Frontmatter layer
CSS layer 6 (highest priority). Contains CSS files specified in the document's frontmatter `styles:` array. Overrides all other layers.

---

## G

### GFM Alert
GitHub Flavored Markdown callout syntax. Renders as styled boxes with icons.

```markdown
> [!NOTE]
> This is a note.

> [!WARNING]
> This is a warning.
```

Types: NOTE, TIP, IMPORTANT, WARNING, CAUTION.

---

## H

### highlight_theme
Profile or frontmatter field that selects the syntax highlighting color scheme for code blocks. Uses shiki themes.

Default: `github-light`. Options include: `github-dark`, `monokai`, `nord`, `dracula`, etc.

---

## I

### INDEX directive
Extended syntax marker that creates a back-of-book index entry. Page numbers are calculated during PDF rendering.

```markdown
<!-- ::INDEX term="Configuration" -->
```

---

## L

### Layout (CSS file)
A CSS file containing `@page` rules that define page structure: size, margins, headers, footers, page numbers. Distinct from style CSS which controls visual appearance.

Location: `layouts/` directory or `resources.layout` in profile.

Example: `letter.css` defines US Letter page size with 1-inch margins.

### Layout directive
Extended syntax that switches to a different named page layout mid-document.

```markdown
<!-- ::LAYOUT(landscape) -->
Wide content here
<!-- ::LAYOUT(default) -->
```

### Layout layer
CSS layer 3. Contains layout CSS files with `@page` rules. Source: `layouts/*.css` or profile `resources.layout`.

---

## N

### Named page
CSS feature that allows different page styles within a single document. Defined via `@page name { }` and applied via `page: name;` CSS property.

```css
@page landscape {
  size: Letter landscape;
}
.page-landscape {
  page: landscape;
}
```

---

## O

### Output mode
Profile setting that controls when a format is generated. Three values:

| Mode | Behavior |
|------|----------|
| `ACTIVE_ONLY` | Only when requested via `-o` flag |
| `ALWAYS` | Always generated |
| `DISABLED` | Never generated |

Set in profile: `outputs.pdf.mode`, `outputs.html.mode`, etc.

---

## P

### Page margin box
Regions around the page content area where headers and footers appear. Defined in CSS using `@page` rule with position keywords.

```css
@page {
  @top-center { content: "Header"; }
  @bottom-right { content: counter(page); }
}
```

Positions: `@top-left`, `@top-center`, `@top-right`, `@bottom-left`, `@bottom-center`, `@bottom-right`.

### Paged.js
JavaScript library that implements CSS Paged Media features in browsers. PageMD uses Paged.js to render print-ready layouts with page numbers, headers, footers, and proper page breaks.

Website: https://pagedjs.org/

### Preset
A ready-to-use CSS file in `styles/presets/` that provides complete visual styling. Can be used directly via frontmatter or as a starting point for custom styles.

Examples: `modern-clean.css`, `technical-docs.css`, `print-friendly.css`.

### Primary layer
CSS layer 2. Contains project-wide default colors and spacing. Source: `styles/primary.css`.

### Profile
A JSON or YAML configuration file that controls how PageMD processes documents. Profiles *reference* resources (templates, layouts, CSS files)—they don't contain styling rules themselves.

```json
{
  "id": "my-profile",
  "extends": "standard_letter",
  "resources": {
    "template": "standard",
    "layout": "letter.css",
    "css": ["corporate.css"]
  }
}
```

Location: `.pagemd/profiles/` (project) or built-in `profiles/` directory.

### Profile-css layer
CSS layer 5. Contains CSS files referenced by the active profile's `resources.css[]` array. Not the profile itself—the CSS files it points to.

---

## R

### Resource
In profile context, an external file (template, layout, CSS, schema) that the profile references. Configured in the `resources` section of a profile.

```json
{
  "resources": {
    "template": "report",
    "layout": "letter.css",
    "css": ["typography.css", "colors.css"],
    "highlight_theme": "github-dark"
  }
}
```

### Running header
Page header content that updates based on document content (e.g., current chapter title). Implemented via CSS string-set.

```css
h1 { string-set: chapter content(text); }
@page { @top-center { content: string(chapter); } }
```

---

## S

### shiki
Syntax highlighting library that PageMD uses for code blocks. Uses VS Code's TextMate grammars for accurate, editor-identical highlighting.

Website: https://shiki.style/

### String set
CSS Paged Media feature that captures text content from elements for use in page margins. Used for running headers.

```css
h1 { string-set: doctitle content(text); }
@page { @top-center { content: string(doctitle); } }
```

### Style (CSS file)
A CSS file that controls visual appearance: fonts, colors, spacing, typography. Distinct from layout CSS which controls page structure.

Referenced via profile `resources.css[]` or frontmatter `styles:`.

### Syntax layer
CSS layer 4. Contains code block styling from shiki. Source: `styles/syntax/shiki-base.css`.

---

## T

### Template
An HTML file that provides document structure. Markdown content is inserted into the template using tokens like `${content}`, `${title}`, `${author}`.

Built-in templates:
- `standard` - Simple single-column document
- `report` - Title page followed by body content

### TOC directive
Extended syntax that generates a table of contents from document headings.

```markdown
<!-- ::TOC -->
```

Options via frontmatter: `toc_levels`, `toc_title`, `toc_page_numbers`.

---

## V

### Validation
Profile feature that enforces document requirements. Can require specific frontmatter fields or validate against a JSON schema.

```json
{
  "validation": {
    "required_fields": ["title", "author", "date"],
    "strict": true
  }
}
```

---

## See Also

- [[general/Concepts|Key Concepts]] - Overview of core concepts
- [[guides/Profiles|Working with Profiles]] - Profile creation guide
- [[guides/Style-Guide|Style Guide]] - CSS customization
- [[reference/Profile-Schema|Profile Schema]] - All profile fields
- [[guides/Extended-Syntax|Extended Syntax]] - Directives and extensions
