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

### Continuation with # (and Auto-Increment Reality)

The `#.` marker is a placeholder that continues numbering:

```markdown
1. First item
#. Second item
#. Third item
```

**However:** Markers after the first item are **always ignored** - the list auto-increments regardless of what you write:

```markdown
a. First      → renders as a
z. Second     → renders as b (z is ignored)
m. Third      → renders as c (m is ignored)
#. Fourth     → renders as d (# is ignored too)
```

This means `a. a. a. a.` and `a. b. c. d.` and `a. #. #. #.` all produce identical output: a, b, c, d.

**What actually matters:**
- **First marker** sets the list type (a, A, i, I, or 1)
- **First marker** sets the start value (e.g., `c.` starts at c)
- **All subsequent markers** are ignored - just need to be valid to continue the list

**After content interruption**, `#.` starts a new list at `1` (not continuing previous):

```markdown
a. First
b. Second

[[WARNING]]
Note here.
[[/WARNING]]

#. This becomes 1, NOT c
c. Use explicit marker instead
```

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

## Complete Syntax Rules

### Marker Types

| Marker | Type | Output |
|--------|------|--------|
| `1.` or `1)` | Decimal | 1, 2, 3... |
| `a.` or `a)` | Lowercase alpha | a, b, c... |
| `A.` or `A)` | Uppercase alpha | A, B, C... |
| `i.` or `i)` | Lowercase Roman | i, ii, iii... |
| `I.` or `I)` | Uppercase Roman | I, II, III... |
| `#.` or `#)` | Auto-continue | Continues previous numbering |

### Spacing After Marker (CRITICAL)

| Marker Type | Required Spacing | Example | Valid? |
|-------------|------------------|---------|--------|
| Numbers (`1.`, `2.`) | 1+ spaces | `1. Item` | ✓ |
| Lowercase letters (`a.`, `b.`) | 1+ spaces | `a. Item` | ✓ |
| Lowercase Roman (`i.`, `ii.`) | 1+ spaces | `i. Item` | ✓ |
| **Uppercase letters (`A.`, `B.`)** | **2+ spaces** | `A.  Item` | ✓ |
| **Uppercase letters (`A.`, `B.`)** | **1 space** | `A. Item` | ✗ |
| **Uppercase Roman (`I.`, `II.`)** | **2+ spaces** | `I.  Item` | ✓ |
| **Uppercase Roman (`I.`, `II.`)** | **1 space** | `I. Item` | ✗ |

**Why uppercase needs two spaces:** Prevents false positives like "A. Smith said..." from being parsed as lists.

### Nesting Indentation

Add **3-4 spaces relative to the parent level** to create sub-lists:

```markdown
1. Level 1 (0 spaces indent)
   a. Level 2 (3 spaces from level 1)
   b. Another level 2
      i. Level 3 (3 spaces from level 2 = 6 total)
      ii. Another level 3
         A.  Level 4 (3 spaces from level 3 = 9 total, note 2 spaces after A.)
```

| Level | Indent From Parent | Total Indent | Example |
|-------|-------------------|--------------|---------|
| 1 | — | 0 spaces | `1. Item` |
| 2 | +3-4 spaces | 3-4 spaces | `   a. Item` |
| 3 | +3-4 spaces | 6-8 spaces | `      i. Item` |
| 4 | +3-4 spaces | 9-12 spaces | `         A.  Item` |

**Key point:** Indentation is **relative to the parent**, not absolute. If your level 1 starts at 4 spaces, level 2 must be at 7-8 spaces (4 + 3-4).

**Important:** A blank line before a nested list helps the parser recognize it as a new list level.

### List Behavior Rules

1. **First item determines type** - `b.` starts at "b", continues c, d, e...
2. **Subsequent markers are ignored** - `a. z. m.` renders as a, b, c (z and m ignored)
3. **Changing marker type starts new list** - switching `a.` → `A.` or `.` → `)` creates a separate list
4. **`I` or `i` first = Roman numerals** - `I.  ` starts Roman (1), not letter "I" (9th)
5. **Other single letters = alpha** - `C.` = letter C (3rd), not Roman 100
6. **`#` is just another valid marker** - no special "memory" across content breaks

### Auto-Increment Behavior

**Markers auto-increment regardless of what you write.** The actual marker values after the first item are ignored:

```markdown
a. First item
a. Second item (renders as "b")
a. Third item (renders as "c")
```

This means you can use any valid marker and the list will increment automatically. Only the **first marker** determines the starting value and list type.

### Custom Start Values

Start a list at any value by using that value as the first marker:

```markdown
c. Starts at c
d. Continues as d
e. Continues as e
```

```markdown
5. Starts at 5
6. Continues as 6
```

### Keeping Lists Continuous (Indentation Trick)

Content **indented past the list level** becomes part of the current list item and does NOT break the list:

````markdown
a. First item
b. Second item

    [[WARNING]]
    This callout is indented 4+ spaces, so it's inside item b.
    [[/WARNING]]

a. Continues as c (not restarted!)
````

The callout becomes part of item `b`, and the list continues unbroken.

**Rule:** Indentation determines if content breaks the list:
- Content at list level → breaks the list
- Content indented past list level → stays inside current item

### Restarting List Numbering

To **intentionally** restart numbering (e.g., go back to "a"), place content at the list's indentation level:

**Use `<!-- ::BREAK -->` at list level to restart:**

````markdown
a. First item
b. Second item

<!-- ::BREAK -->

a. Restarts at a
b. Continues as b
````

Other content that breaks lists (when at list indentation level):
- Any PageMD directive: `<!-- ::BREAK -->`, `<!-- ::TOC -->`, etc.
- Paragraph text
- Headings
- Horizontal rules (`---`)

**Does NOT break lists:**
- Blank lines alone
- HTML comments (`<!-- comment -->`)
- Content indented past list level (becomes part of list item)

### Paragraph Interruption

- **Can interrupt paragraphs:** `A`, `a`, `I`, `i`, `1`, `#` (first numerals)
- **Cannot interrupt paragraphs:** `B.`, `ii.`, `2.` (non-first values) at top level
- **Nested lists:** Any start value can interrupt within a list context

### Not Supported

- Parentheses around numbers: `(1)` ✗
- Only right-paren or period after marker: `1)` ✓ or `1.` ✓

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

### Spacing Requirements
- **Uppercase requires two spaces:** `A.  Item` ✓ (two spaces) vs `A. Item` ✗ (one space)
- **Lowercase needs one space:** `a. Item` ✓ (one space is sufficient)

### Nesting Requirements
- **3-4 spaces per level:** Each nesting level needs 3-4 spaces of indentation
- **Blank lines help:** A blank line before a nested list improves parser recognition

### List Behavior
- **First marker determines type:** The marker on the first item determines the list type for the entire list
- **Mixing markers starts new list:** Using a different marker type (e.g., `a.` to `A.`) starts a new list
- **Period or parenthesis:** Lists can use either `.` or `)` after the marker (e.g., `A.` or `A)`)

### Configuration
- **Disabled by default:** Must be explicitly enabled via frontmatter, profile, or environment variable

### Rendering
- **Browser rendering:** All fancy list types are rendered natively by browsers via HTML `<ol type="">` attribute
- **PDF support:** Paged.js fully supports all fancy list types in PDF output
- **CSS required:** PageMD base.css includes rules to properly style all list types

## Troubleshooting

### Lists not rendering with fancy numbering

**Cause:** Fancy lists are not enabled.

**Solution:** Add `fancy_lists: true` to frontmatter or enable via profile/environment variable.

### Uppercase markers (A., I.) not recognized as list items

**Cause:** Uppercase markers require **two spaces** after the period, not one.

**Wrong:**
```markdown
A. First item
B. Second item
```

**Correct:**
```markdown
A.  First item
B.  Second item
```

### Nested list appearing as paragraph text

**Cause:** Missing blank line before nested list, or insufficient indentation.

**Solution:**
1. Add a blank line after the parent item
2. Use 3-4 spaces of indentation per nesting level
3. For uppercase markers, remember two spaces after the period

**Example:**
```markdown
1. Parent item

   A.  Nested uppercase (blank line above, 3 spaces indent, 2 spaces after A.)
   B.  Another nested item
```

### Numbering resets unexpectedly

**Cause:** Mixing marker types (e.g., switching from `A.` to `i.`) starts a new list.

**Solution:** Use consistent marker types within a list. Each list type must be separate.

### Custom start value not working

**Cause:** Fancy lists feature is disabled.

**Solution:** Enable fancy lists. Standard Markdown only supports starting ordered lists at `1.`

### List not continuing after callout/content

**Cause:** Content at the list's indentation level breaks the list.

**Solution 1 - Indent the content** (keeps list continuous):

```markdown
a. First item
b. Second item

    [[NOTE]]
    Indented 4+ spaces - becomes part of item b.
    [[/NOTE]]

a. Continues as c (list not broken!)
```

**Solution 2 - Use explicit markers** (if content must be at list level):

```markdown
a. First item
b. Second item

[[NOTE]]
At list level - breaks the list.
[[/NOTE]]

c. Explicitly start at c
d. Next item
```

**Note:** Within a contiguous list, markers are ignored anyway (`a. z. m.` → a, b, c).

### List numbering won't restart

**Cause:** Blank lines and HTML comments (`<!-- comment -->`) do not break lists.

**Solution:** Use `<!-- ::BREAK -->` or other actual content to separate lists:

```markdown
a. First list item a
b. First list item b

<!-- ::BREAK -->

a. NEW list starts at a
b. Continues as b
```

See [Restarting List Numbering](#restarting-list-numbering) above for details.

## See Also

- [Extended Syntax](Extended-Syntax.md) - Other PageMD extensions
- [Profiles](../reference/Profiles.md) - Project-wide configuration
- [Settings](../reference/Settings.md) - Environment variables and configuration
