# Introduction

PageMD is a JS-only pipeline that converts Markdown into HTML, PDF, PNG, and JPEG using a hybrid Paged.js + Puppeteer renderer.

## Overview

PageMD transforms Markdown documents into professionally formatted outputs with precise layout control. It uses profile-driven configuration to manage layouts, validation rules, and output generation. The system runs on Node 20+ and prioritizes layout fidelity over performance optimization.

## Contents

- [What PageMD Is](#what-pagemd-is)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Scope Boundaries](#scope-boundaries)
- [Key Differentiators](#key-differentiators)
- [See Also](#see-also)

## What PageMD Is

**Display Name:** PageMD

**Technology Stack:** JavaScript-only pipeline built on Node.js 20+

**Core Components:**
- Markdown parser with frontmatter support
- HTML renderer with template and CSS assembly
- PDF renderer using Paged.js + Puppeteer orchestration
- Export packaging system with multiple output formats (HTML, PDF, PNG, JPEG)
- Profile manifest system (JSON/YAML) for configuration

**Rendering Approach:**
- Hybrid Paged.js + Puppeteer renderer
- Paged.js runs in-browser by default
- Optional CLI prepass mode via `--pagedjs` flag
- Prefers system Chrome when available; falls back to bundled Chromium

## Goals

PageMD solves the following problems:

1. **Precise Layout Control:** Generate professional documents with exact margins, headers, footers, and pagination from Markdown sources

2. **Multi-Format Output:** Produce HTML, PDF, PNG, and JPEG from a single Markdown source with consistent layout

3. **Profile-Driven Configuration:** Manage document layouts, validation rules, and outputs through reusable profile manifests

4. **Tolerant Parsing:** Accept non-standard Markdown inputs without breaking the pipeline

5. **Flexible Validation:** Enforce metadata requirements only when profiles require them, not globally

6. **Workspace Customization:** Support workspace-level overrides for profiles and layouts

## Non-Goals

PageMD explicitly does NOT:

1. Replace general-purpose Markdown renderers (use Pandoc, mdBook, etc. for that)

2. Handle real-time collaborative editing or WYSIWYG editing

3. Provide a web service or API (CLI and VS Code extension only)

4. Support non-JavaScript runtimes (no Python, Rust, or native binaries in core pipeline)

5. Optimize for speed over layout fidelity (reasonable performance is sufficient)

6. Replace or override VS Code's built-in Markdown preview (extension is opt-in only)

## Scope Boundaries

**Primary Delivery Surface:** CLI (`build`, `validate`, `list-profiles` commands)

**VS Code Extension Role:**
- Thin client to the CLI and core pipeline
- Bundles CLI for ease of installation
- Does NOT override VS Code's built-in Markdown preview
- Offers opt-in PageMD paged preview command/panel
- Uses same rendering pipeline as CLI (no extension-specific logic)

**Configuration Hierarchy:**
- Profile manifests in `project/templates/profiles/` (defaults)
- Workspace overrides in `.pagemd/templates/` (highest precedence)
- Per-document frontmatter (overrides manifest settings)

**Path Resolution:**
- Markdown directory
- Configuration directory
- Project folder
- Tokens: `${manifestDir}`, `${projectRoot}`, `${workspaceFolder}`

## Key Differentiators

### Profile-Driven Architecture
Profile manifests control layouts, resources, outputs, and validation behavior. Profiles support inheritance via `extends` (deep-merge objects, replace arrays).

### Hybrid Rendering
Combines Paged.js for CSS Paged Media support with Puppeteer for browser automation. In-browser mode is default; CLI prepass is optional.

### System Chrome Preferred
Uses system Chrome installation when available for better performance and compatibility. Falls back to bundled Chromium only when necessary.

### First-Class Multi-Format Output
HTML, PDF, PNG, and JPEG are all first-class outputs with tokenized filenames and configurable target directories. Output modes: `ACTIVE_ONLY`, `ALWAYS`, `DISABLED`.

### Frontmatter-First Configuration
Per-document frontmatter overrides profile manifest settings. Validation is profile-driven, not global.

### Workspace Override Model
`.pagemd/templates/` provides highest-precedence overrides for profiles and layouts without modifying project defaults.

## See Also

- [[Architecture]] - System components and data flow
- [[Profiles]] - Profile manifest structure and inheritance
- [[Settings]] - Command-line interface and settings
- [[Configuration]] - Path resolution and settings hierarchy
