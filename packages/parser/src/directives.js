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

  // Reset state on each render
  const originalRender = md.render.bind(md);
  md.render = function (...args) {
    sectionStack = [];
    return originalRender(...args);
  };

  // Core rule to process directive comments
  md.core.ruler.after('block', 'pagemd_directives', (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Look for HTML block tokens containing directives
      if (token.type === 'html_block' || token.type === 'html_inline') {
        const content = token.content.trim();

        // Match directive pattern: <!-- ::KEYWORD params -->
        const directiveMatch = content.match(/^<!--\s*::([A-Z_]+)(?:\(([^)]*)\))?\s*(.*?)\s*-->$/);

        if (directiveMatch) {
          const command = directiveMatch[1];
          const parenParams = directiveMatch[2]; // For LAYOUT(name) syntax
          const attrString = directiveMatch[3];
          const attrs = parseAttributes(attrString);

          // Transform token based on directive type
          switch (command) {
            case 'PAGEBREAK':
              token.content = '<div class="break-page"></div>\n';
              break;

            case 'TOC':
              const levels = attrs.levels || '3';
              token.content = `<div class="toc-placeholder" data-levels="${md.utils.escapeHtml(levels)}"></div>\n`;
              break;

            case 'SECTION_START':
              const className = attrs.class || '';
              const sectionId = attrs.id || '';
              sectionStack.push('section');
              let sectionAttrs = '';
              // Escape id and class to prevent XSS
              if (sectionId) sectionAttrs += ` id="${md.utils.escapeHtml(sectionId)}"`;
              if (className) sectionAttrs += ` class="${md.utils.escapeHtml(className)}"`;
              token.content = `<div${sectionAttrs}>\n`;
              break;

            case 'SECTION_END':
              if (sectionStack.length > 0) {
                sectionStack.pop();
              }
              token.content = '</div>\n';
              break;

            case 'LAYOUT':
              // LAYOUT(name) or LAYOUT name="..." syntax
              const layoutName = parenParams || attrs.name || 'default';
              // Close previous section and open new one with page class
              token.content = `</div>\n<div class="page-${md.utils.escapeHtml(layoutName)}">\n`;
              break;

            case 'COVER_START':
              sectionStack.push('cover');
              token.content = '<div class="cover">\n';
              break;

            case 'COVER_END':
              if (sectionStack.length > 0 && sectionStack[sectionStack.length - 1] === 'cover') {
                sectionStack.pop();
              }
              token.content = '</div>\n';
              break;

            case 'INCLUDE':
              // INCLUDE is handled by markdown-it-include plugin
              // This is a fallback that outputs a placeholder if include plugin not loaded
              const includePath = attrs.path || attrs.src || '';
              if (includePath) {
                // If markdown-it-include is configured, this won't be reached
                // Otherwise, output a visible placeholder
                const escapedPath = md.utils.escapeHtml(includePath);
                token.content = `<div class="include-placeholder" data-path="${escapedPath}">[Include: ${escapedPath}]</div>\n`;
              }
              break;

            default:
              // Unknown directive - leave as comment for debugging
              token.content = `<!-- Unknown directive: ${command} -->\n`;
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
