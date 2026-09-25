/**
 * Tests for annotated-image plugin
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import { annotatedImagePlugin } from '../src/plugins/annotated-image.js';

/**
 * Tokenize every start tag in the HTML and return its element name and real
 * attribute names. The plugin always emits double-quoted attribute values, so
 * a value can only "break out" if an unescaped `"` reaches the output - in
 * that case the injected text shows up here as an extra attribute name.
 * Escaped text inside a value (e.g. `&quot;onclick=`) is NOT reported.
 * @param {string} html - Rendered HTML
 * @returns {Array<{tag: string, attrs: string[]}>} Parsed start tags
 */
function parseTags(html) {
  const tags = [];
  const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:\s*=\s*"[^"]*")?)*)\s*\/?>/g;
  const attrRe = /([^\s=/>]+)(?:\s*=\s*"[^"]*")?/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const attrs = [...m[2].matchAll(attrRe)].map(a => a[1].toLowerCase());
    tags.push({ tag: m[1].toLowerCase(), attrs });
  }
  return tags;
}

/**
 * Assert rendered HTML has no event-handler attributes and only the expected
 * element types (no injected <script>, <img onerror>, etc.)
 * @param {string} html - Rendered HTML
 */
function expectNoInjectedMarkup(html) {
  const tags = parseTags(html);
  // Every start tag must tokenize cleanly - a mangled tag would otherwise be
  // skipped and let the checks below pass vacuously
  expect(tags).toHaveLength((html.match(/<[a-zA-Z]/g) || []).length);
  const allAttrs = tags.flatMap(t => t.attrs);
  expect(allAttrs.filter(a => a.startsWith('on'))).toEqual([]);
  expect(tags.filter(t => t.tag === 'script')).toEqual([]);
  // Exactly one <img> - the annotated image itself
  expect(tags.filter(t => t.tag === 'img')).toHaveLength(1);
}

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

  describe('Arrows', () => {
    it('should render arrow with x1/y1/x2/y2 coordinates', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: 10, y1: 20, x2: 40, y2: 50, color: "#cc0000" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<svg class="annotation-shapes"');
      expect(html).toContain('<line x1="10" y1="20" x2="40" y2="50" stroke="#cc0000"');
      expect(html).toContain('marker-end="url(#arrowhead-annotated-1)"');
      expect(html).toContain('vector-effect="non-scaling-stroke"');
    });

    it('should clamp arrow coordinates to 0-100 range', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: -10, y1: 120, x2: 50, y2: 50 }
:::`;
      const html = md.render(input);

      expect(html).toContain('<line x1="0" y1="100" x2="50" y2="50"');
    });

    it('should apply custom stroke width on arrows', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: 10, y1: 20, x2: 40, y2: 50, strokeWidth: 3 }
:::`;
      const html = md.render(input);

      expect(html).toContain('stroke-width="3"');
    });

    it('should include arrow with id and label in legend', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { id: 1, x1: 10, y1: 20, x2: 40, y2: 50, label: "Flow direction" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="legend-text">Flow direction</span>');
      expect(html).toContain('<span class="legend-num">1</span>');
    });

    it('should skip invalid arrow entries', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: 10, y1: 20, x2: 40 }
  - { x1: 50, y1: 50, x2: 60, y2: 60 }
:::`;
      const html = md.render(input);

      expect(html).toContain('<line x1="50" y1="50" x2="60" y2="60"');
      expect(html).not.toContain('<line x1="10" y1="20"');
    });
  });

  describe('Boxes', () => {
    it('should render box with x/y/width/height', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { x: 10, y: 20, width: 30, height: 15, color: "#0066cc" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<rect x="10" y="20" width="30" height="15" stroke="#0066cc"');
      expect(html).toContain('vector-effect="non-scaling-stroke"');
    });

    it('should clamp box coordinates and dimensions', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { x: 80, y: 90, width: 50, height: 50 }
:::`;
      const html = md.render(input);

      expect(html).toContain('<rect x="80" y="90" width="20" height="10"');
    });

    it('should apply fill property on boxes', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { x: 10, y: 20, width: 30, height: 15, fill: "#ccccff" }
:::`;
      const html = md.render(input);

      expect(html).toContain('fill="#ccccff"');
    });

    it('should include box with id and label in legend', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { id: 1, x: 10, y: 20, width: 30, height: 15, label: "Settings panel" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="legend-text">Settings panel</span>');
      expect(html).toContain('<span class="legend-num">1</span>');
    });

    it('should skip invalid box entries', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { x: 10, y: 20, width: 30 }
  - { x: 50, y: 50, width: 20, height: 15 }
:::`;
      const html = md.render(input);

      expect(html).toContain('<rect x="50" y="50" width="20" height="15"');
      expect(html).not.toContain('<rect x="10" y="20"');
    });
  });

  describe('Text', () => {
    it('should render text shape with x/y/text', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 50, y: 10, text: "Note here" }
:::`;
      const html = md.render(input);

      // Text overlays are HTML spans (SVG <text> would be stretched by the
      // non-uniform 0-100 viewBox), positioned by top-left corner
      expect(html).toContain('<span class="annotation-text" style="left: 50%; top: 10%;');
      expect(html).toContain('>Note here</span>');
      expect(html).not.toContain('<text');
    });

    it('should render text without an SVG layer when there are no arrows or boxes', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 50, y: 10, text: "Note here" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('<svg');
    });

    it('should clamp text coordinates', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: -10, y: 120, text: "Test" }
:::`;
      const html = md.render(input);

      expect(html).toContain('style="left: 0%; top: 100%;');
    });

    it('should apply font size to text (px) with a default of 14', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 50, y: 10, text: "Big", fontSize: 18 }
  - { x: 50, y: 30, text: "Default" }
:::`;
      const html = md.render(input);

      expect(html).toContain('font-size: 18px;');
      expect(html).toContain('font-size: 14px;');
    });

    it('should apply color and background to text', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 50, y: 10, text: "Note", color: "#ff0000", background: "#333333" }
:::`;
      const html = md.render(input);

      expect(html).toContain('color: #ff0000;');
      expect(html).toContain('background: #333333;');
    });

    it('should omit background when not provided', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 50, y: 10, text: "Note" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('background:');
    });

    it('should skip invalid text entries', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 50, y: 10 }
  - { x: 60, y: 20, text: "Valid" }
:::`;
      const html = md.render(input);

      expect(html).toContain('>Valid</span>');
      expect(html).not.toContain('left: 50%; top: 10%;');
    });
  });

  describe('Mixed Shapes', () => {
    it('should render markers, arrows, boxes, and text together', () => {
      const input = `::: annotated-image ./test.png
markers:
  - { id: 1, x: 10, y: 20, label: "Point" }
arrows:
  - { id: 2, x1: 30, y1: 30, x2: 50, y2: 50, label: "Arrow" }
boxes:
  - { id: 3, x: 60, y: 60, width: 20, height: 20, label: "Box" }
text:
  - { x: 80, y: 80, text: "Text" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="marker" style="left: 10%; top: 20%;">1</span>');
      expect(html).toContain('<line');
      expect(html).toContain('<rect');
      expect(html).toContain('>Text</span>');
      expect(html).toContain('Point');
      expect(html).toContain('Arrow');
      expect(html).toContain('Box');
    });

    it('should merge legend items from all shape types', () => {
      const input = `::: annotated-image ./test.png
markers:
  - { id: 1, x: 10, y: 20, label: "Marker 1" }
arrows:
  - { id: 2, x1: 30, y1: 30, x2: 50, y2: 50, label: "Arrow 2" }
boxes:
  - { id: 3, x: 60, y: 60, width: 20, height: 20, label: "Box 3" }
:::`;
      const html = md.render(input);

      const legend1 = html.indexOf('Marker 1');
      const legend2 = html.indexOf('Arrow 2');
      const legend3 = html.indexOf('Box 3');

      expect(legend1).toBeGreaterThan(-1);
      expect(legend2).toBeGreaterThan(-1);
      expect(legend3).toBeGreaterThan(-1);
      expect(legend1).toBeLessThan(legend2);
      expect(legend2).toBeLessThan(legend3);
    });
  });

  describe('XSS Protection', () => {
    it('should escape text content in text shapes', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 50, y: 10, text: "<script>alert('xss')</script>" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    // Note: escaped output still contains substrings like `onclick=` inside a
    // quoted value (e.g. `stroke="&quot;onclick=&quot;..."`). That is inert
    // text, so these tests check the parsed attribute structure instead of
    // raw substrings.

    it('should keep arrow color inside the stroke attribute', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: 10, y1: 20, x2: 40, y2: 50, color: "\\"onclick=\\"alert(1)" }
:::`;
      const html = md.render(input);

      expect(html).toContain('stroke="&quot;onclick=&quot;alert(1)"');
      expectNoInjectedMarkup(html);
    });

    it('should keep box fill inside the fill attribute', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { x: 10, y: 20, width: 30, height: 15, fill: "red\\"onload=\\"alert(1)" }
:::`;
      const html = md.render(input);

      expect(html).toContain('fill="red&quot;onload=&quot;alert(1)"');
      expectNoInjectedMarkup(html);
    });

    it('should escape labels in shape legend items', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { id: 1, x1: 10, y1: 20, x2: 40, y2: 50, label: "<img src=x onerror=alert(1)>" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="legend-text">&lt;img src=x onerror=alert(1)&gt;</span>');
      expectNoInjectedMarkup(html);
    });

    it('should reject non-numeric strokeWidth and fontSize (no attribute injection)', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: 10, y1: 20, x2: 40, y2: 50, strokeWidth: '2" onmouseover="alert(1)' }
boxes:
  - { x: 10, y: 20, width: 30, height: 15, strokeWidth: '1" onclick="alert(1)' }
text:
  - { x: 5, y: 5, text: "T", fontSize: '12px; } body { display:none' }
:::`;
      const html = md.render(input);

      expect(html.match(/stroke-width="2"/g)).toHaveLength(2);
      expect(html).toContain('font-size: 14px;');
      expect(html).not.toContain('display:none');
      expectNoInjectedMarkup(html);
    });

    it('should reject non-numeric legendColumns', () => {
      const input = `::: annotated-image ./test.png
options:
  legendColumns: '3;"><img src=x onerror=alert(1)>'
markers:
  - { id: 1, x: 10, y: 20, label: "Button" }
:::`;
      const html = md.render(input);

      expect(html).toContain('--legend-columns: 3;');
      expectNoInjectedMarkup(html);
    });

    it('should reject CSS declaration injection in text color/background', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 5, y: 5, text: "T", color: "red; position: fixed", background: "#000}" }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('position: fixed');
      expect(html).toContain('color: #000000;');
      expect(html).toContain('background: transparent;');
    });

    it('should fall back to default arrow/box colours for values containing ; { }', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: 10, y1: 20, x2: 40, y2: 50, color: "red; x" }
boxes:
  - { x: 10, y: 20, width: 30, height: 15, color: "{blue}", fill: "a;b" }
:::`;
      const html = md.render(input);

      expect(html).toContain('stroke="#cc0000"');
      expect(html).toContain('stroke="#0066cc" fill="none"');
    });

    it('should escape text overlay content', () => {
      const input = `::: annotated-image ./test.png
text:
  - { x: 5, y: 5, text: "<img src=x onerror=alert(1)> & 'quotes'" }
:::`;
      const html = md.render(input);

      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &#39;quotes&#39;');
      expectNoInjectedMarkup(html);
    });
  });

  describe('Arrowhead colours', () => {
    it('should give each arrow colour its own arrowhead marker', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: 10, y1: 20, x2: 40, y2: 50 }
  - { x1: 50, y1: 50, x2: 60, y2: 60, color: "#0a7d00" }
  - { x1: 70, y1: 70, x2: 80, y2: 80 }
:::`;
      const html = md.render(input);

      // First colour keeps the base id; later colours get a suffix
      expect(html).toContain('<marker id="arrowhead-annotated-1"');
      expect(html).toContain('<marker id="arrowhead-annotated-1-2"');
      expect(html.match(/<marker /g)).toHaveLength(2);
      expect(html).toContain('<polygon points="0 0, 10 3, 0 6" fill="#cc0000" />');
      expect(html).toContain('<polygon points="0 0, 10 3, 0 6" fill="#0a7d00" />');
      expect(html).toContain('stroke="#0a7d00" stroke-width="2" marker-end="url(#arrowhead-annotated-1-2)"');
      expect(html.match(/marker-end="url\(#arrowhead-annotated-1\)"/g)).toHaveLength(2);
    });

    it('should not emit <defs> when there are boxes but no arrows', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { x: 10, y: 20, width: 30, height: 15 }
:::`;
      const html = md.render(input);

      expect(html).toContain('<svg class="annotation-shapes"');
      expect(html).not.toContain('<defs>');
    });
  });

  describe('Badge positions', () => {
    it('should place arrow badge at the line midpoint', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { id: 1, x1: 10, y1: 20, x2: 40, y2: 50, label: "Arrow" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="marker" style="left: 25%; top: 35%;">1</span>');
    });

    it('should inset box badge 3% from the top-left corner', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { id: 1, x: 10, y: 20, width: 30, height: 15, label: "Box" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="marker" style="left: 13%; top: 23%;">1</span>');
    });

    it('should keep badge inside very small boxes (inset capped at half size)', () => {
      const input = `::: annotated-image ./test.png
boxes:
  - { id: 1, x: 10, y: 20, width: 2, height: 4, label: "Tiny" }
:::`;
      const html = md.render(input);

      expect(html).toContain('<span class="marker" style="left: 11%; top: 22%;">1</span>');
    });

    it('should not add arrows/boxes without label to the legend', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { id: 1, x1: 10, y1: 20, x2: 40, y2: 50 }
boxes:
  - { label: "No id", x: 10, y: 20, width: 30, height: 15 }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('class="marker"');
      expect(html).not.toContain('annotation-legend');
    });
  });

  describe('Malformed shape data', () => {
    it.each([
      ['arrows as string', 'arrows: "oops"'],
      ['boxes as mapping', 'boxes: { x: 1 }'],
      ['text as number', 'text: 5'],
      ['options as string', 'options: "caption"']
    ])('should not throw for %s', (_name, yamlLine) => {
      const input = `::: annotated-image ./test.png
${yamlLine}
markers:
  - { id: 1, x: 10, y: 20, label: "Still works" }
:::`;
      let html;
      expect(() => { html = md.render(input); }).not.toThrow();
      expect(html).toContain('Still works');
    });

    it('should skip shapes with NaN/Infinity-like or string coordinates', () => {
      const input = `::: annotated-image ./test.png
arrows:
  - { x1: ".nan", y1: 20, x2: 40, y2: 50 }
  - { x1: .inf, y1: 20, x2: 40, y2: 50 }
:::`;
      const html = md.render(input);

      expect(html).not.toContain('<line');
    });
  });

  describe('Multi-block ID Collision Prevention', () => {
    it('should use distinct arrowhead IDs for multiple annotated-image blocks', () => {
      const input = `::: annotated-image ./test1.png
arrows:
  - { x1: 10, y1: 20, x2: 40, y2: 50 }
:::
::: annotated-image ./test2.png
arrows:
  - { x1: 50, y1: 50, x2: 80, y2: 80 }
:::`;
      const html = md.render(input);

      expect(html).toContain('id="arrowhead-annotated-1"');
      expect(html).toContain('id="arrowhead-annotated-2"');
      expect(html).toContain('marker-end="url(#arrowhead-annotated-1)"');
      expect(html).toContain('marker-end="url(#arrowhead-annotated-2)"');
    });
  });
});
