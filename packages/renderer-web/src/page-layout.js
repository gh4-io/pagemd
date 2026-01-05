/**
 * @pagemd/renderer-web/page-layout
 * Generates CSS for page layout features (headers, footers, page numbers)
 *
 * TOKENS (use in any header/footer position):
 * - :::PAGE  → current page number
 * - :::PAGES → total page count
 *
 * POSITIONS:
 * - left, center, right: Fixed positions
 * - inside, outside: Book binding positions (auto-flip on left/right pages)
 *   - inside = binding/gutter side
 *   - outside = edge side
 * - span: Full width centered (clears left/right)
 *
 * FRONTMATTER OPTIONS:
 * - running_header: string | { left?, center?, right?, inside?, outside?, span? }
 * - running_footer: string | { left?, center?, right?, inside?, outside?, span? }
 * - page_numbers: boolean | string (shorthand for common footer patterns)
 * - first_page: false | { header?, footer? } (first page customization)
 * - page_margin_font_size: string (default: 9pt)
 *
 * EXAMPLES:
 *   # Book layout with page numbers on outside edge
 *   running_footer:
 *     outside: ":::PAGE"
 *     inside: "Chapter Title"
 *
 *   # Suppress header/footer on first page
 *   first_page: false
 *
 *   # Custom first page
 *   first_page:
 *     header: false
 *     footer: { center: "Title Page" }
 */

import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.web');

/**
 * Token replacements for CSS content property
 */
const TOKENS = {
  ':::PAGE': 'counter(page)',
  ':::PAGES': 'counter(pages)'
};

/**
 * Valid position keys for header/footer
 */
const VALID_POSITIONS = ['left', 'center', 'right', 'inside', 'outside', 'span'];

/**
 * page_numbers shorthand presets
 * These expand to running_footer configurations
 */
const PAGE_NUMBER_PRESETS = {
  'true': { center: ':::PAGE of :::PAGES' },
  'page': { center: ':::PAGE' },
  'X of Y': { center: ':::PAGE of :::PAGES' },
  'Page X': { center: 'Page :::PAGE' },
  'Page X of Y': { center: 'Page :::PAGE of :::PAGES' },
  '- X -': { center: '- :::PAGE -' }
};

/**
 * Generate CSS for page layout features based on metadata
 * @param {Object} metadata - Document metadata (frontmatter merged with profile defaults)
 * @returns {string} CSS string with custom property declarations
 */
export function generatePageLayoutCSS(metadata) {
  if (!metadata) {
    return '';
  }

  const cssVars = [];

  // Process running header
  if (metadata.running_header) {
    const headerVars = parseRunningContent(metadata.running_header, 'header');
    cssVars.push(...headerVars);
    if (headerVars.length > 0) {
      logger.debug('page-layout', 'success', 'Running header enabled', {
        positions: headerVars.length
      });
    }
  }

  // Process running footer (merge with page_numbers shorthand)
  const footerConfig = mergeFooterConfig(metadata.running_footer, metadata.page_numbers);
  if (footerConfig) {
    const footerVars = parseRunningContent(footerConfig, 'footer');
    cssVars.push(...footerVars);
    if (footerVars.length > 0) {
      logger.debug('page-layout', 'success', 'Running footer enabled', {
        positions: footerVars.length
      });
    }
  }

  // Process first page settings
  if (metadata.first_page !== undefined) {
    const firstPageVars = parseFirstPage(metadata.first_page);
    cssVars.push(...firstPageVars);
    if (firstPageVars.length > 0) {
      logger.debug('page-layout', 'success', 'First page customization enabled', {
        vars: firstPageVars.length
      });
    }
  }

  // Process font size override
  if (metadata.page_margin_font_size) {
    cssVars.push(`  --page-margin-font-size: ${metadata.page_margin_font_size};`);
  }

  // Return empty if nothing to generate
  if (cssVars.length === 0) {
    return '';
  }

  // Wrap in :root selector
  return `:root {\n${cssVars.join('\n')}\n}`;
}

/**
 * Parse first_page config into CSS variable declarations
 * @param {boolean|Object} config - First page configuration
 * @returns {string[]} Array of CSS variable declarations
 */
function parseFirstPage(config) {
  const vars = [];

  // first_page: false - suppress all header/footer on first page
  if (config === false) {
    vars.push(`  --page-first-header-left: none;`);
    vars.push(`  --page-first-header-center: none;`);
    vars.push(`  --page-first-header-right: none;`);
    vars.push(`  --page-first-footer-left: none;`);
    vars.push(`  --page-first-footer-center: none;`);
    vars.push(`  --page-first-footer-right: none;`);
    return vars;
  }

  // first_page: { header: ..., footer: ... }
  if (typeof config === 'object') {
    // Process header
    if (config.header === false) {
      vars.push(`  --page-first-header-left: none;`);
      vars.push(`  --page-first-header-center: none;`);
      vars.push(`  --page-first-header-right: none;`);
    } else if (config.header) {
      const headerVars = parseRunningContent(config.header, 'first-header');
      vars.push(...headerVars);
    }

    // Process footer
    if (config.footer === false) {
      vars.push(`  --page-first-footer-left: none;`);
      vars.push(`  --page-first-footer-center: none;`);
      vars.push(`  --page-first-footer-right: none;`);
    } else if (config.footer) {
      const footerVars = parseRunningContent(config.footer, 'first-footer');
      vars.push(...footerVars);
    }
  }

  return vars;
}

/**
 * Merge running_footer config with page_numbers shorthand
 * page_numbers is syntactic sugar for common footer patterns
 * @param {string|Object} footerConfig - Explicit footer config
 * @param {boolean|string|Object} pageNumbers - page_numbers shorthand
 * @returns {Object|null} Merged footer configuration
 */
function mergeFooterConfig(footerConfig, pageNumbers) {
  // Start with page_numbers preset if provided
  let baseConfig = null;

  if (pageNumbers && pageNumbers !== false) {
    if (pageNumbers === true) {
      baseConfig = { ...PAGE_NUMBER_PRESETS['true'] };
    } else if (typeof pageNumbers === 'string' && PAGE_NUMBER_PRESETS[pageNumbers]) {
      baseConfig = { ...PAGE_NUMBER_PRESETS[pageNumbers] };
    } else if (typeof pageNumbers === 'object') {
      // Object form: { position: "outside" } etc.
      const position = pageNumbers.position || 'center';
      const format = pageNumbers.format || ':::PAGE of :::PAGES';
      baseConfig = { [position]: format };
    }
  }

  // If no footer config, return page_numbers config (or null)
  if (!footerConfig || footerConfig === false) {
    return baseConfig;
  }

  // Normalize string to object
  const normalizedFooter = typeof footerConfig === 'string'
    ? { center: footerConfig }
    : footerConfig;

  // Merge: explicit footer config overrides page_numbers defaults
  if (baseConfig) {
    return { ...baseConfig, ...normalizedFooter };
  }

  return normalizedFooter;
}

/**
 * Parse running header/footer config into CSS variable declarations
 * @param {string|Object} config - Header/footer configuration
 * @param {string} type - 'header', 'footer', 'first-header', or 'first-footer'
 * @returns {string[]} Array of CSS variable declarations
 */
function parseRunningContent(config, type) {
  const vars = [];

  if (!config || config === false) {
    return vars;
  }

  // String: place in center position
  if (typeof config === 'string') {
    const cssContent = tokensToCSSContent(config);
    vars.push(`  --page-${type}-center: ${cssContent};`);
    return vars;
  }

  // Object: { left, center, right, inside, outside, span }
  if (typeof config === 'object') {
    // span takes precedence - sets center and clears left/right
    if (config.span) {
      const cssContent = tokensToCSSContent(config.span);
      vars.push(`  --page-${type}-left: none;`);
      vars.push(`  --page-${type}-center: ${cssContent};`);
      vars.push(`  --page-${type}-right: none;`);
      return vars;
    }

    // Process each position
    for (const pos of VALID_POSITIONS) {
      if (pos === 'span') continue; // Already handled above
      if (config[pos]) {
        const cssContent = tokensToCSSContent(config[pos]);
        vars.push(`  --page-${type}-${pos}: ${cssContent};`);
      }
    }
  }

  return vars;
}

/**
 * Convert text with :::PAGE/:::PAGES tokens to CSS content property value
 *
 * Input:  "Page :::PAGE of :::PAGES"
 * Output: "Page " counter(page) " of " counter(pages)
 *
 * @param {string} text - Text with optional tokens
 * @returns {string} CSS content property value
 */
function tokensToCSSContent(text) {
  if (!text) return 'none';

  // Check if text contains any tokens
  const hasTokens = Object.keys(TOKENS).some(token => text.includes(token));

  if (!hasTokens) {
    // No tokens - simple quoted string
    return `"${escapeCSS(text)}"`;
  }

  // Split by tokens and rebuild as CSS content
  // Regex to match tokens while preserving them in split
  const tokenPattern = /(:::PAGE[S]?)/g;
  const parts = text.split(tokenPattern);

  const cssparts = parts
    .filter(part => part !== '')
    .map(part => {
      if (TOKENS[part]) {
        return TOKENS[part];
      }
      // Escape and quote text parts
      const escaped = escapeCSS(part);
      return escaped ? `"${escaped}"` : null;
    })
    .filter(Boolean);

  return cssparts.join(' ');
}

/**
 * Escape string for CSS content property
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeCSS(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\A ');
}

// Export for testing
export { tokensToCSSContent, mergeFooterConfig, parseFirstPage };
