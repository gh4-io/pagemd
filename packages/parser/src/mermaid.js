/**
 * @pagemd/parser/mermaid
 * Mermaid diagram preprocessing using @mermaid-js/mermaid-cli
 *
 * Converts ```mermaid code blocks to inline SVG before markdown parsing.
 * Uses npx to run mermaid-cli with temp files for I/O.
 */

import { spawn } from 'child_process';
import { writeFile, unlink, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';

/**
 * Check if mermaid diagram rendering is enabled
 * @returns {boolean} True if PAGEMD_MERMAID is not set to '0', 'false', or 'no'
 */
export function isMermaidEnabled() {
  const value = process.env.PAGEMD_MERMAID;
  if (value === undefined || value === null || value === '') {
    return true; // Enabled by default
  }
  const lower = String(value).toLowerCase().trim();
  return !(lower === '0' || lower === 'false' || lower === 'no');
}

/**
 * Generate unique temp file path for mermaid diagram
 * @param {string} content - Mermaid diagram content
 * @param {string} ext - File extension (.mmd or .svg)
 * @returns {string} Absolute temp file path
 */
function getTempPath(content, ext) {
  const hash = createHash('md5').update(content).digest('hex').slice(0, 8);
  const timestamp = Date.now();
  return join(tmpdir(), `pagemd-mermaid-${timestamp}-${hash}${ext}`);
}

/**
 * Render mermaid diagram to SVG using @mermaid-js/mermaid-cli
 * @param {string} mermaidCode - Mermaid diagram source
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} SVG content
 * @throws {Error} If rendering fails or times out
 */
async function renderMermaidToSVG(mermaidCode, timeout = 30000) {
  const inputPath = getTempPath(mermaidCode, '.mmd');
  const outputPath = getTempPath(mermaidCode, '.svg');

  try {
    // Write mermaid source to temp file
    await writeFile(inputPath, mermaidCode, 'utf-8');

    // Run mermaid-cli via npx
    const args = [
      '--yes',
      '@mermaid-js/mermaid-cli@latest',
      '-i', inputPath,
      '-o', outputPath
    ];

    await new Promise((resolve, reject) => {
      const proc = spawn('npx', args, {
        stdio: 'pipe',
        timeout,
        shell: true
      });

      let stderr = '';

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn mermaid-cli: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`mermaid-cli exited with code ${code}${stderr ? `: ${stderr}` : ''}`));
        }
      });

      // Timeout handling
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill();
          reject(new Error(`mermaid-cli timed out after ${timeout}ms`));
        }
      }, timeout);
    });

    // Read generated SVG
    const svg = await readFile(outputPath, 'utf-8');
    return svg;

  } finally {
    // Cleanup temp files (ignore errors)
    try { await unlink(inputPath); } catch {}
    try { await unlink(outputPath); } catch {}
  }
}

/**
 * Parse fence attributes from a `{...}` string into an HTML attribute string.
 * Supports `.class-name`, `#id-name`, and `key="value"` / `key='value'` syntax.
 * Always includes `mermaid-diagram` as a base class.
 *
 * @param {string|null} attrsRaw - Merged attribute content (inner text from `{...}` braces, without braces)
 * @returns {string} HTML attribute string with leading space, e.g. ` class="mermaid-diagram custom" id="fig-1"`
 */
export function parseFenceAttributes(attrsRaw) {
  const classes = ['mermaid-diagram'];
  if (!attrsRaw) return ` class="${classes.join(' ')}"`;

  const inner = attrsRaw.trim();
  if (!inner) return ` class="${classes.join(' ')}"`;

  let id = null;
  const attrs = {};

  // Match .class, #id, key="value", key='value'
  const tokenRegex = /\.([a-zA-Z0-9_-]+)|#([a-zA-Z0-9_-]+)|([a-zA-Z][a-zA-Z0-9_-]*)=(?:"([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = tokenRegex.exec(inner)) !== null) {
    if (m[1]) {
      classes.push(m[1]);
    } else if (m[2]) {
      // First id wins (opening fence takes precedence)
      if (!id) id = m[2];
    } else if (m[3]) {
      // First value wins for duplicate keys (opening fence takes precedence)
      if (!(m[3] in attrs)) attrs[m[3]] = m[4] ?? m[5];
    }
  }

  let result = ` class="${classes.join(' ')}"`;
  if (id) result += ` id="${id}"`;
  for (const [key, value] of Object.entries(attrs)) {
    result += ` ${key}="${value}"`;
  }
  return result;
}

/**
 * Extract mermaid code blocks from markdown, including optional fence attributes.
 *
 * Supports:
 * - Standard:           ```mermaid\n...\n```
 * - Trailing whitespace: ```mermaid  \n...\n```
 * - Opening attrs:      ```mermaid {.class style="..."}\n...\n```
 * - Closing attrs:      ```\n...\n``` {style="..."}
 * - Both:               Opening attrs take precedence for conflicts
 *
 * @param {string} markdown - Markdown content
 * @returns {Array<{code: string, attrs: string|null, fullMatch: string, start: number, end: number}>} Mermaid blocks
 */
export function extractMermaidBlocks(markdown) {
  const blocks = [];
  const regex = /```mermaid[^\S\n]*(?:\{([^}]*)\})?[^\S\n]*\n([\s\S]*?)```[^\S\n]*(?:\{([^}]*)\})?/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    const openAttrs = match[1] || null;  // Inner content of opening {…}
    const code = match[2].trim();
    const closeAttrs = match[3] || null; // Inner content of closing {…}

    // Merge attributes: opening first (takes precedence for conflicts)
    let mergedAttrs = null;
    if (openAttrs && closeAttrs) {
      mergedAttrs = `${openAttrs} ${closeAttrs}`;
    } else {
      mergedAttrs = openAttrs || closeAttrs;
    }

    blocks.push({
      code,
      attrs: mergedAttrs,
      fullMatch: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  return blocks;
}

/**
 * Preprocess markdown to replace ```mermaid blocks with inline SVG
 * @param {string} markdown - Raw markdown content
 * @param {object} options - Processing options
 * @param {number} options.timeout - Rendering timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} Processed markdown with SVG replacements
 */
export async function preprocessMermaid(markdown, options = {}) {
  if (!isMermaidEnabled()) {
    return markdown;
  }

  const timeout = options.timeout || 30000;
  const blocks = extractMermaidBlocks(markdown);

  if (blocks.length === 0) {
    return markdown;
  }

  // Process blocks in reverse order to preserve indices
  let processed = markdown;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];

    try {
      const svg = await renderMermaidToSVG(block.code, timeout);

      // Wrap SVG in figure element with attributes for styling
      const attrString = parseFenceAttributes(block.attrs);
      const replacement = `<figure${attrString}>\n${svg}\n</figure>`;

      // Replace the code block with SVG
      processed =
        processed.slice(0, block.start) +
        replacement +
        processed.slice(block.end);

    } catch (err) {
      // On error, leave the code block as-is and continue
      // This allows syntax highlighting to show the source
      console.warn(`Failed to render mermaid diagram: ${err.message}`);
    }
  }

  return processed;
}
