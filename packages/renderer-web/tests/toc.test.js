/**
 * @pagemd/renderer-web - TOC module tests
 */

import { describe, it, expect } from 'vitest';
import { extractHeadings, generateTocHtml, fillTocPlaceholder } from '../src/toc.js';

describe('TOC Module', () => {
  describe('extractHeadings', () => {
    it('should extract headings from HTML', () => {
      const html = `
        <h1>Chapter 1</h1>
        <p>Content</p>
        <h2>Section 1.1</h2>
        <h2>Section 1.2</h2>
        <h1>Chapter 2</h1>
      `;
      const headings = extractHeadings(html, 3);

      expect(headings).toHaveLength(4);
      expect(headings[0]).toEqual({ id: 'chapter-1', text: 'Chapter 1', level: 1 });
      expect(headings[1]).toEqual({ id: 'section-11', text: 'Section 1.1', level: 2 });
      expect(headings[2]).toEqual({ id: 'section-12', text: 'Section 1.2', level: 2 });
      expect(headings[3]).toEqual({ id: 'chapter-2', text: 'Chapter 2', level: 1 });
    });

    it('should respect maxLevel parameter', () => {
      const html = `
        <h1>Title</h1>
        <h2>Section</h2>
        <h3>Subsection</h3>
        <h4>Deep</h4>
      `;

      const headings = extractHeadings(html, 2);
      expect(headings).toHaveLength(2);
      expect(headings.map(h => h.level)).toEqual([1, 2]);
    });

    it('should handle empty input', () => {
      expect(extractHeadings('', 3)).toEqual([]);
      expect(extractHeadings(null, 3)).toEqual([]);
      expect(extractHeadings(undefined, 3)).toEqual([]);
    });

    it('should generate slugified IDs', () => {
      const html = '<h1>Hello World!</h1>';
      const headings = extractHeadings(html, 1);

      expect(headings[0].id).toBe('hello-world');
    });

    it('should handle special characters in headings', () => {
      const html = '<h1>What is C++?</h1>';
      const headings = extractHeadings(html, 1);

      expect(headings[0].id).toBe('what-is-c');
    });
  });

  describe('generateTocHtml', () => {
    it('should generate nested list structure', () => {
      const headings = [
        { id: 'intro', text: 'Introduction', level: 1 },
        { id: 'background', text: 'Background', level: 2 },
        { id: 'main', text: 'Main Content', level: 1 }
      ];

      const toc = generateTocHtml(headings, 'Contents');

      expect(toc).toContain('<nav class="toc">');
      expect(toc).toContain('<h2 class="toc-title">Contents</h2>');
      expect(toc).toContain('<a href="#intro">Introduction</a>');
      expect(toc).toContain('<a href="#background">Background</a>');
      expect(toc).toContain('<a href="#main">Main Content</a>');
    });

    it('should return empty string for empty headings', () => {
      expect(generateTocHtml([], 'Contents')).toBe('');
      expect(generateTocHtml(null, 'Contents')).toBe('');
    });

    it('should use custom title', () => {
      const headings = [{ id: 'test', text: 'Test', level: 1 }];
      const toc = generateTocHtml(headings, 'Table of Contents');

      expect(toc).toContain('Table of Contents');
    });
  });

  describe('fillTocPlaceholder', () => {
    it('should replace placeholder with TOC', () => {
      const html = `
        <div class="toc-placeholder"></div>
        <h1>Chapter 1</h1>
        <h2>Section 1.1</h2>
      `;

      const result = fillTocPlaceholder(html, { title: 'Contents', levels: 3 });

      expect(result).not.toContain('toc-placeholder');
      expect(result).toContain('<nav class="toc">');
      expect(result).toContain('Chapter 1');
    });

    it('should return unchanged HTML if no placeholder', () => {
      const html = '<h1>Title</h1><p>Content</p>';
      const result = fillTocPlaceholder(html, { title: 'Contents', levels: 3 });

      expect(result).toBe(html);
    });

    it('should remove placeholder if no headings found', () => {
      const html = '<div class="toc-placeholder"></div><p>No headings here</p>';
      const result = fillTocPlaceholder(html, { title: 'Contents', levels: 3 });

      expect(result).not.toContain('toc-placeholder');
    });

    it('should handle data-levels attribute', () => {
      const html = `
        <div class="toc-placeholder" data-levels="2"></div>
        <h1>Title</h1>
        <h2>Section</h2>
        <h3>Subsection</h3>
      `;

      const result = fillTocPlaceholder(html, { levels: 2 });

      // Should include h1 and h2, but not h3
      expect(result).toContain('Title');
      expect(result).toContain('Section');
    });
  });
});
