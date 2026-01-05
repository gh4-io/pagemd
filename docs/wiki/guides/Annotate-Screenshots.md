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

## Troubleshooting

### Markers don't appear

- Check that coordinates are numbers (not strings): `x: 10` not `x: "10"`
- Verify all required fields: `id`, `x`, `y`, `label`

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
