---
title: Color Scheme Test Document
profile: "../profiles/color-scheme.json"
author: PageMD Test Suite
date: 2026-01-09
colorScheme: light
---

# Color Scheme Test Document

This document tests the color scheme functionality with various elements that are heavily affected by light/dark mode.

## Text Colors

Regular paragraph text should be readable in both light and dark modes.

### Links and Emphasis

- [External link](https://example.com) - Should be blue in light mode, lighter blue in dark mode
- **Bold text** - Should maintain readable contrast
- *Italic text* - Should be visible in both modes
- `inline code` - Background should adapt to theme

## Code Blocks

```javascript
// Code blocks should have appropriate syntax highlighting
function exampleFunction() {
  const variable = "test";
  return variable.toUpperCase();
}
```

```python
# Python code with different syntax
def calculate_sum(a, b):
    result = a + b
    return result
```

## Tables

Tables are heavily affected by color schemes:

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Data A   | Data B   | Data C   |
| Info X   | Info Y   | Info Z   |

## Blockquotes

> This is a blockquote.
>
> It should have a distinct background color and border that adapts to the theme.
>
> Nested content should be readable.

## Lists

1. First item
2. Second item
   - Nested bullet
   - Another nested item
3. Third item

## Task Lists

- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task

## Horizontal Rule

---

## Alerts/Callouts (if supported)

> **Note:** This is a note callout
> Background colors should be appropriate for the theme

> **Warning:** This is a warning
> Colors should maintain attention-grabbing properties in both modes

## Inline Elements

This paragraph contains <mark>highlighted text</mark>, <kbd>Ctrl</kbd>+<kbd>C</kbd> keyboard shortcuts, and <abbr title="HyperText Markup Language">HTML</abbr> abbreviations.

## Definition List

Term 1
: Definition for term 1

Term 2
: Definition for term 2
: Alternate definition for term 2

---

## Color Scheme Impact Analysis

Elements **most affected** by color scheme changes:

1. **Background colors** - White → Dark gray/black
2. **Text colors** - Dark → Light
3. **Link colors** - Dark blue → Light blue
4. **Code block backgrounds** - Light gray → Dark gray
5. **Table alternating rows** - Subtle gray → Subtle dark
6. **Border colors** - Medium gray → Medium-light gray
7. **Blockquote backgrounds** - Very light → Very dark
8. **Syntax highlighting** - Complete color palette swap
