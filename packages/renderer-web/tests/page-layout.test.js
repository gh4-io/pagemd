/**
 * @pagemd/renderer-web/page-layout tests
 */

import { describe, it, expect } from 'vitest';
import { generatePageLayoutCSS, tokensToCSSContent, mergeFooterConfig, parseFirstPage } from '../src/page-layout.js';

describe('@pagemd/renderer-web/page-layout', () => {
  describe('generatePageLayoutCSS', () => {
    it('should return empty string for null metadata', () => {
      expect(generatePageLayoutCSS(null)).toBe('');
    });

    it('should return empty string for empty metadata', () => {
      expect(generatePageLayoutCSS({})).toBe('');
    });

    it('should return empty string when all features disabled', () => {
      const metadata = {
        page_numbers: false,
        running_header: false,
        running_footer: false
      };
      expect(generatePageLayoutCSS(metadata)).toBe('');
    });
  });

  describe(':::PAGE and :::PAGES tokens', () => {
    it('should convert :::PAGE to counter(page)', () => {
      const metadata = { running_footer: { left: ':::PAGE' } };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('counter(page)');
      expect(css).not.toContain(':::PAGE');
    });

    it('should convert :::PAGES to counter(pages)', () => {
      const metadata = { running_footer: { right: ':::PAGES' } };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('counter(pages)');
      expect(css).not.toContain(':::PAGES');
    });

    it('should handle mixed text and tokens', () => {
      const metadata = { running_footer: { left: 'Page :::PAGE of :::PAGES' } };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('"Page "');
      expect(css).toContain('counter(page)');
      expect(css).toContain('" of "');
      expect(css).toContain('counter(pages)');
    });

    it('should handle tokens in any position', () => {
      const metadata = {
        running_header: { left: ':::PAGE', center: 'Title', right: ':::PAGES' },
        running_footer: { left: 'Company', right: ':::PAGE/:::PAGES' }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-header-left: counter(page)');
      expect(css).toContain('--page-header-center: "Title"');
      expect(css).toContain('--page-header-right: counter(pages)');
      expect(css).toContain('--page-footer-left: "Company"');
      expect(css).toContain('--page-footer-right:');
    });
  });

  describe('page_numbers shorthand', () => {
    it('should expand page_numbers: true to footer center', () => {
      const metadata = { page_numbers: true };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-center');
      expect(css).toContain('counter(page)');
      expect(css).toContain('counter(pages)');
    });

    it('should expand page_numbers: "page" to just page number', () => {
      const metadata = { page_numbers: 'page' };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-center: counter(page)');
      expect(css).not.toContain('counter(pages)');
    });

    it('should expand page_numbers: "Page X of Y"', () => {
      const metadata = { page_numbers: 'Page X of Y' };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('"Page "');
      expect(css).toContain('counter(page)');
      expect(css).toContain('" of "');
      expect(css).toContain('counter(pages)');
    });

    it('should allow running_footer to override page_numbers', () => {
      const metadata = {
        page_numbers: true,
        running_footer: { left: ':::PAGE', right: 'Custom' }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-left: counter(page)');
      expect(css).toContain('--page-footer-right: "Custom"');
      // center from page_numbers should still be present since not overridden
      expect(css).toContain('--page-footer-center');
    });

    it('should support page_numbers with position object', () => {
      const metadata = {
        page_numbers: { position: 'right', format: ':::PAGE' }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-right: counter(page)');
    });
  });

  describe('running_header', () => {
    it('should generate CSS for string header (centers)', () => {
      const metadata = { running_header: 'Document Title' };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain(':root');
      expect(css).toContain('--page-header-center');
      expect(css).toContain('"Document Title"');
    });

    it('should support object with left/center/right', () => {
      const metadata = {
        running_header: {
          left: 'Left Text',
          center: 'Center Text',
          right: 'Right Text'
        }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-header-left');
      expect(css).toContain('--page-header-center');
      expect(css).toContain('--page-header-right');
      expect(css).toContain('"Left Text"');
      expect(css).toContain('"Center Text"');
      expect(css).toContain('"Right Text"');
    });

    it('should support span (full width)', () => {
      const metadata = {
        running_header: { span: 'Full Width Title' }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-header-left: none');
      expect(css).toContain('--page-header-center: "Full Width Title"');
      expect(css).toContain('--page-header-right: none');
    });

    it('should support tokens in header', () => {
      const metadata = {
        running_header: { right: 'Page :::PAGE' }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-header-right: "Page " counter(page)');
    });
  });

  describe('running_footer', () => {
    it('should generate CSS for string footer', () => {
      const metadata = { running_footer: 'Confidential' };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain(':root');
      expect(css).toContain('--page-footer-center');
      expect(css).toContain('"Confidential"');
    });

    it('should support object with left/center/right', () => {
      const metadata = {
        running_footer: {
          left: 'Company',
          right: ':::PAGE'
        }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-left');
      expect(css).toContain('--page-footer-right');
      expect(css).not.toContain('--page-footer-center');
    });

    it('should support span', () => {
      const metadata = {
        running_footer: { span: ':::PAGE of :::PAGES' }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-left: none');
      expect(css).toContain('--page-footer-center:');
      expect(css).toContain('counter(page)');
      expect(css).toContain('--page-footer-right: none');
    });
  });

  describe('page_margin_font_size', () => {
    it('should generate CSS for font size override', () => {
      const metadata = {
        page_numbers: true,
        page_margin_font_size: '10pt'
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-margin-font-size: 10pt');
    });
  });

  describe('tokensToCSSContent', () => {
    it('should return none for empty input', () => {
      expect(tokensToCSSContent('')).toBe('none');
      expect(tokensToCSSContent(null)).toBe('none');
    });

    it('should quote plain text', () => {
      expect(tokensToCSSContent('Hello')).toBe('"Hello"');
    });

    it('should convert single :::PAGE', () => {
      expect(tokensToCSSContent(':::PAGE')).toBe('counter(page)');
    });

    it('should convert single :::PAGES', () => {
      expect(tokensToCSSContent(':::PAGES')).toBe('counter(pages)');
    });

    it('should handle prefix text', () => {
      expect(tokensToCSSContent('Page :::PAGE')).toBe('"Page " counter(page)');
    });

    it('should handle suffix text', () => {
      expect(tokensToCSSContent(':::PAGE pages')).toBe('counter(page) " pages"');
    });

    it('should handle both tokens', () => {
      const result = tokensToCSSContent(':::PAGE of :::PAGES');
      expect(result).toBe('counter(page) " of " counter(pages)');
    });

    it('should handle complex mixed content', () => {
      const result = tokensToCSSContent('Page :::PAGE of :::PAGES total');
      expect(result).toBe('"Page " counter(page) " of " counter(pages) " total"');
    });
  });

  describe('mergeFooterConfig', () => {
    it('should return null when both inputs are falsy', () => {
      expect(mergeFooterConfig(null, null)).toBe(null);
      expect(mergeFooterConfig(false, false)).toBe(null);
    });

    it('should return page_numbers preset when no footer config', () => {
      const result = mergeFooterConfig(null, true);
      expect(result).toEqual({ center: ':::PAGE of :::PAGES' });
    });

    it('should return footer config when no page_numbers', () => {
      const result = mergeFooterConfig({ left: 'Test' }, null);
      expect(result).toEqual({ left: 'Test' });
    });

    it('should merge with footer overriding page_numbers', () => {
      const result = mergeFooterConfig({ left: 'Custom' }, true);
      expect(result).toEqual({ center: ':::PAGE of :::PAGES', left: 'Custom' });
    });

    it('should convert string footer to object', () => {
      const result = mergeFooterConfig('Centered', null);
      expect(result).toEqual({ center: 'Centered' });
    });
  });

  describe('inside/outside positions (book binding)', () => {
    it('should generate CSS for inside position', () => {
      const metadata = { running_footer: { inside: ':::PAGE' } };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-inside: counter(page)');
    });

    it('should generate CSS for outside position', () => {
      const metadata = { running_header: { outside: 'Document Title' } };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-header-outside: "Document Title"');
    });

    it('should support mixed fixed and binding positions', () => {
      const metadata = {
        running_footer: {
          inside: 'Chapter :::PAGE',
          center: ':::PAGE of :::PAGES'
        }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-inside');
      expect(css).toContain('--page-footer-center');
    });

    it('should support full book layout with inside/outside', () => {
      const metadata = {
        running_header: { outside: 'Book Title', inside: 'Chapter Name' },
        running_footer: { outside: ':::PAGE' }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-header-outside: "Book Title"');
      expect(css).toContain('--page-header-inside: "Chapter Name"');
      expect(css).toContain('--page-footer-outside: counter(page)');
    });
  });

  describe('first_page', () => {
    it('should suppress all header/footer when first_page: false', () => {
      const metadata = {
        running_header: 'Title',
        running_footer: ':::PAGE',
        first_page: false
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-first-header-left: none');
      expect(css).toContain('--page-first-header-center: none');
      expect(css).toContain('--page-first-header-right: none');
      expect(css).toContain('--page-first-footer-left: none');
      expect(css).toContain('--page-first-footer-center: none');
      expect(css).toContain('--page-first-footer-right: none');
    });

    it('should suppress only header when first_page.header: false', () => {
      const metadata = {
        running_header: 'Title',
        running_footer: ':::PAGE',
        first_page: { header: false }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-first-header-left: none');
      expect(css).toContain('--page-first-header-center: none');
      expect(css).toContain('--page-first-header-right: none');
      expect(css).not.toContain('--page-first-footer');
    });

    it('should suppress only footer when first_page.footer: false', () => {
      const metadata = {
        running_header: 'Title',
        running_footer: ':::PAGE',
        first_page: { footer: false }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).not.toContain('--page-first-header');
      expect(css).toContain('--page-first-footer-left: none');
      expect(css).toContain('--page-first-footer-center: none');
      expect(css).toContain('--page-first-footer-right: none');
    });

    it('should allow custom first page header', () => {
      const metadata = {
        running_header: 'Regular Header',
        first_page: { header: { center: 'Cover Page' } }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-header-center: "Regular Header"');
      expect(css).toContain('--page-first-header-center: "Cover Page"');
    });

    it('should allow custom first page footer with tokens', () => {
      const metadata = {
        running_footer: { right: ':::PAGE' },
        first_page: { footer: { center: 'Page :::PAGE' } }
      };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('--page-footer-right: counter(page)');
      expect(css).toContain('--page-first-footer-center: "Page " counter(page)');
    });

    it('should handle parseFirstPage with false', () => {
      const vars = parseFirstPage(false);
      expect(vars).toHaveLength(6);
      expect(vars[0]).toContain('--page-first-header-left: none');
    });

    it('should handle parseFirstPage with header only suppression', () => {
      const vars = parseFirstPage({ header: false });
      expect(vars).toHaveLength(3);
      expect(vars.every(v => v.includes('header'))).toBe(true);
    });
  });

  describe('CSS escaping', () => {
    it('should escape quotes in header text', () => {
      const metadata = { running_header: 'Say "Hello"' };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('\\"Hello\\"');
    });

    it('should escape backslashes in header text', () => {
      const metadata = { running_header: 'Path\\to\\file' };
      const css = generatePageLayoutCSS(metadata);

      expect(css).toContain('Path\\\\to\\\\file');
    });
  });
});
