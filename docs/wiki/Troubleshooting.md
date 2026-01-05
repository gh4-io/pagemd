# Troubleshooting

Common issues, error messages, and solutions for PageMD.

---

## Contents

- [Chrome/Browser Issues](#chromebrowser-issues)
- [Profile Not Found](#profile-not-found)
- [Path Resolution Errors](#path-resolution-errors)
- [PDF Rendering Issues](#pdf-rendering-issues)
  - [Browser Persistence](#browser-persistence)
- [Debug Mode](#debug-mode)
- [Log Levels](#log-levels)
- [Common Error Messages](#common-error-messages)
- [See Also](#see-also)

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

**Symptom:** Warnings about missing CSS or font files.

**Behavior:**
- **CSS files:** Warning logged, build continues (may render incorrectly)
- **Font files:** Warning only, build continues

**Solution:**

1. **Check profile manifest:**
   ```json
   {
     "resources": {
       "css": [
         "${projectRoot}/project/styles/primary.css",
         "${configDir}/custom.css"
       ],
       "fonts": [
         "${projectRoot}/project/fonts/roboto.woff2"
       ]
     }
   }
   ```

2. **Verify paths:**
   ```bash
   pagemd validate document.md --strict
   ```

3. **Fix missing files:**
   - Add files to expected locations
   - Update profile paths
   - Remove entries for unused resources

---

## PDF Rendering Issues

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

### PDF Generation Timeout

**Symptom:** Warning: `Paged.js rendering may not have completed`

**Causes:**
- Large document (many pages)
- Complex CSS/images
- Slow system/browser

**Solutions:**

1. **Enable browser persistence (batch builds):**
   ```bash
   # Linux/macOS
   export PAGEMD_KEEP_CHROME=1
   pagemd build *.md -o pdf

   # Windows (PowerShell)
   $env:PAGEMD_KEEP_CHROME="1"
   pagemd build *.md -o pdf
   ```

2. **Simplify document:**
   - Reduce images
   - Simplify CSS
   - Split into multiple files

3. **Check browser performance:**
   ```bash
   # Run with debug to see browser
   pagemd build document.md --debug
   # Monitor CPU/memory usage
   ```

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

## Debug Mode

### Enable Debug Artifacts

**Purpose:** Capture intermediate files for troubleshooting.

**Usage:**
```bash
pagemd build document.md --debug
```

**Artifacts Created:**
- `document-debug.html` - Final HTML before PDF generation
- `document-debug.css` - Merged CSS (all sources)
- Browser window visible (not headless)

**When to Use:**
- PDF layout issues
- CSS not applying correctly
- JavaScript errors
- Profile/path resolution problems

**Example Workflow:**
```bash
# Generate debug artifacts
pagemd build document.md --debug

# Inspect HTML
cat document-debug.html

# Open in browser
open document-debug.html

# Check CSS
cat document-debug.css
```

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
- `WARN` - Warnings and errors
- `INFO` - Progress indicators (default)
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

## Common Error Messages

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

- [CLI API](../api/cli.md) - Command reference
- [[Quick-Start]] - Quick start guide
- [[Profiles]] - Profile manifest reference
- [[Appendix]] - FAQs and examples
- [@pagemd/renderer-pdf](../api/renderer-pdf.md) - PDF rendering internals
- [@pagemd/core](../api/core.md) - Path resolution
