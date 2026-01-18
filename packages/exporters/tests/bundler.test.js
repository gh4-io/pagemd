/**
 * Tests for bundler utilities
 */

import { describe, it, expect } from 'vitest';
import {
  collectAssets,
  deduplicateAssets,
  createAssetMap,
  rewriteAssetPaths,
  rewriteCSSAssetPaths,
  injectStylesheet,
  removeInlineStyles,
  generateOutputFilename,
  slugify
} from '../src/bundler.js';

describe('bundler utilities', () => {
  describe('slugify', () => {
    it('should convert text to lowercase slug', () => {
      expect(slugify('Page Name')).toBe('page-name');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle accented characters', () => {
      expect(slugify('Café')).toBe('cafe');
    });
  });

  describe('collectAssets', () => {
    it('should find images in HTML', () => {
      const html = '<img src="./image.png"><img src="photo.jpg">';
      const assets = collectAssets(html, '', '/test/dir');

      expect(assets).toHaveLength(2);
      expect(assets[0].type).toBe('image');
      expect(assets[0].originalRef).toBe('./image.png');
      expect(assets[1].originalRef).toBe('photo.jpg');
    });

    it('should find urls in CSS', () => {
      const css = 'body { background: url(./bg.png); } @font-face { src: url(font.woff2); }';
      const assets = collectAssets('', css, '/test/dir');

      expect(assets).toHaveLength(2);
      expect(assets.find(a => a.originalRef === './bg.png')).toBeDefined();
      expect(assets.find(a => a.originalRef === 'font.woff2')?.type).toBe('font');
    });

    it('should skip data URIs', () => {
      const html = '<img src="data:image/png;base64,abc123">';
      const assets = collectAssets(html, '', '/test/dir');

      expect(assets).toHaveLength(0);
    });

    it('should skip external URLs', () => {
      const html = '<img src="https://example.com/image.png">';
      const assets = collectAssets(html, '', '/test/dir');

      expect(assets).toHaveLength(0);
    });

    it('should skip absolute paths', () => {
      const html = '<img src="/absolute/path/image.png">';
      const assets = collectAssets(html, '', '/test/dir');

      expect(assets).toHaveLength(0);
    });

    it('should handle filename collisions', () => {
      const html = '<img src="./a/image.png"><img src="./b/image.png">';
      const assets = collectAssets(html, '', '/test/dir');

      expect(assets).toHaveLength(2);
      expect(assets[0].dest).toBe('assets/image.png');
      expect(assets[1].dest).toBe('assets/image-2.png');
    });
  });

  describe('deduplicateAssets', () => {
    it('should remove duplicate assets by source path', () => {
      const assets = [
        { src: '/test/image.png', dest: 'assets/image.png', originalRef: './image.png', type: 'image' },
        { src: '/test/image.png', dest: 'assets/image.png', originalRef: './image.png', type: 'image' }
      ];
      const deduped = deduplicateAssets(assets);

      expect(deduped).toHaveLength(1);
    });

    it('should keep assets with different source paths', () => {
      const assets = [
        { src: '/test/a.png', dest: 'assets/a.png', originalRef: './a.png', type: 'image' },
        { src: '/test/b.png', dest: 'assets/b.png', originalRef: './b.png', type: 'image' }
      ];
      const deduped = deduplicateAssets(assets);

      expect(deduped).toHaveLength(2);
    });
  });

  describe('createAssetMap', () => {
    it('should create map from original ref to bundled path', () => {
      const assets = [
        { src: '/test/image.png', dest: 'assets/image.png', originalRef: './image.png', type: 'image' }
      ];
      const map = createAssetMap(assets);

      expect(map.get('./image.png')).toBe('assets/image.png');
    });
  });

  describe('rewriteAssetPaths', () => {
    it('should rewrite img src attributes', () => {
      const html = '<img src="./image.png">';
      const map = new Map([['./image.png', 'assets/image.png']]);
      const result = rewriteAssetPaths(html, map);

      expect(result).toBe('<img src="assets/image.png">');
    });

    it('should handle both single and double quotes', () => {
      const html = '<img src="./a.png"><img src=\'./b.png\'>';
      const map = new Map([
        ['./a.png', 'assets/a.png'],
        ['./b.png', 'assets/b.png']
      ]);
      const result = rewriteAssetPaths(html, map);

      expect(result).toContain('src="assets/a.png"');
      expect(result).toContain("src='assets/b.png'");
    });

    it('should rewrite href attributes for image links', () => {
      const html = '<a href="./image.png">Download</a>';
      const map = new Map([['./image.png', 'assets/image.png']]);
      const result = rewriteAssetPaths(html, map);

      expect(result).toContain('href="assets/image.png"');
    });
  });

  describe('rewriteCSSAssetPaths', () => {
    it('should rewrite url() references', () => {
      const css = 'body { background: url(./bg.png); }';
      const map = new Map([['./bg.png', 'assets/bg.png']]);
      const result = rewriteCSSAssetPaths(css, map);

      expect(result).toContain('url(assets/bg.png)');
    });

    it('should handle quoted urls', () => {
      const css = 'body { background: url("./bg.png"); }';
      const map = new Map([['./bg.png', 'assets/bg.png']]);
      const result = rewriteCSSAssetPaths(css, map);

      expect(result).toContain('url(assets/bg.png)');
    });
  });

  describe('injectStylesheet', () => {
    it('should inject link tag before </head>', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const result = injectStylesheet(html, './styles.css');

      expect(result).toContain('<link rel="stylesheet" href="./styles.css">');
      expect(result).toContain('<link rel="stylesheet" href="./styles.css">\n</head>');
    });

    it('should fallback to body if no head', () => {
      const html = '<html><body>Content</body></html>';
      const result = injectStylesheet(html, './styles.css');

      expect(result).toContain('<link rel="stylesheet" href="./styles.css">');
    });

    it('should prepend if no head or body', () => {
      const html = '<div>Content</div>';
      const result = injectStylesheet(html, './styles.css');

      expect(result.startsWith('<link rel="stylesheet" href="./styles.css">')).toBe(true);
    });
  });

  describe('removeInlineStyles', () => {
    it('should remove all style tags when keepFrontmatter is false', () => {
      const html = '<style>body{}</style><style data-layer="frontmatter">h1{}</style><p>Content</p>';
      const result = removeInlineStyles(html, false);

      expect(result).not.toContain('<style');
      expect(result).toContain('<p>Content</p>');
    });

    it('should keep frontmatter styles when keepFrontmatter is true', () => {
      const html = '<style>body{}</style><style data-layer="frontmatter">h1{}</style><p>Content</p>';
      const result = removeInlineStyles(html, true);

      expect(result).not.toContain('<style>body{}</style>');
      expect(result).toContain('<style data-layer="frontmatter">');
    });
  });

  describe('generateOutputFilename', () => {
    it('should generate slugified .html filename', () => {
      expect(generateOutputFilename('/path/to/Page Name.md')).toBe('page-name.html');
    });

    it('should handle already slugified names', () => {
      expect(generateOutputFilename('my-file.md')).toBe('my-file.html');
    });

    it('should strip directory path', () => {
      expect(generateOutputFilename('/some/path/to/document.md')).toBe('document.html');
    });
  });

  // ============================================================================
  // Multi-Profile Bundle Support Tests
  // Tests for per-profile CSS file generation (Option A implementation)
  //
  // Problem: When bundling files with DIFFERENT profiles (alerts, SOPs, etc.),
  // a single shared styles.css would cause style collisions.
  //
  // Solution: Split CSS into:
  // - styles-shared.css (base + primary + syntax) - identical for all profiles
  // - styles-{profileId}.css (layout + profile) - varies per profile
  // ============================================================================

  describe('injectStylesheet (multi-profile)', () => {
    it('should inject multiple stylesheet links as array', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const stylesheets = ['./styles-shared.css', './styles-alert.css'];
      const result = injectStylesheet(html, stylesheets);

      // Both stylesheets should be injected
      expect(result).toContain('<link rel="stylesheet" href="./styles-shared.css">');
      expect(result).toContain('<link rel="stylesheet" href="./styles-alert.css">');

      // Shared should come before profile-specific
      const sharedIndex = result.indexOf('styles-shared.css');
      const profileIndex = result.indexOf('styles-alert.css');
      expect(sharedIndex).toBeLessThan(profileIndex);
    });

    it('should handle different profile CSS filenames', () => {
      const html = '<html><head></head><body></body></html>';

      // Test alert profile
      const alertResult = injectStylesheet(html, ['./styles-shared.css', './styles-alert.css']);
      expect(alertResult).toContain('./styles-alert.css');

      // Test sop profile
      const sopResult = injectStylesheet(html, ['./styles-shared.css', './styles-sop.css']);
      expect(sopResult).toContain('./styles-sop.css');

      // Test technical profile
      const techResult = injectStylesheet(html, ['./styles-shared.css', './styles-technical.css']);
      expect(techResult).toContain('./styles-technical.css');
    });

    it('should work with single stylesheet for backward compatibility', () => {
      const html = '<html><head></head><body></body></html>';
      const result = injectStylesheet(html, './styles.css');

      expect(result).toContain('<link rel="stylesheet" href="./styles.css">');
    });

    it('should preserve order of stylesheets in output', () => {
      const html = '<html><head></head><body></body></html>';
      const stylesheets = ['./first.css', './second.css', './third.css'];
      const result = injectStylesheet(html, stylesheets);

      const firstIndex = result.indexOf('./first.css');
      const secondIndex = result.indexOf('./second.css');
      const thirdIndex = result.indexOf('./third.css');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });
});
