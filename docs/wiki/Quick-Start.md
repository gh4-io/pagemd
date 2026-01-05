# Quick Start Guide

This tutorial walks you through creating your first PageMD document and generating HTML and PDF outputs.

## Prerequisites

- **Node.js 20+** installed on your system
- Basic command-line familiarity

**Installation:** See [Installation Guide](Installation.md) for setup instructions.

---

## Step 1: Create Your First Markdown Document

Create a file named `my-document.md` with the following content:

```markdown
---
title: My First PageMD Document
document_id: DOC-001
revision: 1
status: Draft
owner: Jason Grace
pipeline_profile: standard_letter
---

# Welcome to PageMD

This is my first document using the PageMD pipeline.

## Features

PageMD supports:
- Markdown with frontmatter
- HTML and PDF output
- Profile-based layouts
- Validation and quality checks

[[WARNING]]
Always validate your documents before publishing.
[[/WARNING]]

## Next Steps

Check out the [User Guide](User-Guide.md) to learn more advanced features.
```

**Expected result:** A markdown file with YAML frontmatter and standard markdown content including a callout block.

---

## Step 2: Build HTML Output

Generate an HTML version of your document:

```bash
pagemd build my-document.md -o html
```

**Expected output:**
```
Building my-document.md...
Profile: standard_letter
Output: my-document.html
✓ Build completed successfully
```

**What happens:**
- Parser extracts frontmatter and converts markdown to HTML
- `standard_letter` profile applies layout template
- Output saved as `my-document.html` in same directory

**Verify:** Open `my-document.html` in your browser to see the rendered document.

---

## Step 3: Build PDF Output

Generate a PDF version using Puppeteer and Paged.js:

```bash
pagemd build my-document.md -o pdf
```

**Expected output:**
```
Building my-document.md...
Profile: standard_letter
Rendering PDF with Paged.js...
Output: my-document.pdf
✓ Build completed successfully
```

**What happens:**
- HTML is generated (same as Step 2)
- Paged.js applies print media rules
- Puppeteer renders to PDF with proper page breaks
- Output saved as `my-document.pdf`

**Verify:** Open `my-document.pdf` to see the paginated output.

---

## Step 4: Validate Your Document

Check that your document meets profile requirements:

```bash
pagemd validate my-document.md
```

**Expected output (success):**
```
Validating my-document.md...
Profile: standard_letter
✓ Required fields present: document_id, title
✓ Frontmatter schema valid
✓ Validation passed
```

**Expected output (with errors):**
```
Validating my-document.md...
Profile: standard_letter
✗ Missing required field: document_id
✗ Validation failed
```

**What happens:**
- Profile's `validation.required_fields` are checked
- Frontmatter schema validated against JSON schema
- Missing or invalid fields reported

**Fix errors:** Add missing fields to frontmatter and re-validate.

---

## Step 5: Use a Different Profile

Try the `memo` profile for a different layout:

**Update frontmatter:**
```yaml
---
title: My Memo
document_id: MEMO-001
revision: 1
pipeline_profile: memo
---
```

**Build:**
```bash
pagemd build my-document.md -o pdf
```

**Expected result:** PDF with memo-style layout (header, footer, margins).

---

## Step 6: List Available Profiles

See all installed profiles:

```bash
pagemd list-profiles
```

**Expected output:**
```
Available profiles:
  standard_letter  - US Letter format with standard margins
  memo            - Internal memo layout
  sop             - Standard Operating Procedure template
  invoice         - Invoice/billing document layout
```

**Usage:** Reference any profile ID in your frontmatter's `pipeline_profile` field.

---

## Next Steps

Now that you've created your first PageMD document, explore:

1. **[User Guide](User-Guide.md)** - Learn markdown extensions (callouts, figures, wiki-links)
2. **[Profiles](Profiles.md)** - Customize layouts and validation rules
3. **[Frontmatter Reference](Frontmatter-Reference.md)** - All supported metadata fields
4. **[CLI Reference](CLI-Reference.md)** - Complete command-line options
5. **[Creating Custom Profiles](Creating-Custom-Profiles.md)** - Build your own layouts

---

## Common Issues

### Build fails with "Profile not found"

**Solution:** Verify profile name matches installed profiles. Run `pagemd list-profiles` to check.

### PDF output is blank

**Solution:** Check that CSS media queries support print. See [Troubleshooting](Troubleshooting.md).

### Validation always passes

**Solution:** Ensure profile defines `validation.required_fields`. See [Profiles](Profiles.md).

---

## Summary

You've learned how to:
- Create markdown documents with frontmatter
- Build HTML and PDF outputs
- Validate documents against profile requirements
- Switch between different profiles
- Find available profiles

**Ready to build production documents?** See [Production Workflows](Production-Workflows.md) for best practices.
