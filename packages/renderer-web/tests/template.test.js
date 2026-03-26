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

  describe('processTokens - default values', () => {
    it('should use default value for missing key', () => {
      const template = 'Type: {{doc_type ?? "How-To Guide"}}';
      const data = {};

      const result = processTokens(template, data);

      expect(result).toBe('Type: How-To Guide');
    });

    it('should use default value for null key', () => {
      const template = 'Author: {{author ?? "Unknown"}}';
      const data = { author: null };

      const result = processTokens(template, data);

      expect(result).toBe('Author: Unknown');
    });

    it('should use actual value over default when present', () => {
      const template = 'Author: {{author ?? "Unknown"}}';
      const data = { author: 'John Doe' };

      const result = processTokens(template, data);

      expect(result).toBe('Author: John Doe');
    });

    it('should preserve falsey values (not use default)', () => {
      const template = 'Count: {{count ?? "N/A"}}, Active: {{active ?? "yes"}}, Empty: {{empty ?? "default"}}';
      const data = { count: 0, active: false, empty: '' };

      const result = processTokens(template, data);

      expect(result).toBe('Count: 0, Active: false, Empty: ');
    });

    it('should handle default values with nested keys', () => {
      const template = 'Name: {{metadata.author.name ?? "N/A"}}';
      const data = { metadata: {} };

      const result = processTokens(template, data);

      expect(result).toBe('Name: N/A');
    });

    it('should handle single-quoted default values', () => {
      const template = "Type: {{type ?? 'Guide'}}";
      const data = {};

      const result = processTokens(template, data);

      expect(result).toBe('Type: Guide');
    });

    it('should handle default values with spaces', () => {
      const template = 'Status: {{status ?? "Not Available"}}';
      const data = {};

      const result = processTokens(template, data);

      expect(result).toBe('Status: Not Available');
    });

    it('should handle default values with special characters', () => {
      const template = 'Note: {{note ?? "N/A - TBD (pending)"}}';
      const data = {};

      const result = processTokens(template, data);

      expect(result).toBe('Note: N/A - TBD (pending)');
    });

    it('should handle multiple default values in one template', () => {
      const template = 'Author: {{author ?? "Unknown"}}, Type: {{type ?? "Document"}}';
      const data = { author: 'Jane' };

      const result = processTokens(template, data);

      expect(result).toBe('Author: Jane, Type: Document');
    });

    it('should handle default value containing ?? operator', () => {
      const template = 'Info: {{info ?? "Use ?? for defaults"}}';
      const data = {};

      const result = processTokens(template, data);

      expect(result).toBe('Info: Use ?? for defaults');
    });

    it('should handle nested key with value that overrides default', () => {
      const template = 'Title: {{metadata.title ?? "Untitled"}}';
      const data = { metadata: { title: 'My Document' } };

      const result = processTokens(template, data);

      expect(result).toBe('Title: My Document');
    });

    it('should handle undefined value in nested path', () => {
      const template = 'Value: {{meta.nested.deep.value ?? "default"}}';
      const data = { meta: { nested: {} } };

      const result = processTokens(template, data);

      expect(result).toBe('Value: default');
    });
  });

  describe('processTokens - ternary conditionals', () => {
    it('should return truthy value when condition is true', () => {
      const template = '{{controlled ? "Controlled" : "Uncontrolled"}} Document';
      const data = { controlled: true };

      const result = processTokens(template, data);

      expect(result).toBe('Controlled Document');
    });

    it('should return falsy value when condition is false', () => {
      const template = '{{controlled ? "Controlled" : "Uncontrolled"}} Document';
      const data = { controlled: false };

      const result = processTokens(template, data);

      expect(result).toBe('Uncontrolled Document');
    });

    it('should return falsy value when condition is undefined', () => {
      const template = '{{controlled ? "Controlled" : "Uncontrolled"}} Document';
      const data = {};

      const result = processTokens(template, data);

      expect(result).toBe('Uncontrolled Document');
    });

    it('should return falsy value when condition is null', () => {
      const template = '{{controlled ? "Controlled" : "Uncontrolled"}} Document';
      const data = { controlled: null };

      const result = processTokens(template, data);

      expect(result).toBe('Uncontrolled Document');
    });

    it('should handle nested key in ternary', () => {
      const template = '{{metadata.is_draft ? "DRAFT" : "FINAL"}}';
      const data = { metadata: { is_draft: true } };

      const result = processTokens(template, data);

      expect(result).toBe('DRAFT');
    });

    it('should handle missing nested key in ternary', () => {
      const template = '{{metadata.is_draft ? "DRAFT" : "FINAL"}}';
      const data = { metadata: {} };

      const result = processTokens(template, data);

      expect(result).toBe('FINAL');
    });

    it('should treat truthy string as truthy', () => {
      const template = '{{status ? "Has Status" : "No Status"}}';
      const data = { status: 'active' };

      const result = processTokens(template, data);

      expect(result).toBe('Has Status');
    });

    it('should treat empty string as falsy', () => {
      const template = '{{status ? "Has Status" : "No Status"}}';
      const data = { status: '' };

      const result = processTokens(template, data);

      expect(result).toBe('No Status');
    });

    it('should treat zero as falsy', () => {
      const template = '{{count ? "Has Items" : "Empty"}}';
      const data = { count: 0 };

      const result = processTokens(template, data);

      expect(result).toBe('Empty');
    });

    it('should treat non-zero number as truthy', () => {
      const template = '{{count ? "Has Items" : "Empty"}}';
      const data = { count: 5 };

      const result = processTokens(template, data);

      expect(result).toBe('Has Items');
    });

    it('should handle single-quoted values', () => {
      const template = "{{active ? 'Yes' : 'No'}}";
      const data = { active: true };

      const result = processTokens(template, data);

      expect(result).toBe('Yes');
    });

    it('should handle multiple ternaries in one template', () => {
      const template = '{{draft ? "DRAFT" : "FINAL"}} - {{confidential ? "CONFIDENTIAL" : "PUBLIC"}}';
      const data = { draft: true, confidential: false };

      const result = processTokens(template, data);

      expect(result).toBe('DRAFT - PUBLIC');
    });

    it('should handle ternary with whitespace', () => {
      const template = '{{ controlled  ?  "Controlled"  :  "Uncontrolled" }}';
      const data = { controlled: true };

      const result = processTokens(template, data);

      expect(result).toBe('Controlled');
    });

    it('should handle values with spaces', () => {
      const template = '{{urgent ? "High Priority" : "Normal Priority"}}';
      const data = { urgent: true };

      const result = processTokens(template, data);

      expect(result).toBe('High Priority');
    });
  });

  describe('processTokens - block conditionals', () => {
    // Basic functionality
    it('should include content when condition is true', () => {
      const template = '{{#if showSection}}<div>Content</div>{{/if}}';
      const data = { showSection: true };

      const result = processTokens(template, data);

      expect(result).toBe('<div>Content</div>');
    });

    it('should exclude content when condition is false', () => {
      const template = '{{#if showSection}}<div>Content</div>{{/if}}';
      const data = { showSection: false };

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    it('should exclude content when condition is undefined', () => {
      const template = '{{#if showSection}}<div>Content</div>{{/if}}';
      const data = {};

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    it('should exclude content when condition is null', () => {
      const template = '{{#if showSection}}<div>Content</div>{{/if}}';
      const data = { showSection: null };

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    // Nested key access
    it('should handle nested key in block conditional', () => {
      const template = '{{#if metadata.showHeader}}<header>Header</header>{{/if}}';
      const data = { metadata: { showHeader: true } };

      const result = processTokens(template, data);

      expect(result).toBe('<header>Header</header>');
    });

    it('should handle missing nested key in block conditional', () => {
      const template = '{{#if metadata.showHeader}}<header>Header</header>{{/if}}';
      const data = { metadata: {} };

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    it('should handle deeply nested key in block conditional', () => {
      const template = '{{#if meta.document.show}}<span>Show</span>{{/if}}';
      const data = { meta: { document: { show: true } } };

      const result = processTokens(template, data);

      expect(result).toBe('<span>Show</span>');
    });

    // Truthiness
    it('should treat truthy string as truthy in block', () => {
      const template = '{{#if status}}<span>Has Status</span>{{/if}}';
      const data = { status: 'active' };

      const result = processTokens(template, data);

      expect(result).toBe('<span>Has Status</span>');
    });

    it('should treat empty string as falsy in block', () => {
      const template = '{{#if status}}<span>Has Status</span>{{/if}}';
      const data = { status: '' };

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    it('should treat zero as falsy in block', () => {
      const template = '{{#if count}}<span>Has Items</span>{{/if}}';
      const data = { count: 0 };

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    it('should treat non-zero number as truthy in block', () => {
      const template = '{{#if count}}<span>Has Items</span>{{/if}}';
      const data = { count: 5 };

      const result = processTokens(template, data);

      expect(result).toBe('<span>Has Items</span>');
    });

    // Content handling
    it('should preserve HTML content inside truthy block', () => {
      const template = '{{#if show}}<div class="wrapper"><p>Paragraph</p></div>{{/if}}';
      const data = { show: true };

      const result = processTokens(template, data);

      expect(result).toBe('<div class="wrapper"><p>Paragraph</p></div>');
    });

    it('should preserve tokens inside truthy block for processing', () => {
      const template = '{{#if show}}<span>{{name}}</span>{{/if}}';
      const data = { show: true, name: 'Alice' };

      const result = processTokens(template, data);

      expect(result).toBe('<span>Alice</span>');
    });

    it('should not process tokens inside falsy block', () => {
      const template = '{{#if show}}{{name}}{{/if}}';
      const data = { show: false, name: 'Alice' };

      const result = processTokens(template, data);

      expect(result).toBe('');
      expect(result).not.toContain('Alice');
    });

    it('should handle empty block content', () => {
      const template = '{{#if show}}{{/if}}';
      const data = { show: true };

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    it('should preserve whitespace in block content', () => {
      const template = '{{#if show}}  content  {{/if}}';
      const data = { show: true };

      const result = processTokens(template, data);

      expect(result).toBe('  content  ');
    });

    // Nesting
    it('should handle nested if blocks', () => {
      const template = '{{#if outer}}Outer{{#if inner}}Inner{{/if}}End{{/if}}';
      const data = { outer: true, inner: true };

      const result = processTokens(template, data);

      expect(result).toBe('OuterInnerEnd');
    });

    it('should handle nested if with inner false', () => {
      const template = '{{#if outer}}Outer{{#if inner}}Inner{{/if}}End{{/if}}';
      const data = { outer: true, inner: false };

      const result = processTokens(template, data);

      expect(result).toBe('OuterEnd');
    });

    it('should handle nested if with outer false', () => {
      const template = '{{#if outer}}Outer{{#if inner}}Inner{{/if}}End{{/if}}';
      const data = { outer: false, inner: true };

      const result = processTokens(template, data);

      expect(result).toBe('');
    });

    it('should handle multiple levels of nesting', () => {
      const template = '{{#if a}}A{{#if b}}B{{#if c}}C{{/if}}{{/if}}{{/if}}';
      const data = { a: true, b: true, c: true };

      const result = processTokens(template, data);

      expect(result).toBe('ABC');
    });

    it('should handle sibling if blocks', () => {
      const template = '{{#if a}}A{{/if}}{{#if b}}B{{/if}}{{#if c}}C{{/if}}';
      const data = { a: true, b: false, c: true };

      const result = processTokens(template, data);

      expect(result).toBe('AC');
    });

    // Edge cases
    it('should handle whitespace in condition key', () => {
      const template = '{{#if  showSection  }}<div>Content</div>{{/if}}';
      const data = { showSection: true };

      const result = processTokens(template, data);

      expect(result).toBe('<div>Content</div>');
    });

    it('should handle multiple blocks in template', () => {
      const template = 'Start{{#if a}}A{{/if}}Middle{{#if b}}B{{/if}}End';
      const data = { a: true, b: true };

      const result = processTokens(template, data);

      expect(result).toBe('StartAMiddleBEnd');
    });

    it('should preserve unclosed blocks unchanged', () => {
      const template = '{{#if show}}Content without close';
      const data = { show: true };

      const result = processTokens(template, data);

      // Unclosed blocks should remain as-is (defensive behavior)
      expect(result).toBe('{{#if show}}Content without close');
    });

    it('should handle block with path tokens preserved', () => {
      const template = '{{#if show}}Root: {{PROJECT_ROOT}}{{/if}}';
      const data = { show: true };
      const pathContext = { projectRoot: '/project' };

      const result = processTokens(template, data, pathContext);

      expect(result).toBe('Root: /project');
    });

    // Integration with other token types
    it('should process ternary inside included blocks', () => {
      const template = '{{#if show}}{{draft ? "DRAFT" : "FINAL"}}{{/if}}';
      const data = { show: true, draft: true };

      const result = processTokens(template, data);

      expect(result).toBe('DRAFT');
    });

    it('should process defaults inside included blocks', () => {
      const template = '{{#if show}}Author: {{author ?? "Unknown"}}{{/if}}';
      const data = { show: true };

      const result = processTokens(template, data);

      expect(result).toBe('Author: Unknown');
    });

    // Real-world use cases
    it('should handle optional memo fields pattern', () => {
      const template = `<div class="memo-fields">
{{#if metadata.from}}<div class="field"><span>FROM:</span>{{metadata.from}}</div>{{/if}}
{{#if metadata.cc}}<div class="field"><span>CC:</span>{{metadata.cc}}</div>{{/if}}
</div>`;
      const data = { metadata: { from: 'John Doe' } };

      const result = processTokens(template, data);

      expect(result).toContain('FROM:');
      expect(result).toContain('John Doe');
      expect(result).not.toContain('CC:');
    });

    it('should handle multiline block content', () => {
      const template = `{{#if showHeader}}
<header>
  <h1>Title</h1>
  <p>Subtitle</p>
</header>
{{/if}}`;
      const data = { showHeader: true };

      const result = processTokens(template, data);

      expect(result).toContain('<header>');
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('</header>');
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
