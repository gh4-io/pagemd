/**
 * Tests for CSS injection and style management
 * @pagemd/renderer-web/styles.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildStyleBlock,
  formatStyleTag,
  minifyCSS,
  inlineStyles
} from '../src/styles.js';

// Mock @pagemd/theme-kit
vi.mock('@pagemd/theme-kit', () => ({
  aggregateStyles: vi.fn()
}));

// Mock @pagemd/core
vi.mock('@pagemd/core', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn()
  }))
}));

import { aggregateStyles } from '@pagemd/theme-kit';

describe('styles.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('formatStyleTag', () => {
    it('should wrap CSS in style tag with @layer declaration', () => {
      const css = 'body { margin: 0; }';
      const layer = 'base';

      const result = formatStyleTag(css, layer);

      expect(result).toContain('data-layer="base"');
      expect(result).toContain('@layer base');
      expect(result).toContain('body { margin: 0; }');
    });

    it('should handle different layer names', () => {
      const layers = ['base', 'primary', 'profile', 'frontmatter'];

      layers.forEach(layer => {
        const result = formatStyleTag('p { color: blue; }', layer);
        expect(result).toContain(`data-layer="${layer}"`);
      });
    });

    it('should handle empty CSS', () => {
      const result = formatStyleTag('', 'base');
      expect(result).toContain('data-layer="base"');
      expect(result).toContain('@layer base');
    });

    it('should preserve CSS formatting', () => {
      const css = `
.class {
  property: value;
  another: property;
}`;
      const result = formatStyleTag(css, 'profile');

      expect(result).toContain(css);
      expect(result).toContain('data-layer="profile"');
    });

    it('should handle special characters in CSS', () => {
      const css = 'a[href^="https://"] { color: red; }';
      const result = formatStyleTag(css, 'base');

      expect(result).toContain(css);
    });
  });

  describe('minifyCSS', () => {
    it('should remove CSS comments', () => {
      const css = `
/* This is a comment */
body { margin: 0; }
/* Another comment */`;

      const result = minifyCSS(css);

      expect(result).not.toContain('/*');
      expect(result).not.toContain('*/');
      expect(result).toContain('body{margin:0}');
    });

    it('should remove extra whitespace', () => {
      const css = `
        body {
          margin: 0;
          padding: 0;
        }
      `;

      const result = minifyCSS(css);

      expect(result).toBe('body{margin:0;padding:0}');
    });

    it('should collapse multiple spaces', () => {
      const css = 'body   {    margin:   0;   }';

      const result = minifyCSS(css);

      expect(result).toBe('body{margin:0}');
    });

    it('should remove space around braces and colons', () => {
      const css = 'p { color : blue ; font-size : 12px ; }';

      const result = minifyCSS(css);

      expect(result).toBe('p{color:blue;font-size:12px}');
    });

    it('should remove trailing semicolons before closing brace', () => {
      const css = 'div { width: 100%; height: 100%; }';

      const result = minifyCSS(css);

      expect(result).toBe('div{width:100%;height:100%}');
    });

    it('should handle empty CSS', () => {
      const result = minifyCSS('');
      expect(result).toBe('');
    });

    it('should handle complex CSS with multiple selectors', () => {
      const css = `
/* Header styles */
header, nav {
  margin: 0;
  padding: 10px;
}

/* Main content */
.content {
  width: 100%;
  max-width: 1200px;
}`;

      const result = minifyCSS(css);

      expect(result).not.toContain('/*');
      expect(result).toContain('header,nav{');
      expect(result).toContain('.content{');
      expect(result).not.toContain('  ');
    });

    it('should preserve attribute selectors', () => {
      const css = 'input[type="text"] { border: 1px solid #ccc; }';

      const result = minifyCSS(css);

      expect(result).toContain('input[type="text"]');
      expect(result).toContain('border:1px solid #ccc');
    });

    it('should handle media queries', () => {
      const css = `
@media (max-width: 768px) {
  .mobile { display: block; }
}`;

      const result = minifyCSS(css);

      expect(result).toContain('@media');
      expect(result).not.toContain('\n');
    });

    it('should handle multiline comments', () => {
      const css = `
/*
 * Multi-line
 * comment block
 */
body { margin: 0; }`;

      const result = minifyCSS(css);

      expect(result).not.toContain('/*');
      expect(result).not.toContain('Multi-line');
      expect(result).toContain('body{margin:0}');
    });
  });

  describe('buildStyleBlock', () => {
    it('should build style block with aggregated layers', async () => {
      const mockAggregated = [
        { layer: 'base', content: 'body { margin: 0; }' },
        { layer: 'primary', content: 'p { color: black; }' },
        { layer: 'profile', content: '.custom { border: 1px; }' }
      ];

      aggregateStyles.mockResolvedValue(mockAggregated);

      const profile = { id: 'test' };
      const context = { projectRoot: '/project' };

      const result = await buildStyleBlock(profile, context);

      expect(result).toContain('<style data-layer="base">');
      expect(result).toContain('body { margin: 0; }');
      expect(result).toContain('<style data-layer="primary">');
      expect(result).toContain('p { color: black; }');
      expect(result).toContain('<style data-layer="profile">');
      expect(result).toContain('.custom { border: 1px; }');
    });

    it('should minify CSS when option enabled', async () => {
      const mockAggregated = [
        { layer: 'base', content: 'body { margin: 0; padding: 0; }' }
      ];

      aggregateStyles.mockResolvedValue(mockAggregated);

      const result = await buildStyleBlock(
        { id: 'test' },
        {},
        { minify: true }
      );

      expect(result).toContain('body{margin:0;padding:0}');
    });

    it('should add frontmatter CSS layer when provided', async () => {
      const mockAggregated = [
        { layer: 'base', content: 'body { margin: 0; }' }
      ];

      aggregateStyles.mockResolvedValue(mockAggregated);

      const result = await buildStyleBlock(
        { id: 'test' },
        {},
        { frontmatterCSS: '.custom { color: red; }' }
      );

      expect(result).toContain('<style data-layer="base">');
      expect(result).toContain('<style data-layer="frontmatter">');
      expect(result).toContain('.custom { color: red; }');
    });

    it('should minify frontmatter CSS when minify enabled', async () => {
      const mockAggregated = [
        { layer: 'base', content: 'body { margin: 0; }' }
      ];

      aggregateStyles.mockResolvedValue(mockAggregated);

      const result = await buildStyleBlock(
        { id: 'test' },
        {},
        {
          minify: true,
          frontmatterCSS: 'div { padding: 10px; margin: 5px; }'
        }
      );

      expect(result).toContain('div{padding:10px;margin:5px}');
    });

    it('should handle empty aggregated styles', async () => {
      aggregateStyles.mockResolvedValue([]);

      const result = await buildStyleBlock({ id: 'test' }, {});

      // Should still output layer order declaration even with no styles
      // NOTE: frontmatter is intentionally NOT declared (undeclared layers have higher priority)
      expect(result).toContain('@layer base, primary, layout, syntax, profile;');
    });

    it('should preserve layer order', async () => {
      const mockAggregated = [
        { layer: 'base', content: '/* base */' },
        { layer: 'primary', content: '/* primary */' },
        { layer: 'profile', content: '/* profile */' }
      ];

      aggregateStyles.mockResolvedValue(mockAggregated);

      const result = await buildStyleBlock({ id: 'test' }, {});

      const baseIndex = result.indexOf('data-layer="base"');
      const primaryIndex = result.indexOf('data-layer="primary"');
      const profileIndex = result.indexOf('data-layer="profile"');

      expect(baseIndex).toBeLessThan(primaryIndex);
      expect(primaryIndex).toBeLessThan(profileIndex);
    });

    it('should throw error when aggregateStyles fails', async () => {
      aggregateStyles.mockRejectedValue(new Error('Failed to load stylesheet'));

      const profile = { id: 'test' };
      const context = {};

      await expect(buildStyleBlock(profile, context))
        .rejects
        .toThrow('Failed to load stylesheet');
    });

    it('should handle profile with no styles', async () => {
      aggregateStyles.mockResolvedValue([]);

      const result = await buildStyleBlock({ id: 'minimal' }, {});

      // Should still output layer order declaration even with no styles
      // NOTE: frontmatter is intentionally NOT declared (undeclared layers have higher priority)
      expect(result).toContain('@layer base, primary, layout, syntax, profile;');
    });

    // ========================================================================
    // Multi-Profile Bundle Support: Split CSS Mode Tests
    // ========================================================================
    //
    // Problem: When bundling files with DIFFERENT profiles (alerts, SOPs, etc.),
    // a single shared styles.css would cause style collisions.
    //
    // Solution: extractCSS: 'split' mode separates CSS into:
    // - sharedCSS (base + primary + syntax) - identical for all profiles
    // - profileCSS (layout + profile) - varies per profile
    // - frontmatterCSS - per-document (stays inlined)
    //
    // This enables multiple profiles to coexist in the same bundle.
    // ========================================================================

    describe('extractCSS split mode (multi-profile bundles)', () => {
      it('should separate shared layers from profile layers', async () => {
        const mockAggregated = [
          { layer: 'base', content: 'body { margin: 0; }' },
          { layer: 'primary', content: 'p { color: black; }' },
          { layer: 'syntax', content: '.token { color: blue; }' },
          { layer: 'layout', content: '@page { margin: 1in; }' },
          { layer: 'profile', content: '.custom { border: 1px; }' }
        ];

        aggregateStyles.mockResolvedValue(mockAggregated);

        const result = await buildStyleBlock(
          { id: 'test-profile' },
          {},
          { extractCSS: 'split' }
        );

        // Should return object with split CSS
        expect(result).toHaveProperty('sharedCSS');
        expect(result).toHaveProperty('profileCSS');
        expect(result).toHaveProperty('profileId');

        // Shared layers: base + primary + syntax
        expect(result.sharedCSS).toContain('@layer base');
        expect(result.sharedCSS).toContain('@layer primary');
        expect(result.sharedCSS).toContain('@layer syntax');
        expect(result.sharedCSS).toContain('body { margin: 0; }');
        expect(result.sharedCSS).toContain('p { color: black; }');
        expect(result.sharedCSS).toContain('.token { color: blue; }');

        // Shared should NOT contain profile-specific layers
        expect(result.sharedCSS).not.toContain('@layer layout');
        expect(result.sharedCSS).not.toContain('@layer profile');
        expect(result.sharedCSS).not.toContain('@page');
        expect(result.sharedCSS).not.toContain('.custom');

        // Profile layers: layout + profile
        expect(result.profileCSS).toContain('@layer layout');
        expect(result.profileCSS).toContain('@layer profile');
        expect(result.profileCSS).toContain('@page { margin: 1in; }');
        expect(result.profileCSS).toContain('.custom { border: 1px; }');

        // Profile should NOT contain shared layers
        expect(result.profileCSS).not.toContain('body { margin: 0; }');
        expect(result.profileCSS).not.toContain('p { color: black; }');
      });

      it('should include profileId from profile manifest', async () => {
        aggregateStyles.mockResolvedValue([
          { layer: 'base', content: '/* base */' }
        ]);

        const result = await buildStyleBlock(
          { id: 'alert-profile' },
          {},
          { extractCSS: 'split' }
        );

        expect(result.profileId).toBe('alert-profile');
      });

      it('should keep frontmatter CSS separate for per-document inlining', async () => {
        aggregateStyles.mockResolvedValue([
          { layer: 'base', content: '/* base */' },
          { layer: 'profile', content: '/* profile */' }
        ]);

        const result = await buildStyleBlock(
          { id: 'test' },
          {},
          {
            extractCSS: 'split',
            frontmatterCSS: '.document-specific { color: red; }'
          }
        );

        // Frontmatter should be separate
        expect(result.frontmatterCSS).toBe('.document-specific { color: red; }');

        // Frontmatter should NOT be in shared or profile CSS
        expect(result.sharedCSS).not.toContain('.document-specific');
        expect(result.profileCSS).not.toContain('.document-specific');
      });

      it('should handle layer declarations for split mode', async () => {
        aggregateStyles.mockResolvedValue([
          { layer: 'base', content: '/* base */' },
          { layer: 'syntax', content: '/* syntax */' },
          { layer: 'layout', content: '/* layout */' }
        ]);

        const result = await buildStyleBlock(
          { id: 'test' },
          {},
          { extractCSS: 'split' }
        );

        // Shared CSS should declare its own layer order
        expect(result.sharedCSS).toContain('@layer base, primary, syntax;');

        // Profile CSS should declare its own layer order
        expect(result.profileCSS).toContain('@layer layout, profile;');
      });

      it('should use default profileId when profile.id is missing', async () => {
        aggregateStyles.mockResolvedValue([]);

        const result = await buildStyleBlock(
          { /* no id */ },
          {},
          { extractCSS: 'split' }
        );

        expect(result.profileId).toBe('default');
      });

      it('should work with minify option', async () => {
        aggregateStyles.mockResolvedValue([
          { layer: 'base', content: 'body { margin: 0; padding: 0; }' },
          { layer: 'profile', content: '.box { width: 100%; height: 100%; }' }
        ]);

        const result = await buildStyleBlock(
          { id: 'test' },
          {},
          { extractCSS: 'split', minify: true }
        );

        // Both CSS outputs should be minified
        expect(result.sharedCSS).toContain('body{margin:0;padding:0}');
        expect(result.profileCSS).toContain('.box{width:100%;height:100%}');
      });
    });
  });

  describe('inlineStyles', () => {
    it('should replace {{css}} token with styles', () => {
      const html = '<head>{{css}}</head>';
      const styles = '<style>body { margin: 0; }</style>';

      const result = inlineStyles(html, styles);

      expect(result).toBe('<head><style>body { margin: 0; }</style></head>');
    });

    it('should replace multiple {{css}} tokens', () => {
      const html = '<head>{{css}}</head><body>{{css}}</body>';
      const styles = '<style>p { color: blue; }</style>';

      const result = inlineStyles(html, styles);

      expect(result).toContain('<head><style>p { color: blue; }</style></head>');
      expect(result).toContain('<body><style>p { color: blue; }</style></body>');
    });

    it('should handle HTML with no {{css}} token', () => {
      const html = '<html><body>No token here</body></html>';
      const styles = '<style>body { margin: 0; }</style>';

      const result = inlineStyles(html, styles);

      expect(result).toBe(html);
    });

    it('should replace token with comment when no styles provided', () => {
      const html = '<head>{{css}}</head>';
      const styles = '';

      const result = inlineStyles(html, styles);

      expect(result).toBe('<head><!-- No styles provided --></head>');
    });

    it('should handle empty HTML', () => {
      const result = inlineStyles('', '<style></style>');
      expect(result).toBe('');
    });

    it('should handle complex multi-layer styles', () => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  {{css}}
</head>
<body></body>
</html>`;

      const styles = `
<style data-layer="base">body{margin:0}</style>
<style data-layer="primary">p{color:black}</style>
<style data-layer="profile">.custom{border:1px}</style>`;

      const result = inlineStyles(html, styles);

      expect(result).toContain('<style data-layer="base">');
      expect(result).toContain('<style data-layer="primary">');
      expect(result).toContain('<style data-layer="profile">');
    });

    it('should preserve HTML structure', () => {
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    {{css}}
    <title>Test</title>
  </head>
</html>`;

      const styles = '<style>body{margin:0}</style>';

      const result = inlineStyles(html, styles);

      expect(result).toContain('<meta charset="UTF-8">');
      expect(result).toContain('<title>Test</title>');
      expect(result).toContain('<style>body{margin:0}</style>');
      expect(result).not.toContain('{{css}}');
    });

    it('should handle null HTML gracefully', () => {
      const result = inlineStyles(null, '<style></style>');
      expect(result).toBe('');
    });

    it('should handle undefined styles gracefully', () => {
      const html = '<head>{{css}}</head>';
      const result = inlineStyles(html, undefined);
      expect(result).toContain('<!-- No styles provided -->');
    });
  });
});
