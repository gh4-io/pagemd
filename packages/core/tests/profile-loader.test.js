/**
 * Tests for @pagemd/core/profile-loader
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getDefaultProfile,
  mergeProfiles,
  validateProfile,
  detectCircularInheritance,
  loadAndMergeProfile
} from '../src/profile-loader.js';

describe('profile-loader', () => {
  let testDir;
  let profilesDir;

  beforeEach(() => {
    // Create temporary test directory
    const randomId = Math.random().toString(36).substring(7);
    testDir = join(tmpdir(), `pagemd-test-${randomId}`);
    profilesDir = join(testDir, '.pagemd', 'profiles');

    mkdirSync(profilesDir, { recursive: true });

    // Suppress logger output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Restore console first
    vi.restoreAllMocks();

    // Clean up test directory with retry for Windows file locking
    if (existsSync(testDir)) {
      // Small delay to allow file handles to release on Windows
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore EPERM errors on Windows - temp directory will be cleaned up eventually
        if (err.code !== 'EPERM' && err.code !== 'EBUSY') {
          console.warn('Failed to clean up test directory:', err.message);
        }
      }
    }
  });

  describe('getDefaultProfile', () => {
    it('returns standard_letter as default', () => {
      expect(getDefaultProfile()).toBe('standard_letter');
    });
  });

  describe('mergeProfiles', () => {
    it('merges simple objects', () => {
      const parent = {
        id: 'parent',
        pageSize: 'letter',
        margin: '1in'
      };

      const child = {
        id: 'child',
        extends: 'parent',
        margin: '0.5in'
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.id).toBe('child');
      expect(merged.pageSize).toBe('letter'); // from parent
      expect(merged.margin).toBe('0.5in'); // overridden by child
      expect(merged.extends).toBe('parent'); // from child
    });

    it('deep-merges nested objects', () => {
      const parent = {
        id: 'parent',
        layout: {
          header: { height: '1in', enabled: true },
          footer: { height: '0.5in', enabled: true }
        }
      };

      const child = {
        id: 'child',
        layout: {
          header: { height: '2in' }, // override height, keep enabled
          sidebar: { width: '2in' } // add new property
        }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.layout.header.height).toBe('2in'); // overridden
      expect(merged.layout.header.enabled).toBe(true); // preserved from parent
      expect(merged.layout.footer).toEqual({ height: '0.5in', enabled: true }); // preserved
      expect(merged.layout.sidebar).toEqual({ width: '2in' }); // added
    });

    it('replaces arrays completely (no merging)', () => {
      const parent = {
        id: 'parent',
        fonts: ['Arial', 'Times'],
        plugins: ['plugin1', 'plugin2']
      };

      const child = {
        id: 'child',
        fonts: ['Helvetica'], // completely replace parent array
        plugins: [] // empty array replaces parent array
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.fonts).toEqual(['Helvetica']); // not ['Arial', 'Times', 'Helvetica']
      expect(merged.plugins).toEqual([]); // not ['plugin1', 'plugin2']
    });

    it('handles null values', () => {
      const parent = {
        id: 'parent',
        setting: 'value',
        nullable: 'not-null'
      };

      const child = {
        id: 'child',
        setting: null,
        nullable: null
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.setting).toBeNull();
      expect(merged.nullable).toBeNull();
    });

    it('preserves parent properties not in child', () => {
      const parent = {
        id: 'parent',
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3'
      };

      const child = {
        id: 'child',
        prop2: 'override'
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.prop1).toBe('value1');
      expect(merged.prop2).toBe('override');
      expect(merged.prop3).toBe('value3');
    });

    it('handles deeply nested objects', () => {
      const parent = {
        id: 'parent',
        layout: {
          page: {
            margin: {
              top: '1in',
              bottom: '1in',
              left: '1in',
              right: '1in'
            }
          }
        }
      };

      const child = {
        id: 'child',
        layout: {
          page: {
            margin: {
              top: '2in'
            }
          }
        }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.layout.page.margin.top).toBe('2in');
      expect(merged.layout.page.margin.bottom).toBe('1in');
      expect(merged.layout.page.margin.left).toBe('1in');
      expect(merged.layout.page.margin.right).toBe('1in');
    });

    it('handles mixed types correctly', () => {
      const parent = {
        id: 'parent',
        setting: { nested: 'value' }
      };

      const child = {
        id: 'child',
        setting: 'string' // change from object to string
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.setting).toBe('string');
    });
  });

  describe('validateProfile', () => {
    it('validates profile with matching id and filename', () => {
      const profile = {
        id: 'test_profile',
        name: 'Test Profile'
      };

      expect(() => validateProfile(profile, 'test_profile')).not.toThrow();
    });

    it('throws error when profile missing id', () => {
      const profile = {
        name: 'Test Profile'
      };

      expect(() => validateProfile(profile, 'test_profile')).toThrow(
        /missing required 'id' field/
      );
    });

    it('throws error when id does not match filename', () => {
      const profile = {
        id: 'wrong_id',
        name: 'Test Profile'
      };

      expect(() => validateProfile(profile, 'test_profile')).toThrow(
        /does not match filename/
      );
    });

    it('is case-sensitive for id matching', () => {
      const profile = {
        id: 'Test_Profile',
        name: 'Test Profile'
      };

      expect(() => validateProfile(profile, 'test_profile')).toThrow(
        /does not match filename/
      );
    });
  });

  describe('detectCircularInheritance', () => {
    it('detects direct circular reference', () => {
      const profiles = {
        'profile_a': { id: 'profile_a', extends: 'profile_a' }
      };

      const loadFn = (name) => profiles[name];

      expect(() => detectCircularInheritance('profile_a', [], loadFn)).toThrow(
        /Circular inheritance detected/
      );
    });

    it('detects two-level circular reference', () => {
      const profiles = {
        'profile_a': { id: 'profile_a', extends: 'profile_b' },
        'profile_b': { id: 'profile_b', extends: 'profile_a' }
      };

      const loadFn = (name) => profiles[name];

      expect(() => detectCircularInheritance('profile_a', [], loadFn)).toThrow(
        /Circular inheritance detected/
      );
    });

    it('detects multi-level circular reference', () => {
      const profiles = {
        'profile_a': { id: 'profile_a', extends: 'profile_b' },
        'profile_b': { id: 'profile_b', extends: 'profile_c' },
        'profile_c': { id: 'profile_c', extends: 'profile_a' }
      };

      const loadFn = (name) => profiles[name];

      expect(() => detectCircularInheritance('profile_a', [], loadFn)).toThrow(
        /Circular inheritance detected/
      );
    });

    it('does not throw for valid inheritance chain', () => {
      const profiles = {
        'base': { id: 'base' },
        'middle': { id: 'middle', extends: 'base' },
        'child': { id: 'child', extends: 'middle' }
      };

      const loadFn = (name) => profiles[name];

      expect(() => detectCircularInheritance('child', [], loadFn)).not.toThrow();
    });

    it('throws error when profile not found in chain', () => {
      const profiles = {
        'profile_a': { id: 'profile_a', extends: 'nonexistent' }
      };

      const loadFn = (name) => profiles[name] || null;

      expect(() => detectCircularInheritance('profile_a', [], loadFn)).toThrow(
        /Profile not found in inheritance chain/
      );
    });

    it('handles profile without extends', () => {
      const profiles = {
        'base': { id: 'base' }
      };

      const loadFn = (name) => profiles[name];

      expect(() => detectCircularInheritance('base', [], loadFn)).not.toThrow();
    });
  });

  describe('loadAndMergeProfile', () => {
    beforeEach(() => {
      // Change working directory to testDir for these tests
      process.chdir(testDir);
    });

    it('loads profile without inheritance', async () => {
      const profileData = {
        id: 'simple',
        name: 'Simple Profile',
        pageSize: 'letter'
      };

      writeFileSync(
        join(profilesDir, 'simple.json'),
        JSON.stringify(profileData)
      );

      const profile = await loadAndMergeProfile('simple', { searchFrom: testDir });

      expect(profile).toEqual(profileData);
    });

    it('loads and merges profile with single parent', async () => {
      const baseProfile = {
        id: 'base',
        name: 'Base Profile',
        pageSize: 'letter',
        margin: '1in'
      };

      const childProfile = {
        id: 'child',
        extends: 'base',
        name: 'Child Profile',
        margin: '0.5in'
      };

      writeFileSync(join(profilesDir, 'base.json'), JSON.stringify(baseProfile));
      writeFileSync(join(profilesDir, 'child.json'), JSON.stringify(childProfile));

      const merged = await loadAndMergeProfile('child', { searchFrom: testDir });

      expect(merged.id).toBe('child');
      expect(merged.name).toBe('Child Profile');
      expect(merged.pageSize).toBe('letter'); // from base
      expect(merged.margin).toBe('0.5in'); // overridden
    });

    it('loads and merges multi-level inheritance', async () => {
      const grandparent = {
        id: 'grandparent',
        prop1: 'gp-value1',
        prop2: 'gp-value2',
        prop3: 'gp-value3'
      };

      const parent = {
        id: 'parent',
        extends: 'grandparent',
        prop2: 'p-value2', // override
        prop4: 'p-value4' // add
      };

      const child = {
        id: 'child',
        extends: 'parent',
        prop3: 'c-value3', // override
        prop5: 'c-value5' // add
      };

      writeFileSync(join(profilesDir, 'grandparent.json'), JSON.stringify(grandparent));
      writeFileSync(join(profilesDir, 'parent.json'), JSON.stringify(parent));
      writeFileSync(join(profilesDir, 'child.json'), JSON.stringify(child));

      const merged = await loadAndMergeProfile('child', { searchFrom: testDir });

      expect(merged.id).toBe('child');
      expect(merged.prop1).toBe('gp-value1'); // from grandparent
      expect(merged.prop2).toBe('p-value2'); // from parent (override grandparent)
      expect(merged.prop3).toBe('c-value3'); // from child (override grandparent)
      expect(merged.prop4).toBe('p-value4'); // from parent
      expect(merged.prop5).toBe('c-value5'); // from child
    });

    it('throws error for circular inheritance', async () => {
      const profileA = {
        id: 'profile_a',
        extends: 'profile_b'
      };

      const profileB = {
        id: 'profile_b',
        extends: 'profile_a'
      };

      writeFileSync(join(profilesDir, 'profile_a.json'), JSON.stringify(profileA));
      writeFileSync(join(profilesDir, 'profile_b.json'), JSON.stringify(profileB));

      await expect(
        loadAndMergeProfile('profile_a', { searchFrom: testDir })
      ).rejects.toThrow(/Circular inheritance detected/);
    });

    it('throws error when profile not found', async () => {
      await expect(
        loadAndMergeProfile('nonexistent', { searchFrom: testDir })
      ).rejects.toThrow(/Profile not found/);
    });

    it('throws error when parent profile not found', async () => {
      const childProfile = {
        id: 'child',
        extends: 'nonexistent_parent'
      };

      writeFileSync(join(profilesDir, 'child.json'), JSON.stringify(childProfile));

      await expect(
        loadAndMergeProfile('child', { searchFrom: testDir })
      ).rejects.toThrow(/Profile not found/);
    });

    it('throws error for invalid profile (missing id)', async () => {
      const invalidProfile = {
        name: 'No ID Profile'
      };

      writeFileSync(join(profilesDir, 'invalid.json'), JSON.stringify(invalidProfile));

      await expect(
        loadAndMergeProfile('invalid', { searchFrom: testDir })
      ).rejects.toThrow(/missing required 'id' field/);
    });

    it('throws error for profile id mismatch', async () => {
      const mismatchProfile = {
        id: 'different_id',
        name: 'Mismatched'
      };

      writeFileSync(join(profilesDir, 'filename.json'), JSON.stringify(mismatchProfile));

      await expect(
        loadAndMergeProfile('filename', { searchFrom: testDir })
      ).rejects.toThrow(/does not match filename/);
    });

    it('merges nested objects through inheritance chain', async () => {
      const base = {
        id: 'base',
        layout: {
          header: { height: '1in', enabled: true },
          footer: { height: '0.5in', enabled: true }
        }
      };

      const middle = {
        id: 'middle',
        extends: 'base',
        layout: {
          header: { height: '2in' } // override header height
        }
      };

      const final = {
        id: 'final',
        extends: 'middle',
        layout: {
          footer: { height: '1in' } // override footer height
        }
      };

      writeFileSync(join(profilesDir, 'base.json'), JSON.stringify(base));
      writeFileSync(join(profilesDir, 'middle.json'), JSON.stringify(middle));
      writeFileSync(join(profilesDir, 'final.json'), JSON.stringify(final));

      const merged = await loadAndMergeProfile('final', { searchFrom: testDir });

      expect(merged.layout.header.height).toBe('2in'); // from middle
      expect(merged.layout.header.enabled).toBe(true); // from base
      expect(merged.layout.footer.height).toBe('1in'); // from final
      expect(merged.layout.footer.enabled).toBe(true); // from base
    });

    it('handles array replacement through inheritance', async () => {
      const base = {
        id: 'base',
        fonts: ['Arial', 'Times'],
        colors: ['red', 'blue']
      };

      const child = {
        id: 'child',
        extends: 'base',
        fonts: ['Helvetica'] // replace base fonts
      };

      writeFileSync(join(profilesDir, 'base.json'), JSON.stringify(base));
      writeFileSync(join(profilesDir, 'child.json'), JSON.stringify(child));

      const merged = await loadAndMergeProfile('child', { searchFrom: testDir });

      expect(merged.fonts).toEqual(['Helvetica']); // replaced
      expect(merged.colors).toEqual(['red', 'blue']); // inherited
    });

    it('loads YAML profile with inheritance', async () => {
      const baseYaml = `id: base\npageSize: letter\nmargin: 1in`;
      const childYaml = `id: child\nextends: base\nmargin: 0.5in`;

      writeFileSync(join(profilesDir, 'base.yaml'), baseYaml);
      writeFileSync(join(profilesDir, 'child.yaml'), childYaml);

      const merged = await loadAndMergeProfile('child', { searchFrom: testDir });

      expect(merged.id).toBe('child');
      expect(merged.pageSize).toBe('letter');
      expect(merged.margin).toBe('0.5in');
    });
  });
});
