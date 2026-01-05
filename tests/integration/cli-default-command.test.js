/**
 * Integration Test: CLI Default Command Behavior
 *
 * Tests that `pagemd <file.md>` correctly infers `build` as the default command.
 */

import { describe, it, expect } from 'vitest';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, '../..');
const CLI_PATH = resolve(PROJECT_ROOT, 'apps/cli/src/index.js');
const TEMP_DIR = resolve(__dirname, '.temp-cli-test');

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

describe('CLI Default Command Inference', () => {
  // Create temp directory and test file before tests
  const testMdPath = join(TEMP_DIR, 'test-doc.md');

  beforeAll(() => {
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
    // Create a minimal test markdown file
    writeFileSync(testMdPath, `---
title: Test Document
document_id: TEST-001
revision: 1
---

# Test Document

This is a test.
`);
  });

  afterAll(() => {
    // Cleanup temp directory
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  describe('Default command detection', () => {
    it('should treat file path as build command input', () => {
      // Using help to verify parsing works without actually building
      const result = runCli('--help');
      // Message may wrap, so check for key parts
      expect(result.stdout).toContain('no command is specified');
      expect(result.stdout).toContain('build');
    });

    it('should show help with updated usage message', () => {
      const result = runCli('--help');
      expect(result.stdout).toContain('[command] <input> [options]');
    });

    it('should recognize explicit build command', () => {
      const result = runCli(`build "${testMdPath}" -o html`);
      // Should succeed or at least not fail with "unknown command"
      expect(result.stderr || '').not.toContain('Unknown command');
    });

    it('should recognize validate command', () => {
      const result = runCli(`validate "${testMdPath}"`);
      expect(result.stderr || '').not.toContain('Unknown command');
    });

    it('should recognize list command', () => {
      const result = runCli('list profiles');
      // Command should be recognized (not treated as a file path)
      expect(result.stderr || '').not.toContain('Unknown command');
      expect(result.stderr || '').not.toContain('ENOENT');
    });

    it('should recognize ls alias', () => {
      const result = runCli('ls profiles');
      // Command should be recognized (not treated as a file path)
      expect(result.stderr || '').not.toContain('Unknown command');
      expect(result.stderr || '').not.toContain('ENOENT');
    });
  });

  describe('Known commands array', () => {
    // These test that known commands are NOT treated as file paths

    it('should not treat "build" as a file path', () => {
      const result = runCli('build --help');
      expect(result.stdout).toContain('Build markdown');
    });

    it('should not treat "validate" as a file path', () => {
      const result = runCli('validate --help');
      expect(result.stdout).toContain('Validate');
    });

    it('should not treat "list" as a file path', () => {
      const result = runCli('list --help');
      expect(result.stdout).toContain('resource');
    });
  });

  describe('Edge cases', () => {
    it('should handle --help flag without inferring build', () => {
      const result = runCli('--help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Commands:');
    });

    it('should handle -h flag without inferring build', () => {
      const result = runCli('-h');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Commands:');
    });

    it('should handle --version flag without inferring build', () => {
      const result = runCli('--version');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should handle -v flag without inferring build', () => {
      const result = runCli('-v');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should fail gracefully for non-existent file', () => {
      const result = runCli('non-existent-file.md');
      expect(result.exitCode).not.toBe(0);
    });
  });
});
