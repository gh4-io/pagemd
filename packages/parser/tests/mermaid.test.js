/**
 * @pagemd/parser - Mermaid preprocessor tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { preprocessMermaid, isMermaidEnabled } from '../src/mermaid.js';

describe('Mermaid Preprocessor', () => {
  const originalEnv = process.env.PAGEMD_MERMAID;

  afterEach(() => {
    // Restore original env
    if (originalEnv === undefined) {
      delete process.env.PAGEMD_MERMAID;
    } else {
      process.env.PAGEMD_MERMAID = originalEnv;
    }
  });

  describe('isMermaidEnabled', () => {
    it('should be enabled by default', () => {
      delete process.env.PAGEMD_MERMAID;
      expect(isMermaidEnabled()).toBe(true);
    });

    it('should be disabled when PAGEMD_MERMAID=0', () => {
      process.env.PAGEMD_MERMAID = '0';
      expect(isMermaidEnabled()).toBe(false);
    });

    it('should be disabled when PAGEMD_MERMAID=false', () => {
      process.env.PAGEMD_MERMAID = 'false';
      expect(isMermaidEnabled()).toBe(false);
    });

    it('should be disabled when PAGEMD_MERMAID=no', () => {
      process.env.PAGEMD_MERMAID = 'no';
      expect(isMermaidEnabled()).toBe(false);
    });

    it('should be enabled when PAGEMD_MERMAID=1', () => {
      process.env.PAGEMD_MERMAID = '1';
      expect(isMermaidEnabled()).toBe(true);
    });

    it('should be case insensitive', () => {
      process.env.PAGEMD_MERMAID = 'FALSE';
      expect(isMermaidEnabled()).toBe(false);

      process.env.PAGEMD_MERMAID = 'NO';
      expect(isMermaidEnabled()).toBe(false);
    });
  });

  describe('preprocessMermaid', () => {
    it('should return unchanged markdown when disabled', async () => {
      process.env.PAGEMD_MERMAID = '0';
      const markdown = '```mermaid\ngraph TD\n  A --> B\n```';

      const result = await preprocessMermaid(markdown);
      expect(result).toBe(markdown);
    });

    it('should return unchanged markdown when no mermaid blocks', async () => {
      delete process.env.PAGEMD_MERMAID;
      const markdown = '# Title\n\nSome content\n\n```javascript\nconst x = 1;\n```';

      const result = await preprocessMermaid(markdown);
      expect(result).toBe(markdown);
    });

    // Skip this test in CI - requires mermaid-cli installation
    it.skip('should detect mermaid code blocks (requires mermaid-cli)', async () => {
      delete process.env.PAGEMD_MERMAID;
      const markdown = `# Title

\`\`\`mermaid
graph TD
  A[Start] --> B[End]
\`\`\`

More text`;

      const result = await preprocessMermaid(markdown, { timeout: 30000 });
      expect(result).toContain('<figure class="mermaid-diagram">');
      expect(result).toContain('<svg');
    });

    it('should preserve markdown around mermaid blocks', async () => {
      process.env.PAGEMD_MERMAID = '0'; // Disable to test structure only
      const markdown = `# Before

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

# After`;

      const result = await preprocessMermaid(markdown);
      expect(result).toContain('# Before');
      expect(result).toContain('# After');
    });
  });
});
