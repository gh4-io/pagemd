# Normal Operations

Practical workflows and runbooks for daily PageMD usage.

## Overview

Normal operations covers daily workflows for building documents, batch processing, validation, profile management, and output handling. All commands assume working directory is `project/` unless otherwise noted.

## Contents

- [Daily Workflows](#daily-workflows)
- [Validation Workflow](#validation-workflow)
- [Profile Management](#profile-management)
- [Output Management](#output-management)
- [Runbook: Publishing a Document](#runbook-publishing-a-document)
- [Runbook: Batch Processing Folder](#runbook-batch-processing-folder)
- [See Also](#see-also)

---

## Daily Workflows

### Build Single Document

Convert one Markdown file to all output formats.

```bash
# Build with default profile (standard_letter)
pagemd build path/to/document.md

# Build with specific profile
pagemd build path/to/document.md --profile=memo_compact

# Build with custom config
pagemd build path/to/document.md --config=path/to/.pagemd/config.json
```

**Expected Outputs:**
- `document.html` (always)
- `document.pdf` (if profile enables PDF)
- `document_page-001.png` (if profile enables PNG)
- `document_page-001.jpeg` (if profile enables JPEG)

### Build Specific Formats Only

Control which outputs are generated.

```bash
# HTML only
pagemd build document.md --no-pdf --no-png --no-jpeg

# PDF only
pagemd build document.md --no-html --no-png --no-jpeg

# HTML + PDF only
pagemd build document.md --no-png --no-jpeg
```

### Preview Without Saving

Build to temporary directory for review.

```bash
# Preview (future enhancement)
pagemd build document.md --preview

# Manual preview workflow
pagemd build document.md
open document.html  # macOS
xdg-open document.html  # Linux
start document.html  # Windows
```

---

## Validation Workflow

Check Markdown syntax and frontmatter before building.

### Validate Single File

```bash
# Validate syntax and required fields
pagemd validate document.md

# Validate with specific profile
pagemd validate document.md --profile=memo_compact
```

**Validation Checks:**
- Markdown syntax (via markdown-it)
- Frontmatter YAML parsing
- Required fields (from profile manifest)
- Metadata structure

### Validate Before Commit

Recommended pre-commit workflow.

```bash
# Check all .md files in current directory
find . -name "*.md" -exec pagemd validate {} \;

# Validate only staged files
git diff --cached --name-only --diff-filter=ACM | grep '\.md$' | xargs -I {} pagemd validate {}
```

### Validation Exit Codes

- **0:** All checks passed
- **1:** Validation errors found

**Error Output Example:**
```
[Error] Validation failed: document.md
- Missing required field: document_id
- Missing required field: revision
- Invalid frontmatter YAML syntax at line 5
```

---

## Profile Management

List, select, and override profiles for document processing.

### List Available Profiles

```bash
# Show all profiles with descriptions
pagemd list-profiles

# Example output:
# Available profiles:
#   standard_letter - US Letter (8.5x11") layout, standard margins
#   memo_compact - Compact memo format with narrow margins
#   report_a4 - A4 portrait layout for formal reports
```

### Select Profile for Build

```bash
# Use profile from frontmatter (preferred)
# Add to document.md frontmatter:
# ---
# profile: memo_compact
# ---

# Override with CLI flag
pagemd build document.md --profile=report_a4
```

### Profile Resolution Order

1. CLI `--profile` flag (highest priority)
2. Frontmatter `profile` field
3. Config file `defaultProfile` setting
4. Built-in default (`standard_letter`)

### Override Profile Settings

```bash
# Create local profile override
mkdir -p .pagemd/templates/profiles
cp templates/profiles/standard_letter.json .pagemd/templates/profiles/my_custom.json

# Edit my_custom.json, then use it
pagemd build document.md --profile=my_custom
```

**Path Resolution:**
1. `.pagemd/templates/profiles/` (project-local, highest precedence)
2. `project/templates/profiles/` (built-in defaults)

---

## Output Management

Control output formats, filenames, and directories.

### Output Formats

| Format | Extension | When Generated |
|--------|-----------|----------------|
| HTML | `.html` | Always (unless `--no-html`) |
| PDF | `.pdf` | If profile enables PDF output |
| PNG | `_page-NNN.png` | If profile enables PNG output |
| JPEG | `_page-NNN.jpeg` | If profile enables JPEG output |

### Output Modes (Profile Setting)

| Mode | Behavior |
|------|----------|
| `ACTIVE_ONLY` | Generate only if explicitly requested via CLI or frontmatter |
| `ALWAYS` | Always generate this format |
| `DISABLED` | Never generate this format |

### Filename Tokens

Tokens replaced in output filenames (future enhancement):

- `{name}` - Source filename without extension
- `{date}` - Current date (YYYY-MM-DD)
- `{timestamp}` - Full timestamp
- `{page}` - Page number (PNG/JPEG only)

**Example Profile Setting:**
```json
{
  "outputs": {
    "pdf": {
      "filename": "{name}_{date}.pdf"
    }
  }
}
```

### Organize Outputs by Format

```bash
# Default: outputs alongside source file
pagemd build document.md
# → document.html, document.pdf, document_page-001.png

# Future: specify output directory
pagemd build document.md --output-dir=dist/
# → dist/document.html, dist/document.pdf, dist/document_page-001.png
```

---

## Runbook: Publishing a Document

End-to-end workflow for publishing a finalized document.

### Prerequisites

- [ ] Document Markdown file ready
- [ ] Frontmatter complete (all required fields)
- [ ] Profile selected or default acceptable
- [ ] Output formats determined

### Steps

1. **Validate Document**
   ```bash
   pagemd validate document.md
   ```
   Fix any validation errors before continuing.

2. **Build All Outputs**
   ```bash
   pagemd build document.md
   ```

3. **Review Generated Files**
   ```bash
   ls -lh document.*
   # Verify:
   # - document.html exists and renders correctly
   # - document.pdf exists and pages render correctly
   # - PNG/JPEG screenshots generated if enabled
   ```

4. **Verify PDF Pagination**
   ```bash
   open document.pdf  # macOS
   xdg-open document.pdf  # Linux
   start document.pdf  # Windows
   ```
   Check:
   - Page breaks correct
   - Headers/footers present
   - No content overflow

5. **Commit to Repository**
   ```bash
   git add document.md document.html document.pdf
   git commit -m "docs: publish document v1.0"
   git push origin gh4-io/docs/publish-document
   ```

6. **Distribute Outputs**
   - Copy PDF to SharePoint/NAS
   - Email HTML version if needed
   - Archive source Markdown

### Post-Publishing

- [ ] Tag git commit if versioned document
- [ ] Update document index or TOC
- [ ] Notify stakeholders
- [ ] Archive old revision if replacing existing doc

---

## Runbook: Batch Processing Folder

Process multiple Markdown files in one operation.

### Prerequisites

- [ ] All Markdown files in target directory
- [ ] Consistent frontmatter across files
- [ ] Profile selection determined (or use per-file frontmatter)

### Steps

1. **Validate All Files**
   ```bash
   find docs/ -name "*.md" -exec pagemd validate {} \;
   ```
   Fix validation errors before batch building.

2. **Build All Files (Shell Loop)**
   ```bash
   for file in docs/*.md; do
     echo "Building $file..."
     pagemd build "$file"
   done
   ```

3. **Build All Files (PowerShell Loop)**
   ```powershell
   Get-ChildItem docs -Filter *.md | ForEach-Object {
     Write-Host "Building $($_.Name)..."
     pagemd build $_.FullName
   }
   ```

4. **Verify Outputs Generated**
   ```bash
   find docs/ -name "*.html" -o -name "*.pdf"
   # Count files
   find docs/ -name "*.pdf" | wc -l
   ```

5. **Collect Outputs to Distribution Directory**
   ```bash
   mkdir -p dist/pdfs dist/html
   cp docs/*.pdf dist/pdfs/
   cp docs/*.html dist/html/
   ```

6. **Archive Source and Outputs**
   ```bash
   tar -czf documents_$(date +%Y%m%d).tar.gz docs/ dist/
   ```

### Automation Script Example

```bash
#!/usr/bin/env bash
# batch_build.sh

SRC_DIR="${1:-.}"
OUT_DIR="${2:-./dist}"

echo "Batch building Markdown files in $SRC_DIR"
echo "Outputs will be organized in $OUT_DIR"

mkdir -p "$OUT_DIR/html" "$OUT_DIR/pdf"

for md_file in "$SRC_DIR"/*.md; do
  [ -e "$md_file" ] || continue

  echo "Processing: $md_file"
  pagemd build "$md_file" || {
    echo "Error building $md_file"
    exit 1
  }

  base_name=$(basename "$md_file" .md)
  mv "${base_name}.html" "$OUT_DIR/html/" 2>/dev/null || true
  mv "${base_name}.pdf" "$OUT_DIR/pdf/" 2>/dev/null || true
done

echo "Batch build complete. Outputs in $OUT_DIR"
```

**Usage:**
```bash
chmod +x batch_build.sh
./batch_build.sh docs dist
```

---

## See Also

- [[Operations]] - Build verification, testing, and release procedures
- [[Profiles]] - Profile manifest schema and inheritance
- [[Reference]] - CLI command reference and API documentation
- [[Troubleshooting]] - Common issues and diagnostics
