# Basic Usage

> **Section:** Usage Guide

Common workflows for building documents with PageMD.

## Overview

This guide covers everyday tasks: building outputs, selecting profiles, and controlling output formats.

## Prerequisites

- [ ] PageMD installed (`pagemd --version` works)
- [ ] A Markdown file to process

## Building Documents

### Build PDF

**Why:** Convert Markdown to a print-ready PDF with professional formatting.

```bash
pagemd build document.md -o pdf
```

**What you'll see:**
```
[INFO] Parsing document.md
[INFO] Profile: standard_letter
[INFO] Rendering PDF...
[INFO] Output: document.pdf (125KB, 3 pages)
```

**Output:** `document.pdf` in the same directory as your Markdown file.

### Build HTML

**Why:** Generate a standalone HTML file for web viewing or further processing.

```bash
pagemd build document.md -o html
```

**Output:** `document.html` with embedded CSS.

### Build Multiple Formats

**Why:** Generate several formats at once.

```bash
pagemd build document.md -o pdf,html
```

**Output:** Both `document.pdf` and `document.html`.

### Build Images

**Why:** Generate PNG or JPEG of the first page (useful for thumbnails or previews).

```bash
pagemd build document.md -o png
pagemd build document.md -o jpeg
```

**Output:** `document.png` or `document.jpeg` (first page only).

## Selecting Profiles

### Use a Specific Profile

**Why:** Different profiles provide different layouts, styles, and validation rules.

```bash
pagemd build document.md -o pdf -p memo
```

**What `-p memo` does:** Uses the `memo` profile instead of the default `standard_letter`.

### Set Profile in Frontmatter

**Why:** Lock a document to a specific profile without needing CLI flags.

```yaml
---
title: Monthly Report
profile: report
---
```

Now `pagemd build monthly.md -o pdf` uses the `report` profile automatically.

### List Available Profiles

**Why:** See what profiles are installed and available.

```bash
pagemd list profiles
```

**What you'll see:**
```
standard_letter    US Letter, standard margins
standard_a4        A4 format, European standard
memo               Internal memo layout
report             Report with title page
```

## Output Directory

### Change Output Location

**Why:** Put generated files somewhere other than the source directory.

```bash
pagemd build document.md -o pdf -d ./output
```

**Output:** `./output/document.pdf`

### Output to Specific File

**Why:** Control the exact output filename.

```bash
pagemd build document.md -o pdf --output-file report-final.pdf
```

**Output:** `report-final.pdf`

## Validation

### Validate Without Building

**Why:** Check document meets profile requirements without generating output.

```bash
pagemd validate document.md
```

**Success output:**
```
[INFO] Validating document.md
[INFO] Profile: standard_letter
[OK] Required fields present
[OK] Validation passed
```

**Failure output:**
```
[ERROR] Missing required field: document_id
[ERROR] Validation failed
```

### Strict Validation

**Why:** Fail on warnings, not just errors.

```bash
pagemd validate document.md --strict
```

## Troubleshooting

### Profile not found

**What you see:** `[ERROR] Profile 'xyz' not found`

**Why it happens:** Profile name doesn't match any installed profile.

**How to fix:**
1. Run `pagemd list profiles` to see available profiles
2. Check spelling in frontmatter or `-p` flag
3. If custom profile, check it's in `.pagemd/profiles/`

### Output is blank or missing content

**What you see:** PDF/HTML generated but empty or partial.

**Why it happens:** Usually CSS or template issue.

**How to fix:** Check [[Troubleshooting]] for detailed diagnostics.

## See Also

- [[guides/Profiles|Working with Profiles]] - Customize output appearance
- [[guides/Installation|Installation]] - Setup options
- [[reference/CLI|CLI Reference]] - All commands and flags
