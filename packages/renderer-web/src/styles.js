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
 * @typedef {Object} SplitCSSResult
 * @property {string} sharedCSS - Shared layers (base, primary, syntax) - same for all profiles
 * @property {string} profileCSS - Profile-specific layers (layout, profile) - varies per profile
 * @property {string} frontmatterCSS - Per-document CSS (kept separate for inlining)
 * @property {string} profileId - Profile ID for filename generation (e.g., 'alert' → 'styles-alert.css')
 * @property {Array<{layer: string, source: string, resolvedPath: string, size: number}>} resources - CSS resource metadata (when returnMetadata is true)
 */

/**
 * Layers that are shared across ALL profiles (identical content)
 * These are system-provided and don't vary by profile choice
 * @constant {string[]}
 */
const SHARED_LAYERS = ['base', 'primary', 'syntax'];

/**
 * Layers that are profile-specific (content varies by profile)
 * layout: @page rules, margins - varies by profile
 * profile: fonts, colors, visual styling - varies by profile
 * @constant {string[]}
 */
const PROFILE_LAYERS = ['layout', 'profile'];

/**
 * Build complete <style> block for injection into HTML templates
 * @param {object} profile - Profile manifest object
 * @param {object} context - Path resolution context from @pagemd/core
 * @param {object} [options={}] - Options
 * @param {boolean} [options.minify=false] - Minify CSS output
 * @param {string} [options.frontmatterCSS] - Optional frontmatter inline CSS
 * @param {boolean} [options.returnMetadata=false] - Return full result with metadata
 * @param {boolean|'split'} [options.extractCSS=false] - Extract CSS for external stylesheet:
 *   - false: Return inline <style> tags (default)
 *   - true: Return all CSS combined in externalCSS (single styles.css)
 *   - 'split': Return sharedCSS + profileCSS separately (multi-profile bundle support)
 * @param {boolean} [options.useCSSLayers=true] - Wrap CSS in @layer declarations. Set false for
 *   Paged.js PDF rendering which has bugs with CSS cascade layers.
 * @returns {Promise<string|StyleBlockResult|ExtractedCSSResult|SplitCSSResult>} HTML string, full result, or extracted CSS
 */
export async function buildStyleBlock(profile, context, options = {}) {
  const useCSSLayers = options.useCSSLayers !== false; // Default true

  logger.trace('styles', 'in-progress', 'Building style block', {
    profileId: profile?.id,
    minify: options.minify || false,
    hasFrontmatterCSS: !!options.frontmatterCSS,
    extractCSS: options.extractCSS || false,
    useCSSLayers
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

    // === SPLIT CSS MODE (multi-profile bundle support) ===
    // Separates shared layers (base, primary, syntax) from profile-specific (layout, profile)
    // This enables multiple profiles to coexist in same bundle with shared foundation
    if (options.extractCSS === 'split') {
      // Shared layers: identical across all profiles (system-provided)
      const sharedLayerOrder = '@layer base, primary, syntax;\n\n';
      let sharedCSS = sharedLayerOrder;

      // Profile layers: vary by profile (layout + profile visual styles)
      const profileLayerOrder = '@layer layout, profile;\n\n';
      let profileCSS = profileLayerOrder;

      for (const { layer, content } of aggregated) {
        const css = options.minify ? minifyCSS(content) : content;
        const wrappedCSS = `@layer ${layer} {\n${css}\n}\n\n`;

        if (SHARED_LAYERS.includes(layer)) {
          sharedCSS += wrappedCSS;
        } else if (PROFILE_LAYERS.includes(layer)) {
          profileCSS += wrappedCSS;
        }
        // frontmatter is handled separately below
      }

      // Frontmatter CSS stays separate (per-document, inlined in HTML)
      const frontmatterCSS = options.frontmatterCSS
        ? (options.minify ? minifyCSS(options.frontmatterCSS) : options.frontmatterCSS)
        : '';

      logger.info('styles', 'success', 'Extracted split CSS for multi-profile bundling', {
        profileId: profile?.id,
        sharedSize: sharedCSS.length,
        profileSize: profileCSS.length,
        frontmatterSize: frontmatterCSS.length
      });

      return {
        sharedCSS,             // styles-shared.css (base + primary + syntax)
        profileCSS,            // styles-{profileId}.css (layout + profile)
        frontmatterCSS,        // Per-document CSS (stays inlined)
        profileId: profile?.id || 'default',
        resources: options.returnMetadata ? resources : undefined
      };
    }

    // === EXTRACT CSS MODE (single profile) ===
    // Returns CSS content separated from HTML for external stylesheet bundling
    if (options.extractCSS === true) {
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
    //
    // When useCSSLayers is false (for Paged.js PDF), skip @layer wrappers entirely.
    // Paged.js 0.4.3 has bugs with CSS cascade layers that cause "item doesn't belong to list" errors.
    let styleBlock = useCSSLayers
      ? '<style>\n@layer base, primary, layout, syntax, profile;\n</style>\n'
      : '';

    for (const { layer, content } of aggregated) {
      const css = options.minify ? minifyCSS(content) : content;
      styleBlock += formatStyleTag(css, layer, useCSSLayers) + '\n';
    }

    // Add frontmatter layer if provided
    // Note: Resource tracking for frontmatter CSS is handled by the caller (renderDocument)
    // which has access to the actual file paths from loadFrontmatterStyles()
    if (options.frontmatterCSS) {
      const css = options.minify ? minifyCSS(options.frontmatterCSS) : options.frontmatterCSS;
      styleBlock += formatStyleTag(css, 'frontmatter', useCSSLayers) + '\n';
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
 * Wrap CSS in <style> tag with optional @layer declaration
 * @param {string} css - CSS content to wrap
 * @param {string} layer - Layer name (base, primary, layout, syntax, profile, frontmatter)
 * @param {boolean} [useCSSLayers=true] - Wrap in @layer declaration. False for Paged.js compatibility.
 * @returns {string} HTML <style> tag with optional @layer wrapper
 */
export function formatStyleTag(css, layer, useCSSLayers = true) {
  if (useCSSLayers) {
    return `<style data-layer="${layer}">
@layer ${layer} {
${css}
}
</style>`;
  }
  // No @layer wrapper - for Paged.js PDF compatibility
  return `<style data-layer="${layer}">
${css}
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
