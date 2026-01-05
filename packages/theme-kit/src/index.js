/**
 * @pagemd/theme-kit
 * CSS layer management, font resolution, and style aggregation
 *
 * CSS Layer Order (priority low to high):
 * 1. base - CSS reset/normalize
 * 2. primary - project/styles/primary.css
 * 3. profile - profile-specific CSS
 * 4. frontmatter - inline styles from frontmatter
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@pagemd/core';
import { resolvePath, resolveResourcePath, expandTokens } from '@pagemd/core';

const logger = createLogger('assets');

/**
 * CSS Layer Order (priority low to high)
 * @constant {string[]}
 */
export const CSS_LAYER_ORDER = ['base', 'primary', 'profile', 'frontmatter'];

/**
 * Load a stylesheet file
 * @param {string} cssPath - Path to CSS file (may contain tokens)
 * @param {object} context - Path resolution context from @pagemd/core
 * @returns {Promise<string>} CSS file content
 * @throws {Error} If file not found or read fails
 */
export async function loadStylesheet(cssPath, context) {
  logger.trace('stylesheet', 'in-progress', `Loading stylesheet: ${cssPath}`);

  try {
    // Resolve path with token expansion and priority search
    const resolved = path.isAbsolute(cssPath)
      ? resolvePath(cssPath, context)
      : resolveResourcePath(cssPath, context);

    const content = await fs.readFile(resolved, 'utf-8');

    logger.debug('stylesheet', 'success', `Loaded stylesheet`, {
      cssPath,
      resolved,
      size: content.length
    });

    return content;
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
 * @param {object} profile - Profile manifest object
 * @param {object} context - Path resolution context from @pagemd/core
 * @returns {Promise<Array<{layer: string, content: string, source: string}>>}
 */
export async function aggregateStyles(profile, context) {
  logger.trace('aggregate', 'in-progress', 'Aggregating styles for profile', {
    profileId: profile?.id
  });

  const styles = [];

  // Layer 1: Base styles (CSS reset/normalize)
  if (profile?.styles?.base) {
    try {
      const baseContent = await loadStylesheet(profile.styles.base, context);
      styles.push({
        layer: 'base',
        content: baseContent,
        source: profile.styles.base
      });
    } catch (error) {
      logger.warn('aggregate', 'failure', 'Base stylesheet not found, skipping', {
        path: profile.styles.base
      });
    }
  }

  // Layer 2: Primary styles (project/styles/primary.css)
  const primaryPath = 'project/styles/primary.css';
  try {
    const primaryContent = await loadStylesheet(primaryPath, context);
    styles.push({
      layer: 'primary',
      content: primaryContent,
      source: primaryPath
    });
  } catch (error) {
    logger.warn('aggregate', 'failure', 'Primary stylesheet not found, skipping', {
      path: primaryPath
    });
  }

  // Layer 3: Profile-specific styles
  if (profile?.styles?.profile) {
    const profileStyles = Array.isArray(profile.styles.profile)
      ? profile.styles.profile
      : [profile.styles.profile];

    for (const profilePath of profileStyles) {
      try {
        const profileContent = await loadStylesheet(profilePath, context);
        styles.push({
          layer: 'profile',
          content: profileContent,
          source: profilePath
        });
      } catch (error) {
        logger.error('aggregate', 'failure', `Profile stylesheet required but not found: ${profilePath}`, {
          profilePath
        });
        throw error;
      }
    }
  }

  // Layer 4: Frontmatter inline styles (added by caller if present)
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
