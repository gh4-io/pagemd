/**
 * Tests for advanced table features:
 * - markdown-it-multimd-table (colspan, rowspan, multiline, headerless)
 * - markdown-it-table-captions
 * - table-postprocess (zebra striping classes, attrs fix)
 * - markdown-it-attrs compatibility
 */

import { describe, it, expect } from 'vitest';
import { createParser } from '../src/index.js';

describe('tables', () => {
  const md = createParser();

  // =====================================================================
  // GFM Regression - basic tables must still work
  // =====================================================================

  describe('GFM table regression', () => {
    it('should render a basic pipe table', () => {
      const input = [
        '| A | B | C |',
        '|---|---|---|',
        '| 1 | 2 | 3 |',
        '| 4 | 5 | 6 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<table>');
      expect(html).toContain('<thead>');
      expect(html).toContain('<tbody>');
      expect(html).toContain('<th>A</th>');
      expect(html).toContain('<td>1</td>');
    });

    it('should support column alignment', () => {
      const input = [
        '| Left | Center | Right |',
        '|:-----|:------:|------:|',
        '| a    | b      | c     |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toMatch(/style="text-align:left"/);
      expect(html).toMatch(/style="text-align:center"/);
      expect(html).toMatch(/style="text-align:right"/);
    });

    it('should render inline formatting in cells', () => {
      const input = [
        '| **Bold** | *Italic* | `Code` |',
        '|----------|----------|--------|',
        '| text     | text     | text   |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<strong>Bold</strong>');
      expect(html).toContain('<em>Italic</em>');
      expect(html).toContain('<code>Code</code>');
    });
  });

  // =====================================================================
  // Colspan - horizontal cell merging with ||
  // =====================================================================

  describe('colspan', () => {
    it('should merge two columns with || (trailing empty pipe)', () => {
      const input = [
        '| A | B | C |',
        '|---|---|---|',
        '| spanning || C |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('colspan="2"');
    });

    it('should preserve content in colspan cells', () => {
      const input = [
        '| A | B | C |',
        '|---|---|---|',
        '| Content | *Long Cell* ||',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('colspan="2"');
      expect(html).toContain('<em>Long Cell</em>');
    });

    it('should handle colspan in header row', () => {
      const input = [
        '|   | Grouping ||',
        '| H1 | H2 | H3 |',
        '|---|---|---|',
        '| 1 | 2 | 3 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('colspan="2"');
      expect(html).toContain('Grouping');
    });
  });

  // =====================================================================
  // Rowspan - vertical cell merging with ^^
  // =====================================================================

  describe('rowspan', () => {
    it('should merge two rows with ^^', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| span | 1 |',
        '| ^^ | 2 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('rowspan="2"');
    });

    it('should merge three rows', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| tall | 1 |',
        '| ^^ | 2 |',
        '| ^^ | 3 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('rowspan="3"');
    });

    it('should preserve rowspan cell content', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| **merged** | 1 |',
        '| ^^ | 2 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('rowspan="2"');
      expect(html).toContain('<strong>merged</strong>');
    });
  });

  // =====================================================================
  // Combined colspan + rowspan
  // =====================================================================

  describe('combined colspan and rowspan', () => {
    it('should handle colspan and rowspan in the same table', () => {
      const input = [
        '| A | B | C |',
        '|---|---|---|',
        '| span | 1 | 2 |',
        '| ^^ | wide ||',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('rowspan="2"');
      expect(html).toContain('colspan="2"');
    });
  });

  // =====================================================================
  // Multiline cells - backslash continuation
  // =====================================================================

  describe('multiline cells', () => {
    it('should support backslash line continuation', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| Line 1 \\',
        '  Line 2 | data |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<table>');
      expect(html).toContain('Line 1');
      expect(html).toContain('Line 2');
    });
  });

  // =====================================================================
  // Headerless tables
  // =====================================================================

  describe('headerless tables', () => {
    it('should render table with separator first and no header', () => {
      // Headerless syntax: separator line comes first (no header rows above it)
      const input = [
        '|---|---|',
        '| A | B |',
        '| C | D |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<table>');
      expect(html).not.toContain('<thead>');
      expect(html).toContain('<tbody>');
    });

    it('should have table body content in headerless table', () => {
      const input = [
        '|---|---|',
        '| 1 | 2 |',
        '| 3 | 4 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<td');
      expect(html).toContain('1');
      expect(html).toContain('4');
    });
  });

  // =====================================================================
  // Table captions
  // =====================================================================

  describe('table captions', () => {
    it('should render caption from "Table:" prefix after table', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '',
        'Table: My caption text',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<caption');
      expect(html).toContain('My caption text');
    });

    it('should render caption from ":" prefix after table', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '',
        ': Short caption',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<caption');
      expect(html).toContain('Short caption');
    });
  });

  // =====================================================================
  // Zebra striping classes (table-postprocess.js)
  // =====================================================================

  describe('zebra striping classes', () => {
    it('should add .odd class to first tbody row', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '| 3 | 4 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toMatch(/class="odd"/);
    });

    it('should add .even class to second tbody row', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '| 3 | 4 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toMatch(/class="even"/);
    });

    it('should alternate odd/even across multiple rows', () => {
      const input = [
        '| A |',
        '|---|',
        '| 1 |',
        '| 2 |',
        '| 3 |',
        '| 4 |',
        ''
      ].join('\n');
      const html = md.render(input);
      const oddCount = (html.match(/class="odd"/g) || []).length;
      const evenCount = (html.match(/class="even"/g) || []).length;
      expect(oddCount).toBe(2);
      expect(evenCount).toBe(2);
    });

    it('should not add zebra classes to thead rows', () => {
      const input = [
        '| Header |',
        '|--------|',
        '| Data   |',
        ''
      ].join('\n');
      const html = md.render(input);
      const theadMatch = html.match(/<thead>([\s\S]*?)<\/thead>/);
      if (theadMatch) {
        expect(theadMatch[1]).not.toContain('class="odd"');
        expect(theadMatch[1]).not.toContain('class="even"');
      }
    });

    it('should reset counter for each table body', () => {
      const input = [
        '| A |',
        '|---|',
        '| 1 |',
        ''
      ].join('\n');
      // Render two separate tables
      const html = md.render(input) + md.render(input);
      // Each table's first row should be odd
      const oddCount = (html.match(/class="odd"/g) || []).length;
      expect(oddCount).toBe(2);
    });
  });

  // =====================================================================
  // Attrs fix - colspan/rowspan preserved with markdown-it-attrs
  // =====================================================================

  describe('attrs fix for colspan/rowspan', () => {
    it('should preserve colspan content when attrs is active', () => {
      const input = [
        '| A | B | C |',
        '|---|---|---|',
        '| Content | *Long Cell* ||',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('colspan="2"');
      expect(html).toContain('<em>Long Cell</em>');
    });

    it('should preserve bold content in colspan cells', () => {
      const input = [
        '| A | B | C |',
        '|---|---|---|',
        '| X | **Bold Span** ||',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('colspan="2"');
      expect(html).toContain('<strong>Bold Span</strong>');
    });

    it('should handle rowspan with attrs', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| span | 1 |',
        '| ^^ | 2 |',
        '{.compact}',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('rowspan="2"');
      expect(html).toContain('compact');
    });
  });

  // =====================================================================
  // markdown-it-attrs compatibility
  // =====================================================================

  describe('attrs compatibility', () => {
    it('should add class to table via {.class} syntax', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '{.compact}',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('class="compact"');
    });

    it('should add id to table via {#id} syntax', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '{#my-table}',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('id="my-table"');
    });

    it('should combine multiple classes', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '{.compact .striped .no-border}',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('compact');
      expect(html).toContain('striped');
      expect(html).toContain('no-border');
    });
  });

  // =====================================================================
  // Edge cases
  // =====================================================================

  describe('edge cases', () => {
    it('should handle single-column table', () => {
      const input = [
        '| Solo |',
        '|------|',
        '| data |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<table>');
      expect(html).toContain('<td');
    });

    it('should handle empty cells', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '|   | 2 |',
        '| 3 |   |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<table>');
    });

    it('should render a table with many columns', () => {
      const input = [
        '| A | B | C | D | E | F |',
        '|---|---|---|---|---|---|',
        '| 1 | 2 | 3 | 4 | 5 | 6 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<table>');
      // Verify all 6 header cells are present
      expect(html).toContain('<th>A</th>');
      expect(html).toContain('<th>F</th>');
      expect(html).toContain('<td>1</td>');
      expect(html).toContain('<td>6</td>');
    });

    it('should handle multiple table bodies (sections)', () => {
      const input = [
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '',
        '| 3 | 4 |',
        ''
      ].join('\n');
      const html = md.render(input);
      expect(html).toContain('<table>');
    });
  });
});
