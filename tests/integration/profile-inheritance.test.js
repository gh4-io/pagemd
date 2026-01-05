/**
 * Integration Test: Profile Inheritance System
 *
 * Tests profile loading, extends/inheritance, and metadata merging:
 * - Default profile loading (8/8 tests pass)
 * - Profile extends chain resolution (4/4 tests pass)
 * - Deep-merge objects, replace arrays (3/3 tests pass)
 * - Circular reference detection (3/3 tests pass)
 * - Profile validation (4/4 tests pass)
 * - Profile search and resolution (3/3 tests pass)
 * - Profile precedence and override (3/3 tests pass)
 *
 * All tests passing (28/28).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadProfileSync,
  getDefaultProfile,
  mergeProfiles,
  validateProfile,
  detectCircularInheritance,
  loadAndMergeProfile
} from '@pagemd/core';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const PROJECT_ROOT = '/mnt/c/Users/Jason/Documents/Git/PageMD/project';
const TEST_PROFILES_BASE = join(PROJECT_ROOT, 'tests', 'integration', 'test-profiles');
const TEST_PROFILES_DIR = join(TEST_PROFILES_BASE, 'profiles');

describe('Profile Inheritance System', () => {
  // Setup test profiles dir before tests that need custom profiles
  async function setupTestProfiles() {
    await mkdir(TEST_PROFILES_DIR, { recursive: true });
  }

  async function cleanupTestProfiles() {
    await rm(TEST_PROFILES_BASE, { recursive: true, force: true });
  }

  describe('Default profile loading', () => {
    it('should identify default profile', () => {
      const defaultProfile = getDefaultProfile();
      expect(defaultProfile).toBe('standard_letter');
    });

    it('should load standard_letter profile', () => {
      const profile = loadProfileSync('standard_letter', PROJECT_ROOT, PROJECT_ROOT);

      expect(profile).toBeDefined();
      expect(profile.id).toBe('standard_letter');
      expect(profile.description).toBeTruthy();
    });

    it('should load profile with all required sections', () => {
      const profile = loadProfileSync('standard_letter', PROJECT_ROOT, PROJECT_ROOT);

      // Required sections
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('layout');
      expect(profile).toHaveProperty('resources');
      expect(profile).toHaveProperty('pagedjs');
      expect(profile).toHaveProperty('outputs');
      expect(profile).toHaveProperty('validation');
      expect(profile).toHaveProperty('metadata');
    });

    it('should have valid layout config', () => {
      const profile = loadProfileSync('standard_letter', PROJECT_ROOT, PROJECT_ROOT);

      expect(profile.layout).toMatchObject({
        type: 'html',
        source: expect.stringContaining('standard_letter.html')
      });
    });

    it('should have valid resources config', () => {
      const profile = loadProfileSync('standard_letter', PROJECT_ROOT, PROJECT_ROOT);

      expect(profile.resources).toHaveProperty('css');
      expect(Array.isArray(profile.resources.css)).toBe(true);
      expect(profile.resources.css.length).toBeGreaterThan(0);

      expect(profile.resources).toHaveProperty('fonts');
      expect(Array.isArray(profile.resources.fonts)).toBe(true);

      expect(profile.resources).toHaveProperty('assets');
      expect(Array.isArray(profile.resources.assets)).toBe(true);
    });

    it('should have valid outputs config', () => {
      const profile = loadProfileSync('standard_letter', PROJECT_ROOT, PROJECT_ROOT);

      const outputs = profile.outputs;

      // PDF output
      expect(outputs.pdf).toMatchObject({
        enabled: true,
        mode: expect.stringMatching(/ACTIVE_ONLY|ALWAYS|DISABLED/)
      });

      // HTML output
      expect(outputs.html).toHaveProperty('enabled');
      expect(outputs.html).toHaveProperty('mode');

      // Image outputs
      expect(outputs.png).toHaveProperty('enabled');
      expect(outputs.jpeg).toHaveProperty('enabled');
    });

    it('should have validation rules', () => {
      const profile = loadProfileSync('standard_letter', PROJECT_ROOT, PROJECT_ROOT);

      expect(profile.validation).toHaveProperty('required_fields');
      expect(Array.isArray(profile.validation.required_fields)).toBe(true);
      expect(profile.validation.required_fields).toContain('document_id');
      expect(profile.validation.required_fields).toContain('title');
    });

    it('should have metadata defaults', () => {
      const profile = loadProfileSync('standard_letter', PROJECT_ROOT, PROJECT_ROOT);

      expect(profile.metadata).toHaveProperty('defaults');
      expect(profile.metadata.defaults).toMatchObject({
        status: 'Draft',
        revision: 0
      });
    });
  });

  describe('Profile extends/inheritance', () => {
    beforeAll(async () => {
      await setupTestProfiles();

      // Create base profile
      const baseProfile = {
        id: 'test_base',
        description: 'Base test profile',
        layout: {
          type: 'html',
          source: 'base.html'
        },
        resources: {
          css: ['base.css'],
          fonts: ['base-font.woff2']
        },
        metadata: {
          defaults: {
            status: 'Draft',
            priority: 'Low'
          },
          date_format: 'MM/DD/YYYY'
        },
        validation: {
          required_fields: ['document_id']
        }
      };

      // Create child profile that extends base
      const childProfile = {
        id: 'test_child',
        description: 'Child test profile',
        extends: 'test_base',
        resources: {
          css: ['child.css'],
          fonts: []
        },
        metadata: {
          defaults: {
            priority: 'High',
            category: 'Test'
          }
        },
        validation: {
          required_fields: ['document_id', 'title']
        }
      };

      await writeFile(
        join(TEST_PROFILES_DIR, 'test_base.json'),
        JSON.stringify(baseProfile, null, 2)
      );

      await writeFile(
        join(TEST_PROFILES_DIR, 'test_child.json'),
        JSON.stringify(childProfile, null, 2)
      );
    });

    afterAll(async () => {
      await cleanupTestProfiles();
    });

    it('should load child profile with extends', () => {
      const profile = loadProfileSync('test_child', TEST_PROFILES_BASE, TEST_PROFILES_BASE);

      expect(profile).toBeDefined();
      expect(profile.id).toBe('test_child');
      expect(profile.extends).toBe('test_base');
    });

    it('should merge parent and child profiles (deep-merge objects)', async () => {
      const merged = await loadAndMergeProfile('test_child', {
        searchFrom: TEST_PROFILES_BASE,
        configDir: TEST_PROFILES_BASE
      });

      // Child properties should override
      expect(merged.id).toBe('test_child');
      expect(merged.description).toBe('Child test profile');

      // Parent properties should be inherited
      expect(merged.layout).toMatchObject({
        type: 'html',
        source: 'base.html'
      });

      // Metadata defaults should deep-merge
      expect(merged.metadata.defaults).toMatchObject({
        status: 'Draft',      // from parent
        priority: 'High',      // overridden by child
        category: 'Test'       // from child only
      });

      // Date format from parent should be inherited
      expect(merged.metadata.date_format).toBe('MM/DD/YYYY');
    });

    it('should replace arrays (not merge)', async () => {
      const merged = await loadAndMergeProfile('test_child', {
        searchFrom: TEST_PROFILES_BASE,
        configDir: TEST_PROFILES_BASE
      });

      // CSS array should be replaced completely (not merged)
      expect(merged.resources.css).toEqual(['child.css']);
      expect(merged.resources.css).not.toContain('base.css');

      // Fonts array replaced with empty array
      expect(merged.resources.fonts).toEqual([]);

      // Validation required_fields replaced
      expect(merged.validation.required_fields).toEqual(['document_id', 'title']);
      expect(merged.validation.required_fields.length).toBe(2);
    });

    it('should handle multi-level inheritance', async () => {
      // Create grandchild profile
      const grandchildProfile = {
        id: 'test_grandchild',
        extends: 'test_child',
        description: 'Grandchild profile',
        metadata: {
          defaults: {
            priority: 'Critical',
            archived: false
          }
        }
      };

      await writeFile(
        join(TEST_PROFILES_DIR, 'test_grandchild.json'),
        JSON.stringify(grandchildProfile, null, 2)
      );

      const merged = await loadAndMergeProfile('test_grandchild', {
        searchFrom: TEST_PROFILES_BASE,
        configDir: TEST_PROFILES_BASE
      });

      // Should inherit from entire chain
      expect(merged.layout.type).toBe('html'); // from base
      expect(merged.metadata.defaults.status).toBe('Draft'); // from base
      expect(merged.metadata.defaults.category).toBe('Test'); // from child
      expect(merged.metadata.defaults.priority).toBe('Critical'); // from grandchild
      expect(merged.metadata.defaults.archived).toBe(false); // from grandchild
    });
  });

  describe('Metadata merging', () => {
    it('should deep-merge nested objects', () => {
      const parent = {
        id: 'parent',
        metadata: {
          defaults: {
            status: 'Draft',
            priority: 'Low',
            tags: []
          },
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' }
            }
          }
        }
      };

      const child = {
        id: 'child',
        metadata: {
          defaults: {
            priority: 'High',
            category: 'Test'
          },
          schema: {
            required: ['title']
          }
        }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.metadata.defaults).toMatchObject({
        status: 'Draft',
        priority: 'High',
        category: 'Test',
        tags: []
      });

      expect(merged.metadata.schema).toMatchObject({
        type: 'object',
        properties: {
          title: { type: 'string' }
        },
        required: ['title']
      });
    });

    it('should replace arrays completely', () => {
      const parent = {
        id: 'parent',
        resources: {
          css: ['a.css', 'b.css', 'c.css']
        }
      };

      const child = {
        id: 'child',
        resources: {
          css: ['x.css']
        }
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.resources.css).toEqual(['x.css']);
      expect(merged.resources.css.length).toBe(1);
    });

    it('should handle null and undefined values', () => {
      const parent = {
        id: 'parent',
        value1: 'parent-value',
        value2: null,
        value3: { nested: 'object' }
      };

      const child = {
        id: 'child',
        value1: null,
        value2: 'child-value',
        value3: null
      };

      const merged = mergeProfiles(parent, child);

      expect(merged.value1).toBeNull();
      expect(merged.value2).toBe('child-value');
      expect(merged.value3).toBeNull();
    });
  });

  describe('Profile validation', () => {
    it('should validate profile has id field', () => {
      const validProfile = { id: 'test', description: 'Test' };

      expect(() => {
        validateProfile(validProfile, 'test');
      }).not.toThrow();
    });

    it('should reject profile without id', () => {
      const invalidProfile = { description: 'No ID' };

      expect(() => {
        validateProfile(invalidProfile, 'test');
      }).toThrow('Profile missing required \'id\' field');
    });

    it('should validate id matches filename', () => {
      const profile = { id: 'correct_name' };

      expect(() => {
        validateProfile(profile, 'correct_name');
      }).not.toThrow();
    });

    it('should reject id mismatch with filename', () => {
      const profile = { id: 'wrong_id' };

      expect(() => {
        validateProfile(profile, 'expected_name');
      }).toThrow(/Profile ID.*does not match filename/);
    });
  });

  describe('Circular reference detection', () => {
    beforeAll(async () => {
      await setupTestProfiles();

      // Create circular reference: A -> B -> C -> A
      const profileA = {
        id: 'circular_a',
        extends: 'circular_b'
      };

      const profileB = {
        id: 'circular_b',
        extends: 'circular_c'
      };

      const profileC = {
        id: 'circular_c',
        extends: 'circular_a'
      };

      await writeFile(
        join(TEST_PROFILES_DIR, 'circular_a.json'),
        JSON.stringify(profileA, null, 2)
      );

      await writeFile(
        join(TEST_PROFILES_DIR, 'circular_b.json'),
        JSON.stringify(profileB, null, 2)
      );

      await writeFile(
        join(TEST_PROFILES_DIR, 'circular_c.json'),
        JSON.stringify(profileC, null, 2)
      );
    });

    afterAll(async () => {
      await cleanupTestProfiles();
    });

    it('should detect circular inheritance', () => {
      const loadFn = (name) => loadProfileSync(name, TEST_PROFILES_BASE, TEST_PROFILES_BASE);

      expect(() => {
        detectCircularInheritance('circular_a', [], loadFn);
      }).toThrow(/Circular inheritance detected/);
    });

    it('should prevent loading profile with circular reference', async () => {
      await expect(
        loadAndMergeProfile('circular_a', {
          searchFrom: TEST_PROFILES_BASE,
          configDir: TEST_PROFILES_BASE
        })
      ).rejects.toThrow(/Circular inheritance/);
    });

    it('should detect self-reference', async () => {
      const selfRef = {
        id: 'self_reference',
        extends: 'self_reference'
      };

      await writeFile(
        join(TEST_PROFILES_DIR, 'self_reference.json'),
        JSON.stringify(selfRef, null, 2)
      );

      await expect(
        loadAndMergeProfile('self_reference', {
          searchFrom: TEST_PROFILES_BASE,
          configDir: TEST_PROFILES_BASE
        })
      ).rejects.toThrow(/Circular inheritance/);
    });
  });

  describe('Profile search and resolution', () => {
    beforeAll(async () => {
      await setupTestProfiles();
    });

    afterAll(async () => {
      await cleanupTestProfiles();
    });
    it('should find profile in project templates dir', () => {
      const profile = loadProfileSync(
        'standard_letter',
        PROJECT_ROOT,
        PROJECT_ROOT
      );

      expect(profile).toBeDefined();
      expect(profile.id).toBe('standard_letter');
    });

    it('should return null for non-existent profile', () => {
      const profile = loadProfileSync(
        'non_existent_profile',
        PROJECT_ROOT,
        PROJECT_ROOT
      );

      expect(profile).toBeNull();
    });

    it('should handle missing extends gracefully', async () => {
      const orphan = {
        id: 'orphan_profile',
        extends: 'missing_parent'
      };

      await writeFile(
        join(TEST_PROFILES_DIR, 'orphan_profile.json'),
        JSON.stringify(orphan, null, 2)
      );

      await expect(
        loadAndMergeProfile('orphan_profile', {
          searchFrom: TEST_PROFILES_BASE,
          configDir: TEST_PROFILES_BASE
        })
      ).rejects.toThrow(/Profile not found.*missing_parent/);
    });
  });

  describe('Profile precedence and override', () => {
    beforeAll(async () => {
      await setupTestProfiles();

      // Create override scenario
      const baseOverride = {
        id: 'override_test',
        description: 'Base description',
        layout: {
          type: 'html',
          source: 'base.html',
          wrapper: 'div.container'
        },
        outputs: {
          pdf: {
            enabled: true,
            mode: 'ACTIVE_ONLY',
            options: {
              margin: '1in',
              format: 'Letter'
            }
          }
        }
      };

      const childOverride = {
        id: 'override_child',
        extends: 'override_test',
        description: 'Child description',
        layout: {
          wrapper: 'article.document',
          theme: 'modern'
        },
        outputs: {
          pdf: {
            options: {
              margin: '0.5in'
            }
          }
        }
      };

      await writeFile(
        join(TEST_PROFILES_DIR, 'override_test.json'),
        JSON.stringify(baseOverride, null, 2)
      );

      await writeFile(
        join(TEST_PROFILES_DIR, 'override_child.json'),
        JSON.stringify(childOverride, null, 2)
      );
    });

    afterAll(async () => {
      await cleanupTestProfiles();
    });

    it('should override parent properties', async () => {
      const merged = await loadAndMergeProfile('override_child', {
        searchFrom: TEST_PROFILES_BASE,
        configDir: TEST_PROFILES_BASE
      });

      expect(merged.description).toBe('Child description');
    });

    it('should deep-merge nested layout config', async () => {
      const merged = await loadAndMergeProfile('override_child', {
        searchFrom: TEST_PROFILES_BASE,
        configDir: TEST_PROFILES_BASE
      });

      expect(merged.layout).toMatchObject({
        type: 'html',           // from parent
        source: 'base.html',    // from parent
        wrapper: 'article.document',  // overridden by child
        theme: 'modern'         // from child only
      });
    });

    it('should deep-merge nested output options', async () => {
      const merged = await loadAndMergeProfile('override_child', {
        searchFrom: TEST_PROFILES_BASE,
        configDir: TEST_PROFILES_BASE
      });

      expect(merged.outputs.pdf).toMatchObject({
        enabled: true,          // from parent
        mode: 'ACTIVE_ONLY',    // from parent
        options: {
          margin: '0.5in',      // overridden by child
          format: 'Letter'      // from parent
        }
      });
    });
  });
});
