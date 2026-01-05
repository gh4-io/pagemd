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
 * Extract mermaid code blocks from markdown
 * @param {string} markdown - Markdown content
 * @returns {Array<{code: string, fullMatch: string, start: number, end: number}>} Mermaid blocks
 */
function extractMermaidBlocks(markdown) {
  const blocks = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      code: match[1].trim(),
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

      // Wrap SVG in figure element with class for styling
      const replacement = `<figure class="mermaid-diagram">\n${svg}\n</figure>`;

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
