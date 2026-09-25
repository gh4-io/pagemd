/**
 * Tests for document archiver
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  isSystemResource,
  mapToArchivePath,
  collectDependencies,
  exportToArchive,
  createArchive
} from '../src/archiver.js';

// Test fixtures directory
const FIXTURES_DIR = path.join(os.tmpdir(), 'pagemd-archiver-test-' + Date.now());

/**
 * Create a temporary file with content
 */
async function createFile(relativePath, content = '') {
  const fullPath = path.join(FIXTURES_DIR, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf8');
  return fullPath;
}

beforeEach(async () => {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });
});

afterEach(async () => {
  try {
    await fs.rm(FIXTURES_DIR, { recursive: true, force: true });
  } catch {
    // cleanup best-effort
  }
});

describe('isSystemResource', () => {
  it('should return true for files under cliPath', () => {
    expect(isSystemResource('/usr/lib/pagemd/styles/base.css', '/usr/lib/pagemd')).toBe(true);
  });

  it('should return true for files in nested cliPath directories', () => {
    expect(isSystemResource('/usr/lib/pagemd/templates/standard_letter.html', '/usr/lib/pagemd')).toBe(true);
  });

  it('should return false for files outside cliPath', () => {
    expect(isSystemResource('/home/user/project/styles/custom.css', '/usr/lib/pagemd')).toBe(false);
  });

  it('should return false when cliPath is null', () => {
    expect(isSystemResource('/some/path/file.css', null)).toBe(false);
  });

  it('should return false when filePath is null', () => {
    expect(isSystemResource(null, '/usr/lib/pagemd')).toBe(false);
  });

  it('should handle paths with trailing separators', () => {
    expect(isSystemResource('/usr/lib/pagemd/styles/base.css', '/usr/lib/pagemd/')).toBe(true);
  });
});

describe('mapToArchivePath', () => {
  it('should preserve relative path for files within project root', () => {
    const result = mapToArchivePath('/project/styles/custom.css', '/project', 'style');
    expect(result).toBe('styles/custom.css');
  });

  it('should handle nested project files', () => {
    const result = mapToArchivePath('/project/sub/dir/file.md', '/project', 'markdown');
    expect(result).toBe('sub/dir/file.md');
  });

  it('should place external files under resource type directory', () => {
    const result = mapToArchivePath('/external/custom.css', '/project', 'style');
    expect(result).toBe('style/custom.css');
  });

  it('should place external assets under assets/', () => {
    const result = mapToArchivePath('/external/image.png', '/project', 'asset');
    expect(result).toBe('assets/image.png');
  });

  it('should handle filename collisions', () => {
    const collisionMap = new Map();
    const first = mapToArchivePath('/ext1/file.css', '/project', 'style', collisionMap);
    const second = mapToArchivePath('/ext2/file.css', '/project', 'style', collisionMap);

    expect(first).toBe('style/file.css');
    expect(second).toBe('style/file-2.css');
  });

  it('should use forward slashes on all platforms', () => {
    const result = mapToArchivePath(
      path.join('/project', 'sub', 'dir', 'file.md'),
      '/project',
      'markdown'
    );
    expect(result).not.toContain('\\');
  });
});

describe('collectDependencies', () => {
  it('should collect a single markdown file', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n# Hello\n');

    const { files, warnings } = await collectDependencies([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    expect(files.length).toBeGreaterThanOrEqual(1);
    const mdFile = files.find(f => f.type === 'markdown');
    expect(mdFile).toBeDefined();
    expect(mdFile.absolutePath).toBe(path.normalize(mdPath));
  });

  it('should collect image references from markdown', async () => {
    const imgPath = await createFile('images/photo.png', 'fake-png-data');
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n![Photo](images/photo.png)\n');

    const { files } = await collectDependencies([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    const imgFile = files.find(f => f.type === 'asset' && f.absolutePath.endsWith('photo.png'));
    expect(imgFile).toBeDefined();
  });

  it('should collect HTML img tags from markdown', async () => {
    const imgPath = await createFile('logo.jpg', 'fake-jpg-data');
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n<img src="logo.jpg">\n');

    const { files } = await collectDependencies([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    const imgFile = files.find(f => f.type === 'asset' && f.absolutePath.endsWith('logo.jpg'));
    expect(imgFile).toBeDefined();
  });

  it('should warn about missing images but not fail', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n![Missing](nonexistent.png)\n');

    const { files, warnings } = await collectDependencies([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    expect(warnings.some(w => w.includes('nonexistent.png'))).toBe(true);
    // Should still have the markdown file
    expect(files.some(f => f.type === 'markdown')).toBe(true);
  });

  it('should skip external URL references', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n![Remote](https://example.com/img.png)\n');

    const { files } = await collectDependencies([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    const externalFile = files.find(f => f.absolutePath.includes('example.com'));
    expect(externalFile).toBeUndefined();
  });

  it('should skip data URIs', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n![Inline](data:image/png;base64,abc)\n');

    const { files } = await collectDependencies([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    const dataFile = files.find(f => f.absolutePath.includes('data:'));
    expect(dataFile).toBeUndefined();
  });

  it('should deduplicate files referenced by multiple markdown files', async () => {
    const imgPath = await createFile('shared.png', 'fake-data');
    const md1 = await createFile('doc1.md', '---\ntitle: Doc1\n---\n![](shared.png)\n');
    const md2 = await createFile('doc2.md', '---\ntitle: Doc2\n---\n![](shared.png)\n');

    const { files } = await collectDependencies([md1, md2], {
      cliPath: '/nonexistent/cli'
    });

    const sharedFiles = files.filter(f => f.absolutePath.endsWith('shared.png'));
    expect(sharedFiles).toHaveLength(1);
  });

  it('should exclude system resources by default', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n# Hello\n');

    // The standard_letter profile resources are under cliPath and should be excluded
    const { files } = await collectDependencies([mdPath], {
      cliPath: FIXTURES_DIR, // treat fixture dir as cliPath for this test
      includeSystem: false
    });

    // All returned files should be non-system
    for (const file of files) {
      expect(file.isSystem).toBe(false);
    }
  });

  it('should include system resources when includeSystem is true', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n# Hello\n');

    const { files: withSystem } = await collectDependencies([mdPath], {
      cliPath: FIXTURES_DIR,
      includeSystem: true
    });

    const { files: withoutSystem } = await collectDependencies([mdPath], {
      cliPath: FIXTURES_DIR,
      includeSystem: false
    });

    // With includeSystem, should have at least as many files
    expect(withSystem.length).toBeGreaterThanOrEqual(withoutSystem.length);
  });

  it('should collect .pagemd/ directory contents', async () => {
    const configPath = await createFile('.pagemd/profiles/custom.json', '{"id":"custom"}');
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n# Hello\n');

    const { files } = await collectDependencies([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    const configFile = files.find(f => f.type === 'config');
    expect(configFile).toBeDefined();
    expect(configFile.absolutePath).toContain('.pagemd');
  });
});

describe('createArchive', () => {
  it('should create a valid ZIP file', async () => {
    const mdPath = await createFile('doc.md', '# Test document');
    const outputPath = path.join(FIXTURES_DIR, 'output.zip');

    const files = [{
      absolutePath: mdPath,
      archivePath: 'doc.md',
      type: 'markdown',
      source: 'content',
      isSystem: false
    }];

    const result = await createArchive(files, outputPath);

    expect(result.archivePath).toBe(outputPath);
    expect(result.fileCount).toBe(1);
    expect(result.totalSize).toBeGreaterThan(0);

    // Verify file exists
    const stat = await fs.stat(outputPath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('should include manifest.json when provided', async () => {
    const mdPath = await createFile('doc.md', '# Test');
    const outputPath = path.join(FIXTURES_DIR, 'with-manifest.zip');

    const files = [{
      absolutePath: mdPath,
      archivePath: 'doc.md',
      type: 'markdown',
      source: 'content',
      isSystem: false
    }];

    const manifest = { version: '1.0', files: ['doc.md'] };
    const result = await createArchive(files, outputPath, manifest);

    // manifest.json counts as an additional file
    expect(result.fileCount).toBe(2);
  });

  it('should create output directory if needed', async () => {
    const mdPath = await createFile('doc.md', '# Test');
    const outputPath = path.join(FIXTURES_DIR, 'nested', 'dir', 'output.zip');

    const files = [{
      absolutePath: mdPath,
      archivePath: 'doc.md',
      type: 'markdown',
      source: 'content',
      isSystem: false
    }];

    const result = await createArchive(files, outputPath);
    expect(result.archivePath).toBe(outputPath);

    const stat = await fs.stat(outputPath);
    expect(stat.isFile()).toBe(true);
  });
});

describe('exportToArchive', () => {
  it('should create archive with default output name', async () => {
    const mdPath = await createFile('my-document.md', '---\ntitle: Test\n---\n# Hello\n');

    const result = await exportToArchive([mdPath], {
      cliPath: '/nonexistent/cli'
    });

    expect(result.archivePath).toContain('my-document.pagemd.zip');
    expect(result.fileCount).toBeGreaterThanOrEqual(1);
    expect(result.totalSize).toBeGreaterThan(0);

    // Cleanup
    try { await fs.unlink(result.archivePath); } catch { /* ok */ }
  });

  it('should use custom output path', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n# Hello\n');
    const outputPath = path.join(FIXTURES_DIR, 'custom-output.zip');

    const result = await exportToArchive([mdPath], {
      output: outputPath,
      cliPath: '/nonexistent/cli'
    });

    expect(result.archivePath).toBe(outputPath);
  });

  it('should return file list without creating ZIP in dry-run mode', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n# Hello\n');

    const result = await exportToArchive([mdPath], {
      dryRun: true,
      cliPath: '/nonexistent/cli'
    });

    expect(result.archivePath).toBeNull();
    expect(result.files.length).toBeGreaterThanOrEqual(1);
    expect(result.totalSize).toBe(0);
  });

  it('should include manifest in result', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n# Hello\n');

    const result = await exportToArchive([mdPath], {
      dryRun: true,
      cliPath: '/nonexistent/cli'
    });

    expect(result.manifest).toBeDefined();
    expect(result.manifest.version).toBe('1.0');
    expect(result.manifest.generator).toBe('pagemd-archiver');
    expect(result.manifest.files).toBeInstanceOf(Array);
    expect(result.manifest.totalFiles).toBeGreaterThanOrEqual(1);
  });

  it('should collect warnings for missing references', async () => {
    const mdPath = await createFile('doc.md', '---\ntitle: Test\n---\n![missing](no-exist.png)\n');

    const result = await exportToArchive([mdPath], {
      dryRun: true,
      cliPath: '/nonexistent/cli'
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('no-exist.png'))).toBe(true);
  });

  it('should archive multiple markdown files', async () => {
    const md1 = await createFile('doc1.md', '---\ntitle: Doc 1\n---\n# First\n');
    const md2 = await createFile('doc2.md', '---\ntitle: Doc 2\n---\n# Second\n');

    const result = await exportToArchive([md1, md2], {
      dryRun: true,
      cliPath: '/nonexistent/cli'
    });

    const mdFiles = result.files.filter(f => f.type === 'markdown');
    expect(mdFiles).toHaveLength(2);
  });
});
