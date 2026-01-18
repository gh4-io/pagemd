/**
 * @pagemd/renderer-web/styles
 * CSS injection module for HTML template assembly
 *
 * CSS Layer Order (from theme-kit):
 * 1. base - CSS reset/normalize (inline)
 * 2. primary - project/styles/primary.css
 * 3. profile - Profile-specific CSS from profile manifest
 * 4. frontmatter - Inline styles from frontmatter (if any)
 */

import { aggregateStyles } from '@pagemd/theme-kit';
import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.web');

/**
 * @typedef {Object} StyleBlockResult
 * @property {string} styleBlock - HTML string with <style> tags
 * @property {Array<{layer: string, source: string, resolvedPath: string, size: number}>} resources - CSS resource metadata
 */

/**
 * @typedef {Object} ExtractedCSSResult
 * @property {string} inlineStyles - Empty string (critical CSS for future optimization)
 * @property {string} externalCSS - All shared layers combined with @layer declarations
 * @property {string} frontmatterCSS - Per-document CSS (kept separate for inlining)
 * @property {Array<{layer: string, source: string, resolvedPath: string, size: number}>} resources - CSS resource metadata (when returnMetadata is true)
 */

/**
 * Build complete <style> block for injection into HTML templates
 * @param {object} profile - Profile manifest object
 * @param {object} context - Path resolution context from @pagemd/core
 * @param {object} [options={}] - Options
 * @param {boolean} [options.minify=false] - Minify CSS output
 * @param {string} [options.frontmatterCSS] - Optional frontmatter inline CSS
 * @param {boolean} [options.returnMetadata=false] - Return full result with metadata
 * @param {boolean} [options.extractCSS=false] - Extract CSS for external stylesheet instead of inline <style> tags
 * @returns {Promise<string|StyleBlockResult|ExtractedCSSResult>} HTML string, full result, or extracted CSS
 */
export async function buildStyleBlock(profile, context, options = {}) {
  logger.trace('styles', 'in-progress', 'Building style block', {
    profileId: profile?.id,
    minify: options.minify || false,
    hasFrontmatterCSS: !!options.frontmatterCSS,
    extractCSS: options.extractCSS || false
  });

  try {
    // Aggregate styles from theme-kit (base, primary, profile layers)
    const aggregated = await aggregateStyles(profile, context);
    const resources = [];

    // Collect resource metadata
    for (const { layer, source, resolvedPath, size } of aggregated) {
      if (resolvedPath) {
        resources.push({
          layer,
          source: source || resolvedPath,
          resolvedPath,
          size: size || 0
        });
      }
    }

    // === EXTRACT CSS MODE ===
    // Returns CSS content separated from HTML for external stylesheet bundling
    if (options.extractCSS) {
      // Build external CSS: layer declaration + all layers combined
      const layerOrder = '@layer base, primary, layout, syntax, profile;\n\n';
      let externalCSS = layerOrder;

      for (const { layer, content } of aggregated) {
        const css = options.minify ? minifyCSS(content) : content;
        externalCSS += `@layer ${layer} {\n${css}\n}\n\n`;
      }

      // Frontmatter CSS stays separate (per-document, inlined in HTML)
      const frontmatterCSS = options.frontmatterCSS
        ? (options.minify ? minifyCSS(options.frontmatterCSS) : options.frontmatterCSS)
        : '';

      logger.info('styles', 'success', 'Extracted CSS for bundling', {
        profileId: profile?.id,
        layers: aggregated.length,
        externalSize: externalCSS.length,
        frontmatterSize: frontmatterCSS.length
      });

      return {
        inlineStyles: '',      // Future: critical CSS optimization
        externalCSS,           // Combined layers for styles.css
        frontmatterCSS,        // Per-document CSS (stays inlined)
        resources: options.returnMetadata ? resources : undefined
      };
    }

    // === INLINE STYLE MODE (default) ===
    // Declare CSS layer order upfront (priority: low to high)
    // This ensures our layers override any unlayered styles (like VS Code defaults)
    // NOTE: frontmatter is intentionally NOT declared - undeclared layers have highest priority
    let styleBlock = '<style>\n@layer base, primary, layout, syntax, profile;\n</style>\n';

    for (const { layer, content } of aggregated) {
      const css = options.minify ? minifyCSS(content) : content;
      styleBlock += formatStyleTag(css, layer) + '\n';
    }

    // Add frontmatter layer if provided
    // Note: Resource tracking for frontmatter CSS is handled by the caller (renderDocument)
    // which has access to the actual file paths from loadFrontmatterStyles()
    if (options.frontmatterCSS) {
      const css = options.minify ? minifyCSS(options.frontmatterCSS) : options.frontmatterCSS;
      styleBlock += formatStyleTag(css, 'frontmatter') + '\n';
    }

    logger.info('styles', 'success', 'Built style block', {
      profileId: profile?.id,
      layers: aggregated.length + (options.frontmatterCSS ? 1 : 0),
      size: styleBlock.length
    });

    // Return metadata if requested (for debug mode)
    if (options.returnMetadata) {
      return { styleBlock, resources };
    }

    return styleBlock;
  } catch (error) {
    logger.error('styles', 'failure', 'Failed to build style block', {
      profileId: profile?.id,
      error: error.message
    });
    throw error;
  }
}

/**
 * Wrap CSS in <style> tag with proper @layer declaration
 * @param {string} css - CSS content to wrap
 * @param {string} layer - Layer name (base, primary, layout, syntax, profile, frontmatter)
 * @returns {string} HTML <style> tag with @layer wrapper
 */
export function formatStyleTag(css, layer) {
  return `<style data-layer="${layer}">
@layer ${layer} {
${css}
}
</style>`;
}

/**
 * Basic CSS minification for production
 * Removes comments, extra whitespace, and normalizes
 * @param {string} css - CSS to minify
 * @returns {string} Minified CSS
 */
export function minifyCSS(css) {
  if (!css) return '';

  return css
    // Remove CSS comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove leading/trailing whitespace per line
    .replace(/^\s+|\s+$/gm, '')
    // Collapse multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Remove space around braces, colons, semicolons
    .replace(/\s*([{}:;,])\s*/g, '$1')
    // Remove trailing semicolons before closing brace
    .replace(/;}/g, '}')
    // Trim final result
    .trim();
}

/**
 * Inject styles into HTML by replacing {{css}} token
 * @param {string} html - HTML template containing {{css}} token
 * @param {string} styles - Style block to inject (from buildStyleBlock)
 * @returns {string} HTML with styles injected
 */
export function inlineStyles(html, styles) {
  logger.trace('styles', 'in-progress', 'Injecting styles into HTML', {
    htmlSize: html?.length,
    stylesSize: styles?.length
  });

  if (!html) {
    logger.warn('styles', 'failure', 'No HTML provided for style injection');
    return '';
  }

  if (!styles) {
    logger.warn('styles', 'failure', 'No styles provided, removing {{css}} token');
    return html.replace(/\{\{css\}\}/g, '<!-- No styles provided -->');
  }

  const result = html.replace(/\{\{css\}\}/g, styles);

  logger.debug('styles', 'success', 'Injected styles into HTML', {
    htmlSize: result.length,
    tokenReplaced: html.includes('{{css}}')
  });

  return result;
}
