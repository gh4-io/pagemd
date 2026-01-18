# Bundle Export Guide

Export markdown files to a bundled static site for web hosting.

## Overview

The `--bundle` flag creates a self-contained static site from markdown files:

- HTML files with slugified names
- External CSS files (shared + per-profile)
- Assets folder with images and fonts
- Wikilinks converted to `.html` links

## Basic Usage

```bash
# Single file
pagemd build document.md -o html --bundle -d ./dist

# Multiple files
pagemd build *.md -o html --bundle -d ./dist

# Specific directory
pagemd build docs/*.md -o html --bundle -d ./static
```

## Output Structure

### Single Profile

When all files use the same profile:

```
dist/
├── styles-shared.css         # Base + primary + syntax CSS
├── styles-standard-letter.css # Layout + profile CSS
├── document.html             # Your converted document
└── assets/                   # Copied images, fonts
    ├── logo.png
    └── custom-font.woff2
```

### Multiple Profiles

When files use different profiles (alerts, SOPs, technical docs):

```
dist/
├── styles-shared.css         # Shared across ALL files
├── styles-alert.css          # Alert profile styling
├── styles-sop.css            # SOP profile styling
├── styles-technical.css      # Technical profile styling
├── alert-001.html
├── sop-training.html
├── technical-spec.html
└── assets/
```

Each HTML file links to both the shared CSS and its profile-specific CSS:

```html
<link rel="stylesheet" href="./styles-shared.css">
<link rel="stylesheet" href="./styles-alert.css">
```

## Wikilinks

Wikilinks are automatically converted to `.html` links with slugified names:

| Markdown | HTML Output |
|----------|-------------|
| `[[Getting Started]]` | `<a href="getting-started.html">Getting Started</a>` |
| `[[API Reference#Methods]]` | `<a href="api-reference.html#methods">API Reference</a>` |
| `[[My Document]]` | `<a href="my-document.html">My Document</a>` |

## Assets

Images and fonts referenced in your documents are automatically:

1. **Collected** from HTML and CSS
2. **Copied** to the `assets/` folder
3. **Path-rewritten** in output files

```markdown
<!-- In markdown -->
![Logo](./images/logo.png)
```

```html
<!-- In bundled HTML -->
<img src="assets/logo.png" alt="Logo">
```

### Collision Handling

If multiple files have assets with the same name:

```
docs/images/logo.png  →  assets/logo.png
other/logo.png        →  assets/logo-2.png
```

## Profile Detection

Files can specify their profile via frontmatter:

```yaml
---
profile: alert
title: Security Alert
---

# Important Security Notice
```

Or use the `-p` flag as default:

```bash
pagemd build *.md -o html --bundle -d ./dist -p standard_letter
```

Frontmatter `profile:` takes precedence over `-p` flag.

## CSS Layer Architecture

Bundled CSS is organized in layers for proper cascade:

| Layer | File | Content |
|-------|------|---------|
| base | `styles-shared.css` | CSS reset, typography |
| primary | `styles-shared.css` | Project overrides |
| syntax | `styles-shared.css` | Code highlighting |
| layout | `styles-{profile}.css` | Page structure, margins |
| profile | `styles-{profile}.css` | Visual styling |
| frontmatter | Inline | Per-document overrides |

## VS Code Command

The VS Code extension provides "PageMD: Bundle Export to Static Site":

1. Open a markdown file
2. Command Palette (`Ctrl+Shift+P`)
3. "PageMD: Bundle Export to Static Site"
4. Select output folder

Or right-click a markdown file → "Bundle Export to Static Site"

## Serving the Bundle

Test locally with any static file server:

```bash
# Python
python3 -m http.server -d ./dist

# Node (serve package)
npx serve ./dist

# PHP
php -S localhost:8000 -t ./dist
```

Deploy to static hosting:
- GitHub Pages
- Netlify
- Cloudflare Pages
- Caddy/Nginx

## Troubleshooting

### Missing Styles

**Symptom:** HTML renders without styling

**Check:**
1. Both CSS files exist in output directory
2. HTML has two `<link>` tags in `<head>`
3. CSS file paths are relative (`./styles-shared.css`)

### Broken Links

**Symptom:** Wikilinks don't work

**Check:**
1. Target files were also bundled
2. Filenames match slugified wikilink text
3. Links end in `.html`

### Missing Images

**Symptom:** Images show as broken

**Check:**
1. Original image exists at source path
2. Image was copied to `assets/` folder
3. Path in HTML is `assets/filename.png`

## See Also

- [Profiles Guide](./Profiles.md) - Configure document profiles
- [Extended Syntax](./Extended-Syntax.md) - Wikilinks and special syntax
- [Basic Usage](./Basic-Usage.md) - CLI fundamentals
