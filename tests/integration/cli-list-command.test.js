/**
 * Integration Test: CLI List Command
 *
 * Tests `pagemd list [resource]` command and its aliases.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, '../..');
const CLI_PATH = resolve(PROJECT_ROOT, 'apps/cli/src/index.js');
const TEMP_DIR = resolve(__dirname, '.temp-list-test');

// Helper to run CLI and capture output
function runCli(args, options = {}) {
  const cmd = `node "${CLI_PATH}" ${args}`;
  try {
    const result = execSync(cmd, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      env: { ...process.env, PAGEMD_LOG_LEVEL: 'OFF' },
      timeout: 30000,
      ...options
    });
    return { stdout: result, exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1
    };
  }
}

describe('CLI List Command', () => {
  describe('Command recognition', () => {
    it('should require resource argument', () => {
      const result = runCli('list');
      expect(result.exitCode).toBe(1);
      expect(result.stderr || '').toContain('Resource type required');
    });

    it('should recognize "ls" alias', () => {
      const result = runCli('ls profiles');
      expect(result.exitCode).toBe(0);
      expect(result.stderr || '').not.toContain('Unknown command');
    });

    it('should recognize "list profiles" command', () => {
      const result = runCli('list profiles');
      expect(result.exitCode).toBe(0);
      expect(result.stderr || '').not.toContain('Unknown command');
    });
  });

  describe('Help output', () => {
    it('should show help for list command', () => {
      const result = runCli('list --help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('resource');
      expect(result.stdout).toContain('profiles');
      expect(result.stdout).toContain('templates');
      expect(result.stdout).toContain('layouts');
      expect(result.stdout).toContain('styles');
    });

    it('should show JSON option in help', () => {
      const result = runCli('list --help');
      expect(result.stdout).toContain('--json');
      expect(result.stdout).toContain('-j');
    });

    it('should show verbose option in help', () => {
      const result = runCli('list --help');
      expect(result.stdout).toContain('--verbose');
    });

    it('should show all option in help', () => {
      const result = runCli('list --help');
      expect(result.stdout).toContain('--all');
      expect(result.stdout).toContain('-a');
    });
  });

  describe('Profiles listing', () => {
    it('should list profiles with resource argument', () => {
      const result = runCli('list profiles');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('standard_letter');
    });

    it('should show profile descriptions', () => {
      const result = runCli('list profiles');
      expect(result.stdout).toContain('Standard US Letter');
    });
  });

  describe('Resource types', () => {
    it('should list profiles explicitly', () => {
      const result = runCli('list profiles');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('profiles');
    });

    it('should list templates', () => {
      const result = runCli('list templates');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('templates');
    });

    it('should list layouts', () => {
      const result = runCli('list layouts');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('layouts');
    });

    it('should list styles', () => {
      const result = runCli('list styles');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('styles');
    });

    it('should reject invalid resource type', () => {
      const result = runCli('list invalid');
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('JSON output', () => {
    it('should output valid JSON with --json', () => {
      const result = runCli('list profiles --json');
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should output valid JSON with -j', () => {
      const result = runCli('list profiles -j');
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should include name, path, source in JSON', () => {
      const result = runCli('list profiles --json');
      const parsed = JSON.parse(result.stdout);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('name');
      expect(parsed[0]).toHaveProperty('path');
      expect(parsed[0]).toHaveProperty('source');
    });

    it('should include profile-specific fields for profiles', () => {
      const result = runCli('list profiles --json');
      const parsed = JSON.parse(result.stdout);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('description');
    });
  });

  describe('Verbose output', () => {
    it('should show path in verbose mode', () => {
      const result = runCli('list profiles --verbose');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Path:');
    });

    it('should show size in verbose mode', () => {
      const result = runCli('list profiles --verbose');
      expect(result.stdout).toContain('Size:');
    });

    it('should show source in verbose mode', () => {
      const result = runCli('list profiles --verbose');
      expect(result.stdout).toContain('Source:');
    });
  });

  describe('Alias equivalence', () => {
    it('should produce same output for "list profiles" and "ls profiles"', () => {
      const listResult = runCli('list profiles');
      const lsResult = runCli('ls profiles');
      expect(listResult.stdout).toBe(lsResult.stdout);
    });
  });
});

describe('Resource Discovery (via list command)', () => {
  describe('Project resources', () => {
    it('should find standard_letter profile', () => {
      const result = runCli('list profiles --json');
      const parsed = JSON.parse(result.stdout);
      const profile = parsed.find(p => p.name === 'standard_letter');
      expect(profile).toBeDefined();
      expect(profile.source).toBe('project');
    });

    it('should find standard_letter template', () => {
      const result = runCli('list templates --json');
      const parsed = JSON.parse(result.stdout);
      const template = parsed.find(t => t.name === 'standard_letter');
      expect(template).toBeDefined();
    });

    it('should find letter layout', () => {
      const result = runCli('list layouts --json');
      const parsed = JSON.parse(result.stdout);
      const layout = parsed.find(l => l.name === 'letter');
      expect(layout).toBeDefined();
    });

    it('should find base style', () => {
      const result = runCli('list styles --json');
      const parsed = JSON.parse(result.stdout);
      const style = parsed.find(s => s.name === 'base');
      expect(style).toBeDefined();
    });

    it('should find primary style', () => {
      const result = runCli('list styles --json');
      const parsed = JSON.parse(result.stdout);
      const style = parsed.find(s => s.name === 'primary');
      expect(style).toBeDefined();
    });
  });

  describe('Workspace resources', () => {
    const WORKSPACE_DIR = resolve(PROJECT_ROOT, '.pagemd', 'profiles');
    const TEST_PROFILE = join(WORKSPACE_DIR, 'test_workspace_profile.json');

    beforeAll(() => {
      // Create a test workspace profile
      if (!existsSync(WORKSPACE_DIR)) {
        mkdirSync(WORKSPACE_DIR, { recursive: true });
      }
      writeFileSync(TEST_PROFILE, JSON.stringify({
        id: 'test_workspace_profile',
        description: 'Test workspace profile'
      }, null, 2));
    });

    afterAll(() => {
      // Cleanup test workspace profile
      if (existsSync(TEST_PROFILE)) {
        rmSync(TEST_PROFILE);
      }
    });

    it('should not include workspace profiles by default', () => {
      const result = runCli('list profiles --json');
      const parsed = JSON.parse(result.stdout);
      const wsProfile = parsed.find(p => p.name === 'test_workspace_profile');
      expect(wsProfile).toBeUndefined();
    });

    it('should include workspace profiles with --all', () => {
      const result = runCli('list profiles --all --json');
      const parsed = JSON.parse(result.stdout);
      const wsProfile = parsed.find(p => p.name === 'test_workspace_profile');
      expect(wsProfile).toBeDefined();
      expect(wsProfile.source).toBe('workspace');
    });

    it('should include workspace profiles with -a', () => {
      const result = runCli('list profiles -a --json');
      const parsed = JSON.parse(result.stdout);
      const wsProfile = parsed.find(p => p.name === 'test_workspace_profile');
      expect(wsProfile).toBeDefined();
    });
  });
});
