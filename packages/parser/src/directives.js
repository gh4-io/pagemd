/**
 * PageMD Directives Plugin
 *
 * Parses HTML comment directives in the format: <!-- ::KEYWORD params -->
 * Transforms them into appropriate HTML output for paged media rendering.
 *
 * Supported directives:
 * - PAGEBREAK: Force a page break
 * - TOC: Table of contents placeholder
 * - SECTION_START/SECTION_END: Wrapper divs with classes
 * - LAYOUT: Switch to named page layout
 * - COVER_START/COVER_END: Cover page wrapper
 * - INCLUDE: File inclusion (handled by markdown-it-include)
 * - INDEX: Index term marker or placeholder
 */

/**
 * Parse attribute string into key-value object
 * Handles: key="value" key='value' key=value (flag)
 * @param {string} attrString - The attribute string to parse
 * @returns {Object} Parsed attributes
 */
function parseAttributes(attrString) {
  const attrs = {};
  if (!attrString) return attrs;

  // Match key="value", key='value', or key=value, or standalone (flag)
  const attrRegex = /(\w+)(?:=["']([^"']+)["']|=(\S+))?/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const key = match[1];
    const value = match[2] || match[3] || true; // true for flags without value
    attrs[key] = value;
  }

  return attrs;
}

/**
 * Directives plugin for markdown-it
 * @param {MarkdownIt} md - Markdown-it instance
 */
export function directivesPlugin(md) {
  // Track section nesting for validation
  let sectionStack = [];
  // Track whether we're inside a LAYOUT section
  let inLayout = false;

  // Reset state on each render
  const originalRender = md.render.bind(md);
  md.render = function (...args) {
    sectionStack = [];
    inLayout = false;
    return originalRender(...args);
  };

  /**
   * Process a single directive token and transform its content
   * @param {Object} token - The token to process
   * @param {string} command - The directive command (e.g., 'INDEX', 'PAGEBREAK')
   * @param {string} parenParams - Parameters in parentheses (e.g., 'landscape' for LAYOUT(landscape))
   * @param {Object} attrs - Parsed attributes object
   * @returns {boolean} True if token was transformed
   */
  function processDirective(token, command, parenParams, attrs) {
    switch (command) {
      case 'PAGEBREAK':
        token.content = '<div class="break-page"></div>\n';
        return true;

      case 'TOC':
        const levels = attrs.levels || '3';
        const pageLevels = attrs.pageLevels || '';
        let tocAttrs = `data-levels="${md.utils.escapeHtml(levels)}"`;
        if (attrs.pages !== undefined) {
          const showPages = (attrs.pages === 'false' || attrs.pages === '0' || attrs.pages === 'no') ? 'false' : 'true';
          tocAttrs += ` data-pages="${showPages}"`;
        }
        if (pageLevels) {
          tocAttrs += ` data-page-levels="${md.utils.escapeHtml(pageLevels)}"`;
        }
        token.content = `<div class="toc-placeholder" ${tocAttrs}></div>\n`;
        return true;

      case 'SECTION_START':
        const className = attrs.class || '';
        const sectionId = attrs.id || '';
        sectionStack.push('section');
        let sectionAttrs = '';
        if (sectionId) sectionAttrs += ` id="${md.utils.escapeHtml(sectionId)}"`;
        if (className) sectionAttrs += ` class="${md.utils.escapeHtml(className)}"`;
        token.content = `<div${sectionAttrs}>\n`;
        return true;

      case 'SECTION_END':
        if (sectionStack.length > 0) {
          sectionStack.pop();
        }
        token.content = '</div>\n';
        return true;

      case 'LAYOUT':
        const layoutName = parenParams || attrs.name || 'default';
        if (inLayout) {
          token.content = `</div>\n<div class="page-${md.utils.escapeHtml(layoutName)}">\n`;
        } else {
          token.content = `<div class="page-${md.utils.escapeHtml(layoutName)}">\n`;
          inLayout = true;
        }
        return true;

      case 'COVER_START':
        sectionStack.push('cover');
        token.content = '<div class="cover">\n';
        return true;

      case 'COVER_END':
        if (sectionStack.length > 0 && sectionStack[sectionStack.length - 1] === 'cover') {
          sectionStack.pop();
        }
        token.content = '</div>\n';
        return true;

      case 'INCLUDE':
        const includePath = attrs.path || attrs.src || '';
        if (includePath) {
          const escapedPath = md.utils.escapeHtml(includePath);
          token.content = `<div class="include-placeholder" data-path="${escapedPath}">[Include: ${escapedPath}]</div>\n`;
        }
        return true;

      case 'INDEX':
        const indexTerm = attrs.term || '';
        const sortKey = attrs.sort || indexTerm.toLowerCase();
        if (indexTerm) {
          // Inline marker - no newline to avoid breaking text flow
          token.content = `<span class="index-marker" data-term="${md.utils.escapeHtml(indexTerm)}" data-sort="${md.utils.escapeHtml(sortKey)}"></span>`;
        } else {
          // Placeholder for generated index
          token.content = `<div class="index-placeholder"></div>\n`;
        }
        return true;

      default:
        token.content = `<!-- Unknown directive: ${command} -->\n`;
        return true;
    }
  }

  /**
   * Try to match and process a directive from token content
   * @param {Object} token - Token to process
   * @returns {boolean} True if directive was found and processed
   */
  function tryProcessDirective(token) {
    const content = token.content.trim();
    // Match directive pattern: <!-- ::KEYWORD params -->
    // This regex requires the directive to be the ENTIRE content
    const directiveMatch = content.match(/^<!--\s*::([A-Z_]+)(?:\(([^)]*)\))?\s*(.*?)\s*-->$/);
    if (directiveMatch) {
      const command = directiveMatch[1];
      const parenParams = directiveMatch[2];
      const attrString = directiveMatch[3];
      const attrs = parseAttributes(attrString);
      return processDirective(token, command, parenParams, attrs);
    }
    return false;
  }

  /**
   * Replace inline INDEX markers within mixed content (e.g., list items)
   * Handles cases like: "<!-- ::INDEX term="foo" -->Text after"
   * @param {Object} token - Token to process
   * @returns {boolean} True if any replacements were made
   */
  function replaceInlineIndexMarkers(token) {
    const content = token.content;
    // Match INDEX markers that may be embedded in other content
    const indexRegex = /<!--\s*::INDEX\s+(.*?)\s*-->/g;

    if (!indexRegex.test(content)) {
      return false;
    }

    // Reset regex state
    indexRegex.lastIndex = 0;

    token.content = content.replace(indexRegex, (match, attrString) => {
      const attrs = parseAttributes(attrString);
      const term = attrs.term || '';
      if (term) {
        const sortKey = attrs.sort || term.toLowerCase();
        return `<span class="index-marker" data-term="${md.utils.escapeHtml(term)}" data-sort="${md.utils.escapeHtml(sortKey)}"></span>`;
      }
      // No term = placeholder (shouldn't happen inline, but handle gracefully)
      return '<div class="index-placeholder"></div>';
    });

    return true;
  }

  // Core rule to process directive comments
  // Use ruler.push() to run AFTER inline parsing (when children are populated)
  md.core.ruler.push('pagemd_directives', (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Process block-level HTML tokens
      if (token.type === 'html_block') {
        // First try full directive match (directive is entire content)
        if (!tryProcessDirective(token)) {
          // If not a full directive, check for embedded INDEX markers
          // (e.g., in list items: "<!-- ::INDEX term="x" -->Text after")
          replaceInlineIndexMarkers(token);
        }
      }

      // Process inline tokens (paragraphs, headings, etc.) for inline directives
      if (token.children && token.children.length > 0) {
        for (const child of token.children) {
          if (child.type === 'html_inline') {
            // First try full directive match
            if (!tryProcessDirective(child)) {
              // If not a full directive, check for embedded INDEX markers
              replaceInlineIndexMarkers(child);
            }
          }
        }
      }
    }

    return true;
  });
}

/**
 * Register directives plugin with markdown-it instance
 * @param {MarkdownIt} md - Markdown-it instance
 * @returns {MarkdownIt} Same instance for chaining
 */
export function registerDirectives(md) {
  md.use(directivesPlugin);
  return md;
}

export default directivesPlugin;
