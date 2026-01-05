/**
 * Tests for main parser module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createParser,
  parse,
  parseFile
} from '../src/index.js';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
  readFile: vi.fn()
}));

describe('createParser', () => {
  it('should create markdown-it instance with default options', () => {
    const md = createParser();

    expect(md).toBeDefined();
    expect(md.render).toBeInstanceOf(Function);
  });

  it('should enable HTML by default', () => {
    const md = createParser();
    const input = '<div>HTML content</div>';
    const html = md.render(input);

    expect(html).toContain('<div>HTML content</div>');
  });

  it('should enable linkify by default', () => {
    const md = createParser();
    const input = 'Visit https://example.com';
    const html = md.render(input);

    expect(html).toContain('<a href="https://example.com"');
  });

  it('should enable typographer by default', () => {
    const md = createParser();
    const input = '"Hello" and (c)';
    const html = md.render(input);

    // Typographer converts (c) to ©
    expect(html).toContain('©');
    // Note: typographer may not convert quotes in all cases
  });

  it('should accept custom options', () => {
    const md = createParser({ html: false });

    const input = '<script>alert("test")</script>';
    const html = md.render(input);

    // HTML should be escaped when html: false
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should register markdown-it-attrs plugin', () => {
    const md = createParser();
    const input = '# Heading {.custom-class #my-id}';
    const html = md.render(input);

    expect(html).toContain('class="custom-class"');
    expect(html).toContain('id="my-id"');
  });

  it('should register custom extensions (callouts)', () => {
    const md = createParser();
    const input = '[[WARNING]] Test warning';
    const html = md.render(input);

    expect(html).toContain('callout-warning');
  });

  it('should register custom extensions (figures)', () => {
    const md = createParser();
    const input = `<!-- ::FIGURE caption="Test" -->
![](img.png)`;
    const html = md.render(input);

    expect(html).toContain('<figure>');
    expect(html).toContain('Figure 1: Test');
  });

  it('should register wikilink plugin', () => {
    const md = createParser();
    const input = '[[Page Name]]';
    const html = md.render(input);

    expect(html).toContain('class="wikilink"');
    expect(html).toContain('href="Page Name"');
  });

  it('should pass wikilink options', () => {
    const md = createParser({
      wikilinks: {
        baseUrl: '/docs',
        linkClass: 'custom-link'
      }
    });

    const input = '[[Page]]';
    const html = md.render(input);

    expect(html).toContain('href="/docs/Page"');
    expect(html).toContain('class="custom-link"');
  });
});

describe('parse', () => {
  it('should parse markdown with frontmatter', () => {
    const markdown = `---
title: Test Document
author: John Doe
---

# Heading

Content here.`;

    const result = parse(markdown);

    expect(result.metadata.title).toBe('Test Document');
    expect(result.metadata.author).toBe('John Doe');
    expect(result.content).toContain('# Heading');
    expect(result.html).toContain('<h1>Heading</h1>');
  });

  it('should normalize metadata by default', () => {
    const markdown = `---
docId: DOC-001
rev: 5
---

Content`;

    const result = parse(markdown);

    expect(result.metadata.document_id).toBe('DOC-001');
    expect(result.metadata.revision).toBe(5);
  });

  it('should skip normalization when option is false', () => {
    const markdown = `---
docId: DOC-001
rev: 5
---

Content`;

    const result = parse(markdown, { normalizeMetadata: false });

    expect(result.metadata.docId).toBe('DOC-001');
    expect(result.metadata.rev).toBe(5);
    expect(result.metadata.document_id).toBeUndefined();
  });

  it('should parse markdown without frontmatter', () => {
    const markdown = '# Just a heading\n\nSome content.';
    const result = parse(markdown);

    expect(result.metadata).toBeDefined();
    expect(result.content).toBe(markdown);
    expect(result.html).toContain('<h1>Just a heading</h1>');
  });

  it('should return raw frontmatter string', () => {
    const markdown = `---
key1: value1
key2: value2
---

Content`;

    const result = parse(markdown);

    expect(result.raw).toContain('key1: value1');
    expect(result.raw).toContain('key2: value2');
  });

  it('should render wikilinks in HTML', () => {
    const markdown = 'See [[Documentation]] for details.';
    const result = parse(markdown);

    expect(result.html).toContain('class="wikilink"');
    expect(result.html).toContain('href="Documentation"');
  });

  it('should render callouts in HTML', () => {
    const markdown = '[[WARNING]] This is important';
    const result = parse(markdown);

    expect(result.html).toContain('callout-warning');
  });

  it('should render figures in HTML', () => {
    const markdown = `<!-- ::FIGURE caption="Test" -->
![](img.png)`;
    const result = parse(markdown);

    expect(result.html).toContain('<figure>');
    expect(result.html).toContain('Figure 1: Test');
  });

  it('should handle complex markdown with all features', () => {
    const markdown = `---
title: Complex Document
revision: 3
tags: [test, markdown]
---

# Main Heading {.main}

Paragraph with [[Internal Link]] and **bold text**.

[[WARNING]] Important note

<!-- ::FIGURE caption="Diagram 1" -->
![Diagram](diagram.png)

## Section

- List item
- ![[embedded.png]]

> Quote with [!DANGER] inline callout`;

    const result = parse(markdown);

    // Metadata
    expect(result.metadata.title).toBe('Complex Document');
    expect(result.metadata.revision).toBe(3);
    expect(result.metadata.tags).toEqual(['test', 'markdown']);

    // HTML
    expect(result.html).toContain('class="main"'); // attrs
    expect(result.html).toContain('class="wikilink"'); // wikilinks
    expect(result.html).toContain('<strong>bold text</strong>'); // markdown
    expect(result.html).toContain('callout-warning'); // callouts
    expect(result.html).toContain('<figure>'); // figures
    expect(result.html).toContain('class="embedded-image"'); // image embeds
    expect(result.html).toContain('callout-danger'); // inline callouts
  });

  it('should preserve content structure', () => {
    const markdown = `---
title: Test
---

Paragraph 1

Paragraph 2

Paragraph 3`;

    const result = parse(markdown);

    expect(result.content).toContain('Paragraph 1');
    expect(result.content).toContain('Paragraph 2');
    expect(result.content).toContain('Paragraph 3');
    expect(result.html).toContain('<p>Paragraph 1</p>');
  });

  it('should handle empty markdown', () => {
    const result = parse('');

    expect(result.content).toBe('');
    expect(result.html).toBe('');
    expect(result.metadata).toBeDefined();
    expect(result.raw).toBe('');
  });

  it('should pass parser options to createParser', () => {
    const markdown = '<div>HTML</div>';
    const result = parse(markdown, { html: false });

    expect(result.html).toContain('&lt;div&gt;');
    expect(result.html).not.toContain('<div>HTML</div>');
  });

  it('should handle wikilink options', () => {
    const markdown = '[[Page]]';
    const result = parse(markdown, {
      wikilinks: {
        baseUrl: '/wiki',
        linkClass: 'internal'
      }
    });

    expect(result.html).toContain('href="/wiki/Page"');
    expect(result.html).toContain('class="internal"');
  });
});

describe('parseFile', () => {
  beforeEach(async () => {
    const { readFile } = await import('fs/promises');
    vi.clearAllMocks();
    readFile.mockReset();
  });

  it('should read and parse file', async () => {
    const { readFile } = await import('fs/promises');
    const testContent = `---
title: File Test
---

# Content from file`;

    readFile.mockResolvedValue(testContent);

    const result = await parseFile('/test/file.md');

    expect(readFile).toHaveBeenCalledWith('/test/file.md', 'utf-8');
    expect(result.metadata.title).toBe('File Test');
    expect(result.html).toContain('<h1>Content from file</h1>');
  });

  it('should pass options to parse', async () => {
    const { readFile } = await import('fs/promises');
    const testContent = `---
docId: DOC-001
---

Content`;

    readFile.mockResolvedValue(testContent);

    const result = await parseFile('/test/file.md', { normalizeMetadata: false });

    expect(result.metadata.docId).toBe('DOC-001');
    expect(result.metadata.document_id).toBeUndefined();
  });

  it('should handle file read errors', async () => {
    const { readFile } = await import('fs/promises');
    readFile.mockRejectedValue(new Error('File not found'));

    await expect(parseFile('/nonexistent.md')).rejects.toThrow('File not found');
  });

  it('should read and parse complex file', async () => {
    const { readFile } = await import('fs/promises');
    const testContent = `---
title: Complex File
revision: 5
tags: [file, test]
---

# Heading

See [[Link]] for details.

[[WARNING]] Important callout

<!-- ::FIGURE caption="Test" -->
![](img.png)`;

    readFile.mockResolvedValue(testContent);

    const result = await parseFile('/test/complex.md');

    expect(result.metadata.title).toBe('Complex File');
    expect(result.metadata.revision).toBe(5);
    expect(result.html).toContain('class="wikilink"');
    expect(result.html).toContain('callout-warning');
    expect(result.html).toContain('<figure>');
  });

  it('should handle empty file', async () => {
    const { readFile } = await import('fs/promises');
    readFile.mockResolvedValue('');

    const result = await parseFile('/test/empty.md');

    expect(result.content).toBe('');
    expect(result.html).toBe('');
    expect(result.metadata).toBeDefined();
  });
});

describe('integration tests', () => {
  it('should handle full document workflow', () => {
    const markdown = `---
document_id: SOP-2024-001
title: Safety Procedures
revision: 3
effective_date: 01/15/2024
owner: John Doe
status: Published
tags: [safety, operations]
---

# Safety Procedures {.document-title}

## Overview

This document outlines [[Standard Operating Procedures]] for safety.

[[WARNING]] All personnel must review this document.

## Procedures

1. First step
2. Second step with [[Equipment Checklist]]
3. Third step

<!-- ::FIGURE caption="Safety Equipment Layout" -->
![Equipment](equipment.png)

## Critical Notes

[!DANGER] Do not bypass safety systems.

> Reference: See [[Safety Manual]] for details.`;

    const result = parse(markdown);

    // Verify metadata normalization
    expect(result.metadata.document_id).toBe('SOP-2024-001');
    expect(result.metadata.title).toBe('Safety Procedures');
    expect(result.metadata.revision).toBe(3);
    expect(result.metadata.effective_date).toBe('01/15/2024');
    expect(result.metadata.owner).toBe('John Doe');
    expect(result.metadata.status).toBe('Published');
    expect(result.metadata.tags).toEqual(['safety', 'operations']);

    // Verify HTML rendering
    const html = result.html;

    // Attrs plugin
    expect(html).toContain('class="document-title"');

    // Wikilinks
    expect(html).toContain('href="Standard Operating Procedures"');
    expect(html).toContain('href="Equipment Checklist"');
    expect(html).toContain('href="Safety Manual"');

    // Block callout
    expect(html).toContain('<div class="callout callout-warning">');
    expect(html).toContain('All personnel must review');

    // Figure
    expect(html).toContain('<figure>');
    expect(html).toContain('Figure 1: Safety Equipment Layout');
    expect(html).toContain('src="equipment.png"');

    // Inline callout
    expect(html).toContain('callout-danger');
    expect(html).toContain('callout-inline');

    // Standard markdown
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<ol>');
    expect(html).toContain('<blockquote>');
  });

  it('should maintain figure numbering across multiple figures', () => {
    const markdown = `<!-- ::FIGURE caption="First" -->
![](img1.png)

Some text

<!-- ::FIGURE caption="Second" -->
![](img2.png)

More text

<!-- ::FIGURE caption="Third" -->
![](img3.png)`;

    const result = parse(markdown);

    expect(result.html).toContain('Figure 1: First');
    expect(result.html).toContain('Figure 2: Second');
    expect(result.html).toContain('Figure 3: Third');
  });

  it('should handle nested markdown in callouts', () => {
    const markdown = `[[WARNING]]
This has **bold**, *italic*, and [[links]].

- List item 1
- List item 2

[[/WARNING]]`;

    const result = parse(markdown);

    expect(result.html).toContain('callout-warning');
    expect(result.html).toContain('<strong>bold</strong>');
    expect(result.html).toContain('<em>italic</em>');
    expect(result.html).toContain('class="wikilink"');
  });
});
