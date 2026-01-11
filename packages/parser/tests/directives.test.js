/**
 * Tests for PageMD directives plugin and extended syntax
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import { directivesPlugin } from '../src/directives.js';
import { figurePlugin } from '../src/extensions.js';
import { parse, createParser } from '../src/index.js';

describe('directivesPlugin', () => {
  let md;

  beforeEach(() => {
    md = new MarkdownIt({ html: true });
    md.use(directivesPlugin);
  });

  describe('PAGEBREAK directive', () => {
    it('should render PAGEBREAK as break-page div', () => {
      const input = '<!-- ::PAGEBREAK -->';
      const html = md.render(input);

      expect(html).toContain('<div class="break-page"></div>');
    });

    it('should handle PAGEBREAK with whitespace variations', () => {
      const inputs = [
        '<!--::PAGEBREAK-->',
        '<!--  ::PAGEBREAK  -->',
        '<!-- ::PAGEBREAK -->'
      ];

      for (const input of inputs) {
        const html = md.render(input);
        expect(html).toContain('<div class="break-page"></div>');
      }
    });

    it('should render multiple PAGEBREAK directives', () => {
      const input = `Content before

<!-- ::PAGEBREAK -->

Middle content

<!-- ::PAGEBREAK -->

Content after`;

      const html = md.render(input);
      const matches = html.match(/<div class="break-page"><\/div>/g);
      expect(matches).toHaveLength(2);
    });
  });

  describe('TOC directive', () => {
    it('should render TOC as placeholder div', () => {
      const input = '<!-- ::TOC -->';
      const html = md.render(input);

      expect(html).toContain('<div class="toc-placeholder"');
      expect(html).toContain('data-levels="3"');
    });

    it('should accept custom levels parameter', () => {
      const input = '<!-- ::TOC levels=5 -->';
      const html = md.render(input);

      expect(html).toContain('data-levels="5"');
    });

    it('should handle levels with quotes', () => {
      const input = '<!-- ::TOC levels="2" -->';
      const html = md.render(input);

      expect(html).toContain('data-levels="2"');
    });
  });

  describe('SECTION_START/SECTION_END directives', () => {
    it('should render SECTION_START with class', () => {
      const input = '<!-- ::SECTION_START class="sidebar" -->';
      const html = md.render(input);

      expect(html).toContain('<div class="sidebar">');
    });

    it('should render SECTION_END as closing div', () => {
      const input = '<!-- ::SECTION_END -->';
      const html = md.render(input);

      expect(html).toContain('</div>');
    });

    it('should handle SECTION with id and class', () => {
      const input = '<!-- ::SECTION_START class="cols-2" id="two-col" -->';
      const html = md.render(input);

      expect(html).toContain('id="two-col"');
      expect(html).toContain('class="cols-2"');
    });

    it('should render complete section with content', () => {
      const input = `<!-- ::SECTION_START class="note" -->

This is section content.

<!-- ::SECTION_END -->`;

      const html = md.render(input);

      expect(html).toContain('<div class="note">');
      expect(html).toContain('This is section content.');
      expect(html).toContain('</div>');
    });
  });

  describe('LAYOUT directive', () => {
    it('should render first LAYOUT without closing div', () => {
      const input = '<!-- ::LAYOUT(landscape) -->';
      const html = md.render(input);

      // First LAYOUT only opens (no previous section to close)
      expect(html).not.toContain('</div>');
      expect(html).toContain('<div class="page-landscape">');
    });

    it('should render LAYOUT with name attribute', () => {
      const input = '<!-- ::LAYOUT name="portrait" -->';
      const html = md.render(input);

      expect(html).toContain('<div class="page-portrait">');
    });

    it('should close previous layout when switching', () => {
      const input = `<!-- ::LAYOUT(landscape) -->

Content here

<!-- ::LAYOUT(default) -->`;
      const html = md.render(input);

      // First LAYOUT opens
      expect(html).toContain('<div class="page-landscape">');
      // Second LAYOUT closes previous and opens new
      expect(html).toContain('</div>');
      expect(html).toContain('<div class="page-default">');
    });
  });

  describe('COVER_START/COVER_END directives', () => {
    it('should render COVER_START as cover div', () => {
      const input = '<!-- ::COVER_START -->';
      const html = md.render(input);

      expect(html).toContain('<div class="cover">');
    });

    it('should render COVER_END as closing div', () => {
      const input = '<!-- ::COVER_END -->';
      const html = md.render(input);

      expect(html).toContain('</div>');
    });

    it('should render complete cover section', () => {
      const input = `<!-- ::COVER_START -->

# Document Title

**Author Name**

<!-- ::COVER_END -->`;

      const html = md.render(input);

      expect(html).toContain('<div class="cover">');
      expect(html).toContain('Document Title');
      expect(html).toContain('Author Name');
      expect(html).toContain('</div>');
    });
  });

  describe('INCLUDE directive fallback', () => {
    it('should render INCLUDE placeholder when include plugin not loaded', () => {
      const input = '<!-- ::INCLUDE path="chapter1.md" -->';
      const html = md.render(input);

      expect(html).toContain('include-placeholder');
      expect(html).toContain('data-path="chapter1.md"');
    });
  });

  describe('unknown directives', () => {
    it('should output comment for unknown directives', () => {
      const input = '<!-- ::UNKNOWN_DIRECTIVE -->';
      const html = md.render(input);

      expect(html).toContain('Unknown directive: UNKNOWN_DIRECTIVE');
    });
  });

  describe('edge cases', () => {
    it('should not match regular HTML comments', () => {
      const input = '<!-- This is a regular comment -->';
      const html = md.render(input);

      // Regular comments should pass through unchanged
      expect(html).not.toContain('break-page');
      expect(html).not.toContain('toc-placeholder');
    });

    it('should handle directives mixed with other content', () => {
      const input = `# Heading

<!-- ::PAGEBREAK -->

Paragraph text

<!-- ::TOC -->

More content`;

      const html = md.render(input);

      expect(html).toContain('Heading');
      expect(html).toContain('<div class="break-page">');
      expect(html).toContain('toc-placeholder');
      expect(html).toContain('More content');
    });
  });

  describe('INDEX directive', () => {
    it('should render INDEX with term as invisible marker', () => {
      const input = '<!-- ::INDEX term="aviation fuel" -->';
      const html = md.render(input);

      expect(html).toContain('<span class="index-marker"');
      expect(html).toContain('data-term="aviation fuel"');
      expect(html).toContain('data-sort="aviation fuel"');
    });

    it('should use custom sort key when provided', () => {
      const input = '<!-- ::INDEX term="jet fuel" sort="fuel, jet" -->';
      const html = md.render(input);

      expect(html).toContain('data-term="jet fuel"');
      expect(html).toContain('data-sort="fuel, jet"');
    });

    it('should render INDEX without term as placeholder', () => {
      const input = '<!-- ::INDEX -->';
      const html = md.render(input);

      expect(html).toContain('<div class="index-placeholder"></div>');
    });

    it('should escape HTML in term attribute', () => {
      const input = '<!-- ::INDEX term="<script>alert(1)</script>" -->';
      const html = md.render(input);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should handle multiple index terms in document', () => {
      const input = `<!-- ::INDEX term="aviation" -->

<!-- ::INDEX term="fuel" -->

<!-- ::INDEX -->`;

      const html = md.render(input);

      const markers = html.match(/index-marker/g) || [];
      expect(markers.length).toBe(2);
      expect(html).toContain('index-placeholder');
    });

    it('should handle inline INDEX markers within text', () => {
      const input = 'This chapter covers <!-- ::INDEX term="aviation" -->aviation topics and <!-- ::INDEX term="fuel" -->fuel management.';
      const html = md.render(input);

      expect(html).toContain('<p>This chapter covers');
      expect(html).toContain('<span class="index-marker" data-term="aviation"');
      expect(html).toContain('aviation topics');
      expect(html).toContain('<span class="index-marker" data-term="fuel"');
      expect(html).toContain('fuel management.</p>');
      const markers = html.match(/index-marker/g) || [];
      expect(markers.length).toBe(2);
    });

    it('should handle INDEX markers in list items', () => {
      const input = `- <!-- ::INDEX term="turbine" -->Turbine blades
- <!-- ::INDEX term="compressor" sort="compressor stage" -->Compressor stages
- Regular item`;
      const html = md.render(input);

      expect(html).toContain('<span class="index-marker" data-term="turbine"');
      expect(html).toContain('<span class="index-marker" data-term="compressor"');
      expect(html).toContain('data-sort="compressor stage"');
      expect(html).toContain('Turbine blades');
      expect(html).toContain('Compressor stages');
      const markers = html.match(/index-marker/g) || [];
      expect(markers.length).toBe(2);
    });
  });
});

describe('enhanced figurePlugin', () => {
  let md;

  beforeEach(() => {
    md = new MarkdownIt();
    md.use(figurePlugin);
  });

  describe('src attribute', () => {
    it('should render figure with src attribute', () => {
      const input = '<!-- ::FIGURE src="diagram.png" caption="Test diagram" -->';
      const html = md.render(input);

      expect(html).toContain('<figure>');
      expect(html).toContain('<img src="diagram.png" alt="Test diagram">');
      expect(html).toContain('Figure');
      expect(html).toContain('Test diagram');
    });

    it('should not require image on next line when src provided', () => {
      const input = `<!-- ::FIGURE src="image.png" caption="Standalone" -->

Other content`;

      const html = md.render(input);

      expect(html).toContain('<img src="image.png"');
      expect(html).toContain('Other content');
    });
  });

  describe('id attribute', () => {
    it('should render figure with id', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" id="fig-1" -->';
      const html = md.render(input);

      expect(html).toContain('<figure id="fig-1"');
    });

    it('should escape HTML in id', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" id="fig<script>" -->';
      const html = md.render(input);

      expect(html).not.toContain('<script>');
    });
  });

  describe('width attribute', () => {
    it('should render figure with width class', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" width="full" -->';
      const html = md.render(input);

      expect(html).toContain('class="width-full"');
    });

    it('should handle half width', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" width="half" -->';
      const html = md.render(input);

      expect(html).toContain('class="width-half"');
    });
  });

  describe('all attributes combined', () => {
    it('should render figure with all attributes', () => {
      const input = '<!-- ::FIGURE src="arch.png" caption="System Architecture" id="fig-arch" width="full" -->';
      const html = md.render(input);

      expect(html).toContain('<figure id="fig-arch" class="width-full">');
      expect(html).toContain('<img src="arch.png" alt="System Architecture">');
      expect(html).toContain('<figcaption>Figure <span class="fig-num">1</span>: System Architecture</figcaption>');
    });
  });

  describe('backward compatibility', () => {
    it('should still work with caption-only and image on next line', () => {
      const input = `<!-- ::FIGURE caption="Legacy format" -->
![](legacy.png)`;

      const html = md.render(input);

      expect(html).toContain('<figure>');
      expect(html).toContain('Figure');
      expect(html).toContain('Legacy format');
    });
  });
});

describe('GFM Alerts integration', () => {
  let md;

  beforeEach(() => {
    md = createParser();
  });

  it('should render NOTE alert', () => {
    const input = `> [!NOTE]
> This is a note.`;

    const html = md.render(input);

    // markdown-it-github-alerts adds class containing alert type
    expect(html.toLowerCase()).toContain('note');
  });

  it('should render WARNING alert', () => {
    const input = `> [!WARNING]
> This is a warning.`;

    const html = md.render(input);

    expect(html.toLowerCase()).toContain('warning');
  });

  it('should render TIP alert', () => {
    const input = `> [!TIP]
> This is a tip.`;

    const html = md.render(input);

    expect(html.toLowerCase()).toContain('tip');
  });

  it('should render IMPORTANT alert', () => {
    const input = `> [!IMPORTANT]
> This is important.`;

    const html = md.render(input);

    expect(html.toLowerCase()).toContain('important');
  });

  it('should render CAUTION alert', () => {
    const input = `> [!CAUTION]
> Exercise caution.`;

    const html = md.render(input);

    expect(html.toLowerCase()).toContain('caution');
  });
});

describe('parse() with extended syntax', () => {
  it('should parse markdown with directives', () => {
    const markdown = `---
title: Test Document
---

# Header {.custom-class}

<!-- ::PAGEBREAK -->

> [!NOTE]
> This is a note.

<!-- ::FIGURE src="test.png" caption="Test Figure" id="fig-1" -->`;

    const { html, metadata } = parse(markdown);

    expect(metadata.title).toBe('Test Document');
    expect(html).toContain('<div class="break-page">');
    expect(html.toLowerCase()).toContain('note');
    expect(html).toContain('<figure id="fig-1"');
    expect(html).toContain('<img src="test.png"');
  });

  it('should handle attributes syntax', () => {
    const markdown = `# Title {#main-title .hero}

Paragraph with {.highlight} class.`;

    const { html } = parse(markdown);

    // markdown-it-attrs should add the id and class
    expect(html).toContain('id="main-title"');
    expect(html).toContain('class="hero"');
  });
});

describe('Extended Syntax Integration', () => {
  it('should parse combined extended markdown syntax (prompt verification)', () => {
    // This test exactly matches the verification case from implement_extended_syntax.md
    const markdown = `---
title: Extended Syntax Test
---

# Header {.custom-class}

> [!NOTE]
> This is a note.

<!-- ::PAGEBREAK -->

<!-- ::FIGURE src="test.png" caption="Test" -->`;

    const { html, metadata } = parse(markdown);

    // Frontmatter parsed
    expect(metadata.title).toBe('Extended Syntax Test');

    // markdown-it-attrs: class applied to heading
    expect(html).toContain('class="custom-class"');

    // GFM alerts: markdown-alert structure
    expect(html).toContain('markdown-alert');
    expect(html).toContain('markdown-alert-note');

    // PAGEBREAK directive
    expect(html).toContain('<div class="break-page"></div>');

    // FIGURE directive with src
    expect(html).toContain('<figure');
    expect(html).toContain('<img src="test.png"');
    expect(html).toContain('<figcaption>');
    expect(html).toContain('Test');
  });

  it('should handle all GFM alert types', () => {
    const types = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];
    for (const type of types) {
      const input = `> [!${type}]\n> Content`;
      const { html } = parse(input);
      expect(html).toContain(`markdown-alert-${type.toLowerCase()}`);
    }
  });

  it('should handle nested directives within sections', () => {
    const input = `<!-- ::SECTION_START class="outer" -->

<!-- ::FIGURE src="inner.png" caption="Nested figure" -->

<!-- ::PAGEBREAK -->

<!-- ::SECTION_END -->`;

    const { html } = parse(input);
    expect(html).toContain('<div class="outer">');
    expect(html).toContain('<figure');
    expect(html).toContain('<div class="break-page">');
    expect(html).toContain('</div>');
  });

  it('should handle complex document structure', () => {
    const markdown = `---
title: Complex Document
author: Test Author
---

<!-- ::COVER_START -->

# Document Title {.cover-title}

**By Test Author**

<!-- ::COVER_END -->

<!-- ::TOC levels=2 -->

## Chapter 1 {#ch1}

> [!IMPORTANT]
> Key information here.

<!-- ::FIGURE src="fig1.png" caption="First Figure" id="fig-1" width="half" -->

<!-- ::PAGEBREAK -->

## Chapter 2 {#ch2}

<!-- ::SECTION_START class="cols-2" -->

This content is in two columns.

<!-- ::SECTION_END -->`;

    const { html, metadata } = parse(markdown);

    // Metadata
    expect(metadata.title).toBe('Complex Document');
    expect(metadata.author).toBe('Test Author');

    // Cover
    expect(html).toContain('<div class="cover">');

    // TOC
    expect(html).toContain('toc-placeholder');
    expect(html).toContain('data-levels="2"');

    // Headings with attributes
    expect(html).toContain('id="ch1"');
    expect(html).toContain('id="ch2"');

    // Alert
    expect(html).toContain('markdown-alert-important');

    // Figure
    expect(html).toContain('<figure id="fig-1" class="width-half">');

    // Page break
    expect(html).toContain('<div class="break-page">');

    // Section
    expect(html).toContain('<div class="cols-2">');
  });
});

describe('markdown-it-container integration', () => {
  it('should render details container', () => {
    const input = `:::details
This is detailed content.
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="container container-details">');
    expect(html).toContain('This is detailed content.');
    expect(html).toContain('</div>');
  });

  it('should render aside container', () => {
    const input = `:::aside
Sidebar content here.
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="container container-aside">');
    expect(html).toContain('Sidebar content here.');
  });

  it('should render columns container', () => {
    const input = `:::columns
Content that flows into two columns.
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="container container-columns">');
  });

  it('should render spoiler container with title', () => {
    const input = `:::spoiler Movie ending
The butler did it.
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="container container-spoiler"');
    expect(html).toContain('data-title="Movie ending"');
  });

  it('should handle container with nested markdown', () => {
    const input = `:::details

## Nested heading

- List item 1
- List item 2

:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="container container-details">');
    expect(html).toContain('<h2>');
    expect(html).toContain('<li>');
  });

  it('should work alongside other extended syntax', () => {
    const markdown = `# Title {.main-title}

:::aside
> [!NOTE]
> A note inside an aside.
:::

<!-- ::PAGEBREAK -->`;

    const { html } = parse(markdown);
    expect(html).toContain('class="main-title"');
    expect(html).toContain('container-aside');
    expect(html).toContain('markdown-alert-note');
    expect(html).toContain('<div class="break-page">');
  });

  // Attribute syntax tests
  it('should render container with single class attribute', () => {
    const input = `::: {.warning}
This is a warning message.
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="warning">');
    expect(html).toContain('This is a warning message.');
    expect(html).toContain('</div>');
  });

  it('should render container with multiple classes', () => {
    const input = `::: {.document-header .primary}
Header content
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="document-header primary">');
    expect(html).toContain('Header content');
  });

  it('should render container with id attribute', () => {
    const input = `::: {#section-intro}
Introduction section
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div id="section-intro">');
    expect(html).toContain('Introduction section');
  });

  it('should render container with both class and id', () => {
    const input = `::: {.title-block #main-title}
# Main Title
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="title-block" id="main-title">');
    expect(html).toContain('<h1>Main Title</h1>');
  });

  it('should handle all technical form container classes', () => {
    const containers = [
      '.document-header',
      '.title-block',
      '.applicability-box',
      '.warning',
      '.caution',
      '.note',
      '.approval-block',
      '.footer-notice'
    ];

    for (const className of containers) {
      const input = `::: {${className}}
Content
:::`;
      const { html } = parse(input);
      const expectedClass = className.slice(1); // Remove leading dot
      expect(html).toContain(`<div class="${expectedClass}">`);
    }
  });

  it('should handle nested markdown inside attribute containers', () => {
    const input = `::: {.warning}

## Warning Title

- Point 1
- Point 2

**Important:** Read this carefully.
:::`;

    const { html } = parse(input);
    expect(html).toContain('<div class="warning">');
    expect(html).toContain('<h2>Warning Title</h2>');
    expect(html).toContain('<li>Point 1</li>');
    expect(html).toContain('<strong>Important:</strong>');
  });

  it('should prefer named containers over attribute syntax when both match', () => {
    // 'warning' is both a named container and can be used with {.warning}
    const namedInput = `:::warning
Named container
:::`;

    const attrInput = `::: {.warning}
Attribute container
:::`;

    const { html: namedHtml } = parse(namedInput);
    const { html: attrHtml } = parse(attrInput);

    // Named should use container-warning class
    expect(namedHtml).toContain('<div class="container container-warning">');

    // Attribute syntax should use just the class name
    expect(attrHtml).toContain('<div class="warning">');
  });
});
