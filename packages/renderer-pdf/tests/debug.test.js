/**
 * Tests for @pagemd/renderer-pdf/debug
 * Debug artifact management for PDF rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import {
  createDebugDir,
  shouldSaveDebug,
  saveDebugHtml,
  saveDebugScreenshot,
  cleanupDebugArtifacts
} from '../src/debug.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
    rm: vi.fn(),
    access: vi.fn()
  }
}));

// Mock logger
vi.mock('@pagemd/core', () => ({
  createLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('createDebugDir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create debug directory alongside output file', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    const basePath = '/output/document.pdf';
    const result = await createDebugDir(basePath);

    expect(result).toBe('/output/debug');
    expect(fs.mkdir).toHaveBeenCalledWith('/output/debug', { recursive: true });
  });

  it('should handle nested output paths', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    const basePath = '/output/subdir/nested/document.pdf';
    const result = await createDebugDir(basePath);

    expect(result).toBe('/output/subdir/nested/debug');
  });

  it('should throw error when mkdir fails', async () => {
    const error = new Error('Permission denied');
    fs.mkdir.mockRejectedValue(error);

    await expect(createDebugDir('/output/document.pdf')).rejects.toThrow('Permission denied');
  });

  it('should create directory with recursive option', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    await createDebugDir('/output/document.pdf');

    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ recursive: true })
    );
  });

  it('should handle Windows-style paths', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    const basePath = 'C:\\output\\document.pdf';
    const result = await createDebugDir(basePath);

    expect(result).toContain('debug');
    expect(fs.mkdir).toHaveBeenCalled();
  });
});

describe('shouldSaveDebug', () => {
  it('should return true when options.debug is true', () => {
    const options = { debug: true };
    const profile = {};

    expect(shouldSaveDebug(options, profile)).toBe(true);
  });

  it('should return true when profile.debugArtifacts is true', () => {
    const options = {};
    const profile = { debugArtifacts: true };

    expect(shouldSaveDebug(options, profile)).toBe(true);
  });

  it('should return true when both are true', () => {
    const options = { debug: true };
    const profile = { debugArtifacts: true };

    expect(shouldSaveDebug(options, profile)).toBe(true);
  });

  it('should return false when both are false', () => {
    const options = { debug: false };
    const profile = { debugArtifacts: false };

    expect(shouldSaveDebug(options, profile)).toBe(false);
  });

  it('should return false when both are undefined', () => {
    const options = {};
    const profile = {};

    expect(shouldSaveDebug(options, profile)).toBe(false);
  });

  it('should prioritize options.debug over profile.debugArtifacts', () => {
    const options = { debug: true };
    const profile = { debugArtifacts: false };

    expect(shouldSaveDebug(options, profile)).toBe(true);
  });

  it('should handle null options', () => {
    const profile = { debugArtifacts: true };

    expect(shouldSaveDebug(null, profile)).toBe(true);
  });

  it('should handle null profile', () => {
    const options = { debug: true };

    expect(shouldSaveDebug(options, null)).toBe(true);
  });

  it('should return false when both are null', () => {
    expect(shouldSaveDebug(null, null)).toBe(false);
  });
});

describe('saveDebugHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save HTML to debug directory', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);

    const html = '<html><body>Test</body></html>';
    const outputPath = '/output/document.pdf';

    const result = await saveDebugHtml(html, outputPath);

    expect(result).toBe('/output/debug/document.paged.html');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/output/debug/document.paged.html',
      html,
      'utf-8'
    );
  });

  it('should use custom suffix when provided', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);

    const html = '<html><body>Test</body></html>';
    const outputPath = '/output/document.pdf';

    const result = await saveDebugHtml(html, outputPath, { suffix: '.processed' });

    expect(result).toBe('/output/debug/document.processed.html');
  });

  it('should use provided debugDir instead of creating new one', async () => {
    fs.writeFile.mockResolvedValue(undefined);

    const html = '<html><body>Test</body></html>';
    const outputPath = '/output/document.pdf';

    const result = await saveDebugHtml(html, outputPath, { debugDir: '/custom/debug' });

    expect(result).toBe('/custom/debug/document.paged.html');
    expect(fs.mkdir).not.toHaveBeenCalled();
  });

  it('should throw error when writeFile fails', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockRejectedValue(new Error('Write failed'));

    const html = '<html><body>Test</body></html>';
    const outputPath = '/output/document.pdf';

    await expect(saveDebugHtml(html, outputPath)).rejects.toThrow('Write failed');
  });

  it('should handle empty HTML string', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);

    const result = await saveDebugHtml('', '/output/document.pdf');

    expect(result).toBe('/output/debug/document.paged.html');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      '',
      'utf-8'
    );
  });

  it('should preserve output basename in debug filename', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);

    const html = '<html><body>Test</body></html>';
    const outputPath = '/output/my-custom-name.pdf';

    const result = await saveDebugHtml(html, outputPath);

    expect(result).toBe('/output/debug/my-custom-name.paged.html');
  });

  it('should handle output paths without extension', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);

    const html = '<html><body>Test</body></html>';
    const outputPath = '/output/document';

    const result = await saveDebugHtml(html, outputPath);

    expect(result).toContain('document.paged.html');
  });
});

describe('saveDebugScreenshot', () => {
  let mockPage;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = {
      screenshot: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('should save PNG screenshot by default', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    const outputPath = '/output/document.pdf';
    const result = await saveDebugScreenshot(mockPage, outputPath);

    expect(result).toBe('/output/debug/document.screenshot.png');
    expect(mockPage.screenshot).toHaveBeenCalledWith({
      path: '/output/debug/document.screenshot.png',
      type: 'png',
      fullPage: true
    });
  });

  it('should save JPEG screenshot when format is jpeg', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    const outputPath = '/output/document.pdf';
    const result = await saveDebugScreenshot(mockPage, outputPath, {
      format: 'jpeg',
      quality: 90
    });

    expect(result).toBe('/output/debug/document.screenshot.jpeg');
    expect(mockPage.screenshot).toHaveBeenCalledWith({
      path: '/output/debug/document.screenshot.jpeg',
      type: 'jpeg',
      fullPage: true,
      quality: 90
    });
  });

  it('should not include quality for PNG format', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    await saveDebugScreenshot(mockPage, '/output/document.pdf', {
      format: 'png',
      quality: 90 // Should be ignored for PNG
    });

    expect(mockPage.screenshot).toHaveBeenCalledWith(
      expect.not.objectContaining({ quality: expect.any(Number) })
    );
  });

  it('should use custom debugDir when provided', async () => {
    const outputPath = '/output/document.pdf';
    const result = await saveDebugScreenshot(mockPage, outputPath, {
      debugDir: '/custom/debug'
    });

    expect(result).toBe('/custom/debug/document.screenshot.png');
    expect(fs.mkdir).not.toHaveBeenCalled();
  });

  it('should disable fullPage when option is false', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    await saveDebugScreenshot(mockPage, '/output/document.pdf', {
      fullPage: false
    });

    expect(mockPage.screenshot).toHaveBeenCalledWith(
      expect.objectContaining({ fullPage: false })
    );
  });

  it('should throw error when screenshot fails', async () => {
    fs.mkdir.mockResolvedValue(undefined);
    mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

    await expect(saveDebugScreenshot(mockPage, '/output/document.pdf'))
      .rejects.toThrow('Screenshot failed');
  });

  it('should handle different output basenames', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    const outputPath = '/output/my-report.pdf';
    const result = await saveDebugScreenshot(mockPage, outputPath);

    expect(result).toBe('/output/debug/my-report.screenshot.png');
  });

  it('should support jpeg format with custom quality', async () => {
    fs.mkdir.mockResolvedValue(undefined);

    await saveDebugScreenshot(mockPage, '/output/document.pdf', {
      format: 'jpeg',
      quality: 75
    });

    expect(mockPage.screenshot).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'jpeg',
        quality: 75
      })
    );
  });
});

describe('cleanupDebugArtifacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove specific debug artifacts by basename', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue([
      'document.paged.html',
      'document.screenshot.png',
      'other.paged.html'
    ]);
    fs.unlink.mockResolvedValue(undefined);

    const basePath = '/output/document.pdf';
    await cleanupDebugArtifacts(basePath);

    expect(fs.unlink).toHaveBeenCalledTimes(2);
    expect(fs.unlink).toHaveBeenCalledWith('/output/debug/document.paged.html');
    expect(fs.unlink).toHaveBeenCalledWith('/output/debug/document.screenshot.png');
    expect(fs.unlink).not.toHaveBeenCalledWith('/output/debug/other.paged.html');
  });

  it('should remove entire debug directory when removeDir is true', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.rm.mockResolvedValue(undefined);

    const basePath = '/output/document.pdf';
    await cleanupDebugArtifacts(basePath, { removeDir: true });

    expect(fs.rm).toHaveBeenCalledWith('/output/debug', {
      recursive: true,
      force: true
    });
    expect(fs.readdir).not.toHaveBeenCalled();
  });

  it('should skip cleanup when debug directory does not exist', async () => {
    fs.access.mockRejectedValue(new Error('ENOENT'));

    const basePath = '/output/document.pdf';
    await cleanupDebugArtifacts(basePath);

    expect(fs.readdir).not.toHaveBeenCalled();
    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('should not throw when cleanup fails', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockRejectedValue(new Error('Read failed'));

    const basePath = '/output/document.pdf';
    await expect(cleanupDebugArtifacts(basePath)).resolves.toBeUndefined();
  });

  it('should not throw when unlinking files fails', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue(['document.paged.html']);
    fs.unlink.mockRejectedValue(new Error('Unlink failed'));

    const basePath = '/output/document.pdf';
    await expect(cleanupDebugArtifacts(basePath)).resolves.toBeUndefined();
  });

  it('should not throw when removing directory fails', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.rm.mockRejectedValue(new Error('Remove failed'));

    const basePath = '/output/document.pdf';
    await expect(cleanupDebugArtifacts(basePath, { removeDir: true }))
      .resolves.toBeUndefined();
  });

  it('should handle empty debug directory', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue([]);

    const basePath = '/output/document.pdf';
    await cleanupDebugArtifacts(basePath);

    expect(fs.unlink).not.toHaveBeenCalled();
  });

  it('should filter files by exact basename match', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue([
      'document.paged.html',
      'document-backup.paged.html',
      'my-document.paged.html'
    ]);
    fs.unlink.mockResolvedValue(undefined);

    const basePath = '/output/document.pdf';
    await cleanupDebugArtifacts(basePath);

    // Should only remove exact matches
    expect(fs.unlink).toHaveBeenCalledWith('/output/debug/document.paged.html');
    expect(fs.unlink).toHaveBeenCalledTimes(1);
  });

  it('should handle different file extensions in basename', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue([
      'report.paged.html',
      'report.screenshot.png',
      'report.screenshot.jpeg'
    ]);
    fs.unlink.mockResolvedValue(undefined);

    const basePath = '/output/report.pdf';
    await cleanupDebugArtifacts(basePath);

    expect(fs.unlink).toHaveBeenCalledTimes(3);
  });

  it('should construct correct debug directory path', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue([]);

    const basePath = '/output/subdir/document.pdf';
    await cleanupDebugArtifacts(basePath);

    expect(fs.access).toHaveBeenCalledWith('/output/subdir/debug');
    expect(fs.readdir).toHaveBeenCalledWith('/output/subdir/debug');
  });

  it('should handle Windows-style paths', async () => {
    fs.access.mockResolvedValue(undefined);
    fs.readdir.mockResolvedValue([]);

    const basePath = 'C:\\output\\document.pdf';
    await cleanupDebugArtifacts(basePath);

    expect(fs.access).toHaveBeenCalled();
    expect(fs.readdir).toHaveBeenCalled();
  });
});
