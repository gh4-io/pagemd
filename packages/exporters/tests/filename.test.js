/**
 * @pagemd/exporters/filename tests
 * Tests for tokenized filename expansion and sanitization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FILENAME_TOKENS,
  sanitizeFilename,
  expandFilename,
  getOutputFilename,
  getOutputPath
} from '../src/filename.js';
import path from 'node:path';

describe('FILENAME_TOKENS constant', () => {
  it('defines all expected tokens', () => {
    expect(FILENAME_TOKENS.BASENAME).toBe('{basename}');
    expect(FILENAME_TOKENS.DOCUMENT_ID).toBe('{document_id}');
    expect(FILENAME_TOKENS.REVISION).toBe('{revision}');
    expect(FILENAME_TOKENS.TITLE).toBe('{title}');
    expect(FILENAME_TOKENS.STATUS).toBe('{status}');
    expect(FILENAME_TOKENS.DATE).toBe('{date}');
    expect(FILENAME_TOKENS.TIMESTAMP).toBe('{timestamp}');
  });

  it('has exactly 7 tokens', () => {
    expect(Object.keys(FILENAME_TOKENS)).toHaveLength(7);
  });
});

describe('sanitizeFilename', () => {
  describe('invalid character replacement', () => {
    it('replaces forward slashes with underscores', () => {
      expect(sanitizeFilename('path/to/file')).toBe('path_to_file');
    });

    it('replaces backslashes with underscores', () => {
      expect(sanitizeFilename('path\\to\\file')).toBe('path_to_file');
    });

    it('replaces colons with underscores', () => {
      expect(sanitizeFilename('file:name')).toBe('file_name');
    });

    it('replaces asterisks with underscores', () => {
      expect(sanitizeFilename('file*name')).toBe('file_name');
    });

    it('replaces question marks with underscores', () => {
      expect(sanitizeFilename('file?name')).toBe('file_name');
    });

    it('replaces quotes with underscores', () => {
      expect(sanitizeFilename('file"name')).toBe('file_name');
    });

    it('replaces angle brackets with underscores', () => {
      // Trailing underscore is removed by sanitization
      expect(sanitizeFilename('file<name>')).toBe('file_name');
    });

    it('replaces pipes with underscores', () => {
      expect(sanitizeFilename('file|name')).toBe('file_name');
    });

    it('handles multiple invalid characters', () => {
      expect(sanitizeFilename('path/to\\file:name*test?')).toBe('path_to_file_name_test');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading whitespace', () => {
      expect(sanitizeFilename('  filename')).toBe('filename');
    });

    it('trims trailing whitespace', () => {
      expect(sanitizeFilename('filename  ')).toBe('filename');
    });

    it('trims both leading and trailing whitespace', () => {
      expect(sanitizeFilename('  filename  ')).toBe('filename');
    });

    it('preserves internal spaces', () => {
      expect(sanitizeFilename('file name test')).toBe('file name test');
    });
  });

  describe('underscore and dash normalization', () => {
    it('collapses multiple consecutive underscores', () => {
      expect(sanitizeFilename('file___name')).toBe('file_name');
    });

    it('collapses multiple consecutive dashes', () => {
      expect(sanitizeFilename('file---name')).toBe('file-name');
    });

    it('removes leading underscores', () => {
      expect(sanitizeFilename('___filename')).toBe('filename');
    });

    it('removes trailing underscores', () => {
      expect(sanitizeFilename('filename___')).toBe('filename');
    });

    it('removes leading dashes', () => {
      expect(sanitizeFilename('---filename')).toBe('filename');
    });

    it('removes trailing dashes', () => {
      expect(sanitizeFilename('filename---')).toBe('filename');
    });

    it('removes leading and trailing underscores/dashes', () => {
      expect(sanitizeFilename('_-filename-_')).toBe('filename');
    });
  });

  describe('edge cases', () => {
    it('returns "untitled" for empty string', () => {
      expect(sanitizeFilename('')).toBe('untitled');
    });

    it('returns "untitled" for null', () => {
      expect(sanitizeFilename(null)).toBe('untitled');
    });

    it('returns "untitled" for undefined', () => {
      expect(sanitizeFilename(undefined)).toBe('untitled');
    });

    it('returns "untitled" for non-string input', () => {
      expect(sanitizeFilename(123)).toBe('untitled');
      expect(sanitizeFilename({})).toBe('untitled');
      expect(sanitizeFilename([])).toBe('untitled');
    });

    it('returns "untitled" when result is empty after sanitization', () => {
      expect(sanitizeFilename('////')).toBe('untitled');
      expect(sanitizeFilename('****')).toBe('untitled');
      expect(sanitizeFilename('____')).toBe('untitled');
    });

    it('handles unicode characters correctly', () => {
      expect(sanitizeFilename('file-名前-name')).toBe('file-名前-name');
    });

    it('preserves valid filename with extension', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
    });

    it('handles very long filenames', () => {
      const longName = 'a'.repeat(300);
      expect(sanitizeFilename(longName)).toBe(longName);
    });
  });

  describe('real-world cases', () => {
    it('sanitizes typical problematic filenames', () => {
      expect(sanitizeFilename('My File: Version 2.0')).toBe('My File_ Version 2.0');
      expect(sanitizeFilename('Report (Q1/Q2) 2024')).toBe('Report (Q1_Q2) 2024');
      expect(sanitizeFilename('Draft #3 - Final??')).toBe('Draft #3 - Final');
    });
  });
});

describe('expandFilename', () => {
  describe('basename token', () => {
    it('replaces {basename} token', () => {
      const pattern = '{basename}.pdf';
      const context = { basename: 'document' };
      expect(expandFilename(pattern, context)).toBe('document.pdf');
    });

    it('replaces multiple {basename} tokens', () => {
      const pattern = '{basename}-copy-{basename}.pdf';
      const context = { basename: 'file' };
      expect(expandFilename(pattern, context)).toBe('file-copy-file.pdf');
    });

    it('uses "untitled" when basename missing', () => {
      const pattern = '{basename}.pdf';
      const context = {};
      expect(expandFilename(pattern, context)).toBe('untitled.pdf');
    });
  });

  describe('metadata tokens', () => {
    it('replaces {document_id} token', () => {
      const pattern = '{document_id}-{basename}.pdf';
      const context = {
        basename: 'doc',
        metadata: { document_id: 'DOC-123' }
      };
      expect(expandFilename(pattern, context)).toBe('DOC-123-doc.pdf');
    });

    it('replaces {revision} token', () => {
      const pattern = '{basename}-r{revision}.pdf';
      const context = {
        basename: 'doc',
        metadata: { revision: '2.0' }
      };
      expect(expandFilename(pattern, context)).toBe('doc-r2.0.pdf');
    });

    it('handles numeric revision', () => {
      const pattern = '{basename}-r{revision}.pdf';
      const context = {
        basename: 'doc',
        metadata: { revision: 3 }
      };
      expect(expandFilename(pattern, context)).toBe('doc-r3.pdf');
    });

    it('handles revision value of 0', () => {
      const pattern = '{basename}-r{revision}.pdf';
      const context = {
        basename: 'doc',
        metadata: { revision: 0 }
      };
      expect(expandFilename(pattern, context)).toBe('doc-r0.pdf');
    });

    it('replaces {title} token', () => {
      const pattern = '{title}.pdf';
      const context = {
        basename: 'doc',
        metadata: { title: 'My Report' }
      };
      expect(expandFilename(pattern, context)).toBe('My Report.pdf');
    });

    it('replaces {status} token', () => {
      const pattern = '{basename}-{status}.pdf';
      const context = {
        basename: 'doc',
        metadata: { status: 'draft' }
      };
      expect(expandFilename(pattern, context)).toBe('doc-draft.pdf');
    });

    it('replaces multiple metadata tokens', () => {
      const pattern = '{document_id}-{title}-{status}.pdf';
      const context = {
        basename: 'doc',
        metadata: {
          document_id: 'DOC-001',
          title: 'Report',
          status: 'final'
        }
      };
      expect(expandFilename(pattern, context)).toBe('DOC-001-Report-final.pdf');
    });
  });

  describe('date and timestamp tokens', () => {
    beforeEach(() => {
      // Mock Date to return consistent value
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T14:30:45'));
    });

    it('replaces {date} token with YYYY-MM-DD format', () => {
      const pattern = '{basename}-{date}.pdf';
      const context = { basename: 'doc' };
      expect(expandFilename(pattern, context)).toBe('doc-2024-03-15.pdf');
    });

    it('replaces {timestamp} token with YYYYMMDDHHmmss format', () => {
      const pattern = '{basename}-{timestamp}.pdf';
      const context = { basename: 'doc' };
      expect(expandFilename(pattern, context)).toBe('doc-20240315143045.pdf');
    });

    it('handles both date and timestamp in same pattern', () => {
      const pattern = '{date}-{basename}-{timestamp}.pdf';
      const context = { basename: 'doc' };
      expect(expandFilename(pattern, context)).toBe('2024-03-15-doc-20240315143045.pdf');
    });
  });

  describe('unreplaced tokens', () => {
    it('removes tokens when metadata is missing', () => {
      const pattern = '{document_id}-{basename}.pdf';
      const context = {
        basename: 'doc',
        metadata: {}  // No document_id
      };
      // Sanitization removes leading dash
      expect(expandFilename(pattern, context)).toBe('doc.pdf');
    });

    it('removes unknown tokens', () => {
      const pattern = '{basename}-{unknown_token}.pdf';
      const context = { basename: 'doc' };
      // Dash before .pdf extension not removed (not truly trailing)
      expect(expandFilename(pattern, context)).toBe('doc-.pdf');
    });

    it('removes all unreplaced tokens and sanitizes', () => {
      const pattern = '{unknown1}-{basename}-{unknown2}.pdf';
      const context = { basename: 'doc' };
      // Dashes adjacent to extension not removed
      expect(expandFilename(pattern, context)).toBe('doc-.pdf');
    });
  });

  describe('sanitization integration', () => {
    it('sanitizes invalid characters in metadata values', () => {
      const pattern = '{title}.pdf';
      const context = {
        basename: 'doc',
        metadata: { title: 'Report/Draft: Final?' }
      };
      // ? at end of title becomes _ before .pdf extension
      expect(expandFilename(pattern, context)).toBe('Report_Draft_ Final_.pdf');
    });

    it('sanitizes entire expanded result', () => {
      const pattern = '{document_id}/{basename}.pdf';
      const context = {
        basename: 'file',
        metadata: { document_id: 'DOC-001' }
      };
      expect(expandFilename(pattern, context)).toBe('DOC-001_file.pdf');
    });

    it('collapses multiple underscores from replacements', () => {
      const pattern = '{basename}___{revision}.pdf';
      const context = {
        basename: 'doc',
        metadata: { revision: '1' }
      };
      expect(expandFilename(pattern, context)).toBe('doc_1.pdf');
    });
  });

  describe('edge cases', () => {
    it('handles null pattern', () => {
      const context = { basename: 'doc' };
      expect(expandFilename(null, context)).toBe('doc');
    });

    it('handles undefined pattern', () => {
      const context = { basename: 'doc' };
      expect(expandFilename(undefined, context)).toBe('doc');
    });

    it('handles empty pattern', () => {
      const context = { basename: 'doc' };
      expect(expandFilename('', context)).toBe('doc');
    });

    it('handles null context', () => {
      const pattern = '{basename}.pdf';
      expect(expandFilename(pattern, null)).toBe('untitled.pdf');
    });

    it('handles undefined context', () => {
      const pattern = '{basename}.pdf';
      expect(expandFilename(pattern, undefined)).toBe('untitled.pdf');
    });

    it('handles pattern with no tokens', () => {
      const pattern = 'static-name.pdf';
      const context = { basename: 'doc' };
      expect(expandFilename(pattern, context)).toBe('static-name.pdf');
    });

    it('preserves format parameter in context', () => {
      const pattern = '{basename}.{format}';
      const context = { basename: 'doc', format: 'pdf' };
      // {format} is not a defined token, removed leaving trailing dot
      expect(expandFilename(pattern, context)).toBe('doc.');
    });
  });

  describe('real-world patterns', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T14:30:45'));
    });

    it('handles SOP document pattern', () => {
      const pattern = '{document_id}-{title}-rev{revision}.pdf';
      const context = {
        basename: 'sop',
        metadata: {
          document_id: 'SOP-CVG-001',
          title: 'Aircraft Inspection',
          revision: '3.0'
        }
      };
      expect(expandFilename(pattern, context))
        .toBe('SOP-CVG-001-Aircraft Inspection-rev3.0.pdf');
    });

    it('handles timestamped export pattern', () => {
      const pattern = '{basename}-{status}-{timestamp}.pdf';
      const context = {
        basename: 'report',
        metadata: { status: 'draft' }
      };
      expect(expandFilename(pattern, context))
        .toBe('report-draft-20240315143045.pdf');
    });

    it('handles simple dated export', () => {
      const pattern = '{date}-{basename}.pdf';
      const context = { basename: 'export' };
      expect(expandFilename(pattern, context)).toBe('2024-03-15-export.pdf');
    });
  });
});

describe('getOutputFilename', () => {
  describe('input validation', () => {
    it('throws error when markdownPath is missing', () => {
      expect(() => getOutputFilename(null, 'pdf', {}))
        .toThrow('Markdown path is required');
    });

    it('throws error when markdownPath is not a string', () => {
      expect(() => getOutputFilename(123, 'pdf', {}))
        .toThrow('Markdown path is required');
    });

    it('throws error when format is missing', () => {
      expect(() => getOutputFilename('/path/to/file.md', null, {}))
        .toThrow('Output format is required');
    });

    it('throws error when format is not a string', () => {
      expect(() => getOutputFilename('/path/to/file.md', 123, {}))
        .toThrow('Output format is required');
    });
  });

  describe('basename extraction', () => {
    it('extracts basename without extension', () => {
      const filename = getOutputFilename('/path/to/document.md', 'pdf', {});
      expect(filename).toBe('document.pdf');
    });

    it('handles files with multiple dots', () => {
      const filename = getOutputFilename('/path/to/my.document.md', 'pdf', {});
      expect(filename).toBe('my.document.pdf');
    });

    it('handles files with no extension', () => {
      const filename = getOutputFilename('/path/to/document', 'pdf', {});
      expect(filename).toBe('document.pdf');
    });

    it('handles relative paths', () => {
      const filename = getOutputFilename('./document.md', 'html', {});
      expect(filename).toBe('document.html');
    });

    it('handles filename only (no path)', () => {
      const filename = getOutputFilename('document.md', 'pdf', {});
      expect(filename).toBe('document.pdf');
    });
  });

  describe('default patterns', () => {
    it('uses default pattern for HTML', () => {
      const filename = getOutputFilename('/path/doc.md', 'html', {});
      expect(filename).toBe('doc.html');
    });

    it('uses default pattern for PDF', () => {
      const filename = getOutputFilename('/path/doc.md', 'pdf', {});
      expect(filename).toBe('doc.pdf');
    });

    it('uses default pattern for PNG', () => {
      const filename = getOutputFilename('/path/doc.md', 'png', {});
      expect(filename).toBe('doc.png');
    });

    it('uses default pattern for JPEG (.jpg extension)', () => {
      const filename = getOutputFilename('/path/doc.md', 'jpeg', {});
      expect(filename).toBe('doc.jpg');
    });
  });

  describe('profile pattern override', () => {
    it('uses pattern from profile.outputs[format].filename', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{basename}-output.pdf'
          }
        }
      };

      const filename = getOutputFilename('/path/doc.md', 'pdf', profile);
      expect(filename).toBe('doc-output.pdf');
    });

    it('uses different patterns for different formats', () => {
      const profile = {
        outputs: {
          pdf: { filename: '{basename}-print.pdf' },
          html: { filename: '{basename}-web.html' }
        }
      };

      expect(getOutputFilename('/path/doc.md', 'pdf', profile))
        .toBe('doc-print.pdf');
      expect(getOutputFilename('/path/doc.md', 'html', profile))
        .toBe('doc-web.html');
    });

    it('falls back to default when profile has no pattern for format', () => {
      const profile = {
        outputs: {
          html: { filename: '{basename}-custom.html' }
        }
      };

      const filename = getOutputFilename('/path/doc.md', 'pdf', profile);
      expect(filename).toBe('doc.pdf');
    });
  });

  describe('metadata integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-03-15T14:30:45'));
    });

    it('expands metadata tokens in custom pattern', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{document_id}-{basename}.pdf'
          }
        }
      };
      const metadata = {
        document_id: 'DOC-123'
      };

      const filename = getOutputFilename('/path/doc.md', 'pdf', profile, metadata);
      expect(filename).toBe('DOC-123-doc.pdf');
    });

    it('expands all metadata tokens', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{document_id}-{title}-r{revision}-{status}.pdf'
          }
        }
      };
      const metadata = {
        document_id: 'SOP-001',
        title: 'Manual',
        revision: '2.0',
        status: 'final'
      };

      const filename = getOutputFilename('/path/sop.md', 'pdf', profile, metadata);
      expect(filename).toBe('SOP-001-Manual-r2.0-final.pdf');
    });

    it('expands date tokens', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{basename}-{date}.pdf'
          }
        }
      };

      const filename = getOutputFilename('/path/doc.md', 'pdf', profile);
      expect(filename).toBe('doc-2024-03-15.pdf');
    });

    it('handles missing metadata gracefully', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{document_id}-{basename}.pdf'
          }
        }
      };
      const metadata = {};  // No document_id

      const filename = getOutputFilename('/path/doc.md', 'pdf', profile, metadata);
      // Leading dash removed by sanitization
      expect(filename).toBe('doc.pdf');
    });
  });

  describe('sanitization', () => {
    it('sanitizes problematic characters in basename', () => {
      const filename = getOutputFilename('/path/my:file?.md', 'pdf', {});
      // ? at end becomes _ before .pdf extension
      expect(filename).toBe('my_file_.pdf');
    });

    it('sanitizes problematic characters in metadata', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{title}.pdf'
          }
        }
      };
      const metadata = {
        title: 'Report/Draft: Final?'
      };

      const filename = getOutputFilename('/path/doc.md', 'pdf', profile, metadata);
      // ? at end of title becomes _ before .pdf extension
      expect(filename).toBe('Report_Draft_ Final_.pdf');
    });
  });

  describe('edge cases', () => {
    it('handles empty profile', () => {
      const filename = getOutputFilename('/path/doc.md', 'pdf', {});
      expect(filename).toBe('doc.pdf');
    });

    it('handles null profile', () => {
      const filename = getOutputFilename('/path/doc.md', 'pdf', null);
      expect(filename).toBe('doc.pdf');
    });

    it('handles undefined metadata', () => {
      const filename = getOutputFilename('/path/doc.md', 'pdf', {}, undefined);
      expect(filename).toBe('doc.pdf');
    });

    it('handles null metadata', () => {
      const filename = getOutputFilename('/path/doc.md', 'pdf', {}, null);
      expect(filename).toBe('doc.pdf');
    });
  });
});

describe('getOutputPath', () => {
  describe('path assembly', () => {
    it('combines directory and filename', () => {
      const markdownPath = '/project/docs/document.md';
      const outputPath = getOutputPath(markdownPath, 'pdf', {});

      expect(outputPath).toBe(path.resolve('/project/docs/document.pdf'));
    });

    it('returns absolute path', () => {
      const markdownPath = './document.md';
      const outputPath = getOutputPath(markdownPath, 'pdf', {});

      expect(path.isAbsolute(outputPath)).toBe(true);
    });

    it('uses correct extension for format', () => {
      const markdownPath = '/path/doc.md';

      expect(getOutputPath(markdownPath, 'html', {})).toMatch(/\.html$/);
      expect(getOutputPath(markdownPath, 'pdf', {})).toMatch(/\.pdf$/);
      expect(getOutputPath(markdownPath, 'png', {})).toMatch(/\.png$/);
      expect(getOutputPath(markdownPath, 'jpeg', {})).toMatch(/\.jpg$/);
    });
  });

  describe('output directory priority: options > profile > default', () => {
    const markdownPath = '/project/docs/document.md';

    it('uses options.outputDir when provided', () => {
      const profile = {
        outputs: {
          pdf: { outputDir: '/profile/output' }
        }
      };
      const options = {
        outputDir: '/custom/output'
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', profile, {}, options);
      expect(outputPath).toBe(path.resolve('/custom/output/document.pdf'));
    });

    it('uses profile.outputs[format].outputDir when no options', () => {
      const profile = {
        outputs: {
          pdf: { outputDir: '/profile/pdf' }
        }
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', profile);
      expect(outputPath).toBe(path.resolve('/profile/pdf/document.pdf'));
    });

    it('uses markdown directory as default', () => {
      const outputPath = getOutputPath(markdownPath, 'pdf', {});
      expect(outputPath).toBe(path.resolve('/project/docs/document.pdf'));
    });

    it('allows different outputDir per format', () => {
      const profile = {
        outputs: {
          pdf: { outputDir: '/output/pdf' },
          html: { outputDir: '/output/html' }
        }
      };

      expect(getOutputPath(markdownPath, 'pdf', profile))
        .toBe(path.resolve('/output/pdf/document.pdf'));
      expect(getOutputPath(markdownPath, 'html', profile))
        .toBe(path.resolve('/output/html/document.html'));
    });
  });

  describe('filename pattern integration', () => {
    const markdownPath = '/project/docs/document.md';

    it('applies custom filename pattern from profile', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{basename}-output.pdf',
            outputDir: '/output'
          }
        }
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', profile);
      expect(outputPath).toBe(path.resolve('/output/document-output.pdf'));
    });

    it('expands metadata in filename', () => {
      const profile = {
        outputs: {
          pdf: {
            filename: '{document_id}-{basename}.pdf'
          }
        }
      };
      const metadata = {
        document_id: 'DOC-123'
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', profile, metadata);
      expect(outputPath).toMatch(/DOC-123-document\.pdf$/);
    });
  });

  describe('path resolution', () => {
    const markdownPath = '/project/docs/document.md';

    it('resolves relative outputDir from options', () => {
      const options = {
        outputDir: './build'
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', {}, {}, options);
      expect(path.isAbsolute(outputPath)).toBe(true);
      expect(outputPath).toContain('build');
    });

    it('resolves relative outputDir from profile', () => {
      const profile = {
        outputs: {
          pdf: { outputDir: '../output' }
        }
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', profile);
      expect(path.isAbsolute(outputPath)).toBe(true);
      expect(outputPath).toContain('output');
    });

    it('handles absolute paths in options', () => {
      const options = {
        outputDir: '/absolute/path'
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', {}, {}, options);
      expect(outputPath).toBe(path.resolve('/absolute/path/document.pdf'));
    });

    it('handles absolute paths in profile', () => {
      const profile = {
        outputs: {
          pdf: { outputDir: '/absolute/profile' }
        }
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', profile);
      expect(outputPath).toBe(path.resolve('/absolute/profile/document.pdf'));
    });
  });

  describe('edge cases', () => {
    it('handles markdown path with spaces', () => {
      const markdownPath = '/project/my documents/file.md';
      const outputPath = getOutputPath(markdownPath, 'pdf', {});
      expect(outputPath).toContain('my documents');
      expect(outputPath).toMatch(/file\.pdf$/);
    });

    it('handles output directory with spaces', () => {
      const markdownPath = '/project/doc.md';
      const options = {
        outputDir: '/output/my dir'
      };

      const outputPath = getOutputPath(markdownPath, 'pdf', {}, {}, options);
      expect(outputPath).toContain('my dir');
    });

    it('handles empty profile', () => {
      const outputPath = getOutputPath('/path/doc.md', 'pdf', {});
      expect(outputPath).toMatch(/doc\.pdf$/);
    });

    it('handles null profile', () => {
      const outputPath = getOutputPath('/path/doc.md', 'pdf', null);
      expect(outputPath).toMatch(/doc\.pdf$/);
    });

    it('handles undefined metadata', () => {
      const outputPath = getOutputPath('/path/doc.md', 'pdf', {}, undefined);
      expect(outputPath).toMatch(/doc\.pdf$/);
    });

    it('handles empty options', () => {
      const outputPath = getOutputPath('/path/doc.md', 'pdf', {}, {}, {});
      expect(outputPath).toMatch(/doc\.pdf$/);
    });

    it('normalizes paths with multiple slashes', () => {
      const options = {
        outputDir: '/output//subdir///'
      };

      const outputPath = getOutputPath('/path/doc.md', 'pdf', {}, {}, options);
      expect(outputPath).not.toContain('//');
    });
  });

  describe('cross-platform compatibility', () => {
    it('uses platform-specific path separators', () => {
      const markdownPath = '/project/docs/document.md';
      const outputPath = getOutputPath(markdownPath, 'pdf', {});

      // Path should use the correct separator for the platform
      const segments = outputPath.split(path.sep);
      expect(segments.length).toBeGreaterThan(1);
    });

    it('handles Windows-style paths when resolved', () => {
      const options = {
        outputDir: 'C:\\output\\dir'
      };

      const outputPath = getOutputPath('/path/doc.md', 'pdf', {}, {}, options);
      expect(path.isAbsolute(outputPath)).toBe(true);
    });
  });
});
