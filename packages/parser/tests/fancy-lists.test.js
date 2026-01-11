/**
 * Tests for fancy list formatting (letters, Roman numerals)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createParser } from '../src/index.js';
import { isFancyListsEnabled } from '../src/fancy-lists.js';

describe('fancy lists', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original env var
    originalEnv = process.env.PAGEMD_FANCY_LISTS;
  });

  afterEach(() => {
    // Restore original env var
    if (originalEnv === undefined) {
      delete process.env.PAGEMD_FANCY_LISTS;
    } else {
      process.env.PAGEMD_FANCY_LISTS = originalEnv;
    }
  });

  describe('isFancyListsEnabled', () => {
    it('should default to false when not set', () => {
      delete process.env.PAGEMD_FANCY_LISTS;
      expect(isFancyListsEnabled()).toBe(false);
    });

    it('should enable when env var is "1"', () => {
      process.env.PAGEMD_FANCY_LISTS = '1';
      expect(isFancyListsEnabled()).toBe(true);
    });

    it('should enable when env var is "true"', () => {
      process.env.PAGEMD_FANCY_LISTS = 'true';
      expect(isFancyListsEnabled()).toBe(true);
    });

    it('should enable when env var is "yes"', () => {
      process.env.PAGEMD_FANCY_LISTS = 'yes';
      expect(isFancyListsEnabled()).toBe(true);
    });

    it('should disable when env var is "0"', () => {
      process.env.PAGEMD_FANCY_LISTS = '0';
      expect(isFancyListsEnabled()).toBe(false);
    });

    it('should override env with options.fancyLists (camelCase)', () => {
      process.env.PAGEMD_FANCY_LISTS = '0';
      expect(isFancyListsEnabled({ fancyLists: true })).toBe(true);
    });

    it('should override env with options.fancy_lists (snake_case)', () => {
      process.env.PAGEMD_FANCY_LISTS = '0';
      expect(isFancyListsEnabled({ fancy_lists: true })).toBe(true);
    });

    it('should respect options.fancyLists = false even when env enabled', () => {
      process.env.PAGEMD_FANCY_LISTS = '1';
      expect(isFancyListsEnabled({ fancyLists: false })).toBe(false);
    });
  });

  describe('uppercase letters', () => {
    it('should render uppercase letter list', () => {
      const md = createParser({ fancyLists: true });
      // Note: Uppercase letters require TWO spaces after period to avoid false positives
      const input = 'A.  First item\nB.  Second item\nC.  Third item';
      const html = md.render(input);

      expect(html).toContain('<ol type="A">');
      expect(html).toContain('<li>First item</li>');
      expect(html).toContain('<li>Second item</li>');
      expect(html).toContain('<li>Third item</li>');
    });

    it('should not render fancy lists when disabled', () => {
      const md = createParser({ fancyLists: false });
      const input = 'A. First item\nB. Second item';
      const html = md.render(input);

      // Should render as paragraph, not list
      expect(html).not.toContain('<ol type="A">');
      expect(html).toContain('<p>');
    });
  });

  describe('lowercase letters', () => {
    it('should render lowercase letter list', () => {
      const md = createParser({ fancyLists: true });
      const input = 'a. First item\nb. Second item\nc. Third item';
      const html = md.render(input);

      expect(html).toContain('<ol type="a">');
      expect(html).toContain('<li>First item</li>');
      expect(html).toContain('<li>Second item</li>');
    });
  });

  describe('uppercase Roman numerals', () => {
    it('should render uppercase Roman numeral list', () => {
      const md = createParser({ fancyLists: true });
      // Note: Uppercase Roman numerals require TWO spaces after period
      const input = 'I.  Introduction\nII.  Background\nIII.  Methodology';
      const html = md.render(input);

      expect(html).toContain('<ol type="I">');
      expect(html).toContain('<li>Introduction</li>');
      expect(html).toContain('<li>Background</li>');
      expect(html).toContain('<li>Methodology</li>');
    });
  });

  describe('lowercase Roman numerals', () => {
    it('should render lowercase Roman numeral list', () => {
      const md = createParser({ fancyLists: true });
      const input = 'i. First clause\nii. Second clause\niii. Third clause';
      const html = md.render(input);

      expect(html).toContain('<ol type="i">');
      expect(html).toContain('<li>First clause</li>');
      expect(html).toContain('<li>Second clause</li>');
    });
  });

  describe('continuation with #', () => {
    it('should continue numbering with #', () => {
      const md = createParser({ fancyLists: true });
      const input = '1. First\n2. Second\n\nParagraph\n\n#. Third\n#. Fourth';
      const html = md.render(input);

      expect(html).toContain('<li>First</li>');
      expect(html).toContain('<li>Second</li>');
      expect(html).toContain('<li>Third</li>');
      expect(html).toContain('<li>Fourth</li>');
    });
  });

  describe('custom start value', () => {
    it('should start list at custom number', () => {
      const md = createParser({ fancyLists: true });
      const input = '5. Fifth item\n6. Sixth item';
      const html = md.render(input);

      expect(html).toContain('<ol start="5">');
      expect(html).toContain('<li>Fifth item</li>');
      expect(html).toContain('<li>Sixth item</li>');
    });
  });

  describe('nested lists', () => {
    it('should handle nested fancy lists', () => {
      const md = createParser({ fancyLists: true });
      // Note: Uppercase letters/Roman require TWO spaces after period
      const input = `I.  Top level
   A.  Nested level
   B.  Nested level
II.  Top level`;
      const html = md.render(input);

      expect(html).toContain('<ol type="I">');
      expect(html).toContain('<ol type="A">');
    });
  });

  describe('standard lists when disabled', () => {
    it('should render standard numbered lists when fancy lists disabled', () => {
      const md = createParser({ fancyLists: false });
      const input = '1. First\n2. Second\n3. Third';
      const html = md.render(input);

      expect(html).toContain('<ol>');
      expect(html).toContain('<li>First</li>');
      expect(html).not.toContain('type="');
    });
  });

  describe('integration with other plugins', () => {
    it('should work with inline attributes', () => {
      const md = createParser({ fancyLists: true });
      // Note: Uppercase letters require TWO spaces
      const input = 'A.  First item {.highlight}\nB.  Second item';
      const html = md.render(input);

      expect(html).toContain('<ol type="A">');
      expect(html).toContain('class="highlight"');
    });

    it('should work in nested contexts', () => {
      const md = createParser({ fancyLists: true });
      // Note: Uppercase letters require TWO spaces
      const input = '> A.  Quote item one\n> B.  Quote item two';
      const html = md.render(input);

      expect(html).toContain('<blockquote>');
      expect(html).toContain('<ol type="A">');
    });
  });

  describe('edge cases', () => {
    it('should handle empty list items', () => {
      const md = createParser({ fancyLists: true });
      // Note: Uppercase letters require TWO spaces
      const input = 'A.  \nB.  Second';
      const html = md.render(input);

      expect(html).toContain('<ol type="A">');
    });

    it('should handle list with single item', () => {
      const md = createParser({ fancyLists: true });
      // Note: Uppercase letters require TWO spaces
      const input = 'A.  Only item';
      const html = md.render(input);

      expect(html).toContain('<ol type="A">');
      expect(html).toContain('<li>Only item</li>');
    });

    it('should handle mixed spacing', () => {
      const md = createParser({ fancyLists: true });
      const input = 'i.  First item\nii.   Second item';
      const html = md.render(input);

      expect(html).toContain('<ol type="i">');
      expect(html).toContain('<li>First item</li>');
      expect(html).toContain('<li>Second item</li>');
    });
  });

  describe('environment variable integration', () => {
    it('should enable via env var', () => {
      process.env.PAGEMD_FANCY_LISTS = '1';
      const md = createParser();
      // Note: Uppercase letters require TWO spaces
      const input = 'A.  First\nB.  Second';
      const html = md.render(input);

      expect(html).toContain('<ol type="A">');
    });

    it('should disable via env var', () => {
      process.env.PAGEMD_FANCY_LISTS = '0';
      const md = createParser();
      // Note: Uppercase letters require TWO spaces
      const input = 'A.  First\nB.  Second';
      const html = md.render(input);

      expect(html).not.toContain('<ol type="A">');
    });
  });
});
