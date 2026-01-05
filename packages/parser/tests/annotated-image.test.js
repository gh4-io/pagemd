/**
 * Tests for annotated-image plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import { annotatedImagePlugin } from '../src/plugins/annotated-image.js';

describe('annotatedImagePlugin', () => {
  let md;

  beforeEach(() => {
    md = new MarkdownIt();
    md.use(annotatedImagePlugin);
  });

  describe('Basic Rendering', () => {
    it('should render annotated image with single marker', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, y: 20, label: "Save button" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<figure class="annotated-image-container">');
      expect(html).toContain('<div class="image-wrapper"');
      expect(html).toContain('<img src="./test.png"');
      expect(html).toContain('<span class="marker" style="left: 10%; top: 20%;">1</span>');
      expect(html).toContain('<div class="annotation-legend">');
      expect(html).toContain('<div class="legend-grid"');
      expect(html).toContain('<span class="legend-num">1</span>');
      expect(html).toContain('<span class="legend-text">Save button</span>');
    });

    it('should render image with multiple markers', () => {
      const input = `::: annotated-image ./screenshot.png
- { id: 1, x: 10, y: 20, label: "Button A" }
- { id: 2, x: 85, y: 10, label: "Menu B" }
- { id: 3, x: 50, y: 50, label: "Center C" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="marker" style="left: 10%; top: 20%;">1</span>');
      expect(html).toContain('<span class="marker" style="left: 85%; top: 10%;">2</span>');
      expect(html).toContain('<span class="marker" style="left: 50%; top: 50%;">3</span>');

      expect(html).toContain('<span class="legend-text">Button A</span>');
      expect(html).toContain('<span class="legend-text">Menu B</span>');
      expect(html).toContain('<span class="legend-text">Center C</span>');
    });

    it('should generate legend grid', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, y: 20, label: "Item" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<div class="annotation-legend">');
      expect(html).toContain('<div class="legend-grid"');
      expect(html).toContain('<div class="legend-item">');
    });
  });

  describe('Options', () => {
    it('should render caption when provided', () => {
      const input = `::: annotated-image ./test.png
options:
  caption: "APN 58 Interface"
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<figcaption>Figure <span class="fig-num">1</span>: APN 58 Interface</figcaption>');
    });

    it('should increment figure counter with caption', () => {
      const input1 = `::: annotated-image ./test1.png
options:
  caption: "First Figure"
markers:
  - { id: 1, x: 10, y: 20, label: "A" }
:::`;
      const input2 = `::: annotated-image ./test2.png
options:
  caption: "Second Figure"
markers:
  - { id: 1, x: 10, y: 20, label: "B" }
:::`;

      const env = { figureCounter: 0 };
      const html1 = md.render(input1, env);
      const html2 = md.render(input2, env);

      expect(html1).toContain('<span class="fig-num">1</span>');
      expect(html2).toContain('<span class="fig-num">2</span>');
      expect(env.figureCounter).toBe(2);
    });

    it('should apply custom marker color via CSS variable', () => {
      const input = `::: annotated-image ./test.png
options:
  markerColor: "#0000ff"
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).toContain('style="--marker-color: #0000ff;"');
    });

    it('should apply custom legend columns', () => {
      const input = `::: annotated-image ./test.png
options:
  legendColumns: 5
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).toContain('style="--legend-columns: 5;"');
    });

    it('should apply custom ID attribute', () => {
      const input = `::: annotated-image ./test.png
options:
  id: "fig-apn58"
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<figure class="annotated-image-container" id="fig-apn58">');
    });

    it('should use default values when options not provided', () => {
      const input = `::: annotated-image ./test.png
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      // Default marker color: #cc0000
      expect(html).toContain('style="--marker-color: #cc0000;"');
      // Default legend columns: 3
      expect(html).toContain('style="--legend-columns: 3;"');
      // No caption, no figcaption
      expect(html).not.toContain('<figcaption>');
      // No id attribute
      expect(html).not.toContain('id="');
    });
  });

  describe('Marker Ordering', () => {
    it('should sort legend items by numeric ID', () => {
      const input = `::: annotated-image ./test.png
- { id: 3, x: 10, y: 20, label: "Third" }
- { id: 1, x: 30, y: 40, label: "First" }
- { id: 2, x: 50, y: 60, label: "Second" }
:::`;
      const html = md.render(input);

      // Extract legend text order
      const legendMatch = html.match(/<div class="annotation-legend">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
      expect(legendMatch).toBeTruthy();

      const legend = legendMatch[0];
      const firstIndex = legend.indexOf('First');
      const secondIndex = legend.indexOf('Second');
      const thirdIndex = legend.indexOf('Third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    it('should sort legend items by string ID when not numeric', () => {
      const input = `::: annotated-image ./test.png
- { id: "c", x: 10, y: 20, label: "Item C" }
- { id: "a", x: 30, y: 40, label: "Item A" }
- { id: "b", x: 50, y: 60, label: "Item B" }
:::`;
      const html = md.render(input);

      const legendMatch = html.match(/<div class="annotation-legend">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
      expect(legendMatch).toBeTruthy();

      const legend = legendMatch[0];
      const aIndex = legend.indexOf('Item A');
      const bIndex = legend.indexOf('Item B');
      const cIndex = legend.indexOf('Item C');

      expect(aIndex).toBeLessThan(bIndex);
      expect(bIndex).toBeLessThan(cIndex);
    });

    it('should handle mixed numeric and string IDs', () => {
      const input = `::: annotated-image ./test.png
- { id: 10, x: 10, y: 20, label: "Ten" }
- { id: 2, x: 30, y: 40, label: "Two" }
- { id: "a", x: 50, y: 60, label: "A" }
:::`;
      const html = md.render(input);

      // Numeric IDs should sort numerically (2 before 10)
      const legendMatch = html.match(/<div class="annotation-legend">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
      expect(legendMatch).toBeTruthy();

      const legend = legendMatch[0];
      const twoIndex = legend.indexOf('Two');
      const tenIndex = legend.indexOf('Ten');

      expect(twoIndex).toBeLessThan(tenIndex);
    });
  });

  describe('Coordinate Handling', () => {
    it('should clamp x coordinate to 0-100 range', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: -10, y: 50, label: "Below zero" }
- { id: 2, x: 150, y: 50, label: "Above 100" }
- { id: 3, x: 50, y: 50, label: "Normal" }
:::`;
      const html = md.render(input);

      expect(html).toContain('style="left: 0%; top: 50%;">1</span>');
      expect(html).toContain('style="left: 100%; top: 50%;">2</span>');
      expect(html).toContain('style="left: 50%; top: 50%;">3</span>');
    });

    it('should clamp y coordinate to 0-100 range', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 50, y: -20, label: "Below zero" }
- { id: 2, x: 50, y: 200, label: "Above 100" }
- { id: 3, x: 50, y: 75, label: "Normal" }
:::`;
      const html = md.render(input);

      expect(html).toContain('style="left: 50%; top: 0%;">1</span>');
      expect(html).toContain('style="left: 50%; top: 100%;">2</span>');
      expect(html).toContain('style="left: 50%; top: 75%;">3</span>');
    });
  });

  describe('XSS Protection', () => {
    it('should escape HTML in labels', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, y: 20, label: "<script>alert('xss')</script>" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;/script&gt;');
    });

    it('should escape HTML in caption', () => {
      const input = `::: annotated-image ./test.png
options:
  caption: "<img src=x onerror=alert(1)>"
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img');
      expect(html).toContain('&gt;');
    });

    it('should escape HTML in image path', () => {
      const input = `::: annotated-image ./test.png" onerror="alert(1)
- { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('onerror="alert');
      expect(html).toContain('&quot;');
    });

    it('should escape HTML in ID attribute', () => {
      const input = `::: annotated-image ./test.png
options:
  id: 'fig" onload="alert(1)'
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('onload="alert');
      expect(html).toContain('&quot;');
    });

    it('should escape HTML in marker color', () => {
      const input = `::: annotated-image ./test.png
options:
  markerColor: 'red" style="position:absolute" data-evil="'
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      // Quotes should be escaped to prevent attribute injection
      expect(html).toContain('&quot;');
      // The injected style should not create a separate attribute
      expect(html).not.toMatch(/style="[^"]*"\s+data-evil=/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty container (no markers)', () => {
      const input = `::: annotated-image ./test.png
markers: []
:::`;
      const html = md.render(input);

      expect(html).toContain('<figure class="annotated-image-container">');
      expect(html).toContain('<img src="./test.png"');
      expect(html).not.toContain('<div class="annotation-legend">');
      expect(html).not.toContain('class="marker"');
    });

    it('should handle many markers (30+)', () => {
      const markers = Array.from({ length: 35 }, (_, i) =>
        `- { id: ${i + 1}, x: ${(i * 3) % 100}, y: ${(i * 5) % 100}, label: "Item ${i + 1}" }`
      ).join('\n');

      const input = `::: annotated-image ./test.png
${markers}
:::`;
      const html = md.render(input);

      // Count markers
      const markerMatches = html.match(/class="marker"/g);
      expect(markerMatches).toHaveLength(35);

      // Count legend items
      const legendMatches = html.match(/class="legend-item"/g);
      expect(legendMatches).toHaveLength(35);
    });

    it('should skip invalid markers (missing id)', () => {
      const input = `::: annotated-image ./test.png
- { x: 10, y: 20, label: "No ID" }
- { id: 1, x: 30, y: 40, label: "Valid" }
:::`;
      const html = md.render(input);

      const markerMatches = html.match(/class="marker"/g);
      expect(markerMatches).toHaveLength(1);
      expect(html).toContain('Valid');
      expect(html).not.toContain('No ID');
    });

    it('should skip invalid markers (missing x coordinate)', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, y: 20, label: "No X" }
- { id: 2, x: 30, y: 40, label: "Valid" }
:::`;
      const html = md.render(input);

      const markerMatches = html.match(/class="marker"/g);
      expect(markerMatches).toHaveLength(1);
      expect(html).toContain('Valid');
      expect(html).not.toContain('No X');
    });

    it('should skip invalid markers (missing y coordinate)', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, label: "No Y" }
- { id: 2, x: 30, y: 40, label: "Valid" }
:::`;
      const html = md.render(input);

      const markerMatches = html.match(/class="marker"/g);
      expect(markerMatches).toHaveLength(1);
      expect(html).toContain('Valid');
      expect(html).not.toContain('No Y');
    });

    it('should skip invalid markers (missing label)', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, y: 20 }
- { id: 2, x: 30, y: 40, label: "Valid" }
:::`;
      const html = md.render(input);

      const markerMatches = html.match(/class="marker"/g);
      expect(markerMatches).toHaveLength(1);
      expect(html).toContain('Valid');
    });

    it('should skip invalid markers (non-number coordinates)', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: "ten", y: 20, label: "Bad X" }
- { id: 2, x: 30, y: "forty", label: "Bad Y" }
- { id: 3, x: 50, y: 60, label: "Valid" }
:::`;
      const html = md.render(input);

      const markerMatches = html.match(/class="marker"/g);
      expect(markerMatches).toHaveLength(1);
      expect(html).toContain('Valid');
      expect(html).not.toContain('Bad X');
      expect(html).not.toContain('Bad Y');
    });

    it('should handle YAML parse errors gracefully', () => {
      const input = `::: annotated-image ./test.png
this is not valid yaml { [ }
:::`;
      const html = md.render(input);

      // Should render image without markers
      expect(html).toContain('<figure class="annotated-image-container">');
      expect(html).toContain('<img src="./test.png"');
      expect(html).not.toContain('class="marker"');
      expect(html).not.toContain('<div class="annotation-legend">');
    });

    it('should handle empty YAML content', () => {
      const input = `::: annotated-image ./test.png
:::`;
      const html = md.render(input);

      expect(html).toContain('<figure class="annotated-image-container">');
      expect(html).toContain('<img src="./test.png"');
      expect(html).not.toContain('class="marker"');
    });

    it('should handle image path with spaces', () => {
      const input = `::: annotated-image ./path/to/my image.png
- { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).toContain('src="./path/to/my image.png"');
    });
  });

  describe('Legacy Syntax', () => {
    it('should accept array at root level (without options/markers structure)', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, y: 20, label: "Button A" }
- { id: 2, x: 85, y: 10, label: "Menu B" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="marker" style="left: 10%; top: 20%;">1</span>');
      expect(html).toContain('<span class="marker" style="left: 85%; top: 10%;">2</span>');
      expect(html).toContain('Button A');
      expect(html).toContain('Menu B');
    });

    it('should use default options with legacy array syntax', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      // Default marker color
      expect(html).toContain('style="--marker-color: #cc0000;"');
      // Default legend columns
      expect(html).toContain('style="--legend-columns: 3;"');
      // No caption
      expect(html).not.toContain('<figcaption>');
    });

    it('should handle both legacy and new syntax in same document', () => {
      const input1 = `::: annotated-image ./test1.png
- { id: 1, x: 10, y: 20, label: "Legacy" }
:::`;
      const input2 = `::: annotated-image ./test2.png
options:
  caption: "New Syntax"
markers:
  - { id: 1, x: 30, y: 40, label: "Modern" }
:::`;

      const env = {};
      const html1 = md.render(input1, env);
      const html2 = md.render(input2, env);

      expect(html1).toContain('Legacy');
      expect(html1).not.toContain('<figcaption>');

      expect(html2).toContain('Modern');
      expect(html2).toContain('<figcaption>Figure <span class="fig-num">1</span>: New Syntax</figcaption>');
    });
  });

  describe('Integration with figure counter', () => {
    it('should not increment counter without caption', () => {
      const input = `::: annotated-image ./test.png
- { id: 1, x: 10, y: 20, label: "Button" }
:::`;

      const env = { figureCounter: 5 };
      md.render(input, env);

      expect(env.figureCounter).toBe(5);
    });

    it('should share counter with other figure plugins', () => {
      const input1 = `::: annotated-image ./test1.png
options:
  caption: "Annotated Figure"
markers:
  - { id: 1, x: 10, y: 20, label: "A" }
:::`;

      const env = { figureCounter: 10 };
      const html = md.render(input1, env);

      expect(html).toContain('<span class="fig-num">11</span>');
      expect(env.figureCounter).toBe(11);
    });
  });

  describe('All options combined', () => {
    it('should render with all options and features', () => {
      const input = `::: annotated-image ./assets/workpackage.png
options:
  caption: "APN 58 Work Package Interface"
  markerColor: "#0066cc"
  legendColumns: 4
  id: "fig-apn58"
markers:
  - { id: 1, x: 10, y: 15, label: "Save button" }
  - { id: 2, x: 85, y: 8, label: "Settings menu" }
  - { id: 3, x: 50, y: 50, label: "Work package grid" }
  - { id: 4, x: 25, y: 90, label: "Status bar" }
:::`;
      const html = md.render(input);

      // Container with ID
      expect(html).toContain('<figure class="annotated-image-container" id="fig-apn58">');

      // Image wrapper with custom color
      expect(html).toContain('style="--marker-color: #0066cc;"');

      // Image
      expect(html).toContain('<img src="./assets/workpackage.png"');

      // All markers
      expect(html).toContain('style="left: 10%; top: 15%;">1</span>');
      expect(html).toContain('style="left: 85%; top: 8%;">2</span>');
      expect(html).toContain('style="left: 50%; top: 50%;">3</span>');
      expect(html).toContain('style="left: 25%; top: 90%;">4</span>');

      // Caption with figure number
      expect(html).toContain('<figcaption>Figure <span class="fig-num">1</span>: APN 58 Work Package Interface</figcaption>');

      // Legend with custom columns
      expect(html).toContain('style="--legend-columns: 4;"');
      expect(html).toContain('Save button');
      expect(html).toContain('Settings menu');
      expect(html).toContain('Work package grid');
      expect(html).toContain('Status bar');
    });
  });
});
