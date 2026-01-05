# filename.js

Tokenized filename expansion and sanitization for PageMD outputs.

## Exports

### `FILENAME_TOKENS`

Constant object containing supported filename tokens:

```javascript
{
  BASENAME: '{basename}',      // Original filename without extension
  DOCUMENT_ID: '{document_id}',
  REVISION: '{revision}',
  TITLE: '{title}',
  STATUS: '{status}',
  DATE: '{date}',              // YYYY-MM-DD format
  TIMESTAMP: '{timestamp}'     // YYYYMMDDHHmmss
}
```

### `sanitizeFilename(filename)`

Remove/replace invalid filesystem characters.

**Parameters:**
- `filename` (string): Filename to sanitize

**Returns:** (string) Sanitized filename

**Behavior:**
- Replaces `/ \ : * ? " < > |` with `_`
- Trims whitespace
- Collapses multiple underscores/dashes
- Returns `'untitled'` if empty after sanitization

**Example:**
```javascript
sanitizeFilename('my/bad:file*name?.txt')
// => 'my_bad_file_name_.txt'
```

### `expandFilename(pattern, context)`

Expand tokens in filename pattern.

**Parameters:**
- `pattern` (string): Filename pattern with `{tokens}`
- `context` (object):
  - `basename` (string): Original filename without extension
  - `metadata` (object): Metadata object
  - `format` (string): Output format (html, pdf, png, jpeg)

**Returns:** (string) Expanded and sanitized filename

**Example:**
```javascript
expandFilename('{document_id}_rev{revision}_{basename}', {
  basename: 'test-doc',
  metadata: { document_id: 'SOP-001', revision: 3 },
  format: 'pdf'
})
// => 'SOP-001_rev3_test-doc'
```

### `getOutputFilename(markdownPath, format, profile, metadata)`

Get output filename for a given format.

**Parameters:**
- `markdownPath` (string): Path to source markdown file
- `format` (string): Output format (html, pdf, png, jpeg)
- `profile` (object): Profile configuration
- `metadata` (object): Document metadata (optional)

**Returns:** (string) Output filename (basename only)

**Default Patterns:**
- `html`: `{basename}.html`
- `pdf`: `{basename}.pdf`
- `png`: `{basename}.png`
- `jpeg`: `{basename}.jpg`

**Example:**
```javascript
const profile = {
  outputs: {
    pdf: {
      filename: '{document_id}_v{revision}.pdf'
    }
  }
};

getOutputFilename('/docs/my-doc.md', 'pdf', profile, {
  document_id: 'WP-123',
  revision: 2
})
// => 'WP-123_v2.pdf'
```

### `getOutputPath(markdownPath, format, profile, metadata, options)`

Get full output path for a given format.

**Parameters:**
- `markdownPath` (string): Path to source markdown file
- `format` (string): Output format
- `profile` (object): Profile configuration
- `metadata` (object): Document metadata (optional)
- `options` (object): Additional options (optional)
  - `outputDir` (string): Override output directory

**Returns:** (string) Full absolute path to output file

**Default Behavior:**
- Uses `options.outputDir` if provided
- Falls back to `profile.outputs[format].outputDir`
- Defaults to markdown file's directory

**Example:**
```javascript
getOutputPath('/docs/sample.md', 'pdf', profile, metadata, {
  outputDir: '/output'
})
// => '/output/sample.pdf'
```

## Token Replacement Rules

1. Tokens are case-sensitive: `{basename}` not `{BASENAME}`
2. Missing metadata values result in token removal
3. Date tokens use current time if not in metadata
4. All output is sanitized for filesystem safety

## Logging

Uses `createLogger('exporter')` from `@pagemd/core`:

- **TRACE**: Sanitization operations
- **DEBUG**: Token expansion, unreplaced tokens
- **INFO**: Filename/path resolution
- **WARN**: Invalid inputs, empty results
- **ERROR**: Missing required parameters
