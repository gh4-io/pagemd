# Working with Profiles

> **Section:** Usage Guide

Customize document appearance and behavior using profiles.

## Overview

A [[reference/Glossary#Profile|profile]] is a JSON or YAML configuration file that controls how PageMD processes and renders your documents. Profiles *reference* external resources (templates, layouts, CSS files)—they don't contain styling rules themselves.

Profiles can:
- Reference HTML templates, layout CSS, and style CSS
- Set validation rules (require specific [[reference/Glossary#Frontmatter|frontmatter]] fields)
- Configure output format behavior (PDF, HTML, PNG, JPEG)
- Inherit settings from parent profiles via [[reference/Glossary#extends|extends]]

## Prerequisites

- [ ] PageMD installed (see [[guides/Installation|Installation Guide]])
- [ ] Basic understanding of JSON format (curly braces `{}`, key-value pairs)

## Using Built-in Profiles

### List Available Profiles

To see what profiles are available, run the `list` command in your terminal:

```bash
pagemd list profiles
```

**What you'll see:**
```
standard_letter    Standard US Letter layout for SOPs and documentation (default)
standard_a4        A4 format, European standard (planned)
memo               Internal memo layout (planned)
report             Report with title page (planned)
```

**Understanding the output:**
- Each line shows: `profile_id    description`
- The default profile (`standard_letter`) is used when you don't specify one
- Profiles marked "(planned)" are not yet available

### Select a Profile

There are two ways to select a profile:

**Option 1: CLI flag (highest priority)**

Add `-p` or `--profile` to your build command:

```bash
pagemd build document.md -o pdf -p standard_letter
```

**Option 2: Frontmatter**

Add a `profile:` field in your document's [[reference/Glossary#Frontmatter|frontmatter]]:

```yaml
---
title: My Document
profile: standard_letter
---
```

**Precedence:** CLI flag (`-p`) overrides frontmatter. If neither is specified, `standard_letter` is used by default.

## Creating Custom Profiles

Custom profiles let you define reusable configurations for your documents. They go in your project's `.pagemd/profiles/` directory.

### Step 1: Create Profile Directory

Open a terminal in your project root (the folder containing your Markdown files) and create the profile directory:

```bash
mkdir -p .pagemd/profiles
```

**What this does:** Creates a hidden folder `.pagemd/` with a `profiles/` subfolder. This is where PageMD looks for custom profiles.

**Verification:** Run `ls -la .pagemd/` and you should see the `profiles/` directory listed.

### Step 2: Create Profile File

Create a new file at `.pagemd/profiles/my-profile.json`. You can use any text editor.

Add this content:

```json
{
  "id": "my-profile",
  "description": "My custom profile with Georgia font",
  "extends": "standard_letter",
  "resources": {
    "css": ["${workspaceFolder}/.pagemd/styles/my-styles.css"]
  }
}
```

**What each field does:**
- `id` - Unique identifier. **Must match the filename** (without `.json`)
- `description` - Human-readable text shown in `pagemd list profiles`
- `extends` - Parent profile to inherit settings from (here: `standard_letter`)
- `resources.css` - Array of CSS files to apply. The `${workspaceFolder}` token expands to your project root

### Step 3: Create Style File

Create the CSS file your profile references. First create the styles directory:

```bash
mkdir -p .pagemd/styles
```

Then create `.pagemd/styles/my-styles.css`:

```css
/* Custom styles for my-profile */
body {
  font-family: "Georgia", serif;
}

h1 {
  color: #2c3e50;
}
```

### Step 4: Use Your Profile

Build a document with your custom profile:

```bash
pagemd build document.md -o pdf -p my-profile
```

**What you'll see:**
```
[INFO] Profile: my-profile
[INFO] Extends: standard_letter
[INFO] Building: document.md
[INFO] Output: document.pdf
```

**Success indicator:** The PDF opens with Georgia font and dark blue headings.

**If profile not found:** You'll see `[ERROR] Profile 'my-profile' not found`. See [[#Troubleshooting]] below.

## Profile Inheritance

Profiles can [[reference/Glossary#extends|extend]] other profiles to inherit their settings. This lets you build on existing configurations without duplicating them.

```json
{
  "id": "child-profile",
  "extends": "standard_letter",
  "resources": {
    "css": ["additional-styles.css"]
  }
}
```

### How Inheritance Works

When PageMD loads a profile with `extends`:

1. **Load parent** - The parent profile is loaded first (recursively if it also extends)
2. **Deep-merge objects** - Nested object properties are merged recursively
3. **Replace arrays** - Child arrays completely replace parent arrays (no merging)
4. **Child wins** - If both define the same field, the child's value is used
5. **Null means inherit** - Set a field to `null` to preserve the parent's value (useful for selective inheritance)

**Single parent only:** Each profile can extend at most one parent. Circular inheritance (A extends B extends A) is detected and throws an error.

### Inheritance Example

**Parent (`standard_letter`):**
```json
{
  "id": "standard_letter",
  "resources": {
    "template": "${projectRoot}/templates/standard_letter.html",
    "css": ["${projectRoot}/styles/primary.css"]
  }
}
```

**Child (`my-profile`):**
```json
{
  "id": "my-profile",
  "extends": "standard_letter",
  "resources": {
    "css": ["my-styles.css"]
  }
}
```

**Merged result:**
- `resources.template` → `"${projectRoot}/templates/standard_letter.html"` (inherited from parent)
- `resources.css` → `["my-styles.css"]` (child replaces parent's array)

The child's `css` array completely replaces the parent's—if you want to *add* to the parent's CSS, you must include all the CSS files in your child's array.

## Profile Resolution Order

PageMD searches for profiles in this priority order:

| Priority | Location | Description |
|----------|----------|-------------|
| 1 (highest) | `.pagemd/profiles/` | Workspace overrides (your project folder) |
| 2 | `~/.pagemd/profiles/` | User profiles (planned, not yet implemented) |
| 3 (lowest) | Built-in `profiles/` | Default profiles shipped with PageMD |

**What this means:**
- Create `.pagemd/profiles/standard_letter.json` in your project to override the built-in `standard_letter` for that project only
- The first match wins—once found, PageMD stops searching

**Path tokens:** Inside profile JSON, you can use these tokens:

| Token | Expands To |
|-------|------------|
| `${projectRoot}` | PageMD installation directory |
| `${workspaceFolder}` | Current working directory (your project) |
| `${manifestDir}` | Directory containing the profile file |

## Common Customizations

### Change Page Size

Override the page size for A4 paper:

```json
{
  "id": "a4-profile",
  "extends": "standard_letter",
  "layout": {
    "pageSize": "A4"
  }
}
```

### Add Company Logo

Add a logo to the page header using CSS [[reference/Glossary#@page rule|@page rules]]:

```json
{
  "id": "branded",
  "extends": "standard_letter",
  "resources": {
    "css": ["${workspaceFolder}/.pagemd/styles/brand-header.css"]
  }
}
```

Create `.pagemd/styles/brand-header.css`:
```css
@page {
  @top-right {
    content: url("${workspaceFolder}/.pagemd/assets/logo.png");
  }
}
```

### Require Specific Frontmatter Fields

Ensure documents include required metadata:

```json
{
  "id": "sop-profile",
  "extends": "standard_letter",
  "validation": {
    "required_fields": ["document_id", "revision", "owner", "approver"]
  }
}
```

**What happens:** If a document is missing any of these frontmatter fields, `pagemd build` outputs an error and stops.

### Set Metadata Defaults

Provide default values for frontmatter fields when documents don't specify them:

```json
{
  "id": "draft-profile",
  "extends": "standard_letter",
  "metadata": {
    "defaults": {
      "status": "Draft",
      "revision": 0,
      "page_numbers": false,
      "running_header": false,
      "running_footer": false
    }
  }
}
```

**How defaults work:** If a document's frontmatter doesn't define `status`, it defaults to `"Draft"`. Explicit frontmatter values always override these defaults.

### Configure Output Modes

Control which formats are generated by default. See [[reference/Glossary#Output mode|output mode]] for details.

```json
{
  "id": "always-pdf",
  "extends": "standard_letter",
  "outputs": {
    "pdf": { "mode": "ALWAYS" },
    "html": { "mode": "ACTIVE_ONLY" },
    "png": { "mode": "DISABLED" }
  }
}
```

| Mode | Behavior |
|------|----------|
| `ACTIVE_ONLY` | Generated only when requested via `-o pdf` |
| `ALWAYS` | Always generated, even without `-o` |
| `DISABLED` | Never generated, even if requested |

## Verification

Test your profile by building a sample document:

```bash
pagemd build test.md -o pdf -p my-profile
```

**What you should see:**
```
[INFO] Profile: my-profile
[INFO] Extends: standard_letter
[INFO] Building: test.md
[INFO] Output: test.pdf (XXX KB, Y pages)
```

**Success:** Open the PDF and verify your custom styling is applied.

**If something's wrong:** Check the log output for `[WARN]` or `[ERROR]` messages. Enable debug logging for more detail:

```bash
PAGEMD_LOG_LEVEL=DEBUG pagemd build test.md -o pdf -p my-profile
```

## Troubleshooting

### Profile not found

**What you see:**
```
[ERROR] Profile 'xyz' not found
```

**Possible causes and fixes:**

1. **Filename doesn't match ID** - The profile filename (without extension) must exactly match the `id` field inside the JSON. Example: `my-profile.json` must contain `"id": "my-profile"`.

2. **Wrong directory** - The profile must be in `.pagemd/profiles/` (workspace) or the built-in `profiles/` directory. Check with:
   ```bash
   ls -la .pagemd/profiles/
   ```

3. **JSON syntax error** - Validate your JSON at https://jsonlint.com or run:
   ```bash
   cat .pagemd/profiles/my-profile.json | python -m json.tool
   ```

### Styles not applying

**What you see:** PDF renders but without your custom styles.

**Possible causes and fixes:**

1. **CSS path incorrect** - The `resources.css` paths must be resolvable. Use `${workspaceFolder}` for project-relative paths:
   ```json
   "css": ["${workspaceFolder}/.pagemd/styles/my-styles.css"]
   ```

2. **CSS layer order** - Your styles may be overridden by higher-priority layers. See [[reference/Glossary#CSS Layer Model|CSS Layer Model]]. To ensure your styles win, use the `@layer` CSS feature or add styles via frontmatter (highest priority).

3. **CSS syntax error** - Check browser devtools or enable debug logging to see CSS parse errors.

### Circular inheritance

**What you see:**
```
[ERROR] Circular inheritance detected: A -> B -> A
```

**Fix:** Check your `extends` chain. Each profile can only extend one parent, and the chain cannot loop back to itself. Map out your inheritance: if `A extends B` and `B extends A`, you have a cycle.

### Parent profile not found

**What you see:**
```
[ERROR] Profile not found in inheritance chain: parent-profile
```

**Fix:** The profile in `extends` must exist. Check:
1. Parent profile exists in `.pagemd/profiles/` or built-in profiles
2. Parent profile name is spelled correctly (case-sensitive)

## See Also

- [[reference/Profile-Schema|Profile Schema]] - Complete field reference (all available options)
- [[guides/Style-Guide|Style Guide]] - CSS customization techniques
- [[reference/Settings|Settings]] - Environment variables and configuration
- [[reference/Glossary|Glossary]] - Definition of terms (profile, extends, frontmatter, etc.)
- [[reference/CLI|CLI Reference]] - Command-line options including `-p`/`--profile`
