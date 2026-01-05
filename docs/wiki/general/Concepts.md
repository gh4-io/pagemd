# Key Concepts

> **Section:** General - Understanding PageMD

Essential terms and principles for working with PageMD.

## Profiles

A **profile** is a JSON or YAML configuration file that controls how your document is processed and rendered. Profiles *reference* other resources (templates, layouts, CSS files)—they don't contain styling rules themselves.

**What profiles configure:**
- Template selection (`resources.template`)
- Layout CSS file (`resources.layout`)
- Style CSS files (`resources.css[]`)
- Validation rules (`validation.required_fields`)
- Output options (`outputs`)

**Example profile:**
```json
{
  "id": "my-report",
  "extends": "standard_letter",
  "resources": {
    "template": "report",
    "css": ["corporate-styles.css"]
  }
}
```

**Profile inheritance:** Profiles can extend other profiles. The `extends` field specifies the parent profile, and child values override parent values.

See [[guides/Profiles|Working with Profiles]] for hands-on guide.
See [[reference/Profile-Schema|Profile Schema]] for all fields.

## Templates

A **template** is an HTML file that provides the structure for your document. Your Markdown content is inserted into the template.

**Default templates:**
- `standard` - Simple document structure
- `report` - Title page + body

**Template tokens:**
Templates use tokens like `${title}`, `${author}`, `${content}` that are replaced with actual values during rendering.

## Layouts

A **layout** is a CSS file containing `@page` rules that define page structure: margins, headers, footers, page numbers.

**Example layout features:**
- Page margins and size
- Running headers with document title
- Page numbers in footers
- First-page special treatment

## Styles (CSS Files)

**Styles** are CSS files that control visual appearance: fonts, colors, spacing, typography. These are distinct from profiles—profiles *select* which CSS files to load; CSS files contain the actual rules.

**CSS layer precedence (1=lowest, 6=highest):**
1. base - CSS reset (`styles/base.css`)
2. primary - Project defaults (`styles/primary.css`)
3. layout - Page structure (`layouts/*.css`)
4. syntax - Code highlighting (`styles/syntax/`)
5. profile-css - CSS files from profile `resources.css[]`
6. frontmatter - CSS files from document `styles[]`

See [[guides/Style-Guide|Style Guide]] for CSS customization details.

## Frontmatter

**Frontmatter** is YAML metadata at the top of your Markdown file:

```yaml
---
title: Document Title
author: Your Name
date: 2025-01-04
profile: standard_letter
---
```

Frontmatter values:
- Set document metadata (`title`, `author`, `date`)
- Select profiles (`profile: my-profile`)
- Override settings (`toc: true`, `highlight_theme: github-dark`)
- Add custom styles (`styles: [custom.css]`)

## Output Modes

PageMD supports three output modes:

| Mode | Behavior |
|------|----------|
| `ACTIVE_ONLY` | Output only explicitly requested formats |
| `ALWAYS` | Always output this format |
| `DISABLED` | Never output this format |

Set in profile `outputs.mode` or via CLI flags.

## See Also

- [[general/Overview|Overview]] - What PageMD does
- [[general/Architecture|Architecture]] - How components connect
- [[guides/Profiles|Working with Profiles]] - Hands-on profile guide
- [[reference/Profile-Schema|Profile Schema]] - All profile fields
- [[reference/Glossary|Glossary]] - Complete term definitions
