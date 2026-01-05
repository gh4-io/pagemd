# Quick Start

> **Section:** Getting Started
> **Goal:** First PDF in 5 minutes

Build your first professional PDF from Markdown in under 5 minutes.

## Prerequisites

Before starting, you need:

- **Node.js 20 or later** - Check with `node --version`. [Download from nodejs.org](https://nodejs.org/) if needed.
- **A terminal** - PowerShell (Windows), Terminal (macOS), or any Linux terminal

## Install PageMD

Open your terminal and run:

```bash
npm install -g pagemd
```

**What you'll see:**

```
added 150 packages in 10s
```

**Verify installation worked:**

```bash
pagemd --version
```

You should see output like:
```
pagemd v2.0.0
```

**If you see `command not found`:** The install didn't add PageMD to your PATH. Try `npx pagemd --version` or see [[guides/Installation|Installation Guide]].

## Your First PDF

### Step 1: Create a Markdown File

Create a file called `hello.md` with this content:

```markdown
---
title: My First Document
author: Your Name
date: 2025-01-04
---

# Hello, PageMD!

This is my first document converted to PDF.

## Features

- Clean typography
- Professional formatting
- Page numbers and headers
```

**Why the `---` section?** This is called "frontmatter" - YAML metadata that sets document properties like title and author. PageMD uses this to populate headers, footers, and title pages.

### Step 2: Build the PDF

Run the build command:

```bash
pagemd build hello.md -o pdf
```

**What this command does:**
- `pagemd build` - Runs the build process
- `hello.md` - Your input Markdown file
- `-o pdf` - Output format (PDF)

**What you'll see:**

```
[INFO] Parsing hello.md
[INFO] Profile: standard_letter
[INFO] Rendering PDF...
[INFO] Output: hello.pdf (45KB, 1 page)
```

### Step 3: View Your PDF

Open `hello.pdf` in any PDF viewer (Adobe Reader, Preview, browser, etc.).

**Success!** You should see a professionally formatted document with:
- Title "My First Document" in the header
- Your author name and date
- Clean typography and spacing
- Page number in the footer

## If Something Went Wrong

| What You See | What It Means | How to Fix |
|--------------|---------------|------------|
| `command not found: pagemd` | PageMD not in PATH | Run `npm install -g pagemd` again, or use `npx pagemd` |
| `[ERROR] File not found: hello.md` | File doesn't exist where you ran command | Check filename spelling, make sure you're in the right folder |
| `[ERROR] Chrome not found` | PDF rendering needs a browser | Install Chrome, or set `CHROME_PATH` environment variable |
| `[ERROR] Profile not found` | Invalid profile name | Remove `profile:` from frontmatter or use valid profile |

See [[Troubleshooting]] for more solutions.

## What Just Happened?

When you ran `pagemd build`:

1. **Parser** read your Markdown and extracted the frontmatter
2. **Renderer-Web** wrapped your content in an HTML template with CSS styling
3. **Renderer-PDF** used Paged.js + Puppeteer to render print-quality PDF
4. **Exporter** saved the result as `hello.pdf`

The `standard_letter` profile (the default) provided US Letter page size, professional margins, and a clean layout.

## Next Steps

Now that you've built your first PDF:

| I want to... | Go to |
|--------------|-------|
| Build HTML or images too | [[guides/Basic-Usage\|Basic Usage]] |
| Customize the appearance | [[guides/Profiles\|Working with Profiles]] |
| Add table of contents | [[guides/Extended-Syntax\|Extended Syntax]] |
| Understand how it works | [[general/Overview\|Overview]] |
| See all CLI options | [[reference/CLI\|CLI Reference]] |

