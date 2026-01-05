/**
 * Tests for @pagemd/core/path-resolver
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join, resolve, normalize } from 'path';
import { tmpdir } from 'os';
import {
  createPathContext,
  expandTokens,
  findProjectRoot,
  resolveResourcePath,
  resolvePath
} from '../src/path-resolver.js';

describe('path-resolver', () => {
  let testDir;
  let projectRoot;
  let markdownDir;
  let configDir;

  beforeEach(() => {
    // Create temporary test directory structure
    const randomId = Math.random().toString(36).substring(7);
    testDir = join(tmpdir(), `pagemd-test-${randomId}`);
    projectRoot = join(testDir, 'project');
    markdownDir = join(projectRoot, 'docs');
    configDir = join(projectRoot, 'config');

    mkdirSync(markdownDir, { recursive: true });
    mkdirSync(configDir, { recursive: true });

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

  describe('createPathContext', () => {
    it('creates context with all options', () => {
      const context = createPathContext({
        markdownDir: '/path/to/markdown',
        configDir: '/path/to/config',
        projectRoot: '/path/to/project',
        manifestDir: '/path/to/manifest',
        workspaceFolder: '/path/to/workspace'
      });

      expect(context.markdownDir).toBe('/path/to/markdown');
      expect(context.configDir).toBe('/path/to/config');
      expect(context.projectRoot).toBe('/path/to/project');
      expect(context.manifestDir).toBe('/path/to/manifest');
      expect(context.workspaceFolder).toBe('/path/to/workspace');
    });

    it('creates context with minimal options', () => {
      const context = createPathContext();

      expect(context.markdownDir).toBeNull();
      expect(context.configDir).toBeNull();
      expect(context.projectRoot).toBeNull();
      expect(context.manifestDir).toBeNull();
      expect(context.workspaceFolder).toBeNull();
    });

    it('uses projectRoot as workspaceFolder fallback', () => {
      const context = createPathContext({
        projectRoot: '/path/to/project'
      });

      expect(context.workspaceFolder).toBe('/path/to/project');
    });

    it('uses workspaceFolder as projectRoot fallback', () => {
      const context = createPathContext({
        workspaceFolder: '/path/to/workspace'
      });

      expect(context.projectRoot).toBe('/path/to/workspace');
    });
  });

  describe('expandTokens', () => {
    it('expands ${manifestDir} token', () => {
      const context = createPathContext({
        manifestDir: '/path/to/manifest'
      });

      const result = expandTokens('${manifestDir}/styles/main.css', context);
      expect(result).toBe('/path/to/manifest/styles/main.css');
    });

    it('expands ${projectRoot} token', () => {
      const context = createPathContext({
        projectRoot: '/path/to/project'
      });

      const result = expandTokens('${projectRoot}/templates', context);
      expect(result).toBe('/path/to/project/templates');
    });

    it('expands ${workspaceFolder} token', () => {
      const context = createPathContext({
        workspaceFolder: '/path/to/workspace'
      });

      const result = expandTokens('${workspaceFolder}/.pagemd', context);
      expect(result).toBe('/path/to/workspace/.pagemd');
    });

    it('expands ${markdownDir} token', () => {
      const context = createPathContext({
        markdownDir: '/path/to/docs'
      });

      const result = expandTokens('${markdownDir}/images/logo.png', context);
      expect(result).toBe('/path/to/docs/images/logo.png');
    });

    it('expands multiple tokens in same path', () => {
      const context = createPathContext({
        projectRoot: '/project',
        markdownDir: '/docs'
      });

      const result = expandTokens('${projectRoot}/templates/${markdownDir}', context);
      expect(result).toBe('/project/templates//docs');
    });

    it('throws error for undefined token', () => {
      const context = createPathContext({
        projectRoot: '/project'
      });

      expect(() => expandTokens('${manifestDir}/styles', context)).toThrow(
        /Token.*manifestDir.*not defined/
      );
    });

    it('returns path unchanged when no tokens', () => {
      const context = createPathContext({
        projectRoot: '/project'
      });

      const result = expandTokens('/absolute/path/file.txt', context);
      expect(result).toBe('/absolute/path/file.txt');
    });

    it('returns empty string unchanged', () => {
      const context = createPathContext();
      const result = expandTokens('', context);
      expect(result).toBe('');
    });

    it('returns null unchanged', () => {
      const context = createPathContext();
      const result = expandTokens(null, context);
      expect(result).toBeNull();
    });
  });

  describe('findProjectRoot', () => {
    it('finds project root via package.json', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      writeFileSync(packageJsonPath, '{}');

      const found = findProjectRoot(markdownDir);
      expect(found).toBe(projectRoot);
    });

    it('finds project root via .git directory', () => {
      const gitDir = join(projectRoot, '.git');
      mkdirSync(gitDir);

      const found = findProjectRoot(markdownDir);
      expect(found).toBe(projectRoot);
    });

    it('finds project root via .pagemdrc file', () => {
      const pagemrcPath = join(projectRoot, '.pagemdrc');
      writeFileSync(pagemrcPath, '{}');

      const found = findProjectRoot(markdownDir);
      expect(found).toBe(projectRoot);
    });

    it('searches parent directories', () => {
      const deepDir = join(markdownDir, 'subdir1', 'subdir2', 'subdir3');
      mkdirSync(deepDir, { recursive: true });

      const packageJsonPath = join(projectRoot, 'package.json');
      writeFileSync(packageJsonPath, '{}');

      const found = findProjectRoot(deepDir);
      expect(found).toBe(projectRoot);
    });

    it('returns null when no project root found', () => {
      const found = findProjectRoot(testDir);
      expect(found).toBeNull();
    });

    it('stops at filesystem root', () => {
      // Try to find from root - should return null
      const found = findProjectRoot('/');
      expect(found).toBeNull();
    });
  });

  describe('resolveResourcePath', () => {
    let context;

    beforeEach(() => {
      context = createPathContext({
        markdownDir,
        configDir,
        projectRoot
      });
    });

    it('resolves resource from markdownDir first', () => {
      const resourcePath = 'styles/custom.css';
      const markdownResource = join(markdownDir, resourcePath);
      const configResource = join(configDir, resourcePath);
      const projectResource = join(projectRoot, resourcePath);

      // Create in all locations
      mkdirSync(join(markdownDir, 'styles'), { recursive: true });
      mkdirSync(join(configDir, 'styles'), { recursive: true });
      mkdirSync(join(projectRoot, 'styles'), { recursive: true });

      writeFileSync(markdownResource, 'markdown');
      writeFileSync(configResource, 'config');
      writeFileSync(projectResource, 'project');

      const resolved = resolveResourcePath(resourcePath, context);
      expect(resolved).toBe(resolve(markdownResource));
    });

    it('falls back to configDir when not in markdownDir', () => {
      const resourcePath = 'styles/custom.css';
      const configResource = join(configDir, resourcePath);

      mkdirSync(join(configDir, 'styles'), { recursive: true });
      writeFileSync(configResource, 'config');

      const resolved = resolveResourcePath(resourcePath, context);
      expect(resolved).toBe(resolve(configResource));
    });

    it('falls back to projectRoot when not in markdownDir or configDir', () => {
      const resourcePath = 'styles/custom.css';
      const projectResource = join(projectRoot, resourcePath);

      mkdirSync(join(projectRoot, 'styles'), { recursive: true });
      writeFileSync(projectResource, 'project');

      const resolved = resolveResourcePath(resourcePath, context);
      expect(resolved).toBe(resolve(projectResource));
    });

    it('throws error when resource not found in any location', () => {
      const resourcePath = 'nonexistent/file.txt';

      expect(() => resolveResourcePath(resourcePath, context)).toThrow(
        /Resource not found/
      );
    });

    it('throws error when context is empty', () => {
      const emptyContext = createPathContext();

      expect(() => resolveResourcePath('file.txt', emptyContext)).toThrow(
        /No search directories available/
      );
    });

    it('resolves absolute paths correctly', () => {
      const resourcePath = 'data/config.json';
      const absolutePath = join(configDir, resourcePath);

      mkdirSync(join(configDir, 'data'), { recursive: true });
      writeFileSync(absolutePath, '{}');

      const resolved = resolveResourcePath(resourcePath, context);
      expect(resolve(resolved)).toBe(resolve(absolutePath));
    });
  });

  describe('resolvePath', () => {
    let context;

    beforeEach(() => {
      context = createPathContext({
        markdownDir,
        configDir,
        projectRoot
      });
    });

    it('resolves absolute path as-is', () => {
      const absolutePath = '/absolute/path/to/file.txt';
      const resolved = resolvePath(absolutePath, context);
      // path.normalize() is applied for consistent separators on all platforms
      expect(resolved).toBe(normalize(absolutePath));
    });

    it('resolves relative path against projectRoot', () => {
      const relativePath = 'templates/styles.css';
      const resolved = resolvePath(relativePath, context);
      expect(resolved).toBe(resolve(projectRoot, relativePath));
    });

    it('expands tokens before resolving', () => {
      const pathWithToken = '${markdownDir}/images/logo.png';
      const resolved = resolvePath(pathWithToken, context);
      expect(resolved).toBe(resolve(markdownDir, 'images/logo.png'));
    });

    it('resolves relative path against configDir when projectRoot unavailable', () => {
      const contextNoRoot = createPathContext({
        configDir,
        markdownDir
      });

      const relativePath = 'file.txt';
      const resolved = resolvePath(relativePath, contextNoRoot);
      expect(resolved).toBe(resolve(configDir, relativePath));
    });

    it('resolves relative path against markdownDir when only that available', () => {
      const contextMdOnly = createPathContext({
        markdownDir
      });

      const relativePath = 'file.txt';
      const resolved = resolvePath(relativePath, contextMdOnly);
      expect(resolved).toBe(resolve(markdownDir, relativePath));
    });

    it('throws error for empty path', () => {
      expect(() => resolvePath('', context)).toThrow(/Cannot resolve empty path/);
      expect(() => resolvePath(null, context)).toThrow(/Cannot resolve empty path/);
    });

    it('throws error when no base directory available', () => {
      const emptyContext = createPathContext();

      expect(() => resolvePath('file.txt', emptyContext)).toThrow(
        /No base directory available/
      );
    });

    it('handles complex token expansion with relative paths', () => {
      const pathWithToken = '${projectRoot}/templates/profiles';
      const resolved = resolvePath(pathWithToken, context);
      expect(resolved).toBe(resolve(projectRoot, 'templates/profiles'));
    });

    it('handles paths with .. navigation', () => {
      const relativePath = '../parent/file.txt';
      const resolved = resolvePath(relativePath, context);
      expect(resolved).toBe(resolve(projectRoot, '../parent/file.txt'));
    });

    it('handles paths with . current directory', () => {
      const relativePath = './current/file.txt';
      const resolved = resolvePath(relativePath, context);
      expect(resolved).toBe(resolve(projectRoot, './current/file.txt'));
    });
  });
});
