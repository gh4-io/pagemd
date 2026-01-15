import { describe, it, expect } from 'vitest';
import { getMimeType, fileUrlToPath } from '../src/request-interceptor.js';

describe('request-interceptor', () => {
  describe('getMimeType', () => {
    it('returns correct MIME for PNG images', () => {
      expect(getMimeType('photo.png')).toBe('image/png');
      expect(getMimeType('/path/to/photo.PNG')).toBe('image/png');
    });

    it('returns correct MIME for JPEG images', () => {
      expect(getMimeType('photo.jpg')).toBe('image/jpeg');
      expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
      expect(getMimeType('/path/to/photo.JPEG')).toBe('image/jpeg');
    });

    it('returns correct MIME for SVG images', () => {
      expect(getMimeType('diagram.svg')).toBe('image/svg+xml');
    });

    it('returns correct MIME for GIF images', () => {
      expect(getMimeType('animation.gif')).toBe('image/gif');
    });

    it('returns correct MIME for WebP images', () => {
      expect(getMimeType('photo.webp')).toBe('image/webp');
    });

    it('returns correct MIME for WOFF fonts', () => {
      expect(getMimeType('font.woff')).toBe('font/woff');
    });

    it('returns correct MIME for WOFF2 fonts', () => {
      expect(getMimeType('font.woff2')).toBe('font/woff2');
    });

    it('returns correct MIME for TTF fonts', () => {
      expect(getMimeType('font.ttf')).toBe('font/ttf');
    });

    it('returns correct MIME for CSS files', () => {
      expect(getMimeType('styles.css')).toBe('text/css');
    });

    it('returns correct MIME for JavaScript files', () => {
      expect(getMimeType('script.js')).toBe('application/javascript');
    });

    it('returns default MIME for unknown extensions', () => {
      expect(getMimeType('file.xyz')).toBe('application/octet-stream');
      expect(getMimeType('document.unknown')).toBe('application/octet-stream');
    });

    it('returns default MIME for files without extension', () => {
      expect(getMimeType('filename')).toBe('application/octet-stream');
    });

    it('handles paths with multiple dots', () => {
      expect(getMimeType('photo.backup.png')).toBe('image/png');
      expect(getMimeType('file.name.with.dots.jpg')).toBe('image/jpeg');
    });
  });

  describe('fileUrlToPath', () => {
    it('converts Unix file URLs to paths', () => {
      expect(fileUrlToPath('file:///home/user/image.png')).toBe('/home/user/image.png');
      expect(fileUrlToPath('file:///var/www/assets/photo.jpg')).toBe('/var/www/assets/photo.jpg');
    });

    it('converts Windows file URLs to paths', () => {
      const result = fileUrlToPath('file:///C:/Users/image.png');
      // path.normalize may use \ on Windows, / on Unix
      expect(result).toMatch(/C:[/\\]Users[/\\]image\.png/);
    });

    it('handles Windows drive letters correctly', () => {
      const resultC = fileUrlToPath('file:///C:/Documents/test.pdf');
      expect(resultC).toMatch(/C:[/\\]Documents[/\\]test\.pdf/);

      const resultD = fileUrlToPath('file:///D:/Projects/file.txt');
      expect(resultD).toMatch(/D:[/\\]Projects[/\\]file\.txt/);
    });

    it('decodes URL-encoded characters', () => {
      const result = fileUrlToPath('file:///path/my%20file.png');
      expect(result).toContain('my file.png');
    });

    it('decodes special characters', () => {
      const result = fileUrlToPath('file:///path/file%26name.png');
      expect(result).toContain('file&name.png');
    });

    it('returns null for non-file URLs', () => {
      expect(fileUrlToPath('https://example.com')).toBeNull();
      expect(fileUrlToPath('http://localhost/file.png')).toBeNull();
      expect(fileUrlToPath('data:image/png;base64,abc')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(fileUrlToPath('')).toBeNull();
    });

    it('handles file URLs with query strings', () => {
      // Query strings in file:// URLs are unusual but should be handled
      const result = fileUrlToPath('file:///path/image.png?v=1');
      expect(result).toContain('image.png');
    });
  });
});
