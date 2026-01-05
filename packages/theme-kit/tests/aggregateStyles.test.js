/**
 * Tests for CSS aggregation and layer ordering
 * @pagemd/theme-kit/aggregateStyles.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  CSS_LAYER_ORDER,
  aggregateStyles
} from '../src/index.js';

// Mock @pagemd/core logger
vi.mock('@pagemd/core', async () => {
  const actual = await vi.importActual('@pagemd/core');
  return {
    ...actual,
    createLogger: vi.fn(() => ({
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  };
});

describe('theme-kit CSS aggregation', () => {
  let testDir;

  beforeEach(() => {
    // Create temporary test directory
    const randomId = Math.random().toString(36).substring(7);
    testDir = join(tmpdir(), `pagemd-theme-test-${randomId}`);
    mkdirSync(testDir, { recursive: true });

    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Restore console
    vi.restoreAllMocks();
  });

  describe('CSS_LAYER_ORDER', () => {
    it('should include all required layers in correct order', () => {
      expect(CSS_LAYER_ORDER).toEqual(['base', 'primary', 'layout', 'syntax', 'profile', 'frontmatter']);
    });

    it('should have layout layer in position 3 (after base and primary)', () => {
      const layoutIndex = CSS_LAYER_ORDER.indexOf('layout');
      const baseIndex = CSS_LAYER_ORDER.indexOf('base');
      const primaryIndex = CSS_LAYER_ORDER.indexOf('primary');
      const syntaxIndex = CSS_LAYER_ORDER.indexOf('syntax');

      expect(layoutIndex).toBe(2);
      expect(layoutIndex).toBeGreaterThan(baseIndex);
      expect(layoutIndex).toBeGreaterThan(primaryIndex);
      expect(layoutIndex).toBeLessThan(syntaxIndex);
    });

    it('should have exactly 6 layers', () => {
      expect(CSS_LAYER_ORDER).toHaveLength(6);
    });
  });

  describe('aggregateStyles - layout layer', () => {
    it('should load layout CSS when profile.layout.css is specified', async () => {
      // Create layout CSS file
      const layoutsDir = join(testDir, 'layouts');
      mkdirSync(layoutsDir, { recursive: true });
      const layoutPath = join(layoutsDir, 'test-layout.css');
      const layoutCSS = '@page { margin: 2cm; }';
      writeFileSync(layoutPath, layoutCSS);

      // Create minimal base and primary CSS (required layers)
      const stylesDir = join(testDir, 'styles');
      mkdirSync(stylesDir, { recursive: true });
      writeFileSync(join(stylesDir, 'base.css'), 'body { margin: 0; }');
      writeFileSync(join(stylesDir, 'primary.css'), 'p { color: black; }');

      const profile = {
        id: 'test-layout',
        layout: {
          css: layoutPath
        }
      };

      const context = {
        projectRoot: testDir,
        searchPaths: [layoutsDir, stylesDir]
      };

      const result = await aggregateStyles(profile, context);

      // Check that layout layer is present
      const layoutLayer = result.find(s => s.layer === 'layout');
      expect(layoutLayer).toBeDefined();
      expect(layoutLayer.content).toContain('@page');
      expect(layoutLayer.source).toBe(layoutPath);
    });

    it('should skip layout layer when profile.layout.css is not specified', async () => {
      // Create minimal base and primary CSS (required layers)
      const stylesDir = join(testDir, 'styles');
      mkdirSync(stylesDir, { recursive: true });
      writeFileSync(join(stylesDir, 'base.css'), 'body { margin: 0; }');
      writeFileSync(join(stylesDir, 'primary.css'), 'p { color: black; }');

      const profile = {
        id: 'no-layout'
        // No layout.css specified
      };

      const context = {
        projectRoot: testDir,
        searchPaths: [stylesDir]
      };

      const result = await aggregateStyles(profile, context);

      // Check that layout layer is NOT present
      const layoutLayer = result.find(s => s.layer === 'layout');
      expect(layoutLayer).toBeUndefined();

      // Should still have base and primary layers
      expect(result.some(s => s.layer === 'base')).toBe(true);
      expect(result.some(s => s.layer === 'primary')).toBe(true);
    });

    it('should throw error when profile.layout.css is specified but file is missing', async () => {
      // Create minimal base and primary CSS
      const stylesDir = join(testDir, 'styles');
      mkdirSync(stylesDir, { recursive: true });
      writeFileSync(join(stylesDir, 'base.css'), 'body { margin: 0; }');
      writeFileSync(join(stylesDir, 'primary.css'), 'p { color: black; }');

      const profile = {
        id: 'missing-layout',
        layout: {
          css: join(testDir, 'layouts', 'nonexistent.css')
        }
      };

      const context = {
        projectRoot: testDir,
        searchPaths: [stylesDir]
      };

      await expect(aggregateStyles(profile, context))
        .rejects
        .toThrow(/Missing layout CSS/);
    });

    it('should preserve layer order with layout included', async () => {
      // Create all CSS files
      const layoutsDir = join(testDir, 'layouts');
      const stylesDir = join(testDir, 'styles');
      mkdirSync(layoutsDir, { recursive: true });
      mkdirSync(stylesDir, { recursive: true });

      writeFileSync(join(stylesDir, 'base.css'), '/* base */');
      writeFileSync(join(stylesDir, 'primary.css'), '/* primary */');
      writeFileSync(join(layoutsDir, 'layout.css'), '/* layout */');

      const profileCSSPath = join(testDir, 'profile.css');
      writeFileSync(profileCSSPath, '/* profile */');

      const profile = {
        id: 'full-layers',
        layout: {
          css: join(layoutsDir, 'layout.css')
        },
        resources: {
          css: [profileCSSPath]
        }
      };

      const context = {
        projectRoot: testDir,
        searchPaths: [layoutsDir, stylesDir, testDir]
      };

      const result = await aggregateStyles(profile, context);

      // Extract layer names in order
      const layerOrder = result.map(s => s.layer);

      // Verify order: base, primary, layout, profile
      expect(layerOrder.indexOf('base')).toBeLessThan(layerOrder.indexOf('primary'));
      expect(layerOrder.indexOf('primary')).toBeLessThan(layerOrder.indexOf('layout'));
      expect(layerOrder.indexOf('layout')).toBeLessThan(layerOrder.indexOf('profile'));
    });
  });

  describe('aggregateStyles - layer metadata', () => {
    it('should include source, resolvedPath, and size for each layer', async () => {
      // Create CSS files
      const stylesDir = join(testDir, 'styles');
      mkdirSync(stylesDir, { recursive: true });
      const baseCSS = 'body { margin: 0; }';
      writeFileSync(join(stylesDir, 'base.css'), baseCSS);
      writeFileSync(join(stylesDir, 'primary.css'), 'p { color: black; }');

      const profile = { id: 'metadata-test' };

      const context = {
        projectRoot: testDir,
        searchPaths: [stylesDir]
      };

      const result = await aggregateStyles(profile, context);

      // Check base layer has all required metadata
      const baseLayer = result.find(s => s.layer === 'base');
      expect(baseLayer).toBeDefined();
      expect(baseLayer.content).toBe(baseCSS);
      expect(baseLayer.source).toBeDefined();
      expect(baseLayer.resolvedPath).toBeDefined();
      expect(baseLayer.size).toBeGreaterThan(0);
      expect(baseLayer.size).toBe(baseCSS.length);
    });
  });
});
