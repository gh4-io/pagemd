# How to Annotate Screenshots with Markers

Add numbered markers to screenshots for UI documentation without image editing software.

## Prerequisites

- PageMD installed and working
- A screenshot image file (PNG, JPG, etc.)
- Basic knowledge of [markdown syntax](Basic-Usage.md)

## What You'll Create

An annotated image with:
- Numbered circles positioned on specific UI elements
- Auto-generated legend grid below the image
- Optional figure caption with numbering

---

## Step 1: Prepare Your Screenshot

1. Take a screenshot of the UI you want to document
2. Save it in your project's assets folder (e.g., `./assets/screenshot.png`)
3. Open the image in any viewer to estimate coordinates

**Coordinate system:**
- Top-left corner = `x: 0, y: 0`
- Bottom-right corner = `x: 100, y: 100`
- Center = `x: 50, y: 50`

---

## Step 2: Create Basic Annotation

Add the annotated-image block to your markdown:

```markdown
::: annotated-image ./assets/screenshot.png
- { id: 1, x: 10, y: 15, label: "Main menu" }
- { id: 2, x: 85, y: 10, label: "Settings button" }
- { id: 3, x: 50, y: 90, label: "Status bar" }
:::
```

**Result:** Screenshot with three numbered markers and a legend below.

---

## Step 3: Add Options (Optional)

Customize appearance with the `options` block:

```markdown
::: annotated-image ./assets/workpackage.png
options:
  caption: "APN 58 Work Package Interface"
  markerColor: "#0066cc"
  legendColumns: 4
  id: "fig-workpackage"
markers:
  - { id: 1, x: 10, y: 20, label: "Save button" }
  - { id: 2, x: 85, y: 10, label: "Settings menu" }
:::
```

**Available options:**

| Option | Default | What it does |
|--------|---------|--------------|
| `caption` | (none) | Adds figure number and caption |
| `markerColor` | `#cc0000` | Changes marker circle color |
| `legendColumns` | `3` | Number of columns in legend |
| `id` | (none) | HTML id for cross-references |

---

## Step 4: Fine-Tune Marker Positions

If markers aren't positioned correctly:

1. **Open the PDF** and note where markers appear
2. **Adjust coordinates** - increase `x` to move right, increase `y` to move down
3. **Rebuild** and check again

**Tips:**
- Start with rough estimates (10, 20, 30, etc.)
- Refine in increments of 2-5%
- Markers center on the coordinate point

---

## Step 5: Build and Verify

Generate your document:

```bash
pagemd build document.md -o pdf
```

Check that:
- All markers are visible and correctly positioned
- Legend items match marker numbers
- Figure caption appears (if using `caption` option)

---

## Common Tasks

### Change Marker Color

Use CSS color values:

```markdown
options:
  markerColor: "#0066cc"   # Blue
  markerColor: "#28a745"   # Green
  markerColor: "#fd7e14"   # Orange
```

### Annotate Many Items (10+)

For dense UIs, increase legend columns:

```markdown
options:
  legendColumns: 4
```

### Add to Figure Numbering

Include `caption` to integrate with document figure sequence:

```markdown
options:
  caption: "Main Application Interface"
```

This renders as "Figure X: Main Application Interface" and increments the document's figure counter.

### Cross-Reference the Figure

Add an `id` and reference it:

```markdown
options:
  id: "fig-main-screen"
```

Then reference: `See [Figure 1](#fig-main-screen)`

---

## Arrows

Arrows point at something on the screenshot. Add an `arrows:` list inside the same block as your markers. Each arrow is a straight line from a **start point** (`x1`, `y1`) to an **end point** (`x2`, `y2`); the arrowhead is drawn at the end point.

```markdown
::: annotated-image ./assets/settings.png
arrows:
  - { x1: 60, y1: 60, x2: 40, y2: 40 }
  - { id: 2, x1: 80, y1: 20, x2: 90, y2: 30, label: "Save button", color: "#0a7d00", strokeWidth: 3 }
:::
```

| Field | Required | Default | What it does |
|-------|----------|---------|--------------|
| `x1`, `y1` | Yes | - | Start of the arrow (percent of image width/height, 0-100) |
| `x2`, `y2` | Yes | - | End of the arrow, where the arrowhead is drawn (0-100) |
| `color` | No | `#cc0000` | Line and arrowhead color (any CSS color) |
| `strokeWidth` | No | `2` | Line thickness in pixels (numbers only, max 20) |
| `id` + `label` | No | - | If **both** are given, a numbered badge is drawn at the middle of the arrow and the label is added to the legend |

**Tip:** Put the end point (`x2`, `y2`) just beside the item you want to highlight, not on top of it, so the arrowhead doesn't hide it.

---

## Boxes

Boxes draw a rectangle around a region, such as a panel or a group of fields. `x` and `y` are the **top-left corner**; `width` and `height` are the size. All four are percentages of the image.

```markdown
::: annotated-image ./assets/settings.png
boxes:
  - { x: 5, y: 50, width: 30, height: 20 }
  - { id: 3, x: 40, y: 10, width: 25, height: 15, label: "Account panel", color: "#0066cc", fill: "rgba(0,102,204,0.12)" }
:::
```

| Field | Required | Default | What it does |
|-------|----------|---------|--------------|
| `x`, `y` | Yes | - | Top-left corner (0-100) |
| `width`, `height` | Yes | - | Size (0-100). Trimmed automatically so the box never runs off the image |
| `color` | No | `#0066cc` | Border color |
| `fill` | No | `none` | Inside color. Use a semi-transparent color such as `rgba(0,102,204,0.12)` so the screenshot stays readable |
| `strokeWidth` | No | `2` | Border thickness in pixels (numbers only, max 20) |
| `id` + `label` | No | - | If **both** are given, a numbered badge is drawn just inside the top-left corner and the label is added to the legend |

---

## Text Overlays

Text overlays write a short note directly on the image. `x` and `y` are the **top-left corner** of the text.

```markdown
::: annotated-image ./assets/settings.png
text:
  - { x: 55, y: 80, text: "Click here, then wait 5 seconds", color: "#ffffff", background: "#333333" }
  - { x: 10, y: 5, text: "Read-only", fontSize: 18, color: "#cc0000" }
:::
```

| Field | Required | Default | What it does |
|-------|----------|---------|--------------|
| `x`, `y` | Yes | - | Top-left corner of the text (0-100) |
| `text` | Yes | - | The words to show (plain text; HTML is shown as-is, not interpreted) |
| `fontSize` | No | `14` | Text size in pixels (numbers only, max 96) |
| `color` | No | `#000000` | Text color |
| `background` | No | (none) | Color of a small rounded box behind the text. Recommended on busy screenshots |

Text overlays are **not** added to the legend and do not get a number.

**Note:** Text size is fixed in pixels (like marker circles). It does **not** shrink when the image is scaled down to fit the page, so keep notes short and check the PDF.

---

## Combining Markers, Arrows, Boxes, and Text

All four can be used in one block. Markers, arrows, and boxes that have an `id` and `label` share **one legend**, sorted by `id`, so give every numbered item a unique `id`.

```markdown
::: annotated-image ./assets/amos-workpackage-screen.png
options:
  caption: "Workpackage screen"
  legendColumns: 2
markers:
  - { id: 1, x: 12, y: 8, label: "Search field" }
arrows:
  - { id: 2, x1: 60, y1: 60, x2: 40, y2: 40, label: "Save button", color: "#0a7d00" }
boxes:
  - { id: 3, x: 5, y: 50, width: 30, height: 20, label: "Task list", fill: "rgba(0,102,204,0.12)" }
text:
  - { x: 55, y: 80, text: "Click here & wait", color: "#ffffff", background: "#333333" }
:::
```

**Result:** Badges 1, 2 and 3 appear on the image, a green arrow and a blue box are drawn, the note appears on a dark background, and the legend lists "1 Search field", "2 Save button", "3 Task list".

---

## Troubleshooting

### Markers don't appear

- Check that coordinates are numbers (not strings): `x: 10` not `x: "10"`
- Verify all required fields: `id`, `x`, `y`, `label`

### Arrow, box, or text doesn't appear

- Check the required fields: arrows need `x1`, `y1`, `x2`, `y2`; boxes need `x`, `y`, `width`, `height`; text needs `x`, `y`, `text`
- Coordinates must be numbers, not quoted strings
- `arrows:`, `boxes:` and `text:` must be **lists** (each item starts with `-`). Anything else is ignored

### Arrow or box is missing from the legend

Only items with **both** an `id` and a `label` get a badge and a legend entry.

### Color, stroke width, or font size is ignored

- `strokeWidth` and `fontSize` must be plain numbers (`3`, not `"3px"`)
- Colors containing `;`, `{` or `}` are rejected for safety and the default color is used instead

### Image doesn't load in PDF

- Use relative paths from markdown file location
- Ensure image file exists at specified path

### Legend has wrong order

Markers automatically sort by ID. Use numeric IDs (1, 2, 3) for predictable ordering.

### YAML parse error

- Ensure consistent indentation (2 spaces)
- Check for missing colons or quotes

---

## Example: Complete Annotation

```markdown
::: annotated-image ./assets/amos-workpackage.png
options:
  caption: "AMOS View/Edit Workpackage Screen"
  markerColor: "#cc0000"
  legendColumns: 3
  id: "fig-amos-wp"
markers:
  - { id: 1, x: 1.5, y: 1.5, label: "AMOS main menu bar" }
  - { id: 2, x: 3, y: 7, label: "New workpackage button" }
  - { id: 3, x: 6, y: 7, label: "Save button" }
  - { id: 4, x: 10, y: 7, label: "Reports menu" }
  - { id: 5, x: 14, y: 7, label: "Duplicate workpackage" }
  - { id: 6, x: 42, y: 14, label: "Workpackage tab group" }
  - { id: 7, x: 48, y: 22, label: "Aircraft field" }
  - { id: 8, x: 55, y: 38, label: "W/P Status dropdown" }
:::
```

---

## Next Steps

- [Extended Syntax Reference](Extended-Syntax.md#annotated-images) - Full parameter documentation
- [Style Guide](Style-Guide.md) - Visual styling options
- [Profiles](Profiles.md) - Set default marker colors per profile
