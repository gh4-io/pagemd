import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import { createHighlighter } from 'shiki';
import { readFile } from 'fs/promises';
import { extractFrontmatter } from './frontmatter.js';
import { wikilinkPlugin } from './wikilinks.js';
import { normalizeMetadata } from './metadata.js';
import { registerExtensions } from './extensions.js';

// Singleton highlighter - initialized once, reused for all renders
let highlighter = null;

// Default languages to load for syntax highlighting
const DEFAULT_LANGS = [
  'javascript', 'typescript', 'json', 'bash', 'shell',
  'python', 'css', 'html', 'markdown', 'yaml', 'sql',
  'xml', 'java', 'c', 'cpp', 'csharp', 'go', 'rust',
  'php', 'ruby', 'swift', 'kotlin', 'powershell'
];

// Default themes to load
const DEFAULT_THEMES = ['github-light', 'github-dark'];

/**
 * Initialize the shiki syntax highlighter (async, called once at startup)
 * @param {object} options - Highlighter options
 * @param {string[]} options.themes - Themes to load (default: github-light, github-dark)
 * @param {string[]} options.langs - Languages to load (default: common languages)
 * @returns {Promise<object>} Initialized highlighter instance
 */
export async function initHighlighter(options = {}) {
  if (highlighter) return highlighter;

  const themes = options.themes || DEFAULT_THEMES;
  const langs = options.langs || DEFAULT_LANGS;

  highlighter = await createHighlighter({ themes, langs });
  return highlighter;
}

/**
 * Get the current highlighter instance (null if not initialized)
 * @returns {object|null} Highlighter instance or null
 */
export function getHighlighter() {
  return highlighter;
}

/**
 * Check if syntax highlighting is enabled
 * @returns {boolean} True if highlighter is initialized
 */
export function isSyntaxHighlightingEnabled() {
  return highlighter !== null && process.env.PAGEMD_SYNTAX_HIGHLIGHT !== '0';
}

/**
 * Create configured markdown-it parser instance
 * NOTE: Call initHighlighter() before this for syntax highlighting support
 * @param {object} options - Parser configuration options
 * @param {boolean} options.html - Enable HTML tags in source (default: true)
 * @param {boolean} options.linkify - Auto-convert URLs to links (default: true)
 * @param {boolean} options.typographer - Enable smart quotes and typography (default: true)
 * @param {string} options.highlightTheme - Shiki theme for syntax highlighting (default: github-light)
 * @param {object} options.wikilinks - Wikilink plugin options (baseUrl, imageBaseUrl, linkClass, imageClass)
 * @returns {MarkdownIt} Configured markdown-it instance
 */
export function createParser(options = {}) {
  const defaultOptions = {
    html: true,
    linkify: true,
    typographer: true
  };

  const highlightTheme = options.highlightTheme || 'github-light';

  // Build markdown-it options including syntax highlighting if available
  const mdOptions = { ...defaultOptions, ...options };

  // Add syntax highlighting if highlighter is initialized and not disabled
  if (isSyntaxHighlightingEnabled()) {
    mdOptions.highlight = (code, lang) => {
      if (!lang) return '';
      try {
        return highlighter.codeToHtml(code, { lang, theme: highlightTheme });
      } catch (e) {
        // Fallback for unknown languages - return empty to use default escaping
        return '';
      }
    };
  }

  const md = new MarkdownIt(mdOptions);

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

  // Create parser and render HTML - pass highlight_theme from metadata
  const md = createParser({
    ...options,
    highlightTheme: metadata.highlight_theme || options.highlightTheme
  });
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
