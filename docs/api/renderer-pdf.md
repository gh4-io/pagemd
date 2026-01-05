# @pagemd/renderer-pdf API

PDF rendering orchestration using Puppeteer + Paged.js for PageMD.

## Installation

```bash
npm install @pagemd/renderer-pdf
```

## Main Functions

### renderPdf(markdownPath, options)

Render markdown file to PDF using Puppeteer + Paged.js.

```javascript
import { renderPdf } from '@pagemd/renderer-pdf';

const result = await renderPdf('./document.md', {
  profile: 'standard_letter',
  output: './output/document.pdf',
  debug: true
});

console.log(result.pdfPath);  // /absolute/path/to/document.pdf
console.log(result.pages);    // 3
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `options` (object):
  - `profile` (string): Profile ID (default: 'standard_letter')
  - `output` (string): Output path (default: same dir as source with .pdf extension)
  - `debug` (boolean): Enable debug artifacts (default: false)
  - `pagedjs` (string): Paged.js mode - 'browser' | 'cli' (default: 'browser')
  - `headless` (boolean): Run browser headless (default: true)
  - `pdfOptions` (object): Additional PDF generation options (see PDF Options below)

**Returns:** `Promise<{ pdfPath: string, pages: number }>`

**Pipeline Steps:**
1. Render HTML using @pagemd/renderer-web
2. Build Paged.js config from profile and frontmatter
3. Inject Paged.js polyfill into HTML
4. Determine output path and create directories
5. Create debug directory if needed
6. Launch Puppeteer browser
7. Create page and set content
8. Wait for Paged.js rendering completion
9. Save debug artifacts if enabled
10. Generate PDF
11. Count pages and close browser

**Throws:**
- Error if HTML rendering fails
- Error if browser launch fails
- Error if PDF generation fails

---

## Browser Functions

### detectChrome()

Detect system Chrome installation across platforms.

```javascript
import { detectChrome } from '@pagemd/renderer-pdf';

const chromePath = detectChrome();
if (chromePath) {
  console.log('Chrome found at:', chromePath);
} else {
  console.log('No system Chrome found, will use bundled Chromium');
}
```

**Returns:** `string|null` - Path to Chrome executable or null if not found

**Platform Detection:**
- **Windows:** Checks Program Files, LOCALAPPDATA, environment variables
- **macOS:** Checks /Applications and ~/Applications
- **Linux:** Checks common paths and uses `which` command

**Common Paths:**
- Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Linux: `/usr/bin/google-chrome`, `/usr/bin/chromium`

### launchBrowser(options)

Launch Puppeteer browser with Chrome preference.

```javascript
import { launchBrowser, closeBrowser } from '@pagemd/renderer-pdf';

const browser = await launchBrowser({
  headless: true,
  debug: false
});

// Use browser...

await closeBrowser(browser);
```

**Parameters:**
- `options` (object):
  - `headless` (boolean): Run in headless mode (default: true)
  - `debug` (boolean): Show browser for debugging (default: false)
  - `executablePath` (string): Override executable path (optional)
  - `args` (Array\<string\>): Additional browser args (default: [])

**Returns:** `Promise<Browser>` - Puppeteer browser instance

**Launch Priority:**
1. User-provided `executablePath` (if specified)
2. System Chrome (detected via `detectChrome()`)
3. Bundled Chromium (fallback)

**Default Browser Args:**
- `--no-sandbox`
- `--disable-setuid-sandbox`
- `--disable-dev-shm-usage`
- `--disable-web-security`

**Note:** If `debug: true`, browser runs in non-headless mode regardless of `headless` setting.

### closeBrowser(browser)

Safely close browser instance.

```javascript
import { closeBrowser } from '@pagemd/renderer-pdf';

await closeBrowser(browser);
```

**Parameters:**
- `browser` (Browser): Puppeteer browser instance to close

**Returns:** `Promise<void>`

**Note:** Errors during close are logged but not thrown, as browser may already be closed or in bad state.

---

## Paged.js Functions

### getPagedJsScript()

Get absolute path to bundled Paged.js polyfill script.

```javascript
import { getPagedJsScript } from '@pagemd/renderer-pdf';

const scriptPath = getPagedJsScript();
console.log(scriptPath);
// /path/to/project/node_modules/pagedjs/dist/paged.polyfill.js
```

**Returns:** `string` - Absolute path to paged.polyfill.js

**Resolution:** Navigates from package location to `node_modules/pagedjs/dist/paged.polyfill.js`

### getPagedJsConfig(profile, frontmatter)

Build PagedConfig object from profile and frontmatter.

```javascript
import { getPagedJsConfig } from '@pagemd/renderer-pdf';

const config = getPagedJsConfig(
  { pagedjs: { spread: 'left' } },           // Profile config
  { pagedjs: { orient: 'landscape' } }       // Frontmatter config
);

console.log(config);
// { auto: true, spread: 'left', orient: 'landscape', ... }
```

**Parameters:**
- `profile` (object): Profile manifest with optional pagedjs config
- `frontmatter` (object): Markdown frontmatter with optional pagedjs config

**Returns:** `object` - PagedConfig object for Paged.js initialization

**Config Precedence:** frontmatter > profile > defaults

**Default Config:**
```javascript
{
  auto: true,              // Auto-start Paged.js on page load
  spread: 'none',          // Spread mode: 'none' | 'left' | 'right'
  orient: 'portrait',      // Page orientation: 'portrait' | 'landscape'
  before: undefined,       // Hook function called before rendering
  after: undefined,        // Hook function called after rendering
  renderTo: undefined      // Target element for rendered output
}
```

**Profile Config Paths:**
- `profile.pagedjs` (recommended)
- `profile.renderer.pagedjs` (alternative)

### injectPagedJs(html, options)

Inject Paged.js polyfill script into HTML string.

```javascript
import { injectPagedJs, getPagedJsConfig } from '@pagemd/renderer-pdf';

const config = getPagedJsConfig(profile, frontmatter);
const injectedHtml = injectPagedJs(html, {
  pagedConfig: config,
  autoInit: true,
  mode: 'browser'
});
```

**Parameters:**
- `html` (string): HTML string to inject into
- `options` (object):
  - `pagedConfig` (object): PagedConfig object to inline (default: `{ auto: true }`)
  - `autoInit` (boolean): Whether to auto-initialize Paged.js (default: true)
  - `mode` (string): Execution mode - 'browser' | 'cli' (default: 'browser')

**Returns:** `string` - Modified HTML with Paged.js injected

**Injection Behavior:**
- Inserts script tags before closing `</body>` tag
- In browser mode: adds script tag referencing paged.polyfill.js
- If autoInit: adds initialization script with PagedConfig
- Adds default `after` callback to log page count

**Example Injected Script:**
```html
<script src="./node_modules/pagedjs/dist/paged.polyfill.js"></script>
<script>
  window.PagedConfig = {
    "auto": true,
    "spread": "none",
    "orient": "portrait"
  };

  if (window.PagedConfig.after === undefined) {
    window.PagedConfig.after = (flow) => {
      console.log('Paged.js rendering complete:', flow.total, 'pages');
    };
  }
</script>
```

---

## Debug Functions

### createDebugDir(basePath)

Create debug directory if it doesn't exist.

```javascript
import { createDebugDir } from '@pagemd/renderer-pdf';

const debugDir = await createDebugDir('/output/document.pdf');
console.log(debugDir);  // /output/debug
```

**Parameters:**
- `basePath` (string): Base output path

**Returns:** `Promise<string>` - Debug directory path

**Directory Structure:** Creates `debug/` subdirectory adjacent to output file.

### shouldSaveDebug(options, profile)

Check if debug artifacts should be saved.

```javascript
import { shouldSaveDebug } from '@pagemd/renderer-pdf';

const save = shouldSaveDebug(
  { debug: true },              // Options
  { debugArtifacts: false }     // Profile
);
console.log(save);  // true
```

**Parameters:**
- `options` (object): Render options
- `profile` (object): Profile configuration

**Returns:** `boolean` - True if debug artifacts should be saved

**Debug Enabled When:**
- `options.debug === true` (explicit flag)
- `profile.debugArtifacts === true` (profile setting)

### saveDebugHtml(html, outputPath, options)

Save pre-PDF HTML snapshot for debugging.

```javascript
import { saveDebugHtml } from '@pagemd/renderer-pdf';

const debugPath = await saveDebugHtml(
  html,
  '/output/document.pdf',
  {
    debugDir: '/output/debug',
    suffix: '.paged'
  }
);
console.log(debugPath);  // /output/debug/document.paged.html
```

**Parameters:**
- `html` (string): HTML content to save
- `outputPath` (string): Original output path (used for naming)
- `options` (object):
  - `debugDir` (string): Custom debug directory (optional, auto-created if not provided)
  - `suffix` (string): Filename suffix before .html (default: '.paged')

**Returns:** `Promise<string>` - Path to saved debug HTML file

**Filename Pattern:** `{basename}{suffix}.html`

### saveDebugScreenshot(page, outputPath, options)

Save page screenshot for visual debugging.

```javascript
import { saveDebugScreenshot } from '@pagemd/renderer-pdf';

const screenshotPath = await saveDebugScreenshot(
  page,
  '/output/document.pdf',
  {
    debugDir: '/output/debug',
    format: 'png',
    fullPage: true
  }
);
console.log(screenshotPath);  // /output/debug/document.screenshot.png
```

**Parameters:**
- `page` (object): Puppeteer page instance
- `outputPath` (string): Original output path (used for naming)
- `options` (object):
  - `debugDir` (string): Custom debug directory (optional)
  - `format` (string): Image format - 'png' | 'jpeg' (default: 'png')
  - `quality` (number): JPEG quality 1-100 (ignored for PNG)
  - `fullPage` (boolean): Capture full scrollable page (default: true)

**Returns:** `Promise<string>` - Path to saved screenshot

**Filename Pattern:** `{basename}.screenshot.{format}`

### cleanupDebugArtifacts(basePath, options)

Remove debug artifacts for a specific output.

```javascript
import { cleanupDebugArtifacts } from '@pagemd/renderer-pdf';

// Remove specific artifacts
await cleanupDebugArtifacts('/output/document.pdf');

// Remove entire debug directory
await cleanupDebugArtifacts('/output/document.pdf', {
  removeDir: true
});
```

**Parameters:**
- `basePath` (string): Base output path
- `options` (object):
  - `removeDir` (boolean): Remove entire debug directory (default: false)

**Returns:** `Promise<void>`

**Cleanup Behavior:**
- If `removeDir: false`: Removes only files matching basename
- If `removeDir: true`: Removes entire debug directory
- Errors are logged but not thrown (cleanup failures don't break pipeline)

---

## Options Reference

### Render Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `profile` | string | `'standard_letter'` | Profile ID to use |
| `output` | string | Same dir as source | Output PDF path |
| `debug` | boolean | `false` | Enable debug artifacts |
| `pagedjs` | string | `'browser'` | Paged.js mode: 'browser' or 'cli' |
| `headless` | boolean | `true` | Run browser headless |
| `pdfOptions` | object | See below | PDF generation options |

### Browser Launch Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | boolean | `true` | Run in headless mode |
| `debug` | boolean | `false` | Show browser for debugging |
| `executablePath` | string | Auto-detected | Path to browser executable |
| `args` | Array\<string\> | Default args | Additional browser arguments |

### Debug Save Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debugDir` | string | Auto-created | Custom debug directory path |
| `suffix` | string | `'.paged'` | HTML filename suffix |
| `format` | string | `'png'` | Screenshot format: 'png' or 'jpeg' |
| `quality` | number | - | JPEG quality (1-100) |
| `fullPage` | boolean | `true` | Capture full scrollable page |

---

## PDF Generation Options

The `pdfOptions` parameter accepts all Puppeteer PDF options:

```javascript
await renderPdf('./document.md', {
  pdfOptions: {
    format: 'Letter',           // Paper format
    printBackground: true,      // Print background graphics
    margin: {                   // Page margins
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      left: '0.5in'
    },
    preferCSSPageSize: true,    // Use @page CSS rules
    landscape: false,           // Orientation
    pageRanges: '',             // Page range (e.g., '1-5, 8, 11-13')
    displayHeaderFooter: false, // Show header/footer
    headerTemplate: '',         // HTML header template
    footerTemplate: '',         // HTML footer template
    scale: 1                    // Scale (0.1 to 2)
  }
});
```

### Default PDF Options

```javascript
{
  path: absolutePdfPath,      // Always set to resolved output path
  format: 'Letter',           // 8.5" x 11"
  printBackground: true,      // Include backgrounds
  margin: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in'
  },
  preferCSSPageSize: true     // Respect @page CSS rules
}
```

### Paper Formats

Supported `format` values:
- `Letter` (8.5" x 11")
- `Legal` (8.5" x 14")
- `Tabloid` (11" x 17")
- `Ledger` (17" x 11")
- `A0` through `A6`
- Custom: Use `width` and `height` instead

### Margin Units

Supported units for margins:
- `px` - pixels
- `in` - inches
- `cm` - centimeters
- `mm` - millimeters

---

## Example Usage

### Basic PDF Rendering

```javascript
import { renderPdf } from '@pagemd/renderer-pdf';

const result = await renderPdf('./document.md');
console.log(`PDF created: ${result.pdfPath} (${result.pages} pages)`);
```

### Custom Profile and Output

```javascript
import { renderPdf } from '@pagemd/renderer-pdf';

const result = await renderPdf('./document.md', {
  profile: 'custom_a4',
  output: './pdfs/output.pdf'
});
```

### Debug Mode with Screenshots

```javascript
import { renderPdf } from '@pagemd/renderer-pdf';

const result = await renderPdf('./document.md', {
  debug: true,
  headless: false  // Show browser window
});

// Debug artifacts saved in ./debug/
// - document.paged.html (HTML before PDF)
// - document.screenshot.png (Visual snapshot)
```

### Custom PDF Options

```javascript
import { renderPdf } from '@pagemd/renderer-pdf';

const result = await renderPdf('./document.md', {
  pdfOptions: {
    format: 'A4',
    landscape: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:10px;">{{metadata.document_id}}</div>',
    footerTemplate: '<div style="font-size:10px;">Page <span class="pageNumber"></span></div>'
  }
});
```

### Manual Browser Control

```javascript
import {
  detectChrome,
  launchBrowser,
  closeBrowser,
  injectPagedJs,
  getPagedJsConfig
} from '@pagemd/renderer-pdf';

// Detect Chrome installation
const chromePath = detectChrome();
console.log('Chrome path:', chromePath);

// Launch browser with custom options
const browser = await launchBrowser({
  headless: true,
  executablePath: chromePath,
  args: ['--disable-gpu']
});

try {
  const page = await browser.newPage();

  // Load and prepare HTML
  const config = getPagedJsConfig(profile, frontmatter);
  const injectedHtml = injectPagedJs(html, {
    pagedConfig: config,
    autoInit: true
  });

  await page.setContent(injectedHtml);

  // Wait for Paged.js
  await page.waitForFunction(
    () => document.body.classList.contains('pagedjs_pages'),
    { timeout: 60000 }
  );

  // Generate PDF
  await page.pdf({
    path: './output.pdf',
    format: 'Letter',
    printBackground: true
  });

} finally {
  await closeBrowser(browser);
}
```

### Debug Artifact Management

```javascript
import {
  createDebugDir,
  shouldSaveDebug,
  saveDebugHtml,
  saveDebugScreenshot,
  cleanupDebugArtifacts
} from '@pagemd/renderer-pdf';

// Check if debug should be enabled
if (shouldSaveDebug(options, profile)) {
  const debugDir = await createDebugDir(outputPath);

  // Save HTML snapshot
  await saveDebugHtml(html, outputPath, {
    debugDir,
    suffix: '.before-pdf'
  });

  // Save screenshot
  await saveDebugScreenshot(page, outputPath, {
    debugDir,
    format: 'jpeg',
    quality: 90
  });
}

// Later, cleanup old artifacts
await cleanupDebugArtifacts(outputPath, {
  removeDir: false  // Keep directory, remove only this document's artifacts
});
```

### Profile-Based Configuration

```javascript
// Profile with Paged.js config
const profile = {
  id: 'custom_letter',
  pagedjs: {
    spread: 'none',
    orient: 'portrait'
  },
  debugArtifacts: true  // Always save debug artifacts
};

// Frontmatter override
const frontmatter = {
  pagedjs: {
    orient: 'landscape'  // Override profile orientation
  }
};

// Config precedence: frontmatter > profile > defaults
const config = getPagedJsConfig(profile, frontmatter);
console.log(config.orient);  // 'landscape'
```
