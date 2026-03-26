/**
 * @pagemd/renderer-web - TOC module tests
 */

import { describe, it, expect } from 'vitest';
import { extractHeadings, extractSectionHeadings, generateTocHtml, fillTocPlaceholder } from '../src/toc.js';

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

    it('should use frontmatter levels when directive has no data-levels', () => {
      const html = `
        <div class="toc-placeholder"></div>
        <h1>Title</h1>
        <h2>Chapter</h2>
        <h3>Section</h3>
      `;

      // Bare placeholder + frontmatter levels:2 → only h1+h2 in TOC
      const result = fillTocPlaceholder(html, { levels: 2, minLevel: 1 });

      const tocNav = result.match(/<nav class="toc"[\s\S]*?<\/nav>/)?.[0] || '';
      expect(tocNav).toContain('Title');
      expect(tocNav).toContain('Chapter');
      expect(tocNav).not.toContain('Section');
    });

    it('directive data-levels overrides frontmatter levels', () => {
      const html = `
        <div class="toc-placeholder" data-levels="3"></div>
        <h1>Title</h1>
        <h2>Chapter</h2>
        <h3>Section</h3>
      `;

      // Directive says 3, frontmatter says 2 → directive wins, h3 included
      const result = fillTocPlaceholder(html, { levels: 2, minLevel: 1 });

      const tocNav = result.match(/<nav class="toc"[\s\S]*?<\/nav>/)?.[0] || '';
      expect(tocNav).toContain('Title');
      expect(tocNav).toContain('Chapter');
      expect(tocNav).toContain('Section');
    });

    it('should exclude h1 by default (minLevel: 2)', () => {
      const html = `
        <div class="toc-placeholder" data-levels="3"></div>
        <h1>Document Title</h1>
        <h2>Chapter 1</h2>
        <h3>Section 1.1</h3>
      `;

      const result = fillTocPlaceholder(html, { levels: 3, minLevel: 2 });

      expect(result).not.toContain('>Document Title</a>');
      expect(result).toContain('Chapter 1');
      expect(result).toContain('Section 1.1');
    });

    it('should include h1 when minLevel is 1', () => {
      const html = `
        <div class="toc-placeholder" data-levels="3"></div>
        <h1>Document Title</h1>
        <h2>Chapter 1</h2>
      `;

      const result = fillTocPlaceholder(html, { levels: 3, minLevel: 1 });

      expect(result).toContain('Document Title');
      expect(result).toContain('Chapter 1');
    });

    it('should respect data-min-level from directive over options', () => {
      const html = `
        <div class="toc-placeholder" data-levels="3" data-min-level="1"></div>
        <h1>Title</h1>
        <h2>Section</h2>
      `;

      // options say minLevel:2, but directive says 1 — directive wins
      const result = fillTocPlaceholder(html, { levels: 3, minLevel: 2 });

      expect(result).toContain('Title');
      expect(result).toContain('Section');
    });

    it('should combine min and max levels (min=2, levels=3 → h2+h3 only)', () => {
      const html = `
        <div class="toc-placeholder" data-levels="3" data-min-level="2"></div>
        <h1>Title</h1>
        <h2>Chapter</h2>
        <h3>Section</h3>
        <h4>Deep</h4>
      `;

      const result = fillTocPlaceholder(html, { levels: 3, minLevel: 2 });

      // Extract just the nav.toc content for assertion
      const tocNav = result.match(/<nav class="toc"[\s\S]*?<\/nav>/)?.[0] || '';
      expect(tocNav).not.toContain('>Title</a>');
      expect(tocNav).toContain('Chapter');
      expect(tocNav).toContain('Section');
      expect(tocNav).not.toContain('Deep');
    });
  });

  describe('extractHeadings with minLevel', () => {
    it('should filter headings below minLevel', () => {
      const html = `
        <h1>Title</h1>
        <h2>Chapter</h2>
        <h3>Section</h3>
      `;

      const headings = extractHeadings(html, 3, 2);
      expect(headings).toHaveLength(2);
      expect(headings[0].level).toBe(2);
      expect(headings[1].level).toBe(3);
    });

    it('should include all when minLevel is 1', () => {
      const html = `
        <h1>Title</h1>
        <h2>Chapter</h2>
      `;

      const headings = extractHeadings(html, 3, 1);
      expect(headings).toHaveLength(2);
    });

    it('should default minLevel to 1 if not provided', () => {
      const html = '<h1>Title</h1><h2>Section</h2>';
      const headings = extractHeadings(html, 3);
      expect(headings).toHaveLength(2);
    });
  });

  describe('extractSectionHeadings', () => {
    it('should collect sub-headings within section boundary', () => {
      const html = '<h2 id="ch1">Chapter 1</h2><h3 id="s1">Section 1</h3><h3 id="s2">Section 2</h3><h2 id="ch2">Chapter 2</h2>';

      // Start after h2, boundary is level 2
      const startIdx = html.indexOf('</h2>') + '</h2>'.length;
      const headings = extractSectionHeadings(html, startIdx, 2);

      expect(headings).toHaveLength(2);
      expect(headings[0]).toEqual({ id: 's1', text: 'Section 1', level: 3 });
      expect(headings[1]).toEqual({ id: 's2', text: 'Section 2', level: 3 });
    });

    it('should stop at next heading of same or higher level', () => {
      const html = '<h2 id="a">A</h2><h3 id="a1">A1</h3><h2 id="b">B</h2><h3 id="b1">B1</h3>';

      const startIdx = html.indexOf('</h2>') + '</h2>'.length;
      const headings = extractSectionHeadings(html, startIdx, 2);

      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('a1');
    });

    it('should stop at higher-level heading', () => {
      const html = '<h3 id="s1">Section</h3><h4 id="ss1">Sub</h4><h2 id="ch2">Chapter</h2>';

      const startIdx = html.indexOf('</h3>') + '</h3>'.length;
      const headings = extractSectionHeadings(html, startIdx, 3);

      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('ss1');
    });

    it('should return empty if no sub-headings found', () => {
      const html = '<h2 id="ch1">Chapter 1</h2><p>Content</p><h2 id="ch2">Chapter 2</h2>';

      const startIdx = html.indexOf('</h2>') + '</h2>'.length;
      const headings = extractSectionHeadings(html, startIdx, 2);

      expect(headings).toHaveLength(0);
    });

    it('should respect maxLevel parameter', () => {
      const html = '<h2 id="ch">Chapter</h2><h3 id="s1">S1</h3><h4 id="ss1">SS1</h4><h5 id="sss1">SSS1</h5>';

      const startIdx = html.indexOf('</h2>') + '</h2>'.length;
      const headings = extractSectionHeadings(html, startIdx, 2, 3);

      expect(headings).toHaveLength(1);
      expect(headings[0].id).toBe('s1');
    });
  });

  describe('section TOC via fillTocPlaceholder', () => {
    it('should generate section TOC for headings within boundary', () => {
      const html = `<h2 id="chapter-1">Chapter 1</h2>
<div class="toc-placeholder" data-levels="6" data-scope="section"></div>
<h3 id="section-1">Section 1</h3>
<h3 id="section-2">Section 2</h3>
<h2 id="chapter-2">Chapter 2</h2>`;

      const result = fillTocPlaceholder(html, { levels: 6 });

      expect(result).toContain('toc-section');
      // Extract just the section TOC nav for precise assertions
      const sectionToc = result.match(/<nav class="toc toc-section"[\s\S]*?<\/nav>/)?.[0] || '';
      expect(sectionToc).toContain('Section 1');
      expect(sectionToc).toContain('Section 2');
      expect(sectionToc).not.toContain('Chapter 2');
      // Section TOC should not have a title heading
      expect(sectionToc).not.toContain('toc-title');
    });

    it('should handle section TOC with no sub-headings', () => {
      const html = `<h2 id="ch1">Chapter</h2>
<div class="toc-placeholder" data-levels="6" data-scope="section"></div>
<p>No sub-headings here</p>
<h2 id="ch2">Next Chapter</h2>`;

      const result = fillTocPlaceholder(html, { levels: 6 });

      expect(result).not.toContain('toc-placeholder');
      expect(result).not.toContain('toc-section');
    });

    it('should handle multiple section TOCs', () => {
      const html = `<h2 id="ch1">Chapter 1</h2>
<div class="toc-placeholder" data-levels="6" data-scope="section"></div>
<h3 id="s1-1">Section 1.1</h3>
<h3 id="s1-2">Section 1.2</h3>
<h2 id="ch2">Chapter 2</h2>
<div class="toc-placeholder" data-levels="6" data-scope="section"></div>
<h3 id="s2-1">Section 2.1</h3>`;

      const result = fillTocPlaceholder(html, { levels: 6 });

      expect(result).toContain('Section 1.1');
      expect(result).toContain('Section 1.2');
      expect(result).toContain('Section 2.1');
      // Both section TOCs present
      const navMatches = result.match(/toc-section/g);
      expect(navMatches).toHaveLength(2);
    });

    it('should handle global and section TOC in same document', () => {
      const html = `<div class="toc-placeholder" data-levels="3"></div>
<h1 id="title">Title</h1>
<h2 id="ch1">Chapter 1</h2>
<div class="toc-placeholder" data-levels="6" data-scope="section"></div>
<h3 id="s1">Section 1</h3>
<h2 id="ch2">Chapter 2</h2>`;

      const result = fillTocPlaceholder(html, { levels: 3, minLevel: 2 });

      // Global TOC
      expect(result).toContain('<nav class="toc"');
      // Section TOC
      expect(result).toContain('toc-section');
      // Global TOC should have title, section should not
      expect(result).toContain('toc-title');
    });
  });

  describe('generateTocHtml section mode', () => {
    it('should generate section TOC without title heading', () => {
      const headings = [
        { id: 's1', text: 'Section 1', level: 3 },
        { id: 's2', text: 'Section 2', level: 3 }
      ];

      const toc = generateTocHtml(headings, 'Contents', {}, { section: true });

      expect(toc).toContain('toc-section');
      expect(toc).not.toContain('toc-title');
      expect(toc).toContain('Section 1');
      expect(toc).toContain('Section 2');
    });
  });
});
