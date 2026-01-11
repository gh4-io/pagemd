import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItGithubAlerts from 'markdown-it-github-alerts';
import markdownItInclude from 'markdown-it-include';
import markdownItContainer from 'markdown-it-container';
import { createHighlighter } from 'shiki';
import { readFile } from 'fs/promises';
import { extractFrontmatter } from './frontmatter.js';
import { wikilinkPlugin } from './wikilinks.js';
import { normalizeMetadata } from './metadata.js';
import { registerExtensions } from './extensions.js';
import { directivesPlugin } from './directives.js';
import { markdownItFancyListPlugin, isFancyListsEnabled } from './fancy-lists.js';

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

// Container types for markdown-it-container (:::name blocks)
// These complement GFM alerts with additional container types
const CONTAINER_TYPES = [
  'details', 'summary', 'aside', 'columns', 'spoiler',
  'warning', 'caution', 'note', 'important', 'tip',
  'document-header', 'title-block', 'applicability-box',
  'approval-block', 'footer-notice'
];

/**
 * Parse attribute syntax {.class #id} into HTML attributes
 * @param {string} attrs - Attribute string like ".warning #id" (without braces)
 * @returns {string} HTML attribute string like 'class="warning" id="id"'
 */
function parseAttributes(attrs) {
  const parts = [];
  const classes = [];
  let id = null;

  // Match .class and #id patterns
  const classMatches = attrs.match(/\.([a-zA-Z0-9_-]+)/g);
  const idMatch = attrs.match(/#([a-zA-Z0-9_-]+)/);

  if (classMatches) {
    classes.push(...classMatches.map(m => m.slice(1)));
  }
  if (idMatch) {
    id = idMatch[1];
  }

  if (classes.length > 0) {
    parts.push(`class="${classes.join(' ')}"`);
  }
  if (id) {
    parts.push(`id="${id}"`);
  }

  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

/**
 * Custom block rule for attribute-based containers `::: {.class}`
 * Runs before markdown-it-container to catch attribute syntax
 * @param {object} state - Markdown-it state
 * @param {number} startLine - Starting line number
 * @param {number} endLine - Ending line number
 * @param {boolean} silent - Silent mode (don't generate tokens)
 * @returns {boolean} True if rule matched and processed
 */
function attributeContainerRule(state, startLine, endLine, silent) {
  const marker = ':';
  const markerCount = 3;
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];

  // Check for ::: marker
  if (pos + markerCount > max) return false;

  const markerStr = state.src.slice(pos, pos + markerCount);
  if (markerStr !== marker.repeat(markerCount)) return false;

  pos += markerCount;

  // Get the content after :::
  const firstLine = state.src.slice(pos, max).trim();

  // Only match if it starts with { (attribute syntax)
  if (!firstLine.startsWith('{')) return false;

  // If we're in silent mode (checking if rule matches), return true
  if (silent) return true;

  // Find the closing :::
  let nextLine = startLine;
  let autoClosed = false;

  while (nextLine < endLine) {
    nextLine++;
    if (nextLine >= endLine) break;

    pos = state.bMarks[nextLine] + state.tShift[nextLine];
    max = state.eMarks[nextLine];

    if (pos < max && state.sCount[nextLine] < state.blkIndent) {
      // Non-empty line with negative indent should stop the container
      break;
    }

    // Check for closing :::
    const line = state.src.slice(pos, max).trim();
    if (line === marker.repeat(markerCount)) {
      autoClosed = true;
      break;
    }
  }

  const oldParent = state.parentType;
  const oldLineMax = state.lineMax;
  state.parentType = 'container';

  // Create opening token
  const tokenOpen = state.push('div_open', 'div', 1);
  tokenOpen.markup = marker.repeat(markerCount);
  tokenOpen.block = true;

  // Parse attributes and add to token
  const attrMatch = firstLine.match(/^\{(.+)\}$/);
  if (attrMatch) {
    const attrs = parseAttributes(attrMatch[1]);
    // Convert attrs string "class=\"foo\" id=\"bar\"" to token attrs array
    const attrPairs = [];
    const classMatch = attrs.match(/class="([^"]+)"/);
    const idMatch = attrs.match(/id="([^"]+)"/);
    if (classMatch) attrPairs.push(['class', classMatch[1]]);
    if (idMatch) attrPairs.push(['id', idMatch[1]]);
    tokenOpen.attrSet = (name, value) => {
      if (!tokenOpen.attrs) tokenOpen.attrs = [];
      tokenOpen.attrs.push([name, value]);
    };
    for (const [name, value] of attrPairs) {
      tokenOpen.attrSet(name, value);
    }
  }

  // Parse block content
  state.lineMax = nextLine;
  state.md.block.tokenize(state, startLine + 1, nextLine);
  state.lineMax = oldLineMax;
  state.parentType = oldParent;

  // Create closing token
  const tokenClose = state.push('div_close', 'div', -1);
  tokenClose.markup = marker.repeat(markerCount);
  tokenClose.block = true;

  state.line = nextLine + (autoClosed ? 1 : 0);
  return true;
}

/**
 * Create a container renderer for markdown-it-container
 * @param {string} name - Container type name
 * @returns {object} Container configuration
 */
function createContainerConfig(name) {
  return {
    validate: (params) => params.trim().split(/\s+/)[0] === name,
    render: (tokens, idx) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        // Extract title if provided (:::name Title here)
        const params = token.info.trim().slice(name.length).trim();
        const title = params ? ` data-title="${params.replace(/"/g, '&quot;')}"` : '';
        return `<div class="container container-${name}"${title}>\n`;
      }
      return '</div>\n';
    }
  };
}

/**
 * Create a catch-all container renderer for attribute syntax `::: {.class #id}`
 * Uses a special regex-based validation to match any params starting with {
 * @returns {object} Container configuration for generic divs
 */
function createGenericContainerConfig() {
  return {
    validate: (params) => {
      // Match if params starts with { (attribute syntax)
      return /^\s*\{/.test(params);
    },
    render: (tokens, idx) => {
      const token = tokens[idx];
      if (token.nesting === 1) {
        // token.info contains the params string (everything after ::: and container name)
        // For empty-name container, this is everything after :::
        const params = token.info.trim();

        // DEBUG: Log what we receive
        if (process.env.PAGEMD_DEBUG_CONTAINERS) {
          console.log('[GenericContainer] token.info:', JSON.stringify(token.info));
          console.log('[GenericContainer] params:', JSON.stringify(params));
        }

        // Parse {.class #id} syntax
        if (params.startsWith('{') && params.endsWith('}')) {
          const attrs = parseAttributes(params.slice(1, -1));
          if (process.env.PAGEMD_DEBUG_CONTAINERS) {
            console.log('[GenericContainer] attrs:', attrs);
          }
          return `<div${attrs}>\n`;
        }

        // Fallback - just a plain div
        return '<div>\n';
      }
      return '</div>\n';
    }
  };
}

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
 * @param {string} options.includeRoot - Root path for markdown-it-include (default: '.')
 * @returns {MarkdownIt} Configured markdown-it instance
 */
export function createParser(options = {}) {
  const defaultOptions = {
    html: true,
    linkify: true,
    typographer: true
  };

  const highlightTheme = options.highlightTheme || 'github-light';
  const includeRoot = options.includeRoot || '.';

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

  // Plugin registration order is important:
  // 1. markdown-it-attrs - Adds {.class #id} attribute syntax
  md.use(markdownItAttrs);

  // 1.5. markdown-it-fancy-lists - Letter and Roman numeral lists (opt-in)
  if (isFancyListsEnabled(options)) {
    md.use(markdownItFancyListPlugin);
  }

  // 2. markdown-it-github-alerts - GFM alert syntax > [!NOTE]
  md.use(markdownItGithubAlerts);

  // 3. markdown-it-include - File inclusion !!!include(path)!!!
  md.use(markdownItInclude, { root: includeRoot });

  // 3.5. Custom attribute container block rule `::: {.class #id}`
  // Registered BEFORE markdown-it-container so it catches attribute syntax first
  md.block.ruler.before('fence', 'attribute_container', attributeContainerRule);

  // 3.6. markdown-it-container - Custom :::name blocks
  // Register each container type (details, aside, columns, spoiler, etc.)
  for (const type of CONTAINER_TYPES) {
    md.use(markdownItContainer, type, createContainerConfig(type));
  }

  // 4. PageMD extensions - Custom callouts [[WARNING]] and figures <!-- ::FIGURE -->
  registerExtensions(md);

  // 5. PageMD directives - Comment directives <!-- ::PAGEBREAK --> etc.
  md.use(directivesPlugin);

  // 6. Wikilinks LAST - Uses [[...]] syntax which conflicts with callouts
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
export { directivesPlugin, registerDirectives } from './directives.js';
export { preprocessMermaid, isMermaidEnabled } from './mermaid.js';
