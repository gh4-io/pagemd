/**
 * @pagemd/theme-kit
 * CSS layer management, font resolution, and style aggregation
 *
 * CSS Layer Order (priority low to high):
 * 1. base - CSS reset/normalize (project/styles/base.css)
 * 2. primary - project overrides (project/styles/primary.css)
 * 3. layout - Paged.js structure (@page rules, margins) - optional
 * 4. profile - visual styling (fonts, colors) from resources.css
 * 5. frontmatter - inline styles from frontmatter
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@pagemd/core';
import { resolvePath, resolveResourcePath, expandTokens, DEFAULT_FILES } from '@pagemd/core';

const logger = createLogger('assets');

/**
 * CSS Layer Order (priority low to high)
 * @constant {string[]}
 */
export const CSS_LAYER_ORDER = ['base', 'primary', 'layout', 'profile', 'frontmatter'];

/**
 * @typedef {Object} StylesheetResult
 * @property {string} content - CSS file content
 * @property {string} resolvedPath - Full resolved absolute path
 * @property {number} size - File size in bytes
 */

/**
 * Load a stylesheet file
 * @param {string} cssPath - Path to CSS file (may contain tokens)
 * @param {object} context - Path resolution context from @pagemd/core
 * @returns {Promise<StylesheetResult>} CSS content with resolved path info
 * @throws {Error} If file not found or read fails
 */
export async function loadStylesheet(cssPath, context) {
  logger.trace('stylesheet', 'in-progress', `Loading stylesheet: ${cssPath}`);

  try {
    // Expand tokens first (e.g., ${projectRoot}, ${manifestDir})
    const expanded = expandTokens(cssPath, context);

    // Resolve path with priority search
    const resolved = path.isAbsolute(expanded)
      ? resolvePath(expanded, context)
      : resolveResourcePath(expanded, context);

    const content = await fs.readFile(resolved, 'utf-8');
    const stats = await fs.stat(resolved);

    logger.debug('stylesheet', 'success', `Loaded stylesheet`, {
      cssPath,
      resolved,
      size: stats.size
    });

    return {
      content,
      resolvedPath: resolved,
      size: stats.size
    };
  } catch (error) {
    logger.error('stylesheet', 'failure', `Failed to load stylesheet: ${cssPath}`, {
      error: error.message,
      cssPath
    });
    throw error;
  }
}

/**
 * Aggregate all CSS for a profile in correct layer order
 * Supports both legacy (styles.profile) and modern (resources.css) structures
 *
 * @param {object} profile - Profile manifest object
 * @param {object} context - Path resolution context from @pagemd/core
 * @returns {Promise<Array<{layer: string, content: string, source: string, resolvedPath: string, size: number}>>}
 * @throws {Error} If referenced CSS resources are missing (hard-fail per spec)
 */
export async function aggregateStyles(profile, context) {
  logger.trace('aggregate', 'in-progress', 'Aggregating styles for profile', {
    profileId: profile?.id
  });

  const styles = [];

  // ==========================================================================
  // Layer 1: Base CSS (engine-provided markdown defaults) - ALWAYS loaded
  // ==========================================================================
  const basePath = DEFAULT_FILES.baseCSS;
  try {
    const baseResult = await loadStylesheet(basePath, context);
    styles.push({
      layer: 'base',
      content: baseResult.content,
      source: basePath,
      resolvedPath: baseResult.resolvedPath,
      size: baseResult.size
    });
    logger.debug('aggregate', 'info', 'Loaded base stylesheet', { path: basePath });
  } catch (error) {
    // Base CSS is engine-provided; warn but continue if missing
    logger.warn('aggregate', 'warning', 'Base stylesheet not found, continuing', {
      path: basePath
    });
  }

  // ==========================================================================
  // Layer 2: Primary CSS (project overrides) - ALWAYS loaded
  // ==========================================================================
  const primaryPath = DEFAULT_FILES.primaryCSS;
  try {
    const primaryResult = await loadStylesheet(primaryPath, context);
    styles.push({
      layer: 'primary',
      content: primaryResult.content,
      source: primaryPath,
      resolvedPath: primaryResult.resolvedPath,
      size: primaryResult.size
    });
    logger.debug('aggregate', 'info', 'Loaded primary stylesheet', { path: primaryPath });
  } catch (error) {
    // Primary CSS is optional; warn but continue if missing
    logger.warn('aggregate', 'warning', 'Primary stylesheet not found, continuing', {
      path: primaryPath
    });
  }

  // ==========================================================================
  // Layer 3: Layout CSS (Paged.js structure) - optional
  // Primary: resources.layout, Fallback: layout.css (backward compatibility)
  // ==========================================================================
  const layoutCssPath = profile?.resources?.layout || profile?.layout?.css;
  if (layoutCssPath) {
    logger.debug('aggregate', 'info', 'Loading layout CSS', {
      cssPath: layoutCssPath
    });

    try {
      const layoutResult = await loadStylesheet(layoutCssPath, context);
      styles.push({
        layer: 'layout',
        content: layoutResult.content,
        source: layoutCssPath,
        resolvedPath: layoutResult.resolvedPath,
        size: layoutResult.size
      });
      logger.debug('aggregate', 'info', 'Loaded layout stylesheet', {
        path: layoutCssPath
      });
    } catch (error) {
      // Layout CSS is specified but missing - hard fail per spec
      logger.error('aggregate', 'failure', `Layout stylesheet not found: ${layoutCssPath}`, {
        cssPath: layoutCssPath,
        profileId: profile?.id
      });
      throw new Error(`Missing layout CSS: ${layoutCssPath}`);
    }
  }

  // ==========================================================================
  // Layer 4: Profile-specific styles
  // Supports both modern (resources.css[]) and legacy (styles.profile) structures
  // ==========================================================================
  const hasResourcesCss = Array.isArray(profile?.resources?.css) && profile.resources.css.length > 0;
  const hasLegacyStyles = profile?.styles?.profile;

  if (hasResourcesCss) {
    // Modern structure: resources.css[] contains profile-specific CSS
    // Skip entries that match base.css or primary.css (already loaded)
    logger.debug('aggregate', 'info', 'Loading profile styles from resources.css', {
      cssCount: profile.resources.css.length
    });

    for (const cssPath of profile.resources.css) {
      // Skip if this is base.css or primary.css (already loaded in layers 1-2)
      if (cssPath.endsWith('/base.css') || cssPath.endsWith('/primary.css') ||
          cssPath === DEFAULT_FILES.baseCSS || cssPath === DEFAULT_FILES.primaryCSS) {
        logger.debug('aggregate', 'skip', 'Skipping already-loaded stylesheet', { cssPath });
        continue;
      }

      try {
        const result = await loadStylesheet(cssPath, context);
        styles.push({
          layer: 'profile',
          content: result.content,
          source: cssPath,
          resolvedPath: result.resolvedPath,
          size: result.size
        });
      } catch (error) {
        // Hard-fail on missing referenced resources (per PROJECT_BRIEF.md spec)
        logger.error('aggregate', 'failure', `Referenced CSS resource not found: ${cssPath}`, {
          cssPath,
          profileId: profile?.id
        });
        throw new Error(`Missing referenced CSS resource: ${cssPath}`);
      }
    }
  } else if (hasLegacyStyles) {
    // Legacy structure: styles.profile
    logger.debug('aggregate', 'info', 'Loading profile styles from styles.profile');

    const profileStyles = Array.isArray(profile.styles.profile)
      ? profile.styles.profile
      : [profile.styles.profile];

    for (const profilePath of profileStyles) {
      try {
        const result = await loadStylesheet(profilePath, context);
        styles.push({
          layer: 'profile',
          content: result.content,
          source: profilePath,
          resolvedPath: result.resolvedPath,
          size: result.size
        });
      } catch (error) {
        // Hard-fail on missing referenced resources
        logger.error('aggregate', 'failure', `Referenced profile stylesheet not found: ${profilePath}`);
        throw new Error(`Missing referenced profile stylesheet: ${profilePath}`);
      }
    }
  }

  // Layer 5: Frontmatter inline styles (added by caller if present)
  // Frontmatter styles are typically added separately by the renderer

  logger.info('aggregate', 'success', `Aggregated ${styles.length} stylesheets`, {
    profileId: profile?.id,
    layers: styles.map(s => s.layer)
  });

  return styles;
}

/**
 * Resolve font file path
 * @param {string} fontPath - Path to font file (may contain tokens)
 * @param {object} context - Path resolution context from @pagemd/core
 * @returns {string} Resolved absolute path to font file
 * @throws {Error} If font file not found
 */
export function resolveFontPath(fontPath, context) {
  logger.trace('font', 'in-progress', `Resolving font: ${fontPath}`);

  try {
    const resolved = path.isAbsolute(fontPath)
      ? resolvePath(fontPath, context)
      : resolveResourcePath(fontPath, context);

    logger.debug('font', 'success', 'Resolved font path', {
      fontPath,
      resolved
    });

    return resolved;
  } catch (error) {
    logger.error('font', 'failure', `Failed to resolve font: ${fontPath}`, {
      error: error.message,
      fontPath
    });
    throw error;
  }
}

/**
 * Resolve asset file path (images, icons, etc.)
 * @param {string} assetPath - Path to asset file (may contain tokens)
 * @param {object} context - Path resolution context from @pagemd/core
 * @returns {string} Resolved absolute path to asset file
 * @throws {Error} If asset file not found
 */
export function resolveAssetPath(assetPath, context) {
  logger.trace('asset', 'in-progress', `Resolving asset: ${assetPath}`);

  try {
    const resolved = path.isAbsolute(assetPath)
      ? resolvePath(assetPath, context)
      : resolveResourcePath(assetPath, context);

    logger.debug('asset', 'success', 'Resolved asset path', {
      assetPath,
      resolved
    });

    return resolved;
  } catch (error) {
    logger.error('asset', 'failure', `Failed to resolve asset: ${assetPath}`, {
      error: error.message,
      assetPath
    });
    throw error;
  }
}
