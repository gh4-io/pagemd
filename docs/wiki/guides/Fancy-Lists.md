# Fancy Lists

Enable advanced list numbering with letters and Roman numerals.

## Overview

Fancy lists extend standard Markdown ordered lists with:
- **Letter numbering** (A, B, C or a, b, c)
- **Roman numerals** (I, II, III or i, ii, iii)
- **Automatic continuation** with `#`
- **Custom start values** for any list type

This feature uses Pandoc-compatible syntax, making it easy to migrate documents from Pandoc to PageMD.

## Enabling Fancy Lists

Fancy lists are **disabled by default** to maintain backward compatibility. Enable them using any of these methods:

### Frontmatter (per-document)

Enable for a specific document by adding to the frontmatter:

```yaml
---
fancy_lists: true
---
```

All supported aliases:
- `fancy_lists: true`
- `fancyLists: true`
- `fancy-lists: true`

### Profile (project-wide)

Enable for all documents using a profile by adding to the profile JSON:

```json
{
  "metadata": {
    "defaults": {
      "fancy_lists": true
    }
  }
}
```

### Environment Variable (system-wide)

Enable globally for your environment:

```bash
export PAGEMD_FANCY_LISTS=1
```

Or on Windows:

```cmd
set PAGEMD_FANCY_LISTS=1
```

**Priority:** Frontmatter > Profile > Environment Variable

## Syntax Reference

### Uppercase Letters

Use uppercase letters followed by a period for lettered lists:

**Important:** Uppercase letters require **two spaces** after the period to avoid false positives (e.g., "A. Smith said...").

```markdown
A.  First item
B.  Second item
C.  Third item
```

Renders as:

<ol type="A">
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ol>

### Lowercase Letters

Use lowercase letters followed by a period:

```markdown
a. First item
b. Second item
c. Third item
```

### Uppercase Roman Numerals

Use uppercase Roman numerals for formal outlines:

**Important:** Uppercase Roman numerals also require **two spaces** after the period.

```markdown
I.  Introduction
II.  Background
III.  Methodology
IV.  Results
```

### Lowercase Roman Numerals

Use lowercase Roman numerals for legal or academic documents:

```markdown
i. First clause
ii. Second clause
iii. Third clause
iv. Fourth clause
```

### Continuation with #

Use `#` to continue numbering without explicitly specifying the number:

```markdown
1. First item
2. Second item

Some intervening paragraph text.

#. Continues as 3
#. Continues as 4
```

This is useful when you need to split a list with other content but want the numbering to continue.

### Custom Start Value

Start a list at any number:

```markdown
5. Start at five
6. Six follows automatically
7. Seven
```

Works with all list types (numbers, letters, Roman numerals).

## Use Cases

### Legal Documents

Legal documents often use lowercase Roman numerals for clauses:

````markdown
---
fancy_lists: true
---

## Terms and Conditions

i. Party agrees to the terms herein
ii. Party shall indemnify and hold harmless
iii. Termination requires 30 days written notice
iv. Governing law is the State of California
````

### Technical Specifications

Technical specifications commonly use letter numbering for sections:

````markdown
---
fancy_lists: true
---

## System Requirements

A.  Hardware Requirements
   1. Minimum 8GB RAM
   2. 256GB SSD storage
   3. Intel Core i5 or equivalent

B.  Software Requirements
   1. Node.js 20+
   2. Chrome or Chromium browser

C.  Network Requirements
   1. Broadband internet connection
   2. Port 443 accessible
````

### Academic Outlines

Academic papers and proposals often use Roman numeral outlines:

````markdown
---
fancy_lists: true
---

I.  Introduction
   A.  Background
   B.  Problem Statement
   C.  Research Questions

II.  Literature Review
   A.  Historical Context
   B.  Current Research
   C.  Gaps in Knowledge

III.  Methodology
   A.  Research Design
   B.  Data Collection
      i. Primary sources
      ii. Secondary sources
   C.  Analysis Methods
````

### Standard Operating Procedures

SOPs can use mixed numbering for hierarchical steps:

````markdown
---
fancy_lists: true
---

## Deployment Procedure

A.  Pre-deployment Checklist
   1. Run test suite
   2. Review changelog
   3. Update documentation

B.  Deployment Steps
   i. Create backup
   ii. Deploy to staging
   iii. Run smoke tests
   iv. Deploy to production

C.  Post-deployment
   1. Monitor error rates
   2. Verify functionality
````

## Nested Lists

Fancy lists work with nested lists and inherit from their parent:

```markdown
I.  Top level Roman
   A.  Nested letter
      1. Nested number
      2. Another number
   B.  Second letter
II.  Second Roman
```

Each nesting level maintains its own numbering style.

## Combining with Other Features

Fancy lists work seamlessly with other PageMD features:

### With Inline Attributes

Add classes or IDs to list items:

```markdown
A.  Important item {.highlight}
B.  Regular item
C.  Another important item {.highlight #special}
```

### With INDEX Markers

Include index markers in fancy lists:

```markdown
i. <!-- ::INDEX term="legal clause" -->First legal clause
ii. <!-- ::INDEX term="indemnification" -->Indemnification clause
iii. <!-- ::INDEX term="termination" -->Termination clause
```

### With Wikilinks

Reference other documents from fancy lists:

```markdown
A.  See [[Requirements Document]]
B.  Review [[Design Specification]]
C.  Check [[Test Plan]]
```

## Notes and Limitations

- **Uppercase requires two spaces:** Uppercase letters (A-Z) and uppercase Roman numerals (I-IX) require **two spaces** after the period (e.g., `A.  Item` not `A. Item`). This prevents false positives like "A. Smith said..."
- **Lowercase needs one space:** Lowercase letters (a-z) and lowercase Roman numerals (i-ix) only need one space (e.g., `a. Item` or `i. Item`)
- **First marker determines type:** The marker on the first item determines the list type for the entire list
- **Mixing markers starts new list:** Using a different marker type starts a new list
- **Period or parenthesis:** Lists can use either `.` or `)` after the marker (e.g., `A.` or `A)`)
- **Disabled by default:** Must be explicitly enabled to avoid unexpected behavior
- **Browser rendering:** All fancy list types are rendered natively by browsers via HTML `<ol type="">` attribute
- **PDF support:** Paged.js fully supports all fancy list types in PDF output

## Troubleshooting

### Lists not rendering with fancy numbering

**Cause:** Fancy lists are not enabled.

**Solution:** Add `fancy_lists: true` to frontmatter or enable via profile/environment variable.

### Numbering resets unexpectedly

**Cause:** Mixing marker types (e.g., switching from `A.` to `i.`) starts a new list.

**Solution:** Use consistent marker types within a list. Each list type must be separate.

### Custom start value not working

**Cause:** Fancy lists feature is disabled.

**Solution:** Enable fancy lists. Standard Markdown only supports starting ordered lists at `1.`

## See Also

- [Extended Syntax](Extended-Syntax.md) - Other PageMD extensions
- [Profiles](../reference/Profiles.md) - Project-wide configuration
- [Settings](../reference/Settings.md) - Environment variables and configuration
