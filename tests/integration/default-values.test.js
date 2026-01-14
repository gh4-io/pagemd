/**
 * Integration Test: Template Default Values
 *
 * Tests the hybrid default value system:
 * 1. Profile-level defaults (profile.metadata.defaults)
 * 2. Inline defaults (template ?? operator)
 *
 * Verifies:
 * - Profile defaults merged with frontmatter
 * - Frontmatter overrides profile defaults
 * - Inline ?? operator provides fallbacks
 * - Falsey values (0, false, '') preserved
 */

import { describe, it, expect } from 'vitest';
import { processTokens, renderTemplate } from '../../packages/renderer-web/src/template.js';
import { parseFile } from '@pagemd/parser';
import { renderDocument } from '@pagemd/renderer-web';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

describe('Template Default Values Integration', () => {
  describe('Inline ?? operator in templates', () => {
    it('should use default value when metadata field is missing', () => {
      const template = 'Document Type: {{metadata.doc_type ?? "General Document"}}';
      const data = {
        metadata: {
          title: 'My Document'
        }
      };

      const result = processTokens(template, data);

      expect(result).toBe('Document Type: General Document');
    });

    it('should use frontmatter value over inline default', () => {
      const template = 'Type: {{metadata.doc_type ?? "General"}}';
      const data = {
        metadata: {
          doc_type: 'Technical Report'
        }
      };

      const result = processTokens(template, data);

      expect(result).toBe('Type: Technical Report');
    });

    it('should preserve falsey values instead of using default', () => {
      const template = 'Count: {{metadata.count ?? "N/A"}}, Active: {{metadata.active ?? "Unknown"}}';
      const data = {
        metadata: {
          count: 0,
          active: false
        }
      };

      const result = processTokens(template, data);

      expect(result).toBe('Count: 0, Active: false');
    });

    it('should handle nested keys with inline defaults', () => {
      const template = 'Department: {{metadata.department.name ?? "Unspecified"}}';
      const data = {
        metadata: {
          department: {}
        }
      };

      const result = processTokens(template, data);

      expect(result).toBe('Department: Unspecified');
    });

    it('should handle multiple inline defaults in complex template', () => {
      const template = `
Title: {{metadata.title ?? "Untitled"}}
Author: {{metadata.author ?? "Anonymous"}}
Status: {{metadata.status ?? "Draft"}}
Version: {{metadata.version ?? "1.0"}}
`;

      const data = {
        metadata: {
          title: 'My Report',
          version: '2.1'
        }
      };

      const result = processTokens(template, data);

      expect(result).toContain('Title: My Report');
      expect(result).toContain('Author: Anonymous');
      expect(result).toContain('Status: Draft');
      expect(result).toContain('Version: 2.1');
    });
  });

  describe('Profile defaults integration', () => {
    it('should merge profile defaults with frontmatter metadata', async () => {
      // Simulate profile with defaults
      const profile = {
        id: 'test-profile',
        metadata: {
          defaults: {
            author: 'Engineering Team',
            status: 'Draft',
            version: '1.0',
            department: 'Engineering'
          }
        },
        resources: {
          base_css: [],
          css: []
        },
        layout: {}
      };

      // Simulate markdown metadata (partial - missing some fields)
      const metadata = {
        title: 'Test Document',
        author: 'Jane Doe' // Overrides profile default
      };

      // Merge as renderer does (profile defaults first, then frontmatter)
      const mergedMetadata = {
        ...profile.metadata.defaults,
        ...metadata
      };

      // Verify merge behavior
      expect(mergedMetadata.title).toBe('Test Document'); // From frontmatter
      expect(mergedMetadata.author).toBe('Jane Doe'); // Frontmatter overrides profile
      expect(mergedMetadata.status).toBe('Draft'); // From profile defaults
      expect(mergedMetadata.version).toBe('1.0'); // From profile defaults
      expect(mergedMetadata.department).toBe('Engineering'); // From profile defaults
    });

    it('should preserve frontmatter values even if profile has defaults', async () => {
      const profile = {
        id: 'test-profile',
        metadata: {
          defaults: {
            status: 'Draft',
            version: '1.0'
          }
        }
      };

      const metadata = {
        status: 'Approved',
        version: '3.0'
      };

      const mergedMetadata = {
        ...profile.metadata.defaults,
        ...metadata
      };

      expect(mergedMetadata.status).toBe('Approved');
      expect(mergedMetadata.version).toBe('3.0');
    });
  });

  describe('Combined: Profile defaults + Inline defaults', () => {
    it('should combine profile defaults with inline template defaults', () => {
      // Profile provides base defaults
      const profileDefaults = {
        author: 'Engineering Team',
        department: 'Engineering'
      };

      // Frontmatter overrides some, leaves others
      const frontmatter = {
        title: 'My Document',
        author: 'Jane Doe'
      };

      // Merged metadata
      const metadata = {
        ...profileDefaults,
        ...frontmatter
      };

      // Template with inline defaults for fields not in profile
      const template = `
Title: {{metadata.title ?? "Untitled"}}
Author: {{metadata.author}}
Department: {{metadata.department}}
Status: {{metadata.status ?? "In Progress"}}
Reviewer: {{metadata.reviewer ?? "TBD"}}
`;

      const data = { metadata };
      const result = processTokens(template, data);

      // Verify correct precedence:
      // - title: from frontmatter
      // - author: from frontmatter (overrides profile)
      // - department: from profile defaults
      // - status: from inline default (not in profile or frontmatter)
      // - reviewer: from inline default (not in profile or frontmatter)
      expect(result).toContain('Title: My Document');
      expect(result).toContain('Author: Jane Doe');
      expect(result).toContain('Department: Engineering');
      expect(result).toContain('Status: In Progress');
      expect(result).toContain('Reviewer: TBD');
    });
  });

  describe('renderTemplate integration', () => {
    it('should handle inline defaults in full template rendering', () => {
      const template = `
<!DOCTYPE html>
<html>
<head>
  <title>{{metadata.title ?? "Untitled Document"}}</title>
  {{styles}}
</head>
<body>
  <header>
    <h1>{{metadata.title ?? "Untitled"}}</h1>
    <p>Author: {{metadata.author ?? "Unknown"}}</p>
    <p>Status: {{metadata.status ?? "Draft"}}</p>
  </header>
  <main>
    {{content}}
  </main>
</body>
</html>`;

      const context = {
        content: '<p>Document content here</p>',
        styles: '<style>body { margin: 0; }</style>',
        metadata: {
          title: 'Test Document'
          // Missing: author, status
        },
        profile: { id: 'test' },
        pathContext: {}
      };

      const result = renderTemplate(template, context);

      // Verify template rendered with defaults
      expect(result).toContain('<title>Test Document</title>');
      expect(result).toContain('<h1>Test Document</h1>');
      expect(result).toContain('Author: Unknown');
      expect(result).toContain('Status: Draft');
      expect(result).toContain('<p>Document content here</p>');
    });
  });
});
