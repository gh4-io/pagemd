# @pagemd/exporters API

Export orchestration for converting markdown to HTML, PDF, PNG, and JPEG formats.

## Installation

```bash
npm install @pagemd/exporters
```

## Main Functions

### exportDocument(markdownPath, options)

Export markdown to all enabled output formats.

```javascript
import { exportDocument } from '@pagemd/exporters';

const result = await exportDocument('./document.md', {
  profile: 'standard_letter',
  formats: ['pdf', 'html']
});

console.log(result.outputs);   // [{ format: 'pdf', path: '...', size: 1234 }, ...]
console.log(result.metadata);  // Extracted frontmatter
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `options` (object):
  - `profile` (string): Profile ID (default: 'standard_letter')
  - `formats` (string[]): Formats to output (overrides profile modes)
  - `outputDir` (string): Output directory override
  - `debug` (boolean): Enable debug mode (default: false)
  - `modes` (object): Mode overrides per format

**Returns:** `Promise<{ outputs: Array, metadata: object }>`

**Output Object Structure:**
- `format` (string): Output format name
- `path` (string): Absolute path to generated file
- `size` (number): File size in bytes
- `pages` (number): Page count (PDF only)

**Pipeline Steps:**
1. Validate markdown path and load profile
2. Determine enabled formats via mode resolution
3. Process each format (HTML → PDF → images)
4. Reuse browser instance for multiple image formats
5. Return array of all generated outputs

### exportToHtml(markdownPath, options)

Export markdown to HTML only.

```javascript
import { exportToHtml } from '@pagemd/exporters';

const result = await exportToHtml('./document.md', {
  profile: 'standard_letter',
  outputDir: './dist'
});

console.log(result.path);      // '/path/to/document.html'
console.log(result.size);      // 5432
console.log(result.metadata);  // { title: '...', ... }
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `options` (object):
  - `profile` (string): Profile ID (default: 'standard_letter')
  - `outputDir` (string): Output directory override
  - `debug` (boolean): Enable debug mode

**Returns:** `Promise<{ format: 'html', path: string, size: number, metadata: object }>`

### exportToPdf(markdownPath, options)

Export markdown to PDF only.

```javascript
import { exportToPdf } from '@pagemd/exporters';

const result = await exportToPdf('./document.md', {
  profile: 'standard_letter',
  pdfOptions: {
    printBackground: true,
    preferCSSPageSize: true
  }
});

console.log(result.path);   // '/path/to/document.pdf'
console.log(result.pages);  // 3
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `options` (object):
  - `profile` (string): Profile ID (default: 'standard_letter')
  - `outputDir` (string): Output directory override
  - `debug` (boolean): Enable debug mode
  - `pdfOptions` (object): Additional PDF generation options

**Returns:** `Promise<{ format: 'pdf', path: string, size: number, pages: number, metadata: object }>`

### exportToImage(markdownPath, format, options)

Export markdown to image (PNG or JPEG).

```javascript
import { exportToImage } from '@pagemd/exporters';

const result = await exportToImage('./document.md', 'png', {
  profile: 'standard_letter',
  screenshotOptions: {
    fullPage: true,
    omitBackground: false
  }
});

console.log(result.path);    // '/path/to/document.png'
console.log(result.format);  // 'png'
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `format` (string): Image format ('png' or 'jpeg')
- `options` (object):
  - `profile` (string): Profile ID (default: 'standard_letter')
  - `outputDir` (string): Output directory override
  - `debug` (boolean): Enable debug mode
  - `browser` (object): Existing browser instance to reuse
  - `screenshotOptions` (object): Screenshot options override

**Returns:** `Promise<{ format: string, path: string, size: number, metadata: object }>`

---

## Output Modes

### OUTPUT_MODES

Output mode constants controlling format generation.

```javascript
import { OUTPUT_MODES } from '@pagemd/exporters';

console.log(OUTPUT_MODES.ACTIVE_ONLY);  // 'ACTIVE_ONLY'
console.log(OUTPUT_MODES.ALWAYS);       // 'ALWAYS'
console.log(OUTPUT_MODES.DISABLED);     // 'DISABLED'
```

**Modes:**
- `ACTIVE_ONLY`: Only output when explicitly requested via `formats` option
- `ALWAYS`: Always generate this output type
- `DISABLED`: Never generate this output type

**Default Modes:**
- `pdf`: `ACTIVE_ONLY`
- `html`: `DISABLED`
- `png`: `DISABLED`
- `jpeg`: `DISABLED`

### getOutputMode(format, profile, options)

Get output mode for a specific format.

```javascript
import { getOutputMode, OUTPUT_MODES } from '@pagemd/exporters';

const mode = getOutputMode('pdf', profile, {
  modes: { pdf: OUTPUT_MODES.ALWAYS }
});
// Returns: 'ALWAYS'
```

**Parameters:**
- `format` (string): Format name (html, pdf, png, jpeg)
- `profile` (object): Profile configuration
- `options` (object):
  - `modes` (object): Mode overrides per format

**Returns:** Output mode string

**Resolution Order:**
1. Options override (`options.modes[format]`)
2. Profile configuration (`profile.outputs[format].mode`)
3. Default mode

### shouldOutput(format, profile, options)

Determine if a format should be output.

```javascript
import { shouldOutput } from '@pagemd/exporters';

const should = shouldOutput('pdf', profile, {
  formats: ['pdf', 'html']
});
// Returns: true (if mode is ACTIVE_ONLY and 'pdf' is requested)
```

**Parameters:**
- `format` (string): Format name
- `profile` (object): Profile configuration
- `options` (object):
  - `formats` (string[]): Explicitly requested formats

**Returns:** Boolean

**Logic:**
- `ALWAYS`: Returns `true`
- `DISABLED`: Returns `false`
- `ACTIVE_ONLY`: Returns `true` if format in `options.formats`

### getEnabledFormats(profile, options)

Get list of formats that should be output.

```javascript
import { getEnabledFormats } from '@pagemd/exporters';

const formats = getEnabledFormats(profile, {
  formats: ['pdf', 'html'],
  modes: { png: OUTPUT_MODES.ALWAYS }
});
// Returns: ['pdf', 'html', 'png']
```

**Parameters:**
- `profile` (object): Profile configuration
- `options` (object):
  - `formats` (string[]): Explicitly requested formats
  - `modes` (object): Mode overrides

**Returns:** Array of format names

### getOutputDir(markdownPath, profile, options)

Get output directory for generated files.

```javascript
import { getOutputDir } from '@pagemd/exporters';

const dir = getOutputDir('/path/to/doc.md', profile, {
  outputDir: './dist'
});
// Returns: '/absolute/path/to/dist'
```

**Parameters:**
- `markdownPath` (string): Absolute path to markdown file
- `profile` (object): Profile configuration
- `options` (object):
  - `outputDir` (string): Output directory override

**Returns:** Absolute path to output directory

**Resolution Order:**
1. Options override (`options.outputDir`)
2. Profile configuration (`profile.outputs.directory`)
3. Markdown file directory

---

## Filename Functions

### FILENAME_TOKENS

Supported filename tokens for pattern expansion.

```javascript
import { FILENAME_TOKENS } from '@pagemd/exporters';

console.log(FILENAME_TOKENS.BASENAME);      // '{basename}'
console.log(FILENAME_TOKENS.DOCUMENT_ID);   // '{document_id}'
console.log(FILENAME_TOKENS.REVISION);      // '{revision}'
console.log(FILENAME_TOKENS.TITLE);         // '{title}'
console.log(FILENAME_TOKENS.STATUS);        // '{status}'
console.log(FILENAME_TOKENS.DATE);          // '{date}'
console.log(FILENAME_TOKENS.TIMESTAMP);     // '{timestamp}'
```

**Available Tokens:**
- `{basename}`: Original filename without extension
- `{document_id}`: Document ID from metadata
- `{revision}`: Revision number from metadata
- `{title}`: Document title from metadata
- `{status}`: Document status from metadata
- `{date}`: Current date (YYYY-MM-DD)
- `{timestamp}`: Current timestamp (YYYYMMDDHHmmss)

### expandFilename(pattern, context)

Expand tokens in filename pattern.

```javascript
import { expandFilename } from '@pagemd/exporters';

const filename = expandFilename('{document_id}-rev{revision}.pdf', {
  basename: 'my-doc',
  metadata: {
    document_id: 'SOP-001',
    revision: '2.0'
  },
  format: 'pdf'
});
// Returns: 'SOP-001-rev2.0.pdf'
```

**Parameters:**
- `pattern` (string): Filename pattern with `{tokens}`
- `context` (object):
  - `basename` (string): Original filename without extension
  - `metadata` (object): Document metadata
  - `format` (string): Output format

**Returns:** Expanded and sanitized filename

**Features:**
- Replaces all supported tokens with actual values
- Removes unreplaced tokens
- Sanitizes invalid filesystem characters
- Collapses multiple underscores/dashes

### sanitizeFilename(filename)

Sanitize filename by removing invalid characters.

```javascript
import { sanitizeFilename } from '@pagemd/exporters';

const safe = sanitizeFilename('My/Document: "Test" <v2>.pdf');
// Returns: 'My_Document_Test_v2_.pdf'
```

**Parameters:**
- `filename` (string): Filename to sanitize

**Returns:** Sanitized filename

**Sanitization Rules:**
- Replace invalid chars (`/\:*?"<>|`) with underscore
- Trim whitespace
- Collapse multiple underscores/dashes
- Remove leading/trailing underscores/dashes
- Return 'untitled' if empty after sanitization

### getOutputFilename(markdownPath, format, profile, metadata)

Get output filename for a given format.

```javascript
import { getOutputFilename } from '@pagemd/exporters';

const filename = getOutputFilename(
  '/path/to/document.md',
  'pdf',
  profile,
  { document_id: 'DOC-001' }
);
// Returns: 'DOC-001.pdf' (if profile pattern is '{document_id}.pdf')
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `format` (string): Output format (html, pdf, png, jpeg)
- `profile` (object): Profile configuration
- `metadata` (object): Document metadata

**Returns:** Output filename (basename only, not full path)

**Default Patterns:**
- `html`: `{basename}.html`
- `pdf`: `{basename}.pdf`
- `png`: `{basename}.png`
- `jpeg`: `{basename}.jpg`

**Profile Override:**
Set custom pattern in `profile.outputs[format].filename`

### getOutputPath(markdownPath, format, profile, metadata, options)

Get full output path for a given format.

```javascript
import { getOutputPath } from '@pagemd/exporters';

const fullPath = getOutputPath(
  '/path/to/document.md',
  'pdf',
  profile,
  { document_id: 'DOC-001' },
  { outputDir: './dist' }
);
// Returns: '/absolute/path/to/dist/DOC-001.pdf'
```

**Parameters:**
- `markdownPath` (string): Path to markdown file
- `format` (string): Output format
- `profile` (object): Profile configuration
- `metadata` (object): Document metadata
- `options` (object):
  - `outputDir` (string): Output directory override

**Returns:** Full absolute path to output file

**Directory Resolution:**
1. Options override (`options.outputDir`)
2. Profile per-format override (`profile.outputs[format].outputDir`)
3. Markdown file directory

---

## Screenshot Functions

### captureScreenshot(page, options)

Capture screenshot from Puppeteer page.

```javascript
import { captureScreenshot } from '@pagemd/exporters';

const buffer = await captureScreenshot(page, {
  format: 'png',
  fullPage: true,
  omitBackground: false
});
```

**Parameters:**
- `page` (object): Puppeteer page instance
- `options` (object):
  - `format` (string): Output format ('png' or 'jpeg', default: 'png')
  - `quality` (number): JPEG quality 0-100 (ignored for PNG, default: 90)
  - `fullPage` (boolean): Capture full page or viewport only (default: true)
  - `omitBackground` (boolean): Transparent background for PNG (default: false)

**Returns:** `Promise<Buffer>` - Screenshot buffer

### saveScreenshot(page, outputPath, options)

Capture and save screenshot to file.

```javascript
import { saveScreenshot } from '@pagemd/exporters';

const result = await saveScreenshot(page, './output.png', {
  fullPage: true,
  quality: 95
});

console.log(result.path);    // '/absolute/path/to/output.png'
console.log(result.size);    // 123456
console.log(result.format);  // 'png'
```

**Parameters:**
- `page` (object): Puppeteer page instance
- `outputPath` (string): Output file path
- `options` (object): Screenshot options (see captureScreenshot)

**Returns:** `Promise<{ path: string, format: string, size: number }>`

**Features:**
- Auto-detects format from file extension if not specified
- Creates output directory if needed
- Normalizes 'jpg' to 'jpeg'

### capturePageScreenshots(page, outputDir, basename, options)

Capture each page of document separately.

```javascript
import { capturePageScreenshots } from '@pagemd/exporters';

const results = await capturePageScreenshots(
  page,
  './output',
  'document',
  {
    format: 'png',
    pageCount: 5
  }
);

// Returns:
// [
//   { path: './output/document-page-1.png', page: 1, format: 'png' },
//   { path: './output/document-page-2.png', page: 2, format: 'png' },
//   ...
// ]
```

**Parameters:**
- `page` (object): Puppeteer page instance
- `outputDir` (string): Output directory for screenshots
- `basename` (string): Base filename (without extension)
- `options` (object):
  - `format` (string): Output format ('png' or 'jpeg', default: 'png')
  - `pageCount` (number): Total page count (auto-detect if not provided)
  - Other screenshot options (quality, fullPage, etc.)

**Returns:** `Promise<Array<{ path: string, page: number, format: string }>>`

**Auto-detection:**
- Attempts to get page count from Paged.js (`window.PagedPolyfill.chunker.total`)
- Falls back to counting `.pagedjs_page` elements
- Defaults to 1 page if detection fails

### getScreenshotOptions(format, profile)

Get screenshot options from profile configuration.

```javascript
import { getScreenshotOptions } from '@pagemd/exporters';

const options = getScreenshotOptions('jpeg', profile);
// Returns: { format: 'jpeg', fullPage: true, omitBackground: false, quality: 90 }
```

**Parameters:**
- `format` (string): Output format ('png' or 'jpeg')
- `profile` (object): Profile configuration

**Returns:** Merged screenshot options with defaults

**Profile Configuration:**
Set in `profile.outputs[format]`:
- `fullPage` (boolean)
- `omitBackground` (boolean)
- `quality` (number, JPEG only)

---

## Options Reference

### exportDocument Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `profile` | string | `'standard_letter'` | Profile ID to use |
| `formats` | string[] | `null` | Formats to output (overrides profile modes) |
| `outputDir` | string | `null` | Output directory override |
| `debug` | boolean | `false` | Enable debug logging |
| `modes` | object | `{}` | Mode overrides per format |
| `pdfOptions` | object | `{}` | Additional PDF generation options |
| `screenshotOptions` | object | `{}` | Screenshot options override |

### Mode Override Example

```javascript
await exportDocument('./doc.md', {
  modes: {
    pdf: OUTPUT_MODES.ALWAYS,
    html: OUTPUT_MODES.ALWAYS,
    png: OUTPUT_MODES.DISABLED
  }
});
```

### Profile Output Configuration

```json
{
  "outputs": {
    "directory": "./dist",
    "pdf": {
      "mode": "ALWAYS",
      "filename": "{document_id}-rev{revision}.pdf",
      "outputDir": "./pdf"
    },
    "html": {
      "mode": "ACTIVE_ONLY",
      "filename": "{basename}.html"
    },
    "png": {
      "mode": "DISABLED",
      "fullPage": true,
      "omitBackground": false
    },
    "jpeg": {
      "mode": "DISABLED",
      "quality": 90,
      "fullPage": true
    }
  }
}
```

---

## Example Usage

### Basic Export

```javascript
import { exportDocument } from '@pagemd/exporters';

// Export to PDF only (default ACTIVE_ONLY mode)
const result = await exportDocument('./document.md', {
  formats: ['pdf']
});

console.log(result.outputs[0].path);  // PDF file path
```

### Multiple Formats

```javascript
// Export to PDF, HTML, and PNG
const result = await exportDocument('./document.md', {
  profile: 'standard_letter',
  formats: ['pdf', 'html', 'png'],
  outputDir: './dist'
});

result.outputs.forEach(output => {
  console.log(`${output.format}: ${output.path} (${output.size} bytes)`);
});
```

### Custom Filename Pattern

```javascript
// Use custom filename pattern from profile
const profile = {
  outputs: {
    pdf: {
      filename: '{document_id}-{date}.pdf'
    }
  }
};

const result = await exportToPdf('./doc.md', {
  profile: 'custom_profile'
});
// Output: SOP-001-2025-12-28.pdf
```

### Reusing Browser for Multiple Images

```javascript
import { launchBrowser, closeBrowser } from '@pagemd/renderer-pdf';
import { exportToImage } from '@pagemd/exporters';

const browser = await launchBrowser({ headless: true });

// Export PNG and JPEG reusing same browser
const png = await exportToImage('./doc.md', 'png', { browser });
const jpeg = await exportToImage('./doc.md', 'jpeg', { browser });

await closeBrowser(browser);
```

### Always Output Multiple Formats

```javascript
// Set modes to ALWAYS for automatic export
await exportDocument('./doc.md', {
  modes: {
    pdf: OUTPUT_MODES.ALWAYS,
    html: OUTPUT_MODES.ALWAYS
  }
});
// Generates both PDF and HTML without specifying formats
```
