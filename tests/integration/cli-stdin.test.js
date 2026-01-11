/**
 * Integration Test: CLI --stdin Flag
 *
 * Tests that `pagemd build --stdin` correctly reads markdown from stdin.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, '../..');
const CLI_PATH = resolve(PROJECT_ROOT, 'apps/cli/src/index.js');
const TEMP_DIR = resolve(__dirname, '.temp-stdin-test');

/**
 * Run CLI with stdin input
 * @param {string[]} args - CLI arguments
 * @param {string} stdinContent - Content to pipe to stdin
 * @param {object} options - Additional options
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function runCliWithStdin(args, stdinContent, options = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      cwd: options.cwd || TEMP_DIR,
      env: { ...process.env, PAGEMD_LOG_LEVEL: 'OFF' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Pipe stdin content
    child.stdin.write(stdinContent);
    child.stdin.end();

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      });
    });

    child.on('error', (err) => {
      resolve({
        stdout,
        stderr: err.message,
        exitCode: 1
      });
    });
  });
}

describe('CLI --stdin Flag', () => {
  beforeAll(() => {
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  });

  describe('Mutual exclusivity', () => {
    it('should error when neither input nor --stdin provided', async () => {
      const result = await runCliWithStdin(['build'], '');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('Provide <input> file/directory or use --stdin');
    });

    it('should error when both input and --stdin provided', async () => {
      const result = await runCliWithStdin(['build', 'test.md', '--stdin'], '# Test');
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('Cannot use both <input> and --stdin');
    });
  });

  describe('stdin reading', () => {
    it('should read markdown from stdin and generate HTML to stdout', async () => {
      const markdown = `---
title: Stdin Test
---

# Hello from stdin

This is a test document.
`;
      const result = await runCliWithStdin(
        ['build', '--stdin', '--stdout', '-o', 'html'],
        markdown
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<!DOCTYPE html>');
      expect(result.stdout).toContain('Hello from stdin');
      expect(result.stdout).toContain('This is a test document');
    });

    it('should error when stdin is empty', async () => {
      const result = await runCliWithStdin(
        ['build', '--stdin', '--stdout', '-o', 'html'],
        ''
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('No content received from stdin');
    });

    it('should error when stdin has only whitespace', async () => {
      const result = await runCliWithStdin(
        ['build', '--stdin', '--stdout', '-o', 'html'],
        '   \n\n   '
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('No content received from stdin');
    });
  });

  describe('--stdin with --stdout', () => {
    it('should output HTML to stdout', async () => {
      const markdown = '# Title\n\nParagraph content.';
      const result = await runCliWithStdin(
        ['build', '--stdin', '--stdout', '-o', 'html'],
        markdown
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<html');
      expect(result.stdout).toContain('<h1');
      expect(result.stdout).toContain('Title');
      expect(result.stdout).toContain('Paragraph content');
    });
  });

  describe('--stdin with --base-name', () => {
    it('should use custom base name for output files', async () => {
      const markdown = '# Test\n\nContent.';
      const result = await runCliWithStdin(
        ['build', '--stdin', '--base-name', 'custom-doc', '-o', 'html'],
        markdown
      );

      expect(result.exitCode).toBe(0);

      // Check that file was created with custom name
      const outputPath = join(TEMP_DIR, 'custom-doc.html');
      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('Test');
      expect(content).toContain('Content');
    });

    it('should default to "stdin" as base name', async () => {
      const markdown = '# Default Name Test\n\nContent.';
      const result = await runCliWithStdin(
        ['build', '--stdin', '-o', 'html'],
        markdown
      );

      expect(result.exitCode).toBe(0);

      // Check that file was created with default name
      const outputPath = join(TEMP_DIR, 'stdin.html');
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe('--stdin with profile', () => {
    it('should apply profile settings', async () => {
      const markdown = `---
title: Profile Test
---

# Test Document
`;
      const result = await runCliWithStdin(
        ['build', '--stdin', '--stdout', '-o', 'html', '-p', 'standard_letter'],
        markdown
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<!DOCTYPE html>');
      expect(result.stdout).toContain('Test Document');
    });
  });

  describe('--stdin with output directory', () => {
    it('should write output to specified directory', async () => {
      const outputDir = join(TEMP_DIR, 'output');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const markdown = '# Output Dir Test\n\nContent.';
      const result = await runCliWithStdin(
        ['build', '--stdin', '--base-name', 'outdir-test', '-o', 'html', '-d', outputDir],
        markdown
      );

      expect(result.exitCode).toBe(0);

      const outputPath = join(outputDir, 'outdir-test.html');
      expect(existsSync(outputPath)).toBe(true);
    });
  });
});
