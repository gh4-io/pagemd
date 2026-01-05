/**
 * @pagemd/core/profile-loader tests
 * Tests for profile loading with inheritance
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mergeProfiles,
  validateProfile,
  detectCircularInheritance,
  getDefaultProfile
} from '../src/profile-loader.js';

describe('profile-loader', () => {
  describe('getDefaultProfile', () => {
    it('should return standard_letter', () => {
      assert.strictEqual(getDefaultProfile(), 'standard_letter');
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

      assert.strictEqual(merged.id, 'child');
      assert.strictEqual(merged.outputs.pdf.enabled, true);
      assert.strictEqual(merged.outputs.pdf.mode, 'ALWAYS');
      assert.strictEqual(merged.outputs.html.enabled, false);
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

      assert.deepStrictEqual(merged.resources.css, ['custom.css']);
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

      assert.strictEqual(merged.layout.page.width, '8.5in');
      assert.strictEqual(merged.layout.page.height, '11in');
      assert.strictEqual(merged.layout.margins.top, '0.5in');
      assert.strictEqual(merged.layout.margins.bottom, '1in');
    });
  });

  describe('validateProfile', () => {
    it('should pass when id matches filename', () => {
      const profile = { id: 'test' };
      assert.doesNotThrow(() => validateProfile(profile, 'test'));
    });

    it('should fail when id does not match filename', () => {
      const profile = { id: 'wrong' };
      assert.throws(
        () => validateProfile(profile, 'test'),
        /Profile ID 'wrong' does not match filename 'test'/
      );
    });

    it('should fail when profile has no id', () => {
      const profile = { name: 'test' };
      assert.throws(
        () => validateProfile(profile, 'test'),
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

      assert.throws(
        () => detectCircularInheritance('a', [], loadFn),
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

      assert.doesNotThrow(() => detectCircularInheritance('child', [], loadFn));
    });

    it('should fail if profile not found in chain', () => {
      const profiles = {
        child: { id: 'child', extends: 'missing' }
      };
      const loadFn = (name) => profiles[name] || null;

      assert.throws(
        () => detectCircularInheritance('child', [], loadFn),
        /Profile not found in inheritance chain: missing/
      );
    });
  });
});
