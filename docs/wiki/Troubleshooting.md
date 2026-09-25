# Troubleshooting

Common issues, error messages, and solutions for PageMD.

---

## Contents

- [Environment Variables](#environment-variables)
- [Chrome/Browser Issues](#chromebrowser-issues)
  - [Non-Headless Mode for Inspection](#non-headless-mode-for-inspection)
- [Profile Not Found](#profile-not-found)
- [Path Resolution Errors](#path-resolution-errors)
  - [System Resource Errors](#system-resource-errors-2026-01-14-fix)
- [PDF Rendering Issues](#pdf-rendering-issues)
  - [Wrong Font in PDF Output](#wrong-font-in-pdf-output)
  - [Links Showing "()" or URL After Link Text](#links-showing--or-url-after-link-text-fixed-2026-01-20)
  - [Internal Anchor Links Not Clickable in PDF](#internal-anchor-links-not-clickable-in-pdf-known-limitation)
  - [Paged.js Crash on Headings Starting with Numbers](#pagedjs-crash-on-headings-starting-with-numbers-fixed-2026-01-22)
  - [Paged.js Crash on CSS Pseudo-Selectors](#pagedjs-crash-on-css-pseudo-selectors-fixed-2026-01-22)
  - [Browser Persistence](#browser-persistence)
  - [Images Not Displaying in PDF](#images-not-displaying-in-pdf)
  - [Running Headers/Footers Not Displaying (string-set)](#running-headersfooters-not-displaying-string-set)
- [Debug Mode](#debug-mode)
- [Log Levels](#log-levels)
- [Common Error Messages](#common-error-messages)
  - [File Include Not Found (Book Assembly)](#file-include-not-found-book-assembly)
  - [Missing Frontmatter Stylesheet](#missing-frontmatter-stylesheet-name)
- [See Also](#see-also)

---

## Environment Variables

### Env Var Not Taking Effect

**Symptom:** Setting `PAGEMD_*` env var but CLI uses default value.

**Causes:**
- CLI flag overrides env var (by design)
- Env var set in wrong shell session
- Invalid value falling back to default

**Solutions:**

1. **Check precedence:** CLI flags > env vars > frontmatter > profile > defaults
   ```bash
   # This uses env var
   export PAGEMD_PROFILE=technical_report
   pagemd build doc.md

   # This ignores env var (CLI flag wins)
   export PAGEMD_PROFILE=technical_report
   pagemd build doc.md --profile standard_letter
   ```

2. **Verify env var is set:**
   ```bash
   # Linux/macOS
   echo $PAGEMD_PROFILE

   # Windows PowerShell
   echo $env:PAGEMD_PROFILE

   # Windows CMD
   echo %PAGEMD_PROFILE%
   ```

3. **Check for invalid values (logged as warnings):**
   ```bash
   pagemd build doc.md --log-level DEBUG
   # Look for: env:warning messages
   ```

---

### Boolean Env Var Format

**Symptom:** Boolean env var not working as expected.

**Valid boolean values:**
- **True:** `1`, `true`, `yes`
- **False:** `0`, `false`, `no`, or unset

**Examples:**
```bash
# These enable debug mode
export PAGEMD_DEBUG=1
export PAGEMD_DEBUG=true
export PAGEMD_DEBUG=yes

# These disable debug mode
export PAGEMD_DEBUG=0
export PAGEMD_DEBUG=false
unset PAGEMD_DEBUG

# Invalid (treated as false, warning logged)
export PAGEMD_DEBUG=enabled  # Wrong!
```

---

### Path Env Var on Windows

**Symptom:** `PAGEMD_OUTPUT_DIR` or `PAGEMD_BROWSER_PATH` not working on Windows.

**Solutions:**

1. **Use forward slashes (recommended):**
   ```powershell
   $env:PAGEMD_OUTPUT_DIR = "C:/temp/output"
   ```

2. **Or escape backslashes:**
   ```powershell
   $env:PAGEMD_OUTPUT_DIR = "C:\\temp\\output"
   ```

3. **Verify path exists:**
   ```powershell
   Test-Path $env:PAGEMD_OUTPUT_DIR
   ```

---

### Env Var Debugging

**Show all loaded env vars:**
```bash
pagemd build doc.md --log-level TRACE
# Look for: env:loaded messages showing parsed values
```

**Common issues:**
- Trailing whitespace in value
- Quotes included literally (`"value"` instead of `value`)
- Wrong shell (bash vs zsh vs PowerShell)

---

## Chrome/Browser Issues

### Chrome Not Detected

**Symptom:** PageMD falls back to bundled Chromium instead of system Chrome.

**Solution:**

1. Verify Chrome installed at standard location:
   - **Windows:** `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - **macOS:** `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
   - **Linux:** `/usr/bin/google-chrome` or `/usr/bin/google-chrome-stable`

2. Check logs for detection failure:
   ```bash
   pagemd build document.md --log-level DEBUG
   ```

3. Override with explicit path:
   ```bash
   export CHROME_PATH="/path/to/chrome"
   pagemd build document.md
   ```

**Related logs:**
```
[DEBUG] renderer.pdf:chrome_detection:none - No system Chrome found, will use bundled Chromium
[INFO] renderer.pdf:browser_launch:start - Falling back to bundled Chromium
```

---

### Browser Launch Failure

**Symptom:** Error: `Failed to launch browser: ...`

**Causes:**
- Chrome/Chromium missing or corrupted
- Insufficient permissions
- Headless mode incompatibility (Linux)

**Solutions:**

1. **Install/reinstall Chrome:**
   ```bash
   # Linux (Debian/Ubuntu)
   wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
   sudo dpkg -i google-chrome-stable_current_amd64.deb

   # macOS
   brew install --cask google-chrome

   # Windows - download from google.com/chrome
   ```

2. **Check permissions:**
   ```bash
   # Linux - Chrome needs execute permission
   chmod +x /usr/bin/google-chrome
   ```

3. **Headless mode issues (Linux servers):**
   ```bash
   # Install dependencies for headless Chrome
   sudo apt-get install -y \
     libnss3 libatk1.0-0 libatk-bridge2.0-0 \
     libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
     libxdamage1 libxrandr2 libgbm1 libasound2
   ```

4. **Debug with visible browser:**
   ```bash
   pagemd build document.md --debug
   # Browser window will appear; watch for errors
   ```

---

### Headless Mode Errors

**Symptom:** Browser launches but renders incorrectly or crashes.

**Solution:**

1. **Disable headless mode temporarily:**
   ```bash
   pagemd build document.md --debug
   ```

2. **Check browser console:**
   - Debug mode shows browser window
   - Open DevTools (F12) to see JavaScript errors
   - Look for CSS or layout issues

3. **Verify sandbox settings:**
   - PageMD disables sandbox (`--no-sandbox`) by default
   - Required for Docker/WSL environments
   - If security concerned, check Puppeteer docs for safe configuration

---

### Non-Headless Mode for Inspection

**Purpose:** Keep browser visible after PDF generation for debugging CSS/layout issues.

**Enable:**
```bash
# Linux/macOS
PAGEMD_HEADLESS=0 pagemd build document.md -o pdf

# Windows (PowerShell)
$env:PAGEMD_HEADLESS="0"
pagemd build document.md -o pdf
```

**Behavior (after 2026-01-10 fix):**
- PDF renders successfully
- **Tab stays open** for inspection (you can use DevTools)
- **Browser window remains** as an orphaned process
- **CLI process exits cleanly** (no timeout)
- Message displayed: `📋 Browser left open for inspection. Close it manually when done.`

**When to Use:**
- Debugging CSS layout issues
- Inspecting Paged.js output
- Checking margin/page-break behavior
- Diagnosing rendering problems

**Close browser manually** when done - it won't close automatically.

**Technical Note:** The browser becomes an orphaned process because puppeteer-core's `disconnect()` releases the WebSocket connection but doesn't terminate the browser. This is intentional - it allows inspection without blocking the CLI.

---

## Profile Not Found

### Profile ID Not Resolved

**Symptom:** Error: `Profile not found: my_profile`

**Cause:** Profile ID mismatch or missing file.

**Solution:**

1. **List available profiles:**
   ```bash
   pagemd list-profiles
   ```

2. **Check search paths:**
   - Workspace: `{projectRoot}/.pagemd/profiles/`
   - Project: `{projectRoot}/project/templates/profiles/`

3. **Verify profile filename matches ID:**
   - If `profile.id` is `"my_profile"`, filename must be `my_profile.json` or `my_profile.yaml`
   - Mismatches logged as warnings

4. **Example fix:**
   ```bash
   # Check profile ID
   cat .pagemd/profiles/my_profile.yaml
   # Should contain: id: my_profile

   # Rename if mismatched
   mv .pagemd/profiles/wrong_name.yaml .pagemd/profiles/my_profile.yaml
   ```

---

### Profile Inheritance Loop

**Symptom:** Error: `Circular inheritance detected in profile chain`

**Cause:** Profile extends itself directly or indirectly.

**Example:**
```yaml
# profile_a.yaml
id: profile_a
extends: profile_b

# profile_b.yaml
id: profile_b
extends: profile_a  # Loop!
```

**Solution:**

1. **Check inheritance chain:**
   ```bash
   pagemd list-profiles --verbose
   ```

2. **Remove circular reference:**
   - Edit profile to break loop
   - Validate with `pagemd validate document.md --profile my_profile`

---

## Path Resolution Errors

### Layout File Not Found

**Symptom:** Error: `Layout file not found: ${projectRoot}/templates/layouts/custom.html`

**Cause:** Path tokens not expanded or file missing.

**Solution:**

1. **Check profile manifest:**
   ```json
   {
     "layout": {
       "source": "${projectRoot}/project/templates/layouts/standard.html"
     }
   }
   ```

2. **Verify token expansion:**
   - `${projectRoot}` - Detected project root
   - `${configDir}` - Directory containing markdown file
   - `${markdownDir}` - Same as `${configDir}`

3. **Check file exists:**
   ```bash
   # Show resolved path in validation
   pagemd validate document.md --log-level DEBUG
   ```

4. **Example fix:**
   ```json
   // Absolute path
   "source": "/absolute/path/to/layout.html"

   // Relative to project root
   "source": "${projectRoot}/project/templates/layouts/standard.html"

   // Relative to markdown file
   "source": "${configDir}/custom-layout.html"
   ```

---

### CSS/Font Files Missing

**Symptom:** Build fails with error about missing CSS resources.

**Behavior:**
- **CSS files:** Build fails immediately (hard-fail per spec)
- **Font files:** Warning only, build continues

**Example error:**
```
Error: Missing referenced CSS resource: ${manifestDir}/styles/custom.css
```

**Solution:**

1. **Check profile manifest uses correct structure:**
   ```json
   {
     "resources": {
       "css": [
         "${projectRoot}/project/styles/primary.css",
         "${manifestDir}/custom.css"
       ],
       "fonts": [
         "${projectRoot}/project/fonts/roboto.woff2"
       ]
     }
   }
   ```

2. **Supported path tokens:**
   - `${projectRoot}` - Detected project root
   - `${manifestDir}` - Directory containing the profile file
   - `${configDir}` - Directory containing markdown file

3. **Verify paths:**
   ```bash
   pagemd validate document.md --strict --log-level DEBUG
   ```

4. **Fix missing files:**
   - Add files to expected locations
   - Update profile paths
   - Remove entries for unused resources

**Note:** Profile-relative resources (like `${manifestDir}/styles/custom.css`) require the profile to be loaded from a file path, not just by ID.

---

### System Resource Errors (2026-01-14 Fix)

**Symptom:** Build fails with errors about missing system stylesheets (base.css, primary.css, or shiki-base.css).

**Example error:**
```
[ERROR] System base stylesheet not found: base.css. This indicates a misconfigured or incomplete installation.
```

**Root Cause (Fixed 2026-01-14):**

This was caused by a path doubling bug in resource resolution:

1. **Path Doubling Bug:** `DEFAULT_FILES` constants included subdirectory prefixes (`styles/base.css`), but the path resolver's `buildSearchPaths()` already added these prefixes when building search paths.
   - Result: Resolver looked for `bin/styles/styles/base.css` (doubled path)
   - Actual location: `bin/styles/base.css` (correct path)

2. **Silent Failures:** Missing system stylesheets only logged warnings and continued building, resulting in broken output with missing styles.

**What Changed:**

- **DEFAULT_FILES paths now exclude subdirectory prefixes** (e.g., `base.css` instead of `styles/base.css`)
- **Missing system resources now fail fast** with clear error messages instead of silently continuing
- **System resources now load directly from CLI bundle** without searching (performance optimization)
  - System stylesheets (base.css, primary.css, shiki-base.css) bypass the 26-path search algorithm
  - Profile CSS, frontmatter CSS, and layout CSS still use full search hierarchy (as intended)
- System stylesheets (base.css, primary.css, shiki-base.css) are **required** for all builds

**If You Encounter This Error:**

This error indicates a misconfigured or incomplete PageMD installation:

1. **For CLI users:** Reinstall PageMD CLI
   ```bash
   npm install -g @pagemd/cli
   ```

2. **For VS Code extension users:** Reinstall the extension
   - Uninstall PageMD extension
   - Reload VS Code
   - Reinstall from Marketplace or VSIX

3. **For developers:** Verify bundled resources exist
   ```bash
   # Check CLI bundle includes required files
   ls -la /path/to/cli/styles/base.css
   ls -la /path/to/cli/styles/primary.css
   ls -la /path/to/cli/styles/syntax/shiki-base.css
   ```

4. **Verify with debug logging:**
   ```bash
   PAGEMD_LOG_LEVEL=TRACE pagemd build doc.md
   # Look for path-resolver messages showing search paths
   ```

**Technical Details:**

**System resources (base.css, primary.css, shiki-base.css) are loaded directly:**

Since 2026-01-14, system resources bypass the search algorithm and load directly from the CLI bundle:
```javascript
// Direct path construction (no search):
const systemPath = path.join(cliPath, 'styles', filename);
// For shiki-base.css: path.join(cliPath, 'styles', 'syntax', filename);
```

This eliminates the 26-path search that was occurring before. System resources are expected to exist at:
- `{cliPath}/styles/base.css`
- `{cliPath}/styles/primary.css`
- `{cliPath}/styles/syntax/shiki-base.css`

**User resources (profile CSS, layout CSS, frontmatter CSS) still use full search:**
```
# Search paths for user-provided resources:
1. {workingPath}/styles/
2. {workspacePath}/styles/
3. {homePath}/.pagemd/styles/
4. {cliPath}/styles/              ← Last resort
```

The fix ensures:
- No path doubling (paths are constructed correctly)
- Fast loading of system resources (direct path, no search)
- Missing system resources fail fast with clear error messages
- User resources maintain flexible search for maximum compatibility

#### Follow-Up Fix (2026-01-15)

**Issue:** After the 2026-01-14 system resource optimization, PDF exports from VS Code extension failed with "cliPath not provided in context".

**Root Cause:** The `cliPath` parameter was correctly threaded through HTML rendering but was **missing** from the PDF rendering call in `apps/cli/src/commands/build.js` (line 638).

**Call Chain:**
```
CLI Entry (index.js:86)
  ✓ Sets argv.cliPath = PROJECT_ROOT
  ↓
Build Command (build.js:562)
  ✓ Extracts cliPath from options
  ✓ Passes to renderDocument() [HTML] ✓
  ✗ Missing from renderPdf() [PDF] ✗  ← BUG HERE
  ↓
renderPdf → renderDocument → createRenderContext
  ✗ cliPath defaults to null
  ✗ System stylesheet loading throws error
```

**Fix Applied:**
- Added `cliPath` parameter to `renderPdf()` call in `build.js:647`
- Added `cliPath` extraction in `renderPdf()` function (`renderer-pdf/src/index.js:52`)
- Added `cliPath` forwarding to `renderDocument()` call inside `renderPdf()` (line 74)
- Added `cliPath` parameter to `exportToPdf()` in `packages/exporters/src/index.js:329`
- CLI bundle rebuilt to include complete fix

**Why It Happened:**
The system resource optimization made `cliPath` **required** for loading system stylesheets (previously failed silently). The PDF rendering path was overlooked during implementation - HTML worked because it already had `cliPath`, but PDF didn't.

**Affected Versions:** Between 2026-01-14 and 2026-01-15 (system resource optimization to this fix)

**Verification:**
```bash
# After fix, this should work:
pagemd build doc.md -o pdf

# VS Code extension PDF export should also work after:
# 1. Rebuilding CLI bundle: npm run bundle-cli
# 2. Reloading VS Code window
```

---

## PDF Rendering Issues

### Wrong Font in PDF Output

**Symptom:** PDF uses a different font than specified in CSS (e.g., DejaVu Sans instead of Inter).

**Cause:** CSS `font-family` silently falls back when fonts aren't installed. Headless Chrome may not have access to all system fonts, especially in WSL or containerized environments.

**Diagnosis:**

1. Check which fonts are actually in the PDF:
   ```bash
   # Using pdffonts (from poppler-utils)
   pdffonts output.pdf

   # Alternative: grep font names
   strings output.pdf | grep FontName
   ```

2. Check if font is installed:
   ```bash
   # Linux/WSL
   fc-list | grep -i "Inter"

   # Windows fonts (from WSL)
   ls /mnt/c/Windows/Fonts/ | grep -i inter
   ```

**Solutions:**

1. **Install the font system-wide** - Download and install to your OS fonts directory
   - Windows: Copy `.ttf`/`.otf` to `C:\Windows\Fonts\`
   - Linux: Copy to `~/.local/share/fonts/` then run `fc-cache -f`

2. **Embed fonts via base64** (recommended for portability) - See [[guides/Profiles#Embed Custom Fonts]]
   ```css
   @font-face {
     font-family: 'Inter';
     src: url('data:font/woff2;base64,d09GMgABA...') format('woff2');
   }
   ```

3. **Use system fonts** - Update CSS to use fonts guaranteed available:
   ```css
   /* Windows/Mac/Linux system fonts */
   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
   ```

**Why no error?** CSS font fallback is silent by design—browsers don't report missing fonts as errors, they just use the next available font in the stack.

---

### Links Showing "()" or URL After Link Text (Fixed 2026-01-20)

**Symptom:** In PDF output, links display with the URL repeated in parentheses:
- `Click here (#section-name)` for internal links
- `https://example.com (https://example.com)` for URL-as-text links (autolinks)
- `Visit site (https://example.com)` - this is intended behavior for named links

**Two Issues Fixed (2026-01-20):**

#### Issue 1: Internal Anchor Links

The print CSS used an overly broad selector that matched ALL links:

```css
/* OLD (too broad) */
a[href]::after {
  content: " (" attr(href) ")";
}
```

**Fix:** Changed selector to only target external HTTP/HTTPS links:

```css
/* FIXED */
a[href^="http"]::after { ... }
```

#### Issue 2: Autolinks (URL as Link Text)

When the link text IS the URL itself (common in documentation), the URL was duplicated:

```
https://example.com (https://example.com)  ← Redundant!
```

**Fix:** The renderer now detects "autolinks" (links where text equals href) and adds a `.autolink` class. The CSS excludes these from the `::after` rule:

```css
/* FIXED */
a[href^="http"]:not(.autolink)::after {
  content: " (" attr(href) ")";
}
```

**Current Behavior:**
- **Named links** (`[Click here](https://example.com)`) → show URL in parentheses ✓
- **Autolinks** (`https://example.com` or `[https://example.com](https://example.com)`) → no duplication ✓
- **Internal anchors** (`[Section](#section)`) → remain clean ✓

**If You See This Issue:**

You may be using an older version of PageMD. Update to the latest version:

```bash
npm install -g @pagemd/cli
```

Or for VS Code extension users, reinstall the extension to get the updated CSS.

---

### TOC Not Appearing

**Symptom:** You expected a Table of Contents but the rendered document has none.

**Possible Causes:**

1. **Neither `toc: true` nor `<!-- ::TOC -->` present:** You need one of these to generate a TOC.

   **Fix:** Add `toc: true` to frontmatter (auto-places after first H1):
   ```yaml
   ---
   toc: true
   ---
   ```

   Or add the directive where you want the TOC:
   ```markdown
   <!-- ::TOC -->
   ```

2. **No headings in document:** The TOC requires at least one heading at or above the configured `toc_levels` depth.

3. **All headings filtered by `toc_min_level`:** If `toc_min_level: 3` but your document only has H1 and H2, the TOC will be empty and removed.

---

### TOC Includes Document Title (H1)

**Symptom:** The document title (H1) appears in the TOC alongside chapter headings.

**Root Cause:** By default, `toc_min_level` is 2, which excludes H1. If you set `toc_min_level: 1`, H1 is included.

**Fix:** Set `toc_min_level: 2` (or omit it, since 2 is the default):
```yaml
---
toc: true
toc_min_level: 2
---
```

If you **want** H1 in the TOC (e.g., multi-chapter documents where H1 is chapter titles), set:
```yaml
---
toc: true
toc_min_level: 1
---
```

---

### Internal Anchor Links Not Clickable in PDF (Known Limitation)

**Symptom:** TOC links and internal anchor links (like `#section-name`) are not clickable in the PDF output, but external links (https://...) work fine.

**Root Cause:**

This is a fundamental limitation of HTML-to-PDF conversion, not specific to PageMD:

1. **HTML anchors** work because browsers maintain a mapping of `id` attributes to elements
2. **PDF internal links** require explicit "named destinations" and "link annotations" - a different mechanism
3. **Browser print-to-PDF** (used by Puppeteer) doesn't create these PDF-specific link structures

**What Works:**
- ✅ External links (`https://example.com`) are clickable in PDF
- ✅ TOC links work in HTML output
- ✅ TOC links work in VS Code preview

**What Doesn't Work:**
- ❌ Internal anchor links (`#section-name`) in PDF output
- ❌ TOC links pointing to document sections in PDF

**Workarounds:**

1. **Use PDF viewer bookmarks:** Many PDF viewers generate bookmarks/outlines from heading structure automatically

2. **Use page numbers in TOC:** Include page numbers in your TOC so readers can navigate manually:
   ```markdown
   1. [Introduction](#introduction) - Page 3
   2. [Getting Started](#getting-started) - Page 5
   ```

3. **For electronic distribution:** Consider HTML output instead of PDF when clickable navigation is critical

**Technical Background:**

PDF internal links require:
- Named destinations (targets) defined in the PDF structure
- Link annotations pointing to those destinations
- This is different from HTML where anchors are resolved at runtime

Puppeteer's `page.pdf()` renders the visual appearance but doesn't post-process the PDF to add these link structures. Implementing this would require PDF post-processing with a library like `pdf-lib`.

**Status:** Known limitation. May be addressed in future versions.

---

### Paged.js Errors

**Symptom:** PDF generates but layout incorrect or missing page breaks.

**Causes:**
- Invalid CSS (Paged.js-specific rules)
- Missing @page rules
- JavaScript errors in Paged.js

**Solutions:**

1. **Check debug artifacts:**
   ```bash
   pagemd build document.md --debug
   # Creates: document-debug.html with full CSS
   ```

2. **Validate CSS:**
   - Paged.js requires specific @page syntax
   - Test in browser with Paged.js polyfill
   - Check browser console for JS errors

3. **Try CLI Paged.js mode:**
   ```bash
   # Preprocess with pagedjs-cli instead of in-browser
   pagemd build document.md --pagedjs cli
   ```

4. **Example valid @page rule:**
   ```css
   @page {
     size: letter;
     margin: 1in;
   }

   @page :first {
     margin-top: 2in;
   }
   ```

---

### Paged.js Crash on Headings Starting with Numbers (Fixed 2026-01-22)

**Symptom:** PDF export produces only a few pages (e.g., title page + empty TOC) instead of full content. Paged.js hangs for several minutes before timeout warning.

**Error in debug log:**
```
SyntaxError: Failed to execute 'querySelector' on 'Element': '#1-check-pagemd-version' is not a valid selector.
```

**Root Cause:**

CSS selectors cannot start with a digit. If you have a heading like:

```markdown
## 1. Check PageMD Version
```

Older versions generated `id="1-check-pagemd-version"`, which is invalid CSS. When Paged.js internally called `querySelector('#1-check-pagemd-version')`, it threw a `SyntaxError` and crashed silently.

**Solution (Fixed in 2026-01-22):**

The `slugify()` function now prefixes IDs starting with digits with `section-`:

| Heading | Old ID (Invalid) | New ID (Valid) |
|---------|-----------------|----------------|
| `## 1. Introduction` | `1-introduction` | `section-1-introduction` |
| `## 2023 Report` | `2023-report` | `section-2023-report` |
| `## Chapter 3` | `chapter-3` | `chapter-3` (unchanged) |

**If you encounter this issue:**

1. Update to the latest PageMD CLI
2. Rebuild the CLI bundle: `npm run bundle-cli`
3. Re-export your document

**Manual workaround (if you can't update):**

Avoid starting headings with numbers. Instead of:
```markdown
## 1. Introduction
```

Use:
```markdown
## Section 1: Introduction
```

---

### Paged.js Crash on CSS Pseudo-Selectors (Fixed 2026-01-22)

**Symptom:** PDF export crashes immediately with "item doesn't belong to list" error. CLI logs the error but still reports "success" with a blank 1-page PDF.

**Error in debug log:**
```
[ERROR] [renderer.pdf] [browser.error] uncaught: Browser error: item doesn't belong to list
    at List$6.remove (:3777:20)
    at onRule (:30859:14)
```

**Root Cause:**

Paged.js 0.4.3 has a bug in its CSS parser (the css-tree library) that crashes when processing certain pseudo-class selectors that involve list-based DOM traversal:

| Selector | Status |
|----------|--------|
| `:nth-child(2n)` | **Crashes Paged.js** |
| `:nth-child(even)` | **Crashes Paged.js** |
| `:nth-of-type(2n+1)` | **Crashes Paged.js** |
| `:first-of-type` | **Crashes Paged.js** |
| `:first-child` | **May crash Paged.js** |
| `:last-child` | **May crash Paged.js** |
| `:first` (page pseudo) | Safe |
| `:hover`, `:focus` | Safe |

**Reference:** [Paged.js GitLab Issue #315](https://gitlab.coko.foundation/pagedjs/pagedjs/-/issues/315)

**Solution (Fixed in 2026-01-22):**

PageMD's CSS files have been updated to remove/comment these selectors:

- `styles/base.css` - Removed `tr:nth-child(2n)` (table zebra striping)
- `styles/book.css` - Removed `:first-child`, `:last-child` selectors
- `layouts/book.css` - Removed `:first-of-type` selector

**If you use custom CSS:**

Check your CSS for the problematic selectors listed above. Either:

1. **Remove** the selector entirely
2. **Replace** with class-based selectors:
   ```css
   /* BEFORE (crashes Paged.js) */
   tr:nth-child(even) { background: #f5f5f5; }

   /* AFTER (safe) */
   tr.even { background: #f5f5f5; }
   /* Or just remove zebra striping */
   ```

**Error Detection Improvement:**

As of 2026-01-22, the CLI now properly detects Paged.js crashes:
- If Paged.js produces 0 pages AND browser errors occurred, CLI reports failure
- Error message includes: "Paged.js crashed: [error]. Check CSS for problematic selectors"

---

### PDF Generation Timeout

**Symptom:** Warning: `Paged.js rendering may not have completed`

**Causes:**
- Large document (many pages)
- Complex CSS/images
- Slow system/browser
- Default timeout (2 minutes) too short

**Solutions:**

1. **Increase timeout in frontmatter:**
   ```yaml
   ---
   title: Large Document
   pagedjs_timeout: 300000  # 5 minutes
   ---
   ```

2. **Increase timeout in profile:**
   ```json
   {
     "pagedjs": {
       "timeout": 300000
     }
   }
   ```

3. **Disable timeout for very large documents:**
   ```yaml
   ---
   pagedjs_timeout: -1  # Wait indefinitely (use with caution)
   ---
   ```

4. **Enable browser persistence (batch builds):**
   ```bash
   # Linux/macOS
   export PAGEMD_KEEP_CHROME=1
   pagemd build *.md -o pdf

   # Windows (PowerShell)
   $env:PAGEMD_KEEP_CHROME="1"
   pagemd build *.md -o pdf
   ```

5. **Simplify document:**
   - Reduce images
   - Simplify CSS
   - Split into multiple files

6. **Check browser performance:**
   ```bash
   # Run with debug to see browser
   pagemd build document.md --debug
   # Monitor CPU/memory usage
   ```

**Timeout values:**
- `0`: Use default (120000ms / 2 minutes)
- `-1`: Disabled (infinite wait)
- Positive number: Timeout in milliseconds

**Cascade order:** frontmatter > profile > default (120000ms)

---

### Browser Persistence

**Purpose:** Keep Chrome alive between renders for batch operations.

**Environment Variable:** `PAGEMD_KEEP_CHROME`

**Usage:**
```bash
# Linux/macOS
export PAGEMD_KEEP_CHROME=1

# Windows (cmd)
set PAGEMD_KEEP_CHROME=1

# Windows (PowerShell)
$env:PAGEMD_KEEP_CHROME="1"
```

**When to Use:**
- Building multiple files in sequence
- Programmatic API with repeated renders
- Watch mode / dev server

**Behavior:**
- First render: Launch Chrome (~2-3s)
- Subsequent renders: Reuse existing browser (~0s overhead)
- Process exit: Browser cleaned up automatically

**Note:** Persistence works within a single Node.js process. Separate CLI invocations start fresh processes.

---

### Blank/Incomplete PDF

**Symptom:** PDF generates but is blank or missing content.

**Causes:**
- CSS hiding content
- JavaScript errors
- Incorrect page size

**Solutions:**

1. **Check HTML output:**
   ```bash
   pagemd build document.md --output html
   # Open document.html in browser
   ```

2. **Verify @page size:**
   ```css
   @page {
     size: letter; /* or A4, legal, etc. */
   }
   ```

3. **Debug browser rendering:**
   ```bash
   pagemd build document.md --debug --log-level DEBUG
   ```

4. **Check for hidden content:**
   ```css
   /* Bad - hides content */
   body { display: none; }

   /* Good - visible */
   body { display: block; }
   ```

---

### Large Blank Gap Below a Heading (Fixed 2026-09-24)

**Symptom:** A section heading (`h2`/`h3`) is followed by a large blank area at the bottom of
the page, and the heading's list content resumes at the top of the next page instead of right
below the heading.

**Cause:** `base.css` combines `h1..h6 { page-break-after: avoid; }` with
`ul, ol, dl { page-break-inside: avoid; }` in print. When a list following a heading is taller
than one page (for example, a numbered procedure step whose items each embed a screenshot
`<figure>`), both constraints together are unsatisfiable. Paged.js resolves this by pushing the
*entire* heading+list block onto the next page, leaving a large blank gap where it used to sit.

**Fix (built into `base.css` as of 2026-09-24):** The "keep together" guarantee now applies to
each list item (`li`) instead of the whole list:

```css
@media print {
  ul, ol, dl {
    page-break-inside: auto;
    break-inside: auto;
  }

  li {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
```

Short lists still render intact (they already fit on one page). Long lists now break cleanly
between items instead of being shoved as one unit, so the gap disappears and the heading stays
attached to its first item.

**If you still see this:** it means an individual `<li>` itself (not the list as a whole) is
taller than a page — e.g. a single step whose figure is very tall. Cap the figure's height in
your document or profile CSS:

```css
figure img {
  max-height: 6in;
}
```

---

### Images Not Displaying in PDF

**Symptom:** Images appear in HTML output but are missing or broken in PDF.

**Causes:**
- Relative image paths not resolving
- Browser can't find local images
- Content Security Policy blocking

**Solutions:**

1. **Verify paths work in HTML first:**
   ```bash
   pagemd build document.md -o html
   # Open document.html in browser and check images
   ```

2. **Use debug mode to inspect:**
   ```bash
   pagemd build document.md --debug --log-level DEBUG
   # Check debug/*.paged.html for base href injection
   # Look for: [DEBUG] renderer.pdf:base-href:success
   ```

3. **Check image path types:**
   ```markdown
   # Supported
   ![](./local-image.png)         # Relative to markdown file
   ![](../assets/image.jpg)       # Parent directory
   ![](https://example.com/img)   # Remote URL

   # Not supported without FIGURE directive
   ![](/absolute/path/image.png) # Root paths may fail
   ```

4. **Use FIGURE directive for reliable images:**
   ```markdown
   <!-- ::FIGURE src="./diagram.png" caption="Architecture" -->
   ```

**Technical Details:**
- PageMD injects `<base href="file:///path/to/markdown/dir/">` into HTML
- This allows relative paths to resolve from the markdown file's directory
- Remote HTTPS images always work
- Data URIs (`data:image/...`) always work

**Workaround for problematic images:**
```markdown
<!-- Convert to data URI for guaranteed rendering -->
![](data:image/png;base64,iVBORw0KGgo...)
```

---

### Running Headers/Footers Not Displaying (string-set)

**Symptom:** Dynamic content in running headers or footers (using CSS `string-set` and `string()`) doesn't appear, while static content like page numbers works fine.

**Root Causes:** Two Paged.js limitations cause this issue:

1. **`display: none` breaks string-set capture** - Elements hidden with `display: none` are removed from the render tree, preventing Paged.js from capturing their content with `string-set`.

2. **String concatenation in CSS `content` doesn't work with `string()`** - Paged.js cannot concatenate `string()` values with literal text in CSS.

**Example of broken patterns:**

```css
/* BROKEN: Source element uses display:none */
.hidden-element {
  display: none;  /* Paged.js can't read this! */
  string-set: my-var content();
}

/* BROKEN: Concatenation in content property */
@page {
  @bottom-left {
    content: string(status) " - Uncontrolled Document";  /* Fails! */
  }
}
```

**Solutions:**

1. **Hide elements without `display: none`:**
   ```css
   /* Use this instead of display:none */
   .string-capture {
     height: 0;
     overflow: hidden;
     font-size: 0;
   }
   ```

2. **Pre-build concatenated strings in HTML template:**
   ```html
   <!-- In your template, build the full string -->
   <div class="string-capture" style="height: 0; overflow: hidden; font-size: 0;">
     <!-- Individual values (if needed separately) -->
     <span class="status-string">{{metadata.status}}</span>

     <!-- Pre-built concatenated string -->
     <span class="footer-left-string">{{metadata.status}} - Uncontrolled Document</span>
   </div>
   ```

3. **Reference the pre-built string in CSS:**
   ```css
   /* Capture the pre-built string */
   .footer-left-string {
     string-set: footer-left content();
   }

   @page {
     @bottom-left {
       /* Use string() alone - no concatenation */
       content: string(footer-left);
     }

     /* Page counters work fine with concatenation */
     @bottom-right {
       content: "Page " counter(page) " of " counter(pages);
     }
   }
   ```

**Why page numbers work but dynamic text doesn't:**
- CSS `counter()` is native browser functionality that works with concatenation
- Paged.js `string()` is a polyfill that doesn't support concatenation in `content`

**Complete working example:**

Template HTML:
```html
<div class="string-capture" style="height: 0; overflow: hidden; font-size: 0;">
  <span class="footer-left-string">{{metadata.status}} - Uncontrolled Document</span>
</div>
```

Layout CSS:
```css
.footer-left-string {
  string-set: footer-left content();
}

@page {
  @bottom-left {
    content: string(footer-left);
    font-size: 8pt;
    color: #666;
  }

  @bottom-right {
    content: "Page " counter(page) " of " counter(pages);
    font-size: 9pt;
  }
}
```

**Debugging tips:**
1. Use `--debug` mode and inspect the generated `.paged.html` file
2. Look for CSS variables like `--pagedjs-string-first-*` to verify string capture
3. If the variable value looks malformed (e.g., `&quot;Draft;`), the source element is likely hidden with `display: none`
4. Test with hardcoded static text first to verify the `@page` rule works

---

## Debug Mode

### Using Debug Mode for Diagnostics

Debug mode provides comprehensive visibility into the build process via an integrated summary output that replaces the standard build summary.

**Enable:**
```bash
pagemd build document.md --debug
# Or via environment
PAGEMD_DEBUG=1 pagemd build document.md
```

**Debug summary output:**
```
======================================================================
  DEBUG MODE ACTIVE
======================================================================

Build Summary:
  Total files: 1
  Successful: 1
  Failed: 0
  Total outputs: 2
  Duration: 0.82s

Overrides:
  PAGEMD_DEBUG: true (cli)

Directory Context:
  Project Root:  /path/to/project
  Output Dir:    /path/to/output
  Debug Dir:     /path/to/output/debug
  Markdown Dir:  /path/to/docs

Loaded Resources:
  Styles:
    [css] styles/base.css (base)
          /path/to/project/styles/base.css (8.8 KB)
    [css] styles/primary.css (primary)
          /path/to/project/styles/primary.css (649 B)
  Layouts:
    [css] ${projectRoot}/templates/layouts/standard_letter.css (profile)
          /path/to/project/templates/layouts/standard_letter.css (447 B)
  Templates:
    [template] ${projectRoot}/templates/layouts/standard_letter.html
          /path/to/project/templates/layouts/standard_letter.html (689 B)

Per-File Breakdown:
  document.md
    Profile: standard_letter
    Duration: 820ms
    Outputs: html, pdf
    Debug artifacts:
      - document.paged.html
      - document.screenshot.png

----------------------------------------------------------------------
```

**What to check in debug summary:**

| Issue | Check | Look For |
|-------|-------|----------|
| Wrong profile | Per-File Breakdown, Overrides | Profile name mismatch, unexpected override |
| Missing styles | Loaded Resources > Styles | Expected CSS files absent |
| Path resolution | Directory Context | Unexpected project root |
| Slow builds | Per-File Breakdown | Duration values |
| Missing output | Per-File Breakdown | Outputs list |
| Config override | Overrides | Unexpected env/cli values |
| Layout issues | Loaded Resources > Layouts | Profile CSS missing or wrong |

**Common diagnostic workflows:**

1. **CSS not applying:**
   - Check "Loaded Resources" for expected CSS files
   - Verify file sizes are non-zero
   - Inspect `*-debug.css` for merged output

2. **Profile mismatch:**
   - Check "Per-File Breakdown" shows expected profile
   - Verify profile exists with `pagemd list-profiles`

3. **Performance issues:**
   - Compare duration across files
   - Look for unexpectedly long renders
   - Check loaded resource sizes

---

### Enable Debug Artifacts

**Purpose:** Capture intermediate files for troubleshooting.

**Usage:**
```bash
pagemd build document.md --debug
# Or via environment variable
PAGEMD_DEBUG=1 pagemd build document.md
```

**Artifacts Created in `debug/` folder:**

| File | Contents |
|------|----------|
| `{name}.paged.html` | HTML snapshot after Paged.js processing |
| `{name}.screenshot.png` | Full page screenshot |

**Example:** Building `document.md` creates:
```
output/
├── document.pdf
├── document.html
└── debug/
    ├── document.paged.html
    └── document.screenshot.png
```

**When to Use:**
- PDF layout issues
- CSS not applying correctly
- Paged.js rendering problems
- Profile/path resolution issues

**Example Workflow:**
```bash
# Generate debug artifacts
pagemd build document.md --debug

# Inspect processed HTML
cat debug/document.paged.html

# Open in browser to debug
open debug/document.paged.html
```

**Show browser window (for interactive debugging):**
```bash
PAGEMD_HEADLESS=0 pagemd build document.md --debug
```

The PDF renders normally and the process completes, but the browser window stays open for inspection. You'll see: `📋 Browser left open for inspection. Close it manually when done.`

Use browser DevTools to inspect CSS, check console for errors, and examine the Paged.js output.

---

### Debug Logs

**Enable verbose logging:**
```bash
pagemd build document.md --log-level DEBUG
```

**Key debug events:**
- `chrome_detected` - Chrome detection results
- `browser_launch` - Browser startup
- `profile_load` - Profile resolution
- `path_resolve` - Token expansion
- `css_merge` - CSS compilation
- `pdf_render` - PDF generation steps

**Example output:**
```
[DEBUG] renderer.pdf:chrome_detected:ok - Found Chrome at /usr/bin/google-chrome
[DEBUG] renderer.pdf:browser_launch:start - Attempting to launch system Chrome
[INFO] renderer.pdf:browser_ready:ok - Chrome 120.0.6099.109 ready (headless: true)
[DEBUG] build.pdf:start - Generating PDF: document.pdf
[INFO] build.pdf:success - PDF generated: document.pdf (2 pages)
```

---

## Log Levels

### Control Verbosity

**Levels (least to most verbose):**
- `OFF` - No logging
- `FATAL` - Fatal errors only
- `ERROR` - Errors only
- `WARN` - Warnings and errors (default)
- `INFO` - Progress indicators
- `DEBUG` - Development diagnostics
- `TRACE` - All operations (very verbose)

**Set via Flag:**
```bash
pagemd build document.md --log-level DEBUG
```

**Set via Environment:**
```bash
export PAGEMD_LOG_LEVEL=DEBUG
pagemd build document.md
```

**Precedence:** CLI flag overrides environment variable.

---

### Suppress Logs

**Minimal output (errors only):**
```bash
pagemd build document.md --log-level ERROR
```

**No output:**
```bash
pagemd build document.md --log-level OFF
```

**Use case:** CI/CD pipelines where only failures matter.

---

### Trace Mode

**All operations logged:**
```bash
export PAGEMD_LOG_LEVEL=TRACE
pagemd build document.md
```

**Output includes:**
- Every file read
- Every path resolution
- Every CSS merge step
- Every browser operation
- Every validation check

**Warning:** Very verbose; use only for deep debugging.

---

### Colored Logs Not Showing

**Symptom:** Logs appear without colors in terminal.

**Causes:**
- Terminal doesn't support ANSI colors
- Output is piped or redirected
- `PAGEMD_LOG_COLOR=0` is set

**Solutions:**

1. **Check if colors are auto-disabled:**
   ```bash
   # Colors disabled when piped
   pagemd build doc.md | cat  # No colors (expected)

   # Colors enabled in terminal
   pagemd build doc.md        # Colors shown
   ```

2. **Force colors when piping:**
   ```bash
   PAGEMD_LOG_COLOR=1 pagemd build doc.md | less -R
   ```

3. **Check env var:**
   ```bash
   echo $PAGEMD_LOG_COLOR  # Should be empty or 1
   ```

---

### Disable Colored Logs

**Symptom:** Want plain text logs for parsing or file storage.

**Solution:**
```bash
# Disable colors
export PAGEMD_LOG_COLOR=0

# Or inline
PAGEMD_LOG_COLOR=0 pagemd build doc.md > build.log
```

**When to disable:**
- Logging to files
- Parsing logs programmatically
- CI/CD systems without color support
- Accessibility requirements

---

## Common Error Messages

### File Include Not Found (Book Assembly)

**Symptom:** When building a multi-file book using include directives:
```
File '/path/to/project/docs/wiki/guides/path/to/file.md' not found.
```

**Causes:**

1. **Path resolution is relative to CLI working directory**, not the markdown file
2. **Nested includes in documentation** - included files contain example include syntax that gets processed

**Solutions:**

**For path issues:**
```bash
# Run from the book's directory so relative paths resolve correctly
cd docs/wiki
pagemd build book.md -o pdf -p book-wiki
```

**For nested documentation examples:**

If an included file documents include syntax (like Extended-Syntax.md), those examples get processed as real includes. Escape them using HTML entities:

Replace `!` with `&#38;#33;` (the HTML entity for exclamation mark). The escaped text renders correctly but won't be processed by the include plugin.

See: [Extended Syntax - Escaping Include Syntax](guides/Extended-Syntax.md#escaping-include-syntax-in-documentation)

---

### `Input not found: /path/to/file.md`

**Cause:** File does not exist.

**Solution:**
```bash
# Check path
ls -l /path/to/file.md

# Use absolute path
pagemd build /absolute/path/to/file.md

# Or relative to current directory
cd /path/to
pagemd build file.md
```

---

### `Profile not found: my_profile`

**Cause:** Profile ID not in search paths.

**Solution:**
```bash
# List profiles
pagemd list-profiles

# Validate paths
pagemd validate document.md --log-level DEBUG
```

See [Profile Not Found](#profile-not-found).

---

### `Missing frontmatter stylesheet: <name>`

**Cause:** A CSS file specified in the document's frontmatter `styles` array could not be found.

**Example Error:**
```
Error: Missing frontmatter stylesheet: my-custom
Source: Document frontmatter 'styles' array
Searched in:
  1. /home/user/docs/my-custom.css
  2. /home/user/docs/.pagemd/styles/my-custom.css
  3. /home/user/docs/styles/my-custom.css
  4. /home/user/project/styles/my-custom.css
  ...
```

**Solutions:**

1. **Check file exists** at one of the searched locations:
   ```bash
   ls -la /path/to/project/styles/
   ```

2. **For preset styles**, they may be in a subdirectory. PageMD searches `styles/presets/`, `styles/syntax/`, and `styles/vendor/` automatically:
   ```yaml
   # Both of these work (subdirectories are searched)
   styles: ["modern-clean"]           # Finds styles/presets/modern-clean.css
   styles: ["presets/modern-clean"]   # Explicit path also works
   ```

3. **Check spelling and extension**:
   - PageMD auto-adds `.css` extension
   - Names are case-sensitive on Linux

4. **Use absolute path** if relative resolution fails:
   ```yaml
   styles: ["/absolute/path/to/my-style.css"]
   ```

5. **Enable debug logging** to see all search paths:
   ```bash
   PAGEMD_LOG_LEVEL=DEBUG pagemd build doc.md
   ```

**Note:** Unlike warnings in previous versions, missing stylesheets now cause the build to fail. This ensures you don't accidentally publish documents with missing styles.

---

### `Missing required field: document_id`

**Cause:** Frontmatter missing field required by profile.

**Solution:**

1. **Check profile requirements:**
   ```bash
   pagemd list-profiles --verbose
   ```

2. **Add missing field to frontmatter:**
   ```yaml
   ---
   title: My Document
   document_id: DOC-001  # Added
   revision: 1.0
   ---
   ```

3. **Validate:**
   ```bash
   pagemd validate document.md
   ```

---

### `Layout file not found: ${projectRoot}/...`

**Cause:** Path token not expanded or file missing.

**Solution:** See [Path Resolution Errors](#path-resolution-errors).

---

### `Failed to launch browser: ...`

**Cause:** Chrome/Chromium missing or launch failure.

**Solution:** See [Browser Launch Failure](#browser-launch-failure).

---

### `No valid output formats. Use: html, pdf, png, jpeg`

**Cause:** Invalid `--output` value.

**Solution:**
```bash
# Valid
pagemd build document.md --output html,pdf

# Invalid
pagemd build document.md --output xml  # Error!
```

---

### `Circular inheritance detected in profile chain`

**Cause:** Profile extends itself (directly or indirectly).

**Solution:** See [Profile Inheritance Loop](#profile-inheritance-loop).

---

## See Also

- [[reference/CLI|CLI Reference]] - Command documentation
- [[Quick-Start]] - Quick start guide
- [[guides/Profiles|Working with Profiles]] - Profile configuration
- [[reference/Settings|Settings]] - Environment variables
- [[reference/Appendix|Appendix]] - Additional reference
