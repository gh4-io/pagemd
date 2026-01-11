/**
 * Tests for template loader and renderer
 * @pagemd/renderer-web/template.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { loadTemplate, processTokens, renderTemplate } from '../src/template.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn()
}));

// Mock @pagemd/core
vi.mock('@pagemd/core', () => ({
  resolvePath: (path) => `/resolved/${path}`,
  resolveResource: (path, type, context) => ({ resolvedPath: `/resolved/${path}`, searchedPaths: [] }),
  expandTokens: (str) => str ? str.replace(/\{\{PROJECT_ROOT\}\}/g, '/project') : str,
  createLogger: () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {}
  })
}));

describe('template.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loadTemplate', () => {
    it('should load template from profile layout source', async () => {
      const mockTemplate = '<html><body>{{content}}</body></html>';
      readFile.mockResolvedValue(mockTemplate);

      const profile = {
        id: 'test',
        layout: {
          source: 'templates/test.html'
        }
      };
      const pathContext = { projectRoot: '/project' };

      const result = await loadTemplate(profile, pathContext);

      expect(result).toBe(mockTemplate);
      expect(readFile).toHaveBeenCalledWith('/resolved/templates/test.html', 'utf-8');
    });

    it('should use default template when profile missing template path', async () => {
      readFile.mockResolvedValue('<html>{{content}}</html>');

      const profile = { id: 'test' };
      const pathContext = {};

      const result = await loadTemplate(profile, pathContext);

      // Should fall back to default template path
      expect(result).toBe('<html>{{content}}</html>');
      expect(readFile).toHaveBeenCalledWith(
        expect.stringContaining('standard_letter.html'),
        'utf-8'
      );
    });

    it('should throw error when template file not found', async () => {
      readFile.mockRejectedValue(new Error('ENOENT: no such file'));

      const profile = {
        id: 'test',
        layout: { source: 'missing.html' }
      };
      const pathContext = {};

      await expect(loadTemplate(profile, pathContext))
        .rejects
        .toThrow('Template load failed');
    });

    it('should handle empty template file', async () => {
      readFile.mockResolvedValue('');

      const profile = {
        id: 'test',
        layout: { source: 'empty.html' }
      };
      const pathContext = {};

      const result = await loadTemplate(profile, pathContext);
      expect(result).toBe('');
    });
  });

  describe('processTokens', () => {
    it('should replace simple tokens', () => {
      const template = 'Hello {{name}}, welcome!';
      const data = { name: 'World' };

      const result = processTokens(template, data);

      expect(result).toBe('Hello World, welcome!');
    });

    it('should replace multiple tokens', () => {
      const template = '{{greeting}} {{name}}, today is {{day}}!';
      const data = {
        greeting: 'Hello',
        name: 'Alice',
        day: 'Monday'
      };

      const result = processTokens(template, data);

      expect(result).toBe('Hello Alice, today is Monday!');
    });

    it('should handle nested object access', () => {
      const template = 'Title: {{metadata.title}}, Author: {{metadata.author}}';
      const data = {
        metadata: {
          title: 'My Document',
          author: 'John Doe'
        }
      };

      const result = processTokens(template, data);

      expect(result).toBe('Title: My Document, Author: John Doe');
    });

    it('should handle deep nested access', () => {
      const template = 'ID: {{meta.document.id}}, Rev: {{meta.document.revision}}';
      const data = {
        meta: {
          document: {
            id: 'DOC-001',
            revision: 'v2.0'
          }
        }
      };

      const result = processTokens(template, data);

      expect(result).toBe('ID: DOC-001, Rev: v2.0');
    });

    it('should replace missing tokens with empty string', () => {
      const template = 'Hello {{name}}, your age is {{age}}';
      const data = { name: 'Bob' };

      const result = processTokens(template, data);

      expect(result).toBe('Hello Bob, your age is ');
    });

    it('should handle null values as empty string', () => {
      const template = 'Value: {{value}}';
      const data = { value: null };

      const result = processTokens(template, data);

      expect(result).toBe('Value: ');
    });

    it('should handle undefined nested values as empty string', () => {
      const template = 'Missing: {{meta.missing.field}}';
      const data = { meta: {} };

      const result = processTokens(template, data);

      expect(result).toBe('Missing: ');
    });

    it('should convert non-string values to strings', () => {
      const template = 'Count: {{count}}, Active: {{active}}';
      const data = {
        count: 42,
        active: true
      };

      const result = processTokens(template, data);

      expect(result).toBe('Count: 42, Active: true');
    });

    it('should expand path tokens when pathContext provided', () => {
      const template = 'Root: {{PROJECT_ROOT}}/path';
      const data = {};
      const pathContext = { projectRoot: '/project' };

      const result = processTokens(template, data, pathContext);

      expect(result).toBe('Root: /project/path');
    });

    it('should handle tokens with whitespace', () => {
      const template = '{{ name }} and {{  title  }}';
      const data = {
        name: 'Alice',
        title: 'Engineer'
      };

      const result = processTokens(template, data);

      expect(result).toBe('Alice and Engineer');
    });

    it('should handle empty template', () => {
      const result = processTokens('', { name: 'test' });
      expect(result).toBe('');
    });

    it('should handle template with no tokens', () => {
      const template = 'Plain text with no tokens';
      const result = processTokens(template, {});
      expect(result).toBe('Plain text with no tokens');
    });

    it('should handle multiple instances of same token', () => {
      const template = '{{name}} says hello to {{name}}';
      const data = { name: 'Alice' };

      const result = processTokens(template, data);

      expect(result).toBe('Alice says hello to Alice');
    });
  });

  describe('renderTemplate', () => {
    it('should render complete template with all context', () => {
      const template = `
<!DOCTYPE html>
<html>
<head>
  <title>{{metadata.title}}</title>
  {{styles}}
</head>
<body>
  {{content}}
</body>
</html>`;

      const context = {
        content: '<p>Hello World</p>',
        styles: '<style>body { margin: 0; }</style>',
        metadata: { title: 'Test Document' },
        profile: { id: 'test' },
        pathContext: {}
      };

      const result = renderTemplate(template, context);

      expect(result).toContain('<title>Test Document</title>');
      expect(result).toContain('<style>body { margin: 0; }</style>');
      expect(result).toContain('<p>Hello World</p>');
    });

    it('should handle missing context properties with defaults', () => {
      const template = 'Content: {{content}}, Styles: {{styles}}';

      const result = renderTemplate(template, {});

      expect(result).toBe('Content: , Styles: ');
    });

    it('should render with partial context', () => {
      const template = '{{content}} - {{metadata.title}}';
      const context = {
        content: 'Body content',
        metadata: { title: 'Page Title' }
      };

      const result = renderTemplate(template, context);

      expect(result).toBe('Body content - Page Title');
    });

    it('should access profile properties in template', () => {
      const template = 'Profile: {{profile.id}}, Version: {{profile.version}}';
      const context = {
        profile: {
          id: 'standard_letter',
          version: '1.0'
        }
      };

      const result = renderTemplate(template, context);

      expect(result).toBe('Profile: standard_letter, Version: 1.0');
    });

    it('should handle complex nested metadata', () => {
      const template = `
Document: {{metadata.document.id}}
Author: {{metadata.authors.primary}}
Date: {{metadata.dates.created}}`;

      const context = {
        metadata: {
          document: { id: 'DOC-123' },
          authors: { primary: 'Jane Doe' },
          dates: { created: '2025-01-01' }
        }
      };

      const result = renderTemplate(template, context);

      expect(result).toContain('Document: DOC-123');
      expect(result).toContain('Author: Jane Doe');
      expect(result).toContain('Date: 2025-01-01');
    });

    it('should render empty template', () => {
      const result = renderTemplate('', {
        content: '<p>Content</p>',
        styles: '<style></style>'
      });

      expect(result).toBe('');
    });

    it('should preserve HTML structure', () => {
      const template = '<div class="wrapper">{{content}}</div>';
      const context = {
        content: '<article><h1>Title</h1><p>Paragraph</p></article>'
      };

      const result = renderTemplate(template, context);

      expect(result).toBe('<div class="wrapper"><article><h1>Title</h1><p>Paragraph</p></article></div>');
    });

    it('should handle empty content gracefully', () => {
      const template = '<body>{{content}}</body>';
      const context = { content: '' };

      const result = renderTemplate(template, context);

      expect(result).toBe('<body></body>');
    });

    it('should integrate pathContext for path expansion', () => {
      const template = 'Root: {{PROJECT_ROOT}}';
      const context = {
        pathContext: { projectRoot: '/project' }
      };

      const result = renderTemplate(template, context);

      expect(result).toBe('Root: /project');
    });
  });
});
