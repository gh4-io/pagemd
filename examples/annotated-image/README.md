# Annotated Image Example

Proof of concept for coordinate-based image annotation feature.

## Files

| File | Description |
|------|-------------|
| `annotated-workpackage.pdf` | Final rendered PDF with markers |
| `annotated-workpackage.md` | Source markdown (base64 image embedded) |
| `amos-workpackage-screen.png` | Original AMOS screenshot |

## What This Demonstrates

- 30 numbered markers positioned via CSS percentage coordinates
- 3-column legend grid below the image
- Red markers (#cc0000) with white border for visibility
- Proof that the concept works with PageMD's PDF renderer

## Proposed Syntax (Not Yet Implemented)

When implemented, the markdown syntax will be:

```markdown
::: annotated-image ./amos-workpackage-screen.png
options:
  caption: "APN 58 Workpackage Interface"
  markerColor: "#cc0000"
  legendColumns: 3
markers:
- { id: 1, x: 1.5, y: 1.5, label: "AMOS main menu bar" }
- { id: 2, x: 3, y: 7, label: "New workpackage button" }
- { id: 3, x: 6, y: 7, label: "Save button" }
:::
```

## See Also

- Proposal: `context/research/image_annotation_proposal.md`
- Implementation tracking: CLAUDE.md "Next Feature" section
