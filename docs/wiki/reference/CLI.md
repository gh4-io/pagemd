# CLI Reference

> **Section:** Reference

Complete documentation for all PageMD commands and options.

## Overview

PageMD provides a command-line interface for building, validating, and managing documents. Commands support both file and directory inputs where applicable.

**Default command:** If you run `pagemd <file.md>` without specifying a command, `build` is assumed:

```bash
# These are equivalent
pagemd document.md
pagemd build document.md
```

---

## build

Convert Markdown to HTML, PDF, PNG, or JPEG.

**Syntax:**
```bash
pagemd build <input> [options]
pagemd build --stdin [options]     # Read from stdin
pagemd <input> [options]           # 'build' is default command
```

**Alias:** `bld`

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<input>` | Markdown file or directory path (omit if using `--stdin`) |

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output format(s), comma-separated: `html`, `pdf`, `png`, `jpeg` | `html,pdf` |
| `--profile` | `-p` | Profile ID to use | `standard_letter` |
| `--output-dir` | `-d` | Output directory | Same as input (or cwd for stdin) |
| `--debug` | | Enable debug artifacts | `false` |
| `--pagedjs` | | Paged.js mode: `browser` or `cli` | `browser` |
| `--stdout` | | Output HTML to stdout (single file, html only) | `false` |
| `--stdin` | | Read markdown from stdin instead of file | `false` |
| `--stdin-path` | | Logical file path for stdin content (enables correct relative path resolution) | `null` |
| `--base-name` | | Base filename for output when using `--stdin` | `stdin` |

**Environment variable overrides:** CLI flags take precedence over environment variables:
- `PAGEMD_PROFILE` → `--profile`
- `PAGEMD_OUTPUT_FORMAT` → `--output`
- `PAGEMD_OUTPUT_DIR` → `--output-dir`
- `PAGEMD_DEBUG` → `--debug`
- `PAGEMD_PAGEDJS_MODE` → `--pagedjs`

**Examples:**

```bash
# Build PDF (default profile)
pagemd build document.md -o pdf

# Build multiple formats
pagemd build document.md -o pdf,html

# Use specific profile
pagemd build document.md -o pdf -p memo

# Output to different directory
pagemd build document.md -o pdf -d ./output

# Build all markdown files in a directory
pagemd build ./docs/

# Enable debug mode for troubleshooting
pagemd build document.md -o pdf --debug

# Output HTML to stdout (for piping)
pagemd build document.md -o html --stdout

# Read markdown from stdin, output HTML to stdout
cat document.md | pagemd build --stdin --stdout -o html

# Read from stdin with custom output filename
echo "# Hello" | pagemd build --stdin --base-name greeting -o html

# Pipe stdin to PDF output
cat document.md | pagemd build --stdin -o pdf --base-name report

# Stdin with path context for relative path resolution
# (Useful when document has relative profile/resource paths)
cat /path/to/doc.md | pagemd build --stdin --stdin-path /path/to/doc.md -o html
```

**What you'll see:**

```
Processing: document.md
  ✓ Success: 2 outputs created

============================================================
Build Summary:
  Total files: 1
  Successful: 1
  Failed: 0
  Total outputs: 2
  Duration: 1.23s
============================================================
```

**With `--debug`:**

Debug mode creates additional artifacts in `debug/` and shows expanded summary with active environment overrides.

**If something goes wrong:**

| Error | Meaning |
|-------|---------|
| `Input not found: <path>` | File or directory doesn't exist |
| `Input is not a markdown file` | File doesn't have `.md` extension |
| `--stdout requires single file input` | Can't use `--stdout` with directories |
| `--stdout only supports html format` | Remove non-html formats when using `--stdout` |
| `Provide <input> file/directory or use --stdin` | Neither input file nor `--stdin` flag provided |
| `Cannot use both <input> and --stdin` | Can't specify both input file and `--stdin` |
| `No content received from stdin` | Empty or whitespace-only stdin content |

---

## validate

Check document against profile requirements without generating output. Validates frontmatter fields, profile existence, and resource paths.

**Syntax:**
```bash
pagemd validate <input> [options]
```

**Alias:** `val`

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<input>` | Markdown file or directory path |

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--profile` | `-p` | Profile ID (overrides frontmatter) | From frontmatter or `standard_letter` |
| `--strict` | | Fail on warnings (not just errors) | `false` |

**Examples:**

```bash
# Validate single file
pagemd validate document.md

# Validate with specific profile
pagemd validate document.md -p sop

# Validate all files in directory
pagemd validate ./docs/

# Strict mode - fail on warnings
pagemd validate document.md --strict
```

**What you'll see:**

*Success:*
```
Validation Summary:
  Total files: 1
  Valid: 1
  Invalid: 0

✓ document.md
```

*Failure:*
```
Validation Summary:
  Total files: 1
  Valid: 0
  Invalid: 1

✗ document.md
  Errors:
    - Missing required field: document_id (required by profile sop)
  Warnings:
    - Profile sop has no layout.source defined
```

**Validation checks:**
- Required metadata fields (from profile `validation.required_fields`)
- Profile existence and inheritance
- Layout CSS file exists
- CSS resource files exist
- Custom CSS from frontmatter exists
- Font files exist (warning only)

---

## list

List available resources (profiles, templates, layouts, styles).

**Syntax:**
```bash
pagemd list <resource> [options]
```

**Alias:** `ls`

**Arguments:**

| Argument | Values |
|----------|--------|
| `<resource>` | `profiles`, `templates`, `layouts`, `styles` |

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--json` | `-j` | Output as JSON array | `false` |
| `--verbose` | | Show full details (paths, sizes) | `false` |
| `--all` | `-a` | Include workspace resources (`.pagemd/`) | `false` |

**Examples:**

```bash
# List available profiles
pagemd list profiles

# List as JSON
pagemd list profiles -j

# Include workspace overrides
pagemd list profiles -a

# Show detailed information
pagemd list profiles --verbose

# List available templates
pagemd list templates
```

**What you'll see:**

```
Available profiles:
  standard_letter
    US Letter, standard margins
  standard_a4
    A4 format, European standard
  memo
    Internal memo layout
```

**With `--verbose`:**

```
Available profiles:
  standard_letter
    US Letter, standard margins
    Source: built-in
    Path: /path/to/profiles/standard_letter.json
    Size: 1.2 KB
    Layout: letter
    Outputs: pdf, html
    Required fields: document_id, title
```

---

## inspect

Show resolved configuration for a document. Displays merged profile settings, metadata, resources, and outputs.

**Syntax:**
```bash
pagemd inspect <input> [options]
```

**Alias:** `insp`

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<input>` | Markdown file path |

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--profile` | `-p` | Profile override (ignores frontmatter) | From frontmatter |
| `--json` | | Output as JSON | `false` |
| `--section` | `-s` | Show specific section | `all` |

**Section values:** `profile`, `metadata`, `resources`, `outputs`, `all`

**Examples:**

```bash
# Full inspection
pagemd inspect document.md

# JSON output for scripting
pagemd inspect document.md --json

# Show only resources section
pagemd inspect document.md -s resources

# Inspect with different profile
pagemd inspect document.md -p memo
```

**What you'll see:**

```
────────────────────────────────────────────────────────────
PageMD Document Inspection
────────────────────────────────────────────────────────────
  File: document.md
  Path: /path/to/document.md
  Profile: standard_letter (from frontmatter)

────────────────────────────────────────────────────────────
Profile
────────────────────────────────────────────────────────────
  ID: standard_letter
  Description: US Letter, standard margins
  Layout:
    Type: letter
    CSS: ${projectRoot}/layouts/letter.css
    Paper: letter

────────────────────────────────────────────────────────────
Document Metadata
────────────────────────────────────────────────────────────
  document_id: DOC-001
  title: My Document
  revision: 1
  author: Jane Doe

────────────────────────────────────────────────────────────
Resources
────────────────────────────────────────────────────────────
  CSS files:
    - ${projectRoot}/styles/base.css
    - ${projectRoot}/styles/primary.css
  Template: ${projectRoot}/templates/default.html
  Highlight theme: github-light

────────────────────────────────────────────────────────────
Outputs
────────────────────────────────────────────────────────────
  ✓ PDF
      mode: "ACTIVE_ONLY"
  ✓ HTML
      mode: "ALWAYS"
  ✗ PNG
  ✗ JPEG
```

---

## init

Initialize a new PageMD project, profile, or markdown file.

**Syntax:**
```bash
pagemd init [name] [options]
```

**Alias:** `new`

**Arguments:**

| Argument | Description | Default |
|----------|-------------|---------|
| `[name]` | Name for the project/profile/document | `my-pagemd-project` |

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--type` | `-t` | Resource type: `project`, `profile`, `markdown` | `project` |
| `--template` | | Base template/profile to use | `standard_letter` |
| `--output` | `-o` | Output location | Current directory |
| `--force` | | Overwrite existing files | `false` |

**Examples:**

```bash
# Initialize full project structure
pagemd init my-docs

# Create new profile only
pagemd init custom-report --type profile

# Create markdown file only
pagemd init meeting-notes --type markdown

# Use different base template
pagemd init report --template memo

# Force overwrite existing
pagemd init my-docs --force
```

**What you'll see (project):**

```
Created PageMD project: ./my-docs

Files created:
  my-docs.md           - Starter markdown document
  my-docs.json         - Profile manifest
  styles/my-docs.css   - Custom styles (empty)
  layouts/my-docs.css  - Layout overrides (empty)
  templates/           - HTML templates (empty)

Next steps:
  cd my-docs
  pagemd build my-docs.md
```

**Project structure created:**

```
my-docs/
├── my-docs.md          # Starter document with frontmatter
├── my-docs.json        # Profile extending standard_letter
├── styles/
│   └── my-docs.css     # Stub for custom styles
├── layouts/
│   └── my-docs.css     # Stub for @page rules
└── templates/          # Empty, for custom HTML templates
```

---

## create

Create a new PageMD resource (profile, style, layout, template) from scaffolds or existing resources.

**Syntax:**
```bash
pagemd create <resource> [options]
```

**Alias:** `add`

**Arguments:**

| Argument | Values |
|----------|--------|
| `<resource>` | `profile`, `style`, `layout`, `template` |

**Options:**

| Option | Alias | Description |
|--------|-------|-------------|
| `--source` | `-s` | Resource ID to copy from |
| `--output` | `-o` | Output filename |
| `--input` | `-i` | Markdown file to inject reference into |
| `--force` | | Overwrite existing files | `false` |

**Examples:**

```bash
# Create profile based on existing one
pagemd create profile --source standard_letter -o .pagemd/profiles/my-profile.json

# Create empty style scaffold
pagemd create style -o .pagemd/styles/custom.css

# Create layout and inject into markdown frontmatter
pagemd create style -o custom.css -i document.md

# Create new layout CSS
pagemd create layout -o print-layout.css

# Overwrite existing resource
pagemd create profile -o existing.json --force
```

**What you'll see:**

```
Created profile: .pagemd/profiles/my-profile.json
```

**With `--input`:**

```
Created style: ./custom.css
Updated frontmatter in: ./document.md
```

The resource reference is automatically added to the markdown frontmatter:
- `profile` → sets `pipeline_profile` field
- `style` → adds to `styles` array

---

## Global Options

These options work with all commands:

| Option | Alias | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help for command |
| `--version` | `-v` | Show PageMD version |
| `--log-level` | | Set log verbosity: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `OFF` |

**Examples:**

```bash
# Show help for build command
pagemd build --help

# Show version
pagemd --version

# Enable debug logging
pagemd build document.md --log-level DEBUG
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (build failed, validation failed, etc.) |

---

## See Also

- [[Quick-Start]] - Get started quickly
- [[guides/Basic-Usage|Basic Usage]] - Common workflows
- [[reference/Settings|Settings]] - Environment variables and configuration files
- [[reference/Profile-Schema|Profile Schema]] - Profile configuration options
