/**
 * Tests for markdown extensions (callouts and figures)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import { calloutPlugin, figurePlugin, registerExtensions } from '../src/extensions.js';

describe('calloutPlugin', () => {
  let md;

  beforeEach(() => {
    md = new MarkdownIt();
    md.use(calloutPlugin);
  });

  describe('block callouts', () => {
    it('should render single-line WARNING callout', () => {
      const input = '[[WARNING]] This is a warning message';
      const html = md.render(input);

      expect(html).toContain('<div class="callout callout-warning">');
      expect(html).toContain('<span class="callout-label">WARNING</span>');
      expect(html).toContain('<div class="callout-content">');
      expect(html).toContain('This is a warning message');
      expect(html).toContain('</div>');
    });

    it('should render single-line DANGER callout', () => {
      const input = '[[DANGER]] This is dangerous';
      const html = md.render(input);

      expect(html).toContain('<div class="callout callout-danger">');
      expect(html).toContain('<span class="callout-label">DANGER</span>');
      expect(html).toContain('This is dangerous');
    });

    it('should handle case-insensitive callout types', () => {
      const input1 = '[[warning]] lowercase warning';
      const input2 = '[[Warning]] mixed case';

      const html1 = md.render(input1);
      const html2 = md.render(input2);

      expect(html1).toContain('callout-warning');
      expect(html2).toContain('callout-warning');
    });

    it('should render multi-line WARNING callout', () => {
      const input = `[[WARNING]]
This is the first line
This is the second line
[[/WARNING]]`;

      const html = md.render(input);

      expect(html).toContain('<div class="callout callout-warning">');
      expect(html).toContain('This is the first line');
      expect(html).toContain('This is the second line');
    });

    it('should render multi-line DANGER callout', () => {
      const input = `[[DANGER]]
Line 1
Line 2
Line 3
[[/DANGER]]`;

      const html = md.render(input);

      expect(html).toContain('<div class="callout callout-danger">');
      expect(html).toContain('Line 1');
      expect(html).toContain('Line 2');
      expect(html).toContain('Line 3');
    });

    it('should handle callout with content on same line as opening tag', () => {
      const input = `[[WARNING]] First line content
More content
[[/WARNING]]`;

      const html = md.render(input);

      expect(html).toContain('First line content');
      expect(html).toContain('More content');
    });

    it('should stop at blank line if no closing tag', () => {
      const input = `[[WARNING]]
Line 1

This should not be included`;

      const html = md.render(input);
      const warningDiv = html.match(/<div class="callout callout-warning">[\s\S]*?<\/div>/);

      expect(warningDiv).toBeTruthy();
      expect(warningDiv[0]).toContain('Line 1');
      expect(warningDiv[0]).not.toContain('This should not be included');
    });

    it('should handle empty callouts', () => {
      const input = '[[WARNING]]';
      const html = md.render(input);

      expect(html).toContain('<div class="callout callout-warning">');
      expect(html).toContain('<span class="callout-label">WARNING</span>');
    });

    it('should handle nested markdown in callout content', () => {
      const input = `[[WARNING]]
This has **bold** and *italic* text.
[[/WARNING]]`;

      const html = md.render(input);

      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<em>italic</em>');
    });

    it('should not render if not at start of line', () => {
      const input = 'Some text [[WARNING]] not at start';
      const html = md.render(input);

      expect(html).not.toContain('<div class="callout');
    });

    it('should render multiple callouts in sequence', () => {
      const input = `[[WARNING]] First warning

[[DANGER]] A danger note`;

      const html = md.render(input);

      expect(html).toContain('callout-warning');
      expect(html).toContain('First warning');
      expect(html).toContain('callout-danger');
      expect(html).toContain('A danger note');
    });
  });

  describe('inline callouts', () => {
    it('should render inline WARNING callout', () => {
      const input = 'This is a [!WARNING] in text';
      const html = md.render(input);

      expect(html).toContain('<span class="callout callout-warning callout-inline">');
      expect(html).toContain('<span class="callout-label">WARNING</span>');
    });

    it('should render inline DANGER callout', () => {
      const input = 'Text with [!DANGER] danger';
      const html = md.render(input);

      expect(html).toContain('<span class="callout callout-danger callout-inline">');
      expect(html).toContain('<span class="callout-label">DANGER</span>');
    });

    it('should handle case-insensitive inline callouts', () => {
      const input = 'Test [!warning] inline';
      const html = md.render(input);

      expect(html).toContain('callout-warning');
    });

    it('should not render invalid inline callout types', () => {
      const input = 'Test [!INFO] should not render';
      const html = md.render(input);

      expect(html).not.toContain('class="callout');
    });

    it('should render multiple inline callouts', () => {
      const input = 'Text [!WARNING] and [!DANGER] together';
      const html = md.render(input);

      expect(html).toContain('callout-warning');
      expect(html).toContain('callout-danger');
    });
  });

  describe('edge cases', () => {
    it('should handle callouts with special characters', () => {
      const input = '[[WARNING]] Content with <html> & special chars';
      const html = md.render(input);

      expect(html).toContain('callout-warning');
      // Content should be escaped by markdown-it
      expect(html).toContain('special chars');
    });

    it('should not match incomplete bracket syntax', () => {
      const input = '[WARNING] single bracket';
      const html = md.render(input);

      expect(html).not.toContain('class="callout');
    });

    it('should handle callout types not WARNING or DANGER', () => {
      const input = '[[INFO]] This should not render as callout';
      const html = md.render(input);

      expect(html).not.toContain('class="callout');
    });
  });
});

describe('figurePlugin', () => {
  let md;

  beforeEach(() => {
    md = new MarkdownIt();
    md.use(figurePlugin);
  });

  it('should render figure with caption', () => {
    const input = `<!-- ::FIGURE caption="Test Image" -->
![alt text](image.png)`;

    const html = md.render(input);

    expect(html).toContain('<figure>');
    expect(html).toContain('<figcaption>Figure <span class="fig-num">1</span>: Test Image</figcaption>');
    expect(html).toContain('<img');
    expect(html).toContain('src="image.png"');
    expect(html).toContain('</figure>');
  });

  it('should auto-increment figure numbers', () => {
    const input = `<!-- ::FIGURE caption="First" -->
![](img1.png)

<!-- ::FIGURE caption="Second" -->
![](img2.png)

<!-- ::FIGURE caption="Third" -->
![](img3.png)`;

    const html = md.render(input);

    // Figure numbers now wrapped in span for styling
    expect(html).toContain('Figure <span class="fig-num">1</span>: First');
    expect(html).toContain('Figure <span class="fig-num">2</span>: Second');
    expect(html).toContain('Figure <span class="fig-num">3</span>: Third');
  });

  it('should reset figure counter on each render', () => {
    const input = `<!-- ::FIGURE caption="Test" -->
![](img.png)`;

    const html1 = md.render(input);
    const html2 = md.render(input);

    expect(html1).toContain('Figure <span class="fig-num">1</span>: Test');
    expect(html2).toContain('Figure <span class="fig-num">1</span>: Test');
  });

  it('should handle captions with single quotes', () => {
    const input = `<!-- ::FIGURE caption='Single quote caption' -->
![](img.png)`;

    const html = md.render(input);

    expect(html).toContain('Figure <span class="fig-num">1</span>: Single quote caption');
  });

  it('should handle captions with double quotes', () => {
    const input = `<!-- ::FIGURE caption="Double quote caption" -->
![](img.png)`;

    const html = md.render(input);

    expect(html).toContain('Figure <span class="fig-num">1</span>: Double quote caption');
  });

  it('should handle captions with special characters', () => {
    const input = `<!-- ::FIGURE caption="Test: A Caption (v1.0)" -->
![](img.png)`;

    const html = md.render(input);

    expect(html).toContain('Figure <span class="fig-num">1</span>: Test: A Caption (v1.0)');
  });

  it('should work without image on next line', () => {
    const input = `<!-- ::FIGURE caption="No image" -->`;

    const html = md.render(input);

    expect(html).toContain('<figure>');
    expect(html).toContain('Figure <span class="fig-num">1</span>: No image');
    expect(html).toContain('</figure>');
  });

  it('should handle figure followed by other content', () => {
    const input = `<!-- ::FIGURE caption="Test" -->
![](img.png)

More content here`;

    const html = md.render(input);

    expect(html).toContain('Figure <span class="fig-num">1</span>: Test');
    expect(html).toContain('More content here');
  });

  it('should not match invalid figure syntax', () => {
    const input = `<!-- FIGURE caption="Test" -->
![](img.png)`;

    const html = md.render(input);

    expect(html).not.toContain('<figure>');
  });

  it('should not match without caption attribute', () => {
    const input = `<!-- ::FIGURE -->
![](img.png)`;

    const html = md.render(input);

    expect(html).not.toContain('<figure>');
  });

  it('should handle multiple figures with mixed content', () => {
    const input = `Some text

<!-- ::FIGURE caption="First figure" -->
![](img1.png)

Middle paragraph

<!-- ::FIGURE caption="Second figure" -->
![](img2.png)

End text`;

    const html = md.render(input);

    expect(html).toContain('Figure <span class="fig-num">1</span>: First figure');
    expect(html).toContain('Figure <span class="fig-num">2</span>: Second figure');
    expect(html).toContain('Middle paragraph');
  });

  it('should escape HTML in captions', () => {
    const input = `<!-- ::FIGURE caption="Test <script>alert('xss')</script>" -->
![](img.png)`;

    const html = md.render(input);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('registerExtensions', () => {
  it('should register both callout and figure plugins', () => {
    const md = new MarkdownIt();
    registerExtensions(md);

    const calloutInput = '[[WARNING]] Test warning';
    const calloutHtml = md.render(calloutInput);
    expect(calloutHtml).toContain('callout-warning');

    // Reset for figure test
    const figureInput = `<!-- ::FIGURE caption="Test" -->
![](img.png)`;
    const figureHtml = md.render(figureInput);
    expect(figureHtml).toContain('<figure>');
  });

  it('should return the markdown-it instance for chaining', () => {
    const md = new MarkdownIt();
    const result = registerExtensions(md);

    expect(result).toBe(md);
  });

  it('should allow using both extensions together', () => {
    const md = new MarkdownIt();
    registerExtensions(md);

    const input = `[[WARNING]] Check this figure

<!-- ::FIGURE caption="Important diagram" -->
![](diagram.png)

[[DANGER]] Critical info`;

    const html = md.render(input);

    expect(html).toContain('callout-warning');
    expect(html).toContain('Figure <span class="fig-num">1</span>: Important diagram');
    expect(html).toContain('callout-danger');
  });
});
