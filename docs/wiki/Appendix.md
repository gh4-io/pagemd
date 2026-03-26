# Appendix

Reference materials, examples, FAQs, edge cases, and glossary for PageMD.

## Overview

This appendix provides supplementary reference information for PageMD users and developers. It includes complete examples, frequently asked questions, known limitations, and a glossary of key terms.

## Contents

- [Example Documents](#example-documents)
- [Example Profiles](#example-profiles)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Edge Cases and Limitations](#edge-cases-and-limitations)
- [Glossary](#glossary)
- [See Also](#see-also)

---

## Example Documents

### Complete SOP Document

Example SOP with full frontmatter and formatted content:

**File:** `SOP-200_Hangar_Inspection.md`

```markdown
---
document_id: SOP-200
title: Daily Hangar Inspection Procedures
revision: 3
status: APPROVED
effective_date: 2025-12-01
owner: Jason T. Grace
approver: Safety Committee
department: Maintenance Operations
classification: Internal Use Only
---

# Daily Hangar Inspection Procedures

## Purpose

Establish standardized procedures for daily hangar safety and readiness inspections at KCVG maintenance facilities.

## Scope

Applies to all maintenance personnel conducting pre-shift hangar inspections across Kalitta Air, DHL Air UK, 21 Air, Singapore Airlines, Aerologic, and CargoJet operations.

## Procedure

### 1. Pre-Inspection Preparation

1. Review previous shift's logbook entries
2. Verify inspection checklist availability
3. Gather required inspection tools
4. Document inspection start time

### 2. Safety Equipment Check

[[WARNING]]
Ensure all fire suppression systems are operational before aircraft entry. Contact Fire Safety immediately if any deficiencies are found.
[[/WARNING]]

Verify presence and condition of:

- Fire extinguishers (Type ABC, 10lb minimum)
- First aid kits (within 6-month expiration)
- Emergency eyewash stations
- Spill containment kits
- Personal protective equipment storage

### 3. Environmental Conditions

Monitor and record:

- Ambient temperature (acceptable range: 50-85°F)
- Humidity levels (target: 30-60%)
- Lighting adequacy (minimum 50 foot-candles)
- Ventilation system status

### 4. Equipment Positioning

Confirm proper placement of:

- Work stands and platforms
- Ground power units
- Toolboxes and carts
- Aircraft towing equipment

<!-- ::FIGURE
caption: Standard hangar layout with equipment zones marked
source: assets/hangar-layout-diagram.png
id: fig-hangar-layout
-->

![Hangar Layout](assets/hangar-layout-diagram.png)

### 5. Documentation

Complete inspection using Form MX-105 and submit to shift supervisor within 30 minutes of inspection completion.

## References

- FAA Part 145 Maintenance Standards
- OSHA 1910.23 Walking-Working Surfaces
- Company Safety Manual Section 4.2

## Revision History

| Revision | Date       | Changes                          | Approver          |
|----------|------------|----------------------------------|-------------------|
| 0        | 2024-01-15 | Initial release                  | Safety Committee  |
| 1        | 2024-06-01 | Added environmental monitoring   | J. Grace          |
| 2        | 2024-09-15 | Updated PPE requirements         | Safety Committee  |
| 3        | 2025-12-01 | Revised fire safety protocols    | Safety Committee  |
```

### Minimal Document

Example with minimal frontmatter using defaults:

```markdown
---
document_id: MEMO-045
title: Equipment Maintenance Reminder
---

# Equipment Maintenance Reminder

All hydraulic test stands require recalibration by end of quarter.

Contact Planning Desk to schedule downtime.
```

### Technical Documentation

Example for technical manuals:

```markdown
---
document_id: TM-320
title: Auxiliary Power Unit Troubleshooting Guide
revision: 2
status: CURRENT
department: Engineering
classification: Technical Manual
---

# APU Troubleshooting Guide

## Symptom: Failure to Start

[!DANGER]
High voltage present. Disconnect main power before inspection.

### Diagnostic Steps

1. Verify fuel pressure (minimum 15 PSI)
2. Check igniter continuity
3. Inspect starter relay operation
4. Review fault codes in APU controller

<!-- ::FIGURE
caption: APU electrical schematic
source: diagrams/apu-electrical.svg
id: fig-apu-electrical
-->

![APU Electrical](diagrams/apu-electrical.svg)
```

---

## Example Profiles

### standard_letter Profile

Default profile for US Letter documents (8.5" x 11").

**File:** `project/templates/profiles/standard_letter.json`

```json
{
  "id": "standard_letter",
  "description": "Standard US Letter layout for SOPs and documentation",

  "layout": {
    "type": "html",
    "source": "${projectRoot}/templates/layouts/standard_letter.html"
  },

  "resources": {
    "css": [
      "${projectRoot}/styles/primary.css",
      "${projectRoot}/templates/layouts/standard_letter.css"
    ]
  },

  "pagedjs": {
    "mode": "browser",
    "save_paged_html": "debug",
    "browser_options": {
      "auto": true
    }
  },

  "outputs": {
    "pdf": { "enabled": true, "mode": "ACTIVE_ONLY" },
    "html": { "enabled": false, "mode": "DISABLED" },
    "png": { "enabled": false, "mode": "DISABLED" },
    "jpeg": { "enabled": false, "mode": "DISABLED" }
  },

  "validation": {
    "required_fields": ["document_id", "title"]
  },

  "metadata": {
    "defaults": {
      "status": "Draft",
      "revision": 0
    },
    "date_format": "MM/DD/YYYY"
  }
}
```

**Key Features:**
- Hole-punch-safe margins (left 1.25", others 0.75")
- Header with SOP label and metadata box
- Footer with page numbering (PAGE X OF Y)
- Identity line with document ID and revision
- PDF-only output by default

### Custom Profile with Inheritance

Example profile extending `standard_letter`:

```json
{
  "id": "company_confidential",
  "extends": "standard_letter",
  "description": "Confidential documents with watermark",

  "resources": {
    "css": [
      "${projectRoot}/styles/primary.css",
      "${projectRoot}/templates/layouts/standard_letter.css",
      "${manifestDir}/confidential-watermark.css"
    ]
  },

  "validation": {
    "required_fields": [
      "document_id",
      "title",
      "classification",
      "approver"
    ]
  },

  "metadata": {
    "defaults": {
      "classification": "CONFIDENTIAL"
    }
  }
}
```

---

## Frequently Asked Questions

### Installation and Setup

**Q: What Node.js version is required?**
A: Node.js 20 or higher. Check version with `node --version`.

**Q: Do I need to install Chrome separately?**
A: No. PageMD prefers system Chrome but falls back to bundled Chromium automatically.

**Q: Can I use PageMD without installing globally?**
A: Yes. Use `npx pagemd` or install locally in your project with `npm install @pagemd/cli`.

### Usage

**Q: How do I specify which outputs to generate?**
A: Use `--output` flag: `pagemd build doc.md --output pdf,html`

**Q: What happens if I don't specify a profile in frontmatter?**
A: PageMD uses `standard_letter` profile by default with basic layout and no required fields.

**Q: Can I override profile settings in frontmatter?**
A: Yes. Frontmatter values take precedence over profile defaults. Use `pagedjs_mode` to override rendering mode.

**Q: How do I validate a document without generating outputs?**
A: Use `pagemd validate doc.md` to check frontmatter and profile requirements.

### Troubleshooting

**Q: Why is my PDF missing headers/footers?**
A: Check that your profile includes layout CSS with `@page` rules and that Paged.js mode is configured correctly.

**Q: How do I debug Paged.js rendering issues?**
A: Set `save_paged_html: "always"` in profile to save intermediate HTML for inspection.

**Q: My custom CSS isn't applying. What's wrong?**
A: Verify CSS file paths in profile manifest. Use absolute paths or `${projectRoot}` token. Check console for file-not-found errors.

**Q: Figure numbering is incorrect. How do I fix it?**
A: Ensure figures use the canonical pattern: `<!-- ::FIGURE ... -->` comment before image, followed by markdown image syntax and caption.

### Advanced

**Q: Can I use multiple profiles in the same project?**
A: Yes. Place custom profiles in `.pagemd/templates/` directory or specify with `--profile` flag.

**Q: How do I create a landscape layout?**
A: Set `cli_options.landscape: true` in profile's `pagedjs` block and adjust CSS `@page` size.

**Q: Can I inject custom JavaScript for Paged.js?**
A: Yes. Use `pagedjs.handlers` array to specify JS files. Files are injected via `--additional-script`.

**Q: How do I prevent remote resource loading?**
A: Set `cli_options.block_remote: true` in profile's `pagedjs` configuration.

---

## Edge Cases and Limitations

### Known Limitations

**Paged.js Compatibility:**
- Complex CSS Grid layouts may render inconsistently between browser and CLI modes
- Some CSS pseudo-elements behave differently in print media context
- Page break control is limited by Paged.js polyfill capabilities

**Browser Requirements:**
- Requires Chromium-based browser (Chrome, Edge, Chromium)
- Firefox and Safari are not supported for PDF rendering
- Headless mode requires sufficient system memory for large documents

**File Path Constraints:**
- Paths with non-ASCII characters may cause issues on Windows
- UNC paths are not supported
- Symlinks must resolve to accessible locations

**Metadata Handling:**
- Date parsing supports limited formats (ISO 8601, US formats)
- Nested metadata objects are flattened during template expansion
- Very long metadata values may overflow header/footer regions

### Edge Cases

**Empty or Missing Content:**
- Document with only frontmatter generates blank PDF with headers/footers
- Missing title falls back to first H1 or "Untitled"
- Missing document_id uses filename as fallback

**Circular Profile Inheritance:**
- Detected and rejected during profile loading
- Error message identifies the circular reference chain

**Duplicate Figure IDs:**
- Last figure with duplicate ID wins
- Warning logged but rendering continues

**Malformed Frontmatter:**
- Invalid YAML causes parsing failure
- Parser attempts recovery by treating as plain markdown
- Validation errors report specific line numbers when possible

**Path Resolution Conflicts:**
- When same filename exists in multiple search paths, highest precedence wins
- No warning issued for shadowed resources

**Output File Collisions:**
- Existing output files are overwritten without warning
- Use unique filename patterns to avoid unintended overwrites

**Large Documents:**
- Documents exceeding 500 pages may exceed browser memory limits
- Consider splitting into multiple smaller documents
- Increase Node heap size if needed: `NODE_OPTIONS=--max-old-space-size=4096`

**Special Characters in Filenames:**
- Characters `/ \ : * ? " < > |` are replaced with underscores
- Resulting filename may differ from token pattern

---

## Glossary

**Asset**
External resource (image, font, CSS) referenced by profile or markdown.

**Browser Mode**
Paged.js polyfill runs in-browser during PDF rendering (default mode).

**Callout**
Emphasized block of text using `[[WARNING]]` or `[!DANGER]` syntax.

**CLI Mode**
Paged.js CLI prepass processes HTML before Puppeteer rendering.

**Deep Merge**
Object inheritance strategy that recursively merges nested properties.

**Exporter**
Pipeline component that writes final output files (PDF, PNG, JPEG).

**Figure**
Numbered image with caption, defined using `<!-- ::FIGURE ... -->` pattern.

**Frontmatter**
YAML metadata block at beginning of markdown file, delimited by `---`.

**Identity Line**
Document identifier and revision displayed in PDF header (e.g., "No. SOP-001 | Rev.3").

**Layout**
HTML template defining document structure, headers, footers, and content regions.

**Manifest**
JSON or YAML profile configuration file.

**Metadata Normalization**
Process of applying aliases, defaults, and type coercion to frontmatter fields.

**Output Mode**
Configuration controlling when outputs are generated: `ACTIVE_ONLY`, `ALWAYS`, `DISABLED`.

**Paged.js**
JavaScript library implementing W3C Paged Media specifications for print layouts.

**Parser**
Pipeline component that extracts frontmatter and converts markdown to HTML.

**Path Token**
Variable used in profile manifests to resolve filesystem locations (e.g., `${projectRoot}`).

**Primary CSS**
Global stylesheet at `project/styles/primary.css` containing base typography and resets.

**Profile**
Configuration manifest defining layouts, validation, and output settings.

**Profile Inheritance**
Mechanism allowing profiles to extend parent profiles using `extends` field.

**Puppeteer**
Headless Chrome automation library used for PDF/image rendering.

**Renderer**
Pipeline component that generates HTML or PDF from parsed markdown.

**Template Token**
Variable used in HTML layouts for content/metadata insertion (e.g., `{{content}}`).

**Validation**
Process of checking frontmatter against profile's required fields and schema.

**Workspace Folder**
VS Code workspace root directory, used for path resolution in extension mode.

---

## See Also

- [[Home]] - Project overview and quick start
- [[Introduction]] - Getting started guide
- [[Reference]] - Technical token and logging reference
- [[Profiles]] - Profile manifest documentation
- [[Troubleshooting]] - Common issues and solutions
- [[Developer-Guide]] - Contributing and development setup
