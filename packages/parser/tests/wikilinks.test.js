/**
 * Tests for Obsidian-style wikilink syntax
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import { wikilinkPlugin, slugify } from '../src/wikilinks.js';

describe('wikilinkPlugin', () => {
  let md;

  beforeEach(() => {
    md = new MarkdownIt();
  });

  describe('basic wikilinks', () => {
    it('should render simple wikilink', () => {
      md.use(wikilinkPlugin);
      const input = '[[Page Name]]';
      const html = md.render(input);

      expect(html).toContain('<a href="Page Name"');
      expect(html).toContain('class="wikilink"');
      expect(html).toContain('>Page Name</a>');
    });

    it('should render wikilink with display text', () => {
      md.use(wikilinkPlugin);
      const input = '[[Page Name|Display Text]]';
      const html = md.render(input);

      expect(html).toContain('<a href="Page Name"');
      expect(html).toContain('class="wikilink"');
      expect(html).toContain('>Display Text</a>');
    });

    it('should render multiple wikilinks', () => {
      md.use(wikilinkPlugin);
      const input = 'Link to [[Page 1]] and [[Page 2]]';
      const html = md.render(input);

      expect(html).toContain('href="Page 1"');
      expect(html).toContain('href="Page 2"');
    });

    it('should handle wikilinks in sentences', () => {
      md.use(wikilinkPlugin);
      const input = 'See [[Documentation]] for more info.';
      const html = md.render(input);

      expect(html).toContain('See <a href="Documentation"');
      expect(html).toContain('>Documentation</a> for more info.');
    });

    it('should trim whitespace in page names and display text', () => {
      md.use(wikilinkPlugin);
      const input = '[[  Page Name  |  Display  ]]';
      const html = md.render(input);

      expect(html).toContain('href="Page Name"');
      expect(html).toContain('>Display</a>');
    });
  });

  describe('wikilink options', () => {
    it('should use custom baseUrl', () => {
      md.use(wikilinkPlugin, { baseUrl: '/docs' });
      const input = '[[Page Name]]';
      const html = md.render(input);

      expect(html).toContain('href="/docs/Page Name"');
    });

    it('should use custom linkClass', () => {
      md.use(wikilinkPlugin, { linkClass: 'custom-link' });
      const input = '[[Page]]';
      const html = md.render(input);

      expect(html).toContain('class="custom-link"');
      expect(html).not.toContain('class="wikilink"');
    });

    it('should handle empty baseUrl', () => {
      md.use(wikilinkPlugin, { baseUrl: '' });
      const input = '[[Page]]';
      const html = md.render(input);

      expect(html).toContain('href="Page"');
    });

    it('should combine baseUrl with page names', () => {
      md.use(wikilinkPlugin, { baseUrl: 'https://example.com' });
      const input = '[[my-page]]';
      const html = md.render(input);

      expect(html).toContain('href="https://example.com/my-page"');
    });
  });

  describe('image embeds', () => {
    it('should render embedded image', () => {
      md.use(wikilinkPlugin);
      const input = '![[image.png]]';
      const html = md.render(input);

      expect(html).toContain('<img');
      expect(html).toContain('src="image.png"');
      expect(html).toContain('class="embedded-image"');
    });

    it('should use custom imageBaseUrl', () => {
      md.use(wikilinkPlugin, { imageBaseUrl: '/assets' });
      const input = '![[image.png]]';
      const html = md.render(input);

      expect(html).toContain('src="/assets/image.png"');
    });

    it('should use custom imageClass', () => {
      md.use(wikilinkPlugin, { imageClass: 'custom-img' });
      const input = '![[image.png]]';
      const html = md.render(input);

      expect(html).toContain('class="custom-img"');
      expect(html).not.toContain('class="embedded-image"');
    });

    it('should handle image paths with subdirectories', () => {
      md.use(wikilinkPlugin);
      const input = '![[assets/images/photo.jpg]]';
      const html = md.render(input);

      expect(html).toContain('src="assets/images/photo.jpg"');
    });

    it('should set alt text from filename', () => {
      md.use(wikilinkPlugin);
      const input = '![[my-image.png]]';
      const html = md.render(input);

      expect(html).toContain('alt="my-image.png"');
    });

    it('should render multiple embedded images', () => {
      md.use(wikilinkPlugin);
      const input = '![[img1.png]] and ![[img2.jpg]]';
      const html = md.render(input);

      expect(html).toContain('src="img1.png"');
      expect(html).toContain('src="img2.jpg"');
    });

    it('should trim whitespace in image paths', () => {
      md.use(wikilinkPlugin);
      const input = '![[  image.png  ]]';
      const html = md.render(input);

      expect(html).toContain('src="image.png"');
    });
  });

  describe('mixed content', () => {
    it('should handle both wikilinks and embeds', () => {
      md.use(wikilinkPlugin);
      const input = 'See [[Page]] and ![[image.png]]';
      const html = md.render(input);

      expect(html).toContain('href="Page"');
      expect(html).toContain('src="image.png"');
    });

    it('should work with standard markdown links', () => {
      md.use(wikilinkPlugin);
      const input = '[[Wikilink]] and [Standard](link.html)';
      const html = md.render(input);

      expect(html).toContain('class="wikilink"');
      expect(html).toContain('href="link.html"');
    });

    it('should work with standard markdown images', () => {
      md.use(wikilinkPlugin);
      const input = '![[Embedded]] and ![Standard](image.png)';
      const html = md.render(input);

      expect(html).toContain('class="embedded-image"');
      expect(html).toContain('src="image.png"');
    });

    it('should work in lists', () => {
      md.use(wikilinkPlugin);
      const input = `- [[Link 1]]
- [[Link 2]]
- [[Link 3]]`;
      const html = md.render(input);

      expect(html).toContain('href="Link 1"');
      expect(html).toContain('href="Link 2"');
      expect(html).toContain('href="Link 3"');
    });

    it('should work in headings', () => {
      md.use(wikilinkPlugin);
      const input = '# Heading with [[Link]]';
      const html = md.render(input);

      expect(html).toContain('<h1');
      expect(html).toContain('href="Link"');
    });

    it('should work in blockquotes', () => {
      md.use(wikilinkPlugin);
      const input = '> Quote with [[Link]]';
      const html = md.render(input);

      expect(html).toContain('<blockquote');
      expect(html).toContain('href="Link"');
    });
  });

  describe('edge cases', () => {
    it('should not render incomplete brackets', () => {
      md.use(wikilinkPlugin);
      const input = '[Page Name]';
      const html = md.render(input);

      expect(html).not.toContain('class="wikilink"');
    });

    it('should not parse nested brackets in page names', () => {
      md.use(wikilinkPlugin);
      const input = '[[Page [with] brackets]]';
      const html = md.render(input);

      // The wikilink plugin requires proper closing ]], so nested brackets won't parse
      expect(html).not.toContain('class="wikilink"');
    });

    it('should not parse empty wikilinks', () => {
      md.use(wikilinkPlugin);
      const input = '[[]]';
      const html = md.render(input);

      // Empty wikilinks don't match the pattern
      expect(html).not.toContain('class="wikilink"');
    });

    it('should not parse wikilinks with only pipe', () => {
      md.use(wikilinkPlugin);
      const input = '[[Page|]]';
      const html = md.render(input);

      // This edge case doesn't match the expected pattern
      expect(html).not.toContain('class="wikilink"');
    });

    it('should handle special characters in page names', () => {
      md.use(wikilinkPlugin);
      const input = '[[Page-Name_123]]';
      const html = md.render(input);

      expect(html).toContain('href="Page-Name_123"');
    });

    it('should handle spaces in page names', () => {
      md.use(wikilinkPlugin);
      const input = '[[My Page Name]]';
      const html = md.render(input);

      expect(html).toContain('href="My Page Name"');
    });

    it('should not interfere with code blocks', () => {
      md.use(wikilinkPlugin);
      const input = '`[[Not a link]]`';
      const html = md.render(input);

      expect(html).toContain('<code>');
      expect(html).not.toContain('class="wikilink"');
    });

    it('should not interfere with inline code', () => {
      md.use(wikilinkPlugin);
      const input = 'Code: `[[example]]` text';
      const html = md.render(input);

      expect(html).toContain('<code>[[example]]</code>');
      expect(html).not.toContain('class="wikilink"');
    });
  });

  describe('configuration combinations', () => {
    it('should use all custom options together', () => {
      md.use(wikilinkPlugin, {
        baseUrl: '/wiki',
        imageBaseUrl: '/images',
        linkClass: 'internal-link',
        imageClass: 'wiki-image'
      });

      const input = '[[Page]] and ![[img.png]]';
      const html = md.render(input);

      expect(html).toContain('href="/wiki/Page"');
      expect(html).toContain('class="internal-link"');
      expect(html).toContain('src="/images/img.png"');
      expect(html).toContain('class="wiki-image"');
    });

    it('should handle default options when none provided', () => {
      md.use(wikilinkPlugin, {});
      const input = '[[Page]] and ![[img.png]]';
      const html = md.render(input);

      expect(html).toContain('href="Page"');
      expect(html).toContain('class="wikilink"');
      expect(html).toContain('src="img.png"');
      expect(html).toContain('class="embedded-image"');
    });
  });

  describe('complex scenarios', () => {
    it('should handle wikilinks with URLs as page names', () => {
      md.use(wikilinkPlugin);
      const input = '[[https://example.com]]';
      const html = md.render(input);

      expect(html).toContain('href="https://example.com"');
    });

    it('should handle multiple pipes (only first is separator)', () => {
      md.use(wikilinkPlugin);
      const input = '[[Page|Display|Extra]]';
      const html = md.render(input);

      // Should treat everything after first | as display text
      expect(html).toContain('href="Page"');
    });

    it('should work in complex markdown document', () => {
      md.use(wikilinkPlugin);
      const input = `# Title

Paragraph with [[Link 1]] and [[Link 2|custom text]].

## Section

![[diagram.png]]

- List item [[Link 3]]
- Another item

> Quote with [[Link 4]]`;

      const html = md.render(input);

      expect(html).toContain('href="Link 1"');
      expect(html).toContain('href="Link 2"');
      expect(html).toContain('>custom text</a>');
      expect(html).toContain('src="diagram.png"');
      expect(html).toContain('href="Link 3"');
      expect(html).toContain('href="Link 4"');
    });
  });

  describe('generateSlugs option (static site bundling)', () => {
    it('should convert page names to slugged .html links', () => {
      md.use(wikilinkPlugin, { generateSlugs: true });
      const input = '[[Page Name]]';
      const html = md.render(input);

      expect(html).toContain('href="page-name.html"');
      expect(html).toContain('>Page Name</a>');
    });

    it('should preserve fragment identifiers', () => {
      md.use(wikilinkPlugin, { generateSlugs: true });
      const input = '[[Page Name#Section]]';
      const html = md.render(input);

      expect(html).toContain('href="page-name.html#section"');
    });

    it('should not slugify external URLs', () => {
      md.use(wikilinkPlugin, { generateSlugs: true });
      const input = '[[https://example.com]]';
      const html = md.render(input);

      // External URL should remain unchanged
      expect(html).toContain('href="https://example.com"');
      expect(html).not.toContain('.html');
    });

    it('should handle display text with slugified href', () => {
      md.use(wikilinkPlugin, { generateSlugs: true });
      const input = '[[Page Name|Custom Display]]';
      const html = md.render(input);

      expect(html).toContain('href="page-name.html"');
      expect(html).toContain('>Custom Display</a>');
    });

    it('should handle special characters in page names', () => {
      md.use(wikilinkPlugin, { generateSlugs: true });
      const input = '[[My Page Name 123]]';
      const html = md.render(input);

      expect(html).toContain('href="my-page-name-123.html"');
    });

    it('should not apply baseUrl when generateSlugs is enabled', () => {
      md.use(wikilinkPlugin, { generateSlugs: true, baseUrl: '/wiki' });
      const input = '[[Page Name]]';
      const html = md.render(input);

      // With generateSlugs, baseUrl is not used (slugs are relative)
      expect(html).toContain('href="page-name.html"');
    });

    it('should handle accented characters', () => {
      md.use(wikilinkPlugin, { generateSlugs: true });
      const input = '[[Résumé Page]]';
      const html = md.render(input);

      expect(html).toContain('href="resume-page.html"');
    });

    it('should handle fragment with accented page name', () => {
      md.use(wikilinkPlugin, { generateSlugs: true });
      const input = '[[Café Guide#Brewing Tips]]';
      const html = md.render(input);

      expect(html).toContain('href="cafe-guide.html#brewing tips"');
    });
  });
});

describe('slugify', () => {
  it('should convert text to lowercase slug', () => {
    expect(slugify('Page Name')).toBe('page-name');
  });

  it('should replace spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('should replace non-alphanumeric characters with hyphens', () => {
    expect(slugify('page@name!test')).toBe('page-name-test');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(slugify('--page--name--')).toBe('page-name');
  });

  it('should collapse multiple consecutive hyphens', () => {
    expect(slugify('page   name')).toBe('page-name');
  });

  it('should handle accented characters', () => {
    expect(slugify('Résumé')).toBe('resume');
    expect(slugify('Café')).toBe('cafe');
    expect(slugify('naïve')).toBe('naive');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });

  it('should preserve numbers', () => {
    expect(slugify('Page 123 Test')).toBe('page-123-test');
  });
});
