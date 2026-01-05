import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import { readFile } from 'fs/promises';
import { extractFrontmatter } from './frontmatter.js';
import { wikilinkPlugin } from './wikilinks.js';
import { normalizeMetadata } from './metadata.js';
import { registerExtensions } from './extensions.js';

/**
 * Create configured markdown-it parser instance
 * @param {object} options - Parser configuration options
 * @param {boolean} options.html - Enable HTML tags in source (default: true)
 * @param {boolean} options.linkify - Auto-convert URLs to links (default: true)
 * @param {boolean} options.typographer - Enable smart quotes and typography (default: true)
 * @param {object} options.wikilinks - Wikilink plugin options (baseUrl, imageBaseUrl, linkClass, imageClass)
 * @returns {MarkdownIt} Configured markdown-it instance
 */
export function createParser(options = {}) {
  const defaultOptions = {
    html: true,
    linkify: true,
    typographer: true
  };

  const md = new MarkdownIt({ ...defaultOptions, ...options });

  // Add attribute syntax support {.class #id attr=value}
  md.use(markdownItAttrs);

  // Register PageMD custom extensions BEFORE wikilinks (callouts use [[...]] syntax too)
  registerExtensions(md);

  // Add Obsidian-style wiki links [[Page]] and ![[image.png]]
  md.use(wikilinkPlugin, options.wikilinks);

  return md;
}

/**
 * Parse markdown string with frontmatter extraction
 * @param {string} markdown - Raw markdown content
 * @param {object} options - Parser configuration options
 * @param {boolean} options.normalizeMetadata - Whether to normalize metadata (default: true)
 * @returns {{content: string, html: string, metadata: object, raw: string}} Parsed result
 */
export function parse(markdown, options = {}) {
  const { normalizeMetadata: shouldNormalize = true } = options;

  // Extract frontmatter first
  const { content, metadata: rawMetadata, raw } = extractFrontmatter(markdown);

  // Normalize metadata (keys, aliases, types, defaults)
  const metadata = shouldNormalize
    ? normalizeMetadata(rawMetadata)
    : rawMetadata;

  // Create parser and render HTML
  const md = createParser(options);
  const html = md.render(content);

  return {
    content,      // Markdown content without frontmatter
    html,         // Rendered HTML
    metadata,     // Normalized frontmatter object
    raw          // Raw frontmatter string
  };
}

/**
 * Parse markdown file
 * @param {string} filePath - Path to markdown file
 * @param {object} options - Parser configuration options
 * @returns {Promise<{content: string, html: string, metadata: object, raw: string}>} Parsed result
 */
export async function parseFile(filePath, options = {}) {
  const markdown = await readFile(filePath, 'utf-8');
  return parse(markdown, options);
}

// Re-export utilities
export { extractFrontmatter } from './frontmatter.js';
export { wikilinkPlugin } from './wikilinks.js';
export {
  normalizeMetadata,
  normalizeKey,
  normalizeValue,
  applyDefaults,
  loadMetadataSchema,
  FIELD_ALIASES
} from './metadata.js';
export {
  calloutPlugin,
  figurePlugin,
  registerExtensions
} from './extensions.js';
