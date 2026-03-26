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

    it('should stop after multiple consecutive blank lines if no closing tag', () => {
      const input = `[[WARNING]]
Line 1



This should not be included`;

      const html = md.render(input);
      const warningDiv = html.match(/<div class="callout callout-warning">[\s\S]*?<\/div>/);

      expect(warningDiv).toBeTruthy();
      expect(warningDiv[0]).toContain('Line 1');
      expect(warningDiv[0]).not.toContain('This should not be included');
    });

    it('should handle blank lines within multi-line callout when closing tag present', () => {
      const input = `[[WARNING]]
First paragraph

Second paragraph after blank line
[[/WARNING]]`;

      const html = md.render(input);

      expect(html).toContain('<div class="callout callout-warning">');
      expect(html).toContain('First paragraph');
      expect(html).toContain('Second paragraph');
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

  // FIGURE Crop Syntax Tests
  describe('crop parameters', () => {
    it('should render figure with crop-fit parameter', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-fit="contain" -->`;

      const html = md.render(input);

      expect(html).toContain('<figure');
      expect(html).toContain('--crop-fit: contain');
      expect(html).toContain('object-fit: contain');
      expect(html).toContain('object-view-box: inset(');
    });

    it('should render figure with crop-x and crop-y parameters', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-x="70" crop-y="40" -->`;

      const html = md.render(input);

      // Option C: Only custom properties, no fixed dimensions
      expect(html).toContain('--crop-x: 70%');
      expect(html).toContain('--crop-y: 40%');
      expect(html).toContain('--crop-fit: cover'); // Auto-default when crop-x/crop-y present
      expect(html).not.toContain('width: 700px'); // No fixed dimensions
      expect(html).not.toContain('height: 400px'); // No fixed dimensions
    });

    it('should render figure with all crop parameters', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-fit="cover" crop-x="60" crop-y="30" -->`;

      const html = md.render(input);

      // Option C: Only custom properties, no fixed dimensions
      expect(html).toContain('--crop-fit: cover');
      expect(html).toContain('--crop-x: 60%');
      expect(html).toContain('--crop-y: 30%');
      expect(html).not.toContain('width: 600px'); // No fixed dimensions
      expect(html).not.toContain('height: 300px'); // No fixed dimensions
    });

    it('should not add crop styles when no crop parameters specified', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" -->`;

      const html = md.render(input);

      expect(html).toContain('<img src="test.png" alt="Test">');
      expect(html).not.toContain('object-fit');
      expect(html).not.toContain('object-position');
      expect(html).not.toContain('--crop-fit');
      expect(html).not.toContain('--crop-x');
      expect(html).not.toContain('--crop-y');
    });

    it('should use default position (50%) when only crop-fit is specified', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-fit="contain" -->`;

      const html = md.render(input);

      expect(html).toContain('--crop-fit: contain');
      expect(html).not.toContain('max-width'); // No viewport dimensions without crop-x/crop-y
      expect(html).not.toContain('max-height');
      expect(html).toContain('object-fit: contain');
      expect(html).toContain('object-view-box: inset(0% 0% 0% 0%)'); // No crop region
    });

    it('should use default for missing position when only one specified', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-x="70" -->`;

      const html = md.render(input);

      // Viewport model: crop-x creates viewport width, no crop-y = no viewport height
      expect(html).not.toContain('width:'); // No fixed dimensions (Option C)
      expect(html).not.toContain('max-height'); // crop-y not specified
      expect(html).toContain('--crop-fit: cover'); // Auto-default
      expect(html).not.toContain('object-position');
    });

    it('should work with crop-fit and width parameters together', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" width="half" crop-fit="cover" crop-x="55" crop-y="45" -->`;

      const html = md.render(input);

      expect(html).toContain('class="width-half"'); // Semantic width uses class
      expect(html).not.toContain('max-width: half'); // Not inline style
      expect(html).toContain('--crop-fit: cover');
      expect(html).toContain('object-fit: cover');
      expect(html).toContain('object-view-box: inset(0% 45% 55% 0%)');
    });

    it('should work with crop parameters and id', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test Figure" id="fig-crop" crop-fit="scale-down" -->`;

      const html = md.render(input);

      expect(html).toContain('id="fig-crop"');
      expect(html).toContain('--crop-fit: scale-down');
      expect(html).toContain('Figure <span class="fig-num">1</span>: Test Figure');
      expect(html).toContain('object-fit: scale-down');
      expect(html).toContain('object-view-box: inset(');
    });

    it('should validate crop-fit values and ignore invalid ones', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-fit="invalid" -->`;

      const html = md.render(input);

      // Invalid crop-fit should be ignored, no styles added
      expect(html).not.toContain('object-fit');
      expect(html).not.toContain('--crop-fit');
    });

    it('should validate crop-x range (0-100) and ignore invalid values', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-x="150" crop-y="50" -->`;

      const html = md.render(input);

      // Invalid crop-x (>100) should be ignored
      expect(html).not.toContain('150%');
      expect(html).not.toContain('max-width'); // Invalid crop-x = no viewport width
      // But crop-y should still work
      expect(html).not.toContain('height:'); // No fixed dimensions (Option C)
      expect(html).toContain('--crop-y: 50%');
      expect(html).toContain('--crop-fit: cover'); // Auto-default from crop-y
    });

    it('should validate crop-y range (0-100) and ignore invalid values', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-x="50" crop-y="-10" -->`;

      const html = md.render(input);

      // Invalid crop-y (<0) should be ignored
      expect(html).not.toContain('-10%');
      expect(html).not.toContain('max-height'); // Invalid crop-y = no viewport height
      // But crop-x should still work
      expect(html).not.toContain('width:'); // No fixed dimensions (Option C)
      expect(html).toContain('--crop-x: 50%');
      expect(html).toContain('--crop-fit: cover'); // Auto-default from crop-x
    });

    it('should handle non-numeric crop values gracefully', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-x="abc" crop-y="def" -->`;

      const html = md.render(input);

      // Non-numeric values should be ignored
      expect(html).not.toContain('object-position');
      expect(html).not.toContain('abc');
      expect(html).not.toContain('def');
    });

    it('should accept boundary values (0 and 100)', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-x="0" crop-y="100" -->`;

      const html = md.render(input);

      // Viewport model: 0 and 100 are valid percentages
      expect(html).not.toContain('width:'); // No fixed dimensions (Option C)
      expect(html).not.toContain('height:'); // No fixed dimensions (Option C)
      expect(html).toContain('--crop-x: 0%');
      expect(html).toContain('--crop-y: 100%');
    });

    it('should handle decimal crop positions', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-x="33.33" crop-y="66.67" -->`;

      const html = md.render(input);

      // Option C: Only custom properties, no fixed dimensions
      expect(html).toContain('--crop-x: 33.33%');
      expect(html).toContain('--crop-y: 66.67%');
      expect(html).not.toContain('width: 333.3px'); // No fixed dimensions
      expect(html).not.toContain('height: 666.7px'); // No fixed dimensions
    });

    it('should support all valid crop-fit values', () => {
      const validFits = ['cover', 'contain', 'fill', 'scale-down'];

      validFits.forEach((fit) => {
        const input = `<!-- ::FIGURE src="test.png" caption="Test ${fit}" crop-fit="${fit}" -->`;
        const html = md.render(input);

        expect(html).toContain(`--crop-fit: ${fit}`);
        expect(html).toContain(`object-fit: ${fit}`);
        expect(html).toContain('object-view-box: inset(');
      });
    });

    it('should escape crop parameter values in HTML output', () => {
      // Attempt XSS via crop-fit (should be blocked by validation anyway)
      const input = `<!-- ::FIGURE src="test.png" caption="Test" crop-fit="cover; background:red" -->`;

      const html = md.render(input);

      // Invalid crop-fit should be rejected entirely
      expect(html).not.toContain('background');
      expect(html).not.toContain('red');
    });

    // alt parameter tests
    it('should use alt parameter when provided', () => {
      const input = `<!-- ::FIGURE src="chart.png" alt="A bar chart" caption="Q3 Results" -->`;
      const html = md.render(input);
      expect(html).toContain('alt="A bar chart"');
      expect(html).not.toContain('alt="Q3 Results"');
    });

    it('should fall back to caption for alt when alt not provided', () => {
      const input = `<!-- ::FIGURE src="chart.png" caption="Q3 Results" -->`;
      const html = md.render(input);
      expect(html).toContain('alt="Q3 Results"');
    });

    it('should escape HTML in alt parameter', () => {
      const input = `<!-- ::FIGURE src="test.png" alt="Test <script>alert('xss')</script>" caption="Caption" -->`;
      const html = md.render(input);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    // loading parameter tests
    it('should add loading="lazy" attribute when specified', () => {
      const input = `<!-- ::FIGURE src="large-image.png" caption="Hero Image" loading="lazy" -->`;
      const html = md.render(input);
      expect(html).toContain('loading="lazy"');
    });

    it('should add loading="eager" attribute when specified', () => {
      const input = `<!-- ::FIGURE src="above-fold.png" caption="Header" loading="eager" -->`;
      const html = md.render(input);
      expect(html).toContain('loading="eager"');
    });

    it('should ignore invalid loading values', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" loading="invalid" -->`;
      const html = md.render(input);
      expect(html).not.toContain('loading=');
    });

    // link parameter tests
    it('should wrap image in anchor tag when link provided', () => {
      const input = `<!-- ::FIGURE src="thumb.png" caption="Preview" link="/full-size.png" -->`;
      const html = md.render(input);
      expect(html).toContain('<a href="/full-size.png">');
      expect(html).toContain('</a>');
      // Anchor should wrap the img
      expect(html).toMatch(/<a href="[^"]*"[^>]*>.*<img/s);
    });

    it('should add target and rel for external links (http)', () => {
      const input = `<!-- ::FIGURE src="logo.png" caption="Brand" link="https://example.com" -->`;
      const html = md.render(input);
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it('should add target and rel for external links (https)', () => {
      const input = `<!-- ::FIGURE src="logo.png" caption="Brand" link="http://example.com/page" -->`;
      const html = md.render(input);
      expect(html).toContain('href="http://example.com/page"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it('should NOT add target and rel for local links', () => {
      const input = `<!-- ::FIGURE src="thumb.png" caption="Preview" link="./images/full.png" -->`;
      const html = md.render(input);
      expect(html).toContain('href="./images/full.png"');
      expect(html).not.toContain('target="_blank"');
      expect(html).not.toContain('rel="noopener noreferrer"');
    });

    it('should escape HTML in link parameter', () => {
      const input = `<!-- ::FIGURE src="test.png" caption="Test" link="javascript:alert('xss')" -->`;
      const html = md.render(input);
      // Should escape or sanitize the dangerous link
      expect(html).not.toContain('javascript:alert');
    });

    // Combination tests
    it('should work with link and loading together', () => {
      const input = `<!-- ::FIGURE src="thumb.png" caption="Gallery" link="/full.png" loading="lazy" -->`;
      const html = md.render(input);
      expect(html).toContain('<a href="/full.png">');
      expect(html).toContain('loading="lazy"');
    });

    it('should work with link and crop parameters together', () => {
      const input = `<!-- ::FIGURE src="photo.png" caption="Portrait" link="https://gallery.com/photo" crop-fit="cover" crop-x="50" crop-y="25" -->`;
      const html = md.render(input);
      expect(html).toContain('href="https://gallery.com/photo"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('--crop-fit: cover');
      expect(html).toContain('object-fit: cover');
      expect(html).toContain('object-view-box: inset(0% 50% 75% 0%)');
    });

    it('should work with alt, link, loading, and crop together', () => {
      const input = `<!-- ::FIGURE src="hero.jpg" alt="Mountain landscape" caption="Sunset at Mt. Rainier" link="https://photos.example.com/hero-full.jpg" loading="lazy" crop-fit="cover" crop-x="50" crop-y="30" -->`;
      const html = md.render(input);
      expect(html).toContain('alt="Mountain landscape"');
      expect(html).toContain('<a href="https://photos.example.com/hero-full.jpg"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('loading="lazy"');
      expect(html).toContain('--crop-fit: cover');
      expect(html).toContain('object-fit: cover');
      expect(html).toContain('object-view-box: inset(0% 50% 70% 0%)');
      expect(html).toContain('Figure <span class="fig-num">1</span>: Sunset at Mt. Rainier');
    });
  });

  // Height parameter tests
  describe('height parameter', () => {
    it('should render height parameter as inline style on figure', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" height="400px" -->';
      const html = md.render(input);
      expect(html).toContain('style="height: 400px"');
    });

    it('should work with crop parameters', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" height="300px" crop-fit="cover" crop-y="30" -->';
      const html = md.render(input);
      // Height is not applied on figure when crop is active (crop handles sizing)
      expect(html).not.toContain('height:'); // No fixed dimensions when crop active
      expect(html).toContain('--crop-fit: cover');
      expect(html).toContain('--crop-y: 30%');
      expect(html).toContain('object-fit: cover');
      expect(html).toContain('object-view-box: inset(0% 0% 70% 0%)');
    });

    it('should validate CSS length values (pixels)', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" height="300px" -->';
      const html = md.render(input);
      expect(html).toContain('height: 300px'); // Explicit height parameter should work
    });

    it('should validate CSS length values (viewport)', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" height="50vh" -->';
      const html = md.render(input);
      expect(html).toContain('height: 50vh');
    });

    it('should validate CSS length values (percentage)', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" height="80%" -->';
      const html = md.render(input);
      expect(html).toContain('height: 80%');
    });

    it('should validate CSS length values (auto)', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" height="auto" -->';
      const html = md.render(input);
      expect(html).toContain('height: auto');
    });

    it('should reject invalid height values', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" height="invalid" -->';
      const html = md.render(input);
      expect(html).not.toContain('height:');
    });

    it('should work with width parameter', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" width="half" height="350px" -->';
      const html = md.render(input);
      expect(html).toContain('class="width-half"'); // Semantic width uses class
      expect(html).toContain('height: 350px'); // Explicit height parameter should work
    });
  });

  // Auto-default crop-fit tests
  describe('crop-fit auto-default', () => {
    it('should default crop-fit to cover when only crop-y present', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" crop-y="30" -->';
      const html = md.render(input);
      expect(html).toContain('--crop-fit: cover'); // CSS hook on figure
      expect(html).toContain('--crop-y: 30%');
      expect(html).not.toContain('object-fit'); // Auto-default doesn't apply object-fit
      expect(html).toContain('object-view-box: inset(0% 0% 70% 0%)');
    });

    it('should default crop-fit to cover when only crop-x present', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" crop-x="70" -->';
      const html = md.render(input);
      expect(html).toContain('--crop-fit: cover'); // CSS hook on figure
      expect(html).toContain('--crop-x: 70%');
      expect(html).not.toContain('object-fit'); // Auto-default doesn't apply object-fit
      expect(html).toContain('object-view-box: inset(0% 30% 0% 0%)');
    });

    it('should default crop-fit to cover when both crop-x and crop-y present', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" crop-x="60" crop-y="40" -->';
      const html = md.render(input);
      expect(html).toContain('--crop-fit: cover'); // CSS hook on figure
      expect(html).toContain('--crop-x: 60%');
      expect(html).toContain('--crop-y: 40%');
      expect(html).not.toContain('object-fit'); // Auto-default doesn't apply object-fit
      expect(html).toContain('object-view-box: inset(0% 40% 60% 0%)');
    });

    it('should not override explicit crop-fit value', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" crop-fit="contain" crop-y="30" -->';
      const html = md.render(input);
      expect(html).toContain('--crop-fit: contain');
      expect(html).not.toContain('--crop-fit: cover'); // Should use explicit value, not auto-default
      expect(html).toContain('object-fit: contain'); // Explicit crop-fit IS applied
      expect(html).toContain('object-view-box: inset(0% 0% 70% 0%)');
    });

    it('should not add crop-fit when only invalid crop-x/crop-y values present', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" crop-x="150" crop-y="-10" -->';
      const html = md.render(input);
      expect(html).not.toContain('--crop-fit');
      expect(html).not.toContain('object-fit');
    });
  });

  // Backward compatibility tests
  describe('backward compatibility', () => {
    it('should not add crop styles when no crop params present', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Normal figure" -->';
      const html = md.render(input);
      expect(html).not.toContain('object-fit');
      expect(html).not.toContain('object-position');
      expect(html).not.toContain('--crop-fit');
      expect(html).not.toContain('--crop-x');
      expect(html).not.toContain('--crop-y');
    });

    it('should render exactly as before without crop params', () => {
      const input = '<!-- ::FIGURE src="test.png" caption="Test" id="fig-1" width="half" -->';
      const html = md.render(input);
      expect(html).toContain('<figure id="fig-1" class="width-half">'); // Semantic width uses class
      expect(html).toContain('<img src="test.png" alt="Test">');
      expect(html).toContain('Figure <span class="fig-num">1</span>: Test');
      expect(html).not.toContain('crop');
      expect(html).not.toContain('object-');
    });
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
