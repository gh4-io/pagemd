/**
 * @pagemd/core/profile-loader tests
 * Tests for profile loading with inheritance
 */

import { describe, it, expect } from 'vitest';
import {
  mergeProfiles,
  validateProfile,
  detectCircularInheritance,
  getDefaultProfile
} from '../src/profile-loader.js';

describe('profile-loader', () => {
  describe('getDefaultProfile', () => {
    it('should return standard_letter', () => {
      expect(getDefaultProfile()).toBe('standard_letter');
    });
  });

  describe('mergeProfiles', () => {
    it('should deep-merge objects', () => {
      const parent = {
        id: 'parent',
        outputs: { pdf: { enabled: true }, html: { enabled: false } }
      };
      const child = {
        id: 'child',
        outputs: { pdf: { mode: 'ALWAYS' } }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.id).toBe('child');
      expect(merged.outputs.pdf.enabled).toBe(true);
      expect(merged.outputs.pdf.mode).toBe('ALWAYS');
      expect(merged.outputs.html.enabled).toBe(false);
    });

    it('should replace arrays', () => {
      const parent = {
        id: 'parent',
        resources: { css: ['base.css', 'parent.css'] }
      };
      const child = {
        id: 'child',
        resources: { css: ['custom.css'] }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.resources.css).toEqual(['custom.css']);
    });

    it('should handle nested deep merge', () => {
      const parent = {
        id: 'parent',
        layout: {
          page: { width: '8.5in', height: '11in' },
          margins: { top: '1in', bottom: '1in' }
        }
      };
      const child = {
        id: 'child',
        layout: {
          margins: { top: '0.5in' }
        }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.layout.page.width).toBe('8.5in');
      expect(merged.layout.page.height).toBe('11in');
      expect(merged.layout.margins.top).toBe('0.5in');
      expect(merged.layout.margins.bottom).toBe('1in');
    });

    it('should preserve parent value when child has null (null means inherit)', () => {
      const parent = { id: 'parent', template: 'letter.html' };
      const child = { id: 'child', template: null };

      const merged = mergeProfiles(parent, child);

      expect(merged.template).toBe('letter.html');
    });

    it('should preserve nested parent value when child has null', () => {
      const parent = {
        id: 'parent',
        resources: { template: 'a.html', layout: 'b.css' }
      };
      const child = {
        id: 'child',
        resources: { template: null }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.resources.template).toBe('a.html');
      expect(merged.resources.layout).toBe('b.css');
    });

    it('should preserve parent array when child has null', () => {
      const parent = { id: 'parent', css: ['base.css', 'theme.css'] };
      const child = { id: 'child', css: null };

      const merged = mergeProfiles(parent, child);

      expect(merged.css).toEqual(['base.css', 'theme.css']);
    });

    it('should handle parent null and child with value', () => {
      const parent = { id: 'parent', value: null };
      const child = { id: 'child', value: 'child-value' };

      const merged = mergeProfiles(parent, child);

      expect(merged.value).toBe('child-value');
    });
  });

  describe('validateProfile', () => {
    it('should pass when id matches filename', () => {
      const profile = { id: 'test' };
      expect(() => validateProfile(profile, 'test')).not.toThrow();
    });

    it('should fail when id does not match filename', () => {
      const profile = { id: 'wrong' };
      expect(() => validateProfile(profile, 'test')).toThrow(
        /Profile ID 'wrong' does not match filename 'test'/
      );
    });

    it('should fail when profile has no id', () => {
      const profile = { name: 'test' };
      expect(() => validateProfile(profile, 'test')).toThrow(
        /Profile missing required 'id' field/
      );
    });
  });

  describe('detectCircularInheritance', () => {
    it('should detect circular reference', () => {
      const profiles = {
        a: { id: 'a', extends: 'b' },
        b: { id: 'b', extends: 'c' },
        c: { id: 'c', extends: 'a' }
      };
      const loadFn = (name) => profiles[name];

      expect(() => detectCircularInheritance('a', [], loadFn)).toThrow(
        /Circular inheritance detected: a -> b -> c -> a/
      );
    });

    it('should allow valid inheritance chain', () => {
      const profiles = {
        child: { id: 'child', extends: 'parent' },
        parent: { id: 'parent', extends: 'base' },
        base: { id: 'base' }
      };
      const loadFn = (name) => profiles[name];

      expect(() => detectCircularInheritance('child', [], loadFn)).not.toThrow();
    });

    it('should fail if profile not found in chain', () => {
      const profiles = {
        child: { id: 'child', extends: 'missing' }
      };
      const loadFn = (name) => profiles[name] || null;

      expect(() => detectCircularInheritance('child', [], loadFn)).toThrow(
        /Profile not found in inheritance chain: missing/
      );
    });
  });
});
