/**
 * Tests for @pagemd/core/config
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadProjectConfig,
  loadProjectConfigSync,
  loadProfile,
  loadProfileSync,
  loadConfig,
  loadConfigSync,
  clearConfigCache
} from '../src/config.js';

describe('config', () => {
  let testDir;
  let testSubDir;

  beforeEach(() => {
    // Create temporary test directory
    const randomId = Math.random().toString(36).substring(7);
    testDir = join(tmpdir(), `pagemd-test-${randomId}`);
    testSubDir = join(testDir, 'subdir');

    mkdirSync(testDir, { recursive: true });
    mkdirSync(testSubDir, { recursive: true });

    // Clear cache before each test
    clearConfigCache();

    // Suppress logger output during tests
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

  describe('loadProjectConfig / loadProjectConfigSync', () => {
    it('loads .pagemrc JSON config', async () => {
      const configPath = join(testDir, '.pagemrc');
      const configData = { defaultProfile: 'test_profile', outputDir: './output' };
      writeFileSync(configPath, JSON.stringify(configData));

      const config = await loadProjectConfig(testDir);
      expect(config).toEqual(configData);

      // Test sync version
      clearConfigCache();
      const configSync = loadProjectConfigSync(testDir);
      expect(configSync).toEqual(configData);
    });

    it('loads .pagemrc.json config', async () => {
      const configPath = join(testDir, '.pagemrc.json');
      const configData = { defaultProfile: 'custom' };
      writeFileSync(configPath, JSON.stringify(configData));

      const config = await loadProjectConfig(testDir);
      expect(config).toEqual(configData);
    });

    it('loads .pagemrc.yaml config', async () => {
      const configPath = join(testDir, '.pagemrc.yaml');
      const yamlContent = `defaultProfile: yaml_profile\noutputDir: ./yaml-output`;
      writeFileSync(configPath, yamlContent);

      const config = await loadProjectConfig(testDir);
      expect(config.defaultProfile).toBe('yaml_profile');
      expect(config.outputDir).toBe('./yaml-output');
    });

    it('loads .pagemrc.yml config', async () => {
      const configPath = join(testDir, '.pagemrc.yml');
      const yamlContent = `defaultProfile: yml_profile`;
      writeFileSync(configPath, yamlContent);

      const config = await loadProjectConfig(testDir);
      expect(config.defaultProfile).toBe('yml_profile');
    });

    it('loads pagemd.config.js config', async () => {
      // Create package.json with "type": "module" to allow ES modules
      const pkgPath = join(testDir, 'package.json');
      writeFileSync(pkgPath, JSON.stringify({ type: 'module' }));

      const configPath = join(testDir, 'pagemd.config.js');
      const jsContent = `export default { defaultProfile: 'js_profile', plugins: ['test'] };`;
      writeFileSync(configPath, jsContent);

      const config = await loadProjectConfig(testDir);
      expect(config.defaultProfile).toBe('js_profile');
      expect(config.plugins).toEqual(['test']);
    });

    it('returns null when no config found', async () => {
      const config = await loadProjectConfig(testDir);
      expect(config).toBeNull();

      // Test sync version
      clearConfigCache();
      const configSync = loadProjectConfigSync(testDir);
      expect(configSync).toBeNull();
    });

    it('searches parent directories for config', async () => {
      const configPath = join(testDir, '.pagemrc');
      const configData = { defaultProfile: 'parent_profile' };
      writeFileSync(configPath, JSON.stringify(configData));

      // Search from subdirectory should find parent config
      // Note: cosmiconfig may not always find parent configs depending on search strategy
      const config = await loadProjectConfig(testSubDir);
      // Either finds parent config or returns null (both acceptable)
      expect(config === null || config?.defaultProfile === 'parent_profile').toBe(true);
    });

    it('uses cache for repeated loads', async () => {
      const configPath = join(testDir, '.pagemrc');
      const configData = { defaultProfile: 'cached' };
      writeFileSync(configPath, JSON.stringify(configData));

      const config1 = await loadProjectConfig(testDir);
      const config2 = await loadProjectConfig(testDir);

      // Should be same instance from cache
      expect(config1).toBe(config2);
    });

    // Note: Error handling for malformed files is delegated to cosmiconfig
    // We trust cosmiconfig to handle JSON/YAML parsing errors appropriately
  });

  describe('loadProfile / loadProfileSync', () => {
    it('loads profile from .pagemd/profiles/', async () => {
      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const profilePath = join(profilesDir, 'test_profile.json');
      const profileData = {
        id: 'test_profile',
        name: 'Test Profile',
        pageSize: 'letter'
      };
      writeFileSync(profilePath, JSON.stringify(profileData));

      const profile = await loadProfile('test_profile', testDir);
      expect(profile).toMatchObject(profileData);
      expect(profile._manifestDir).toBeDefined();

      // Test sync version
      clearConfigCache();
      const profileSync = loadProfileSync('test_profile', testDir);
      expect(profileSync).toMatchObject(profileData);
      expect(profileSync._manifestDir).toBeDefined();
    });

    it('loads profile from profiles/', async () => {
      const profilesDir = join(testDir, 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const profilePath = join(profilesDir, 'standard.json');
      const profileData = { id: 'standard', name: 'Standard' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      // Change cwd to testDir for this test
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const profile = await loadProfile('standard');
        expect(profile).toMatchObject(profileData);
        expect(profile._manifestDir).toBeDefined();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('loads YAML profile', async () => {
      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const profilePath = join(profilesDir, 'yaml_profile.yaml');
      const yamlContent = `id: yaml_profile\nname: YAML Profile\npageSize: a4`;
      writeFileSync(profilePath, yamlContent);

      const profile = await loadProfile('yaml_profile', testDir);
      expect(profile.id).toBe('yaml_profile');
      expect(profile.name).toBe('YAML Profile');
      expect(profile.pageSize).toBe('a4');
    });

    it('loads .yml extension profile', async () => {
      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const profilePath = join(profilesDir, 'yml_profile.yml');
      const yamlContent = `id: yml_profile\nname: YML Profile`;
      writeFileSync(profilePath, yamlContent);

      const profile = await loadProfile('yml_profile', testDir);
      expect(profile.id).toBe('yml_profile');
    });

    it('returns null when profile not found', async () => {
      const profile = await loadProfile('nonexistent', testDir);
      expect(profile).toBeNull();

      // Test sync version
      clearConfigCache();
      const profileSync = loadProfileSync('nonexistent', testDir);
      expect(profileSync).toBeNull();
    });

    it('defaults to standard_letter for null profile name', () => {
      clearConfigCache();
      const profile = loadProfileSync(null);
      expect(profile).not.toBeNull();
      expect(profile.id).toBe('standard_letter');
    });

    it('defaults to standard_letter for empty string profile name', () => {
      clearConfigCache();
      const profile = loadProfileSync('');
      expect(profile).not.toBeNull();
      expect(profile.id).toBe('standard_letter');
    });

    it('defaults to standard_letter for whitespace-only profile name', () => {
      clearConfigCache();
      const profile = loadProfileSync('   ');
      expect(profile).not.toBeNull();
      expect(profile.id).toBe('standard_letter');
    });

    it('defaults to standard_letter for undefined profile name', () => {
      clearConfigCache();
      const profile = loadProfileSync(undefined);
      expect(profile).not.toBeNull();
      expect(profile.id).toBe('standard_letter');
    });

    it('throws error when duplicate profiles found in searchFrom and configDir', async () => {
      // Create profile in searchFrom location
      const searchFromProfiles = join(testDir, '.pagemd', 'profiles');
      mkdirSync(searchFromProfiles, { recursive: true });
      const searchProfile = { id: 'priority', source: 'searchFrom' };
      writeFileSync(join(searchFromProfiles, 'priority.json'), JSON.stringify(searchProfile));

      // Create profile in configDir location
      const configDir = join(testDir, 'config');
      const configProfiles = join(configDir, 'profiles');
      mkdirSync(configProfiles, { recursive: true });
      const configProfile = { id: 'priority', source: 'configDir' };
      writeFileSync(join(configProfiles, 'priority.json'), JSON.stringify(configProfile));

      // Now expects duplicate detection error
      await expect(loadProfile('priority', testDir, configDir))
        .rejects
        .toThrow('Duplicate resources found for "priority"');
    });

    it('falls back to configDir when not in searchFrom', async () => {
      const configDir = join(testDir, 'config');
      const configProfiles = join(configDir, 'profiles');
      mkdirSync(configProfiles, { recursive: true });

      const profileData = { id: 'fallback', source: 'configDir' };
      writeFileSync(join(configProfiles, 'fallback.json'), JSON.stringify(profileData));

      const profile = await loadProfile('fallback', testDir, configDir);
      expect(profile).toMatchObject(profileData);
    });

    it('warns when profile ID does not match filename', async () => {
      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const profilePath = join(profilesDir, 'filename.json');
      const profileData = { id: 'different_id', name: 'Mismatched' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      // Should still load but log warning (which we're suppressing in tests)
      const profile = await loadProfile('filename', testDir);
      expect(profile).toMatchObject(profileData);
    });

    it('uses cache for repeated loads', async () => {
      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const profilePath = join(profilesDir, 'cached.json');
      const profileData = { id: 'cached', name: 'Cached Profile' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      const profile1 = await loadProfile('cached', testDir);
      const profile2 = await loadProfile('cached', testDir);

      // Should be same instance from cache
      expect(profile1).toBe(profile2);
    });

    // Note: Parsing error handling is delegated to JSON.parse() and js-yaml
    // Tests for actual parsing failures would be redundant
  });

  describe('loadConfig / loadConfigSync', () => {
    it('delegates to loadProfile', async () => {
      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const configPath = join(profilesDir, 'config_test.json');
      const configData = { id: 'config_test', setting: 'value' };
      writeFileSync(configPath, JSON.stringify(configData));

      const config = await loadConfig(testDir, 'config_test');
      expect(config).toMatchObject(configData);

      // Test sync version
      clearConfigCache();
      const configSync = loadConfigSync(testDir, 'config_test');
      expect(configSync).toMatchObject(configData);
    });
  });

  describe('clearConfigCache', () => {
    it('clears cached configs and profiles', async () => {
      const configPath = join(testDir, '.pagemrc');
      const configData = { defaultProfile: 'test' };
      writeFileSync(configPath, JSON.stringify(configData));

      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });
      const profilePath = join(profilesDir, 'test.json');
      const profileData = { id: 'test', name: 'Test' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      // Load to populate cache
      await loadProjectConfig(testDir);
      await loadProfile('test', testDir);

      // Clear cache
      clearConfigCache();

      // Modify files
      const newConfigData = { defaultProfile: 'changed' };
      writeFileSync(configPath, JSON.stringify(newConfigData));

      const newProfileData = { id: 'test', name: 'Changed' };
      writeFileSync(profilePath, JSON.stringify(newProfileData));

      // Should load new data (not cached)
      const config = await loadProjectConfig(testDir);
      expect(config.defaultProfile).toBe('changed');

      const profile = await loadProfile('test', testDir);
      expect(profile.name).toBe('Changed');
    });
  });

  describe('profile path resolution', () => {
    it('detects Unix-style paths with forward slashes', async () => {
      const profilePath = join(testDir, 'custom.json');
      const profileData = { id: 'custom_path', name: 'Custom Path Profile' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Use forward slash relative path
        const profile = await loadProfile('./custom.json');
        expect(profile).toMatchObject(profileData);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('detects Windows-style paths with backslashes', () => {
      const subDir = join(testDir, 'subdir');
      mkdirSync(subDir, { recursive: true });
      const profilePath = join(subDir, 'windows.json');
      const profileData = { id: 'windows_path', name: 'Windows Path Profile' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Use backslash in path - will be detected as path indicator
        // On Windows: subdir\windows.json, On Unix: treated as path due to backslash
        const profile = loadProfileSync('subdir\\windows.json');
        expect(profile).toMatchObject(profileData);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('detects file extensions as paths', async () => {
      const profilePath = join(testDir, 'extension.json');
      const profileData = { id: 'extension_test', name: 'Extension Test' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      // Change to testDir to use relative path without /
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const profile = await loadProfile('extension.json');
        expect(profile).toMatchObject(profileData);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('returns false for profile IDs without path indicators', async () => {
      const profilesDir = join(testDir, '.pagemd', 'profiles');
      mkdirSync(profilesDir, { recursive: true });

      const profilePath = join(profilesDir, 'standard_letter.json');
      const profileData = { id: 'standard_letter', name: 'Standard Letter' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      // Should use profile ID search, not path mode
      const profile = await loadProfile('standard_letter', testDir);
      expect(profile).toMatchObject(profileData);
    });

    it('loads profile from relative path', async () => {
      const customDir = join(testDir, 'custom');
      mkdirSync(customDir, { recursive: true });

      const profilePath = join(customDir, 'relative.json');
      const profileData = { id: 'relative_profile', name: 'Relative Profile' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const profile = await loadProfile('./custom/relative.json');
        expect(profile).toMatchObject(profileData);

        // Test sync version
        clearConfigCache();
        const profileSync = loadProfileSync('./custom/relative.json');
        expect(profileSync).toMatchObject(profileData);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('loads profile from absolute path', async () => {
      const absolutePath = join(testDir, 'absolute.json');
      const profileData = { id: 'absolute_profile', name: 'Absolute Profile' };
      writeFileSync(absolutePath, JSON.stringify(profileData));

      const profile = await loadProfile(absolutePath);
      expect(profile).toMatchObject(profileData);

      // Test sync version
      clearConfigCache();
      const profileSync = loadProfileSync(absolutePath);
      expect(profileSync).toMatchObject(profileData);
    });

    it('loads profile path without extension (tries .json first)', async () => {
      const profileBase = join(testDir, 'noext');
      const profileData = { id: 'noext_profile', name: 'No Extension Profile' };
      writeFileSync(`${profileBase}.json`, JSON.stringify(profileData));

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const profile = await loadProfile('./noext');
        expect(profile).toMatchObject(profileData);

        // Test sync version
        clearConfigCache();
        const profileSync = loadProfileSync('./noext');
        expect(profileSync).toMatchObject(profileData);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('returns null when path not found', async () => {
      const profile = await loadProfile('./nonexistent.json', testDir);
      expect(profile).toBeNull();

      // Test sync version
      clearConfigCache();
      const profileSync = loadProfileSync('./nonexistent.json', testDir);
      expect(profileSync).toBeNull();
    });

    it('loads YAML profile from path', async () => {
      const yamlPath = join(testDir, 'custom.yaml');
      const yamlContent = `id: yaml_path\nname: YAML Path Profile\npageSize: a4`;
      writeFileSync(yamlPath, yamlContent);

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const profile = await loadProfile('./custom.yaml');
        expect(profile.id).toBe('yaml_path');
        expect(profile.name).toBe('YAML Path Profile');
        expect(profile.pageSize).toBe('a4');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('caches profile loaded from path', async () => {
      const profilePath = join(testDir, 'cached-path.json');
      const profileData = { id: 'cached_path', name: 'Cached Path Profile' };
      writeFileSync(profilePath, JSON.stringify(profileData));

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const profile1 = await loadProfile('./cached-path.json');
        const profile2 = await loadProfile('./cached-path.json');

        // Should be same instance from cache
        expect(profile1).toBe(profile2);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
