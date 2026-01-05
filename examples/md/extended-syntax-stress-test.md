---
title: Extended Syntax Stress Test
author: PageMD Test Suite
date: 2026-01-03
description: Comprehensive test of all extended markdown syntax features
---

<!-- ::COVER_START -->

# Extended Syntax Stress Test

**PageMD Parser Validation Document**

*Testing all extended markdown features*

January 2026

<!-- ::COVER_END -->

<!-- ::PAGEBREAK -->

<!-- ::TOC levels=3 -->

<!-- ::PAGEBREAK -->

# Chapter 1: Comment Directives {#chapter-1}

This chapter tests all comment directive types.

## Page Breaks

The cover page and TOC above used `<!-- ::PAGEBREAK -->` directives. If you're reading this on page 3, they worked!

## Sections with Custom Classes

<!-- ::SECTION_START class="highlight-box" id="important-section" -->

This content is wrapped in a custom section with:
- Class: `highlight-box`
- ID: `important-section`

You can style this section independently using CSS.

<!-- ::SECTION_END -->

## Figures

### Inline Figure Syntax

<!-- ::FIGURE src="https://via.placeholder.com/400x200" caption="Placeholder Image - Inline Syntax" id="fig-inline" width="half" -->

### Legacy Figure Syntax

<!-- ::FIGURE caption="Placeholder Image - Legacy Syntax" id="fig-legacy" -->
![](https://via.placeholder.com/300x150)

### Full Width Figure

<!-- ::FIGURE src="https://via.placeholder.com/800x200" caption="Full Width Demonstration" width="full" -->

<!-- ::PAGEBREAK -->

# Chapter 2: GFM Alerts {#chapter-2}

GitHub-Flavored Markdown alerts for callout blocks.

> [!NOTE]
> This is a **note** alert. Use for supplementary information that adds context without being critical to understanding.

> [!TIP]
> This is a **tip** alert. Use for helpful suggestions that can improve workflow or results.

> [!IMPORTANT]
> This is an **important** alert. Use for key information users need to know to succeed.

> [!WARNING]
> This is a **warning** alert. Use for potential issues that could cause problems if ignored.

> [!CAUTION]
> This is a **caution** alert. Use for dangerous actions that could have serious negative consequences.

## Nested Content in Alerts

> [!NOTE]
> Alerts can contain **rich markdown**:
>
> - Bullet points
> - `Inline code`
> - [Links](https://example.com)
>
> ```javascript
> const example = "code blocks too!";
> ```

<!-- ::PAGEBREAK -->

# Chapter 3: Custom Callouts {#chapter-3}

PageMD's native callout syntax for inline and block callouts.

## Block Callouts

[[WARNING]]
This is a block warning callout. It spans multiple lines and can contain detailed information about potential issues.

Use these for important cautionary notes.
[[/WARNING]]

[[DANGER]]
This is a danger callout. Use sparingly for critical safety information or actions that could cause data loss or system damage.

**Do not ignore this type of message!**
[[/DANGER]]

## Single-Line Callouts

[[WARNING]] Brief warning: Check your configuration before proceeding. [[/WARNING]]

[[DANGER]] Critical: This action cannot be undone! [[/DANGER]]

## Inline Callouts

When working with the API, be aware that rate limits apply [!WARNING] and exceeding them may result in temporary blocks [!DANGER].

<!-- ::PAGEBREAK -->

# Chapter 4: Container Blocks {#chapter-4}

Fenced container blocks using `:::` syntax.

## Details Container

:::details
This content is wrapped in a details container. In HTML output, this becomes a styled `<div>` that could be made collapsible with JavaScript.

### Nested Heading Inside Details

You can have full markdown inside containers:

1. Ordered lists
2. With multiple items
3. And nested content

```python
def example():
    return "Code blocks work too!"
```
:::

## Aside Container

:::aside
**Sidebar Note**

This is an aside container, styled differently to stand out as supplementary information. Perfect for:

- Author notes
- Related topics
- Quick references
:::

## Columns Container

:::columns
**Column Layout**

This content will flow into two columns when rendered. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
:::

## Spoiler Container

:::spoiler The secret ingredient
The answer is: **42**. But you already knew that, didn't you?
:::

## Summary Container

:::summary
**Key Takeaways:**
- Container blocks use `:::name` syntax
- They support full markdown inside
- Each type has distinct styling
- Titles are optional (except spoiler)
:::

<!-- ::PAGEBREAK -->

# Chapter 5: Inline Attributes {#chapter-5}

Using `markdown-it-attrs` for element styling.

## Headings with Attributes

### Custom Styled Heading {.accent-heading #custom-heading data-section="attributes"}

## Paragraphs with Classes

This paragraph has a highlight class applied. {.highlight}

This paragraph has multiple attributes. {.important .centered #key-point}

## Images with Attributes

![Styled Image](https://via.placeholder.com/300x100){.rounded .shadow #hero-image}

## Links with Attributes

[External Link](https://example.com){.external target="_blank" rel="noopener"}

## Tables with Attributes

| Feature | Support | Notes |
|---------|---------|-------|
| Classes | Yes | `.class` syntax |
| IDs | Yes | `#id` syntax |
| Data attrs | Yes | `data-*` attributes |
{.feature-table #attrs-table}

## Code with Attributes

```javascript {.line-numbers data-filename="example.js"}
function greet(name) {
    return `Hello, ${name}!`;
}
```

<!-- ::PAGEBREAK -->

# Chapter 6: Layout Switching {#chapter-6}

Testing mid-document layout changes.

## Default Portrait Layout

This content uses the default portrait layout. Standard margins, standard orientation.

<!-- ::LAYOUT(landscape) -->

## Landscape Section

This section should render in landscape orientation (if the profile supports it). Perfect for:

| Wide Table Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
|---------------------|----------|----------|----------|----------|----------|
| Data 1 | Data 2 | Data 3 | Data 4 | Data 5 | Data 6 |
| More data | And more | Still more | Even more | Yet more | Final |

<!-- ::LAYOUT(default) -->

## Back to Portrait

Content returns to the default portrait layout after the landscape section.

<!-- ::PAGEBREAK -->

# Chapter 7: Combined Features {#chapter-7}

Testing multiple features together.

## Alert Inside Section

<!-- ::SECTION_START class="bordered-section" -->

> [!IMPORTANT]
> This alert is inside a custom section. Both features should render correctly together.

:::aside
And this aside is also inside the same section!
:::

<!-- ::SECTION_END -->

## Figure with Attributes

<!-- ::FIGURE src="https://via.placeholder.com/400x150" caption="Figure with Custom Attributes" id="fig-attrs" -->

Reference: See [Figure 1](#fig-inline) and [Figure 2](#fig-legacy) in Chapter 1. {.figure-ref}

## Nested Containers

:::details
**Outer Container**

:::aside
This aside is nested inside the details container.
:::

The nesting should be handled gracefully.
:::

## Complex Callout

[[WARNING]]
This warning contains:

> [!NOTE]
> A nested GFM alert (this tests parser ordering)

And inline code: `dangerous_function()` [!DANGER]
[[/WARNING]]

<!-- ::PAGEBREAK -->

# Appendix: Syntax Reference {#appendix .appendix}

## Quick Reference Table

| Syntax | Type | Example |
|--------|------|---------|
| `<!-- ::PAGEBREAK -->` | Directive | Force page break |
| `<!-- ::TOC -->` | Directive | Table of contents |
| `<!-- ::FIGURE -->` | Directive | Numbered figure |
| `> [!NOTE]` | GFM Alert | Info callout |
| `[[WARNING]]` | Callout | Block warning |
| `[!WARNING]` | Callout | Inline warning |
| `:::name` | Container | Wrapper block |
| `{.class}` | Attribute | Element styling |
| `[[Page]]` | Wikilink | Internal link |

## File Inclusion Test

<!-- ::INCLUDE path="includes/sample.md" -->

*(If no include plugin configured, this shows a placeholder)*

---

**End of Stress Test Document**

*Generated by PageMD Extended Syntax Stress Test*
