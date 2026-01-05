/**
 * Tests for @pagemd/renderer-pdf/image-paths
 */

import { describe, it, expect } from 'vitest';
import {
  buildBaseUrl,
  injectBaseHref,
  rewriteRelativePaths,
  prepareHtmlForRendering
} from '../src/image-paths.js';

describe('buildBaseUrl', () => {
  it('should build file:// URL from Unix path', () => {
    const result = buildBaseUrl('/home/user/docs/readme.md');
    expect(result).toBe('file:///home/user/docs/');
  });

  it('should build file:// URL from Windows path', () => {
    // Note: This test behaves differently on Windows vs Linux/WSL
    // On Windows: C:\ is recognized as absolute drive letter
    // On Linux: C:\ is treated as relative path
    const result = buildBaseUrl('C:\\Users\\Jason\\docs\\readme.md');
    if (process.platform === 'win32') {
      expect(result).toBe('file:///C:/Users/Jason/docs/');
    } else {
      // On Linux/WSL, path is relative and gets resolved from cwd
      expect(result).toContain('file://');
      expect(result.endsWith('/')).toBe(true);
    }
  });

  it('should ensure trailing slash', () => {
    const result = buildBaseUrl('/path/to/file.md');
    expect(result.endsWith('/')).toBe(true);
  });

  it('should handle relative paths by resolving them', () => {
    const result = buildBaseUrl('./docs/readme.md');
    expect(result).toContain('file://');
    expect(result).toContain('/docs/');
    expect(result.endsWith('/')).toBe(true);
  });
});

describe('injectBaseHref', () => {
  const basicHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <img src="./image.png">
</body>
</html>`;

  it('should inject base href after <head> tag', () => {
    const result = injectBaseHref(basicHtml, '/path/to/doc.md');
    expect(result).toContain('<base href="file:///path/to/">');
    expect(result.indexOf('<base')).toBeGreaterThan(result.indexOf('<head>'));
  });

  it('should not duplicate base href if already present', () => {
    const htmlWithBase = `<!DOCTYPE html>
<html>
<head>
  <base href="http://example.com/">
  <title>Test</title>
</head>
<body></body>
</html>`;
    const result = injectBaseHref(htmlWithBase, '/path/to/doc.md');
    // Should not add another base tag
    const baseCount = (result.match(/<base\s+href=/gi) || []).length;
    expect(baseCount).toBe(1);
    expect(result).toContain('http://example.com/');
  });

  it('should handle HTML without head tag gracefully', () => {
    const noHeadHtml = '<div>No head tag</div>';
    const result = injectBaseHref(noHeadHtml, '/path/to/doc.md');
    // Should return unchanged
    expect(result).toBe(noHeadHtml);
  });

  it('should handle head tag with attributes', () => {
    const htmlWithHeadAttrs = `<html><head lang="en"><title>Test</title></head><body></body></html>`;
    const result = injectBaseHref(htmlWithHeadAttrs, '/path/to/doc.md');
    expect(result).toContain('<base href=');
  });
});

describe('rewriteRelativePaths', () => {
  it('should rewrite relative src attributes', () => {
    const html = '<img src="./images/photo.png">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toContain('file:///docs/images/photo.png');
    expect(rewritten).toBe(1);
  });

  it('should rewrite multiple relative paths', () => {
    const html = `
      <img src="./img1.png">
      <img src="../assets/img2.jpg">
      <source src="video.mp4">
    `;
    const { html: result, rewritten } = rewriteRelativePaths(html, '/project/docs/readme.md');
    expect(result).toContain('file:///project/docs/img1.png');
    expect(result).toContain('file:///project/assets/img2.jpg');
    expect(result).toContain('file:///project/docs/video.mp4');
    expect(rewritten).toBe(3);
  });

  it('should not rewrite absolute URLs', () => {
    const html = '<img src="https://example.com/image.png">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toBe(html);
    expect(rewritten).toBe(0);
  });

  it('should not rewrite data URIs', () => {
    const html = '<img src="data:image/png;base64,ABC123">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toBe(html);
    expect(rewritten).toBe(0);
  });

  it('should not rewrite file:// URLs', () => {
    const html = '<img src="file:///absolute/path/image.png">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toBe(html);
    expect(rewritten).toBe(0);
  });

  it('should handle single-quoted src attributes', () => {
    const html = "<img src='./image.png'>";
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toContain('file:///docs/image.png');
    expect(rewritten).toBe(1);
  });

  it('should handle paths with spaces (URL encoded)', () => {
    const html = '<img src="./my%20images/photo.png">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toContain('file://');
    expect(rewritten).toBe(1);
  });

  it('should handle CSS url() in style attributes', () => {
    const html = '<div style="background-image: url(./bg.png)"></div>';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toContain('file:///docs/bg.png');
    expect(rewritten).toBe(1);
  });

  it('should handle CSS url() with quotes', () => {
    const html = `<div style="background-image: url('./bg.png')"></div>`;
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toContain('file:///docs/bg.png');
    expect(rewritten).toBe(1);
  });

  it('should not rewrite fragment-only URLs', () => {
    const html = '<a href="#section1">Link</a>';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toBe(html);
    expect(rewritten).toBe(0);
  });
});

describe('prepareHtmlForRendering', () => {
  const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <img src="./image.png">
  <img src="https://example.com/remote.jpg">
</body>
</html>`;

  it('should inject base href by default', () => {
    const result = prepareHtmlForRendering(testHtml, '/docs/readme.md');
    expect(result).toContain('<base href="file:///docs/">');
  });

  it('should skip base href when useBaseHref is false', () => {
    const result = prepareHtmlForRendering(testHtml, '/docs/readme.md', {
      useBaseHref: false
    });
    expect(result).not.toContain('<base href=');
  });

  it('should rewrite paths when rewritePaths is true', () => {
    const result = prepareHtmlForRendering(testHtml, '/docs/readme.md', {
      useBaseHref: false,
      rewritePaths: true
    });
    expect(result).toContain('file:///docs/image.png');
    expect(result).toContain('https://example.com/remote.jpg'); // Unchanged
  });

  it('should apply both strategies when both enabled', () => {
    const result = prepareHtmlForRendering(testHtml, '/docs/readme.md', {
      useBaseHref: true,
      rewritePaths: true
    });
    expect(result).toContain('<base href="file:///docs/">');
    expect(result).toContain('file:///docs/image.png');
  });

  it('should handle wikilink embedded images', () => {
    const html = `<html><head></head><body>
      <img src="diagram.svg" class="embedded-image">
    </body></html>`;
    const result = prepareHtmlForRendering(html, '/project/docs/notes.md', {
      rewritePaths: true,
      useBaseHref: false
    });
    expect(result).toContain('file:///project/docs/diagram.svg');
  });

  it('should handle FIGURE directive images', () => {
    const html = `<html><head></head><body>
      <figure>
        <img src="./screenshots/app.png" alt="App Screenshot">
        <figcaption>Figure 1: App Screenshot</figcaption>
      </figure>
    </body></html>`;
    const result = prepareHtmlForRendering(html, '/project/docs/manual.md', {
      rewritePaths: true,
      useBaseHref: false
    });
    expect(result).toContain('file:///project/docs/screenshots/app.png');
  });
});

describe('Windows path handling', () => {
  it('should handle Windows paths in buildBaseUrl', () => {
    const result = buildBaseUrl('C:\\Users\\Jason\\Documents\\doc.md');
    if (process.platform === 'win32') {
      expect(result).toBe('file:///C:/Users/Jason/Documents/');
    } else {
      // On Linux/WSL, Windows paths are relative
      expect(result).toContain('file://');
      expect(result.endsWith('/')).toBe(true);
    }
  });

  it('should handle Windows paths in rewriteRelativePaths', () => {
    const html = '<img src="./images/test.png">';
    const { html: result } = rewriteRelativePaths(html, 'C:\\Users\\Jason\\Documents\\doc.md');
    // Should have forward slashes in URL
    expect(result).toContain('file:///');
    expect(result).not.toContain('\\');
  });

  it('should handle mixed path separators', () => {
    const html = '<img src="./images\\nested/test.png">';
    const { html: result } = rewriteRelativePaths(html, '/docs/readme.md');
    // Path.resolve normalizes separators
    expect(result).toContain('file://');
  });
});

describe('edge cases', () => {
  it('should handle empty src attributes', () => {
    const html = '<img src="">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(rewritten).toBe(0);
  });

  it('should handle protocol-relative URLs', () => {
    const html = '<img src="//cdn.example.com/image.png">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/docs/readme.md');
    expect(result).toBe(html);
    expect(rewritten).toBe(0);
  });

  it('should handle root-relative paths', () => {
    const html = '<img src="/assets/logo.png">';
    const { html: result, rewritten } = rewriteRelativePaths(html, '/project/docs/readme.md');
    // Root-relative paths are relative, so they get rewritten
    expect(result).toContain('file://');
    expect(rewritten).toBe(1);
  });

  it('should handle complex HTML structure', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Complex Document</title>
        <style>
          body { background: url(./bg.png); }
        </style>
      </head>
      <body>
        <header>
          <img src="./logo.svg" alt="Logo">
        </header>
        <main>
          <figure>
            <img src="../assets/diagram.png">
            <figcaption>Architecture</figcaption>
          </figure>
          <video src="./demo.mp4" poster="./poster.jpg"></video>
        </main>
      </body>
      </html>
    `;
    const result = prepareHtmlForRendering(html, '/project/docs/guide/intro.md');
    expect(result).toContain('<base href="file:///project/docs/guide/">');
  });
});
