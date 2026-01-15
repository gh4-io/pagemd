/**
 * Tests for @pagemd/core/paths
 * Centralized path configuration for PageMD resources
 */

import { describe, it, expect } from 'vitest';
import {
  RESOURCE_PATHS,
  DEFAULT_FILES,
  getResourcePath
} from '../src/paths.js';

describe('paths.js', () => {
  describe('RESOURCE_PATHS', () => {
    it('should have all expected resource types', () => {
      expect(RESOURCE_PATHS).toHaveProperty('styles');
      expect(RESOURCE_PATHS).toHaveProperty('layouts');
      expect(RESOURCE_PATHS).toHaveProperty('templates');
      expect(RESOURCE_PATHS).toHaveProperty('profiles');
    });

    it('should map styles to "styles"', () => {
      expect(RESOURCE_PATHS.styles).toBe('styles');
    });

    it('should map layouts to "layouts"', () => {
      expect(RESOURCE_PATHS.layouts).toBe('layouts');
    });

    it('should map templates to "templates"', () => {
      expect(RESOURCE_PATHS.templates).toBe('templates');
    });

    it('should map profiles to "profiles"', () => {
      expect(RESOURCE_PATHS.profiles).toBe('profiles');
    });

    it('should have exactly 4 resource types', () => {
      const keys = Object.keys(RESOURCE_PATHS);
      expect(keys).toHaveLength(4);
    });

    it('should have no nested directory paths (flattened structure)', () => {
      Object.values(RESOURCE_PATHS).forEach(path => {
        expect(path).not.toContain('/');
        expect(path).not.toContain('\\');
      });
    });
  });

  describe('DEFAULT_FILES', () => {
    it('should have all expected default files', () => {
      expect(DEFAULT_FILES).toHaveProperty('baseCSS');
      expect(DEFAULT_FILES).toHaveProperty('primaryCSS');
      expect(DEFAULT_FILES).toHaveProperty('syntaxCSS');
    });

    it('should map baseCSS to "base.css" (without subdirectory prefix)', () => {
      expect(DEFAULT_FILES.baseCSS).toBe('base.css');
    });

    it('should map primaryCSS to "primary.css" (without subdirectory prefix)', () => {
      expect(DEFAULT_FILES.primaryCSS).toBe('primary.css');
    });

    it('should map syntaxCSS to "shiki-base.css" (without subdirectory prefix)', () => {
      expect(DEFAULT_FILES.syntaxCSS).toBe('shiki-base.css');
    });

    it('should have exactly 3 default files', () => {
      const keys = Object.keys(DEFAULT_FILES);
      expect(keys).toHaveLength(3);
    });

    it('should have all paths end with .css', () => {
      Object.values(DEFAULT_FILES).forEach(path => {
        expect(path).toMatch(/\.css$/);
      });
    });

    it('should NOT include subdirectory prefixes (path resolver adds them)', () => {
      // Paths should be simple filenames without 'styles/' prefix
      // The path resolver's buildSearchPaths() adds subdirectory prefixes
      Object.values(DEFAULT_FILES).forEach(path => {
        expect(path).not.toMatch(/^styles\//);
        expect(path).not.toContain('/');
      });
    });
  });

  describe('getResourcePath', () => {
    it('should combine styles resource type with filename', () => {
      const result = getResourcePath('styles', 'custom.css');
      expect(result).toBe('styles/custom.css');
    });

    it('should combine layouts resource type with filename', () => {
      const result = getResourcePath('layouts', 'page.css');
      expect(result).toBe('layouts/page.css');
    });

    it('should combine templates resource type with filename', () => {
      const result = getResourcePath('templates', 'page.html');
      expect(result).toBe('templates/page.html');
    });

    it('should combine profiles resource type with filename', () => {
      const result = getResourcePath('profiles', 'standard.json');
      expect(result).toBe('profiles/standard.json');
    });

    it('should throw error for unknown resource type', () => {
      expect(() => {
        getResourcePath('unknown', 'file.txt');
      }).toThrow('Unknown resource type: unknown');
    });

    it('should throw error for undefined resource type', () => {
      expect(() => {
        getResourcePath(undefined, 'file.txt');
      }).toThrow('Unknown resource type: undefined');
    });

    it('should throw error for null resource type', () => {
      expect(() => {
        getResourcePath(null, 'file.txt');
      }).toThrow('Unknown resource type: null');
    });

    it('should handle filenames with subdirectories', () => {
      const result = getResourcePath('templates', 'layouts/special.html');
      expect(result).toBe('templates/layouts/special.html');
    });

    it('should handle filenames without extensions', () => {
      const result = getResourcePath('profiles', 'custom');
      expect(result).toBe('profiles/custom');
    });

    it('should handle empty filename', () => {
      const result = getResourcePath('styles', '');
      expect(result).toBe('styles/');
    });

    it('should use forward slashes consistently', () => {
      const result = getResourcePath('layouts', 'file.css');
      expect(result).toContain('/');
      expect(result).not.toContain('\\');
    });
  });

  describe('resource path consistency', () => {
    it('should match RESOURCE_PATHS structure in getResourcePath', () => {
      Object.keys(RESOURCE_PATHS).forEach(type => {
        const result = getResourcePath(type, 'test.txt');
        expect(result).toMatch(new RegExp(`^${RESOURCE_PATHS[type]}/`));
      });
    });

    it('should NOT include RESOURCE_PATHS prefix in DEFAULT_FILES (buildSearchPaths adds it)', () => {
      // DEFAULT_FILES should be simple filenames without 'styles/' prefix
      // The path resolver's buildSearchPaths() will add the subdirectory prefixes
      // This prevents path doubling bugs (e.g., 'bin/styles/styles/base.css')
      Object.values(DEFAULT_FILES).forEach(path => {
        expect(path).not.toMatch(new RegExp(`^${RESOURCE_PATHS.styles}/`));
        expect(path).not.toContain('/'); // Simple filename only
      });
    });
  });
});
