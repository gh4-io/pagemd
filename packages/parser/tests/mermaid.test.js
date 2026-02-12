/**
 * @pagemd/parser - Mermaid preprocessor tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { preprocessMermaid, isMermaidEnabled, extractMermaidBlocks, parseFenceAttributes } from '../src/mermaid.js';

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

  describe('extractMermaidBlocks', () => {
    it('should extract standard mermaid block', () => {
      const md = '```mermaid\ngraph LR\n  A --> B\n```';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].code).toBe('graph LR\n  A --> B');
      expect(blocks[0].attrs).toBeNull();
    });

    it('should handle trailing whitespace after mermaid keyword', () => {
      const md = '```mermaid   \ngraph LR\n  A --> B\n```';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].code).toBe('graph LR\n  A --> B');
      expect(blocks[0].attrs).toBeNull();
    });

    it('should capture attributes on opening fence', () => {
      const md = '```mermaid {.custom-class}\ngraph LR\n  A --> B\n```';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].code).toBe('graph LR\n  A --> B');
      expect(blocks[0].attrs).toBe('.custom-class');
    });

    it('should capture attributes on closing fence', () => {
      const md = '```mermaid\ngraph LR\n  A --> B\n``` {style="max-width: 200px"}';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].code).toBe('graph LR\n  A --> B');
      expect(blocks[0].attrs).toBe('style="max-width: 200px"');
    });

    it('should merge attributes from both fences (opening first)', () => {
      const md = '```mermaid {.diagram}\ngraph LR\n  A --> B\n``` {style="max-width: 200px"}';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].attrs).toBe('.diagram style="max-width: 200px"');
    });

    it('should capture complex attributes on opening fence', () => {
      const md = '```mermaid {.flow-chart #fig-1 style="max-width: 200px; margin: 0 auto;"}\ngraph LR\n  A --> B\n```';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].attrs).toBe('.flow-chart #fig-1 style="max-width: 200px; margin: 0 auto;"');
    });

    it('should extract multiple mermaid blocks', () => {
      const md = '# Title\n\n```mermaid {.a}\ngraph LR\n  A --> B\n```\n\nText\n\n```mermaid\nsequenceDiagram\n  A->>B: Hi\n``` {.b}';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].attrs).toBe('.a');
      expect(blocks[0].code).toBe('graph LR\n  A --> B');
      expect(blocks[1].attrs).toBe('.b');
      expect(blocks[1].code).toBe('sequenceDiagram\n  A->>B: Hi');
    });

    it('should not match non-mermaid code blocks', () => {
      const md = '```javascript\nconst x = 1;\n```';
      const blocks = extractMermaidBlocks(md);
      expect(blocks).toHaveLength(0);
    });
  });

  describe('parseFenceAttributes', () => {
    it('should return default class when attrs is null', () => {
      expect(parseFenceAttributes(null)).toBe(' class="mermaid-diagram"');
    });

    it('should return default class when attrs is empty string', () => {
      expect(parseFenceAttributes('')).toBe(' class="mermaid-diagram"');
    });

    it('should parse .class-name', () => {
      const result = parseFenceAttributes('.custom-class');
      expect(result).toBe(' class="mermaid-diagram custom-class"');
    });

    it('should parse multiple classes', () => {
      const result = parseFenceAttributes('.flow-chart .centered');
      expect(result).toBe(' class="mermaid-diagram flow-chart centered"');
    });

    it('should parse #id', () => {
      const result = parseFenceAttributes('#fig-1');
      expect(result).toContain('id="fig-1"');
      expect(result).toContain('class="mermaid-diagram"');
    });

    it('should parse key="value" attributes', () => {
      const result = parseFenceAttributes('style="max-width: 200px"');
      expect(result).toContain('style="max-width: 200px"');
      expect(result).toContain('class="mermaid-diagram"');
    });

    it('should parse key=\'value\' (single quotes)', () => {
      const result = parseFenceAttributes("style='color: red'");
      expect(result).toContain('style="color: red"');
    });

    it('should parse combined class + id + style', () => {
      const result = parseFenceAttributes('.flow-chart #fig-1 style="max-width: 200px; margin: 0 auto;"');
      expect(result).toContain('class="mermaid-diagram flow-chart"');
      expect(result).toContain('id="fig-1"');
      expect(result).toContain('style="max-width: 200px; margin: 0 auto;"');
    });

    it('should use first id when duplicates exist (opening fence precedence)', () => {
      const result = parseFenceAttributes('#opening-id #closing-id');
      expect(result).toContain('id="opening-id"');
      expect(result).not.toContain('closing-id');
    });

    it('should use first value for duplicate keys (opening fence precedence)', () => {
      const result = parseFenceAttributes('style="color: red" style="color: blue"');
      expect(result).toContain('style="color: red"');
      expect(result).not.toContain('color: blue');
    });

    it('should combine classes from both fences', () => {
      const result = parseFenceAttributes('.from-opening .from-closing');
      expect(result).toBe(' class="mermaid-diagram from-opening from-closing"');
    });

    it('should handle data attributes', () => {
      const result = parseFenceAttributes('data-caption="Flow diagram"');
      expect(result).toContain('data-caption="Flow diagram"');
    });
  });
});
