/**
 * @pagemd/theme-kit
 * CSS layer management, font resolution, and style aggregation
 *
 * CSS Layer Order (priority low to high):
 * 1. base - CSS reset/normalize (project/styles/base.css)
 * 2. primary - project overrides (project/styles/primary.css)
 * 3. layout - Paged.js structure (@page rules, margins) - optional
 * 4. syntax - code block styling (project/styles/syntax/shiki-base.css)
 * 5. profile - visual styling (fonts, colors) from resources.css
 * 6. frontmatter - inline styles from frontmatter
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createLogger } from '@pagemd/core';
import { resolvePath, resolveResourcePath, resolveResource, expandTokens, DEFAULT_FILES, getEnv } from '@pagemd/core';

const logger = createLogger('assets');

/**
 * CSS Layer Order (priority low to high)
 * 1. base - CSS reset/normalize
 * 2. primary - project overrides
 * 3. layout - Paged.js structure (@page rules)
 * 4. syntax - code block styling (shiki)
 * 5. profile - visual styling (fonts, colors)
 * 6. frontmatter - document-specific overrides
 * @constant {string[]}
 */
export const CSS_LAYER_ORDER = ['base', 'primary', 'layout', 'syntax', 'profile', 'frontmatter'];

/**
 * @typedef {Object} StylesheetResult
 * @property {string} content - CSS file content
 * @property {string} resolvedPath - Full resolved absolute path
 * @property {number} size - File size in bytes
 */

/**
 * Load a system stylesheet directly from CLI bundle (no search)
 * System resources (base.css, primary.css, shiki-base.css) are bundled with the CLI
 * and should be loaded directly without searching user directories.
 *
 * @param {string} filename - System resource filename (e.g., 'base.css', 'shiki-base.css')
 * @param {string} cliPath - CLI bundle directory path
 * @param {string} [subdirectory=''] - Optional subdirectory within styles/ (e.g., 'syntax')
 * @returns {Promise<StylesheetResult>}
 * @throws {Error} If system resource is missing (indicates broken installation)
 */
async function loadSystemStylesheet(filename, cliPath, subdirectory = '') {
  logger.trace('stylesheet', 'in-progress', `Loading system stylesheet: ${filename}`);

  if (!cliPath) {
    throw new Error(`Cannot load system stylesheet ${filename}: cliPath not provided in context`);
  }

  try {
    // Construct direct path to bundled system resource (no search needed)
    const systemPath = subdirectory
      ? path.join(cliPath, 'styles', subdirectory, filename)
      : path.join(cliPath, 'styles', filename);

    const content = await fs.readFile(systemPath, 'utf-8');
    const stats = await fs.stat(systemPath);

    logger.debug('stylesheet', 'success', `Loaded system stylesheet (direct)`, {
      filename,
      resolved: systemPath,
      size: stats.size
    });

    return {
      content,
      resolvedPath: systemPath,
      size: stats.size
    };
  } catch (error) {
    logger.error('stylesheet', 'failure', `Failed to load system stylesheet: ${filename}`, {
      error: error.message,
      filename,
      cliPath
    });
    throw new Error(`System stylesheet not found: ${filename}. This indicates a broken installation. Please reinstall PageMD.`);
  }
}

/**
 * Load a stylesheet file
 * @param {string} cssPath - Path to CSS file (may contain tokens)
 * @param {object} context - Path resolution context from @pagemd/core
 * @param {string} [sourceType='profile'] - Source type: 'profile', 'frontmatter', or 'cli'
 * @returns {Promise<StylesheetResult>} CSS content with resolved path info
 * @throws {Error} If file not found or read fails
 */
export async function loadStylesheet(cssPath, context, sourceType = 'profile') {
  logger.trace('stylesheet', 'in-progress', `Loading stylesheet: ${cssPath}`);

  try {
    // First expand tokens in the CSS path
    const expanded = expandTokens(cssPath, context);
    logger.trace('stylesheet', 'info', `CSS path after token expansion: ${expanded}`);

    // Build resource resolution context
    const resourceContext = {
      workingPath: context.markdownDir,
      workspacePath: context.projectRoot || context.workspaceFolder,
      manifestPath: context.manifestDir,
      cliPath: context.cliPath,
      sourceType
    };

    const { resolvedPath } = resolveResource(expanded, 'styles', resourceContext);
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const stats = await fs.stat(resolvedPath);

    logger.debug('stylesheet', 'success', `Loaded stylesheet`, {
      cssPath,
      resolved: resolvedPath,
      size: stats.size
    });

    return {
      content,
      resolvedPath,
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
  // System resource: loaded directly from CLI bundle (no search)
  // ==========================================================================
  const basePath = DEFAULT_FILES.baseCSS;
  try {
    const baseResult = await loadSystemStylesheet(basePath, context.cliPath);
    styles.push({
      layer: 'base',
      content: baseResult.content,
      source: basePath,
      resolvedPath: baseResult.resolvedPath,
      size: baseResult.size
    });
    logger.debug('aggregate', 'info', 'Loaded base stylesheet (system)', { path: basePath });
  } catch (error) {
    // Base CSS is system-provided and REQUIRED - fail fast if missing
    logger.error('aggregate', 'failure', 'System base stylesheet not found', {
      path: basePath,
      error: error.message
    });
    throw new Error(`System base stylesheet not found: ${basePath}. This indicates a misconfigured or incomplete installation.`);
  }

  // ==========================================================================
  // Layer 2: Primary CSS (project overrides) - ALWAYS loaded
  // System resource: loaded directly from CLI bundle (no search)
  // ==========================================================================
  const primaryPath = DEFAULT_FILES.primaryCSS;
  try {
    const primaryResult = await loadSystemStylesheet(primaryPath, context.cliPath);
    styles.push({
      layer: 'primary',
      content: primaryResult.content,
      source: primaryPath,
      resolvedPath: primaryResult.resolvedPath,
      size: primaryResult.size
    });
    logger.debug('aggregate', 'info', 'Loaded primary stylesheet (system)', { path: primaryPath });
  } catch (error) {
    // Primary CSS is system-provided and REQUIRED - fail fast if missing
    logger.error('aggregate', 'failure', 'System primary stylesheet not found', {
      path: primaryPath,
      error: error.message
    });
    throw new Error(`System primary stylesheet not found: ${primaryPath}. This indicates a misconfigured or incomplete installation.`);
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
  // Layer 4: Syntax highlighting CSS (shiki base styles) - conditional
  // Only loaded if syntax highlighting is enabled (PAGEMD_SYNTAX_HIGHLIGHT != 0)
  // System resource: loaded directly from CLI bundle (no search)
  // ==========================================================================
  if (getEnv('syntaxHighlight') !== false) {
    const syntaxPath = DEFAULT_FILES.syntaxCSS;
    try {
      // shiki-base.css is in styles/syntax/ subdirectory
      const syntaxResult = await loadSystemStylesheet(syntaxPath, context.cliPath, 'syntax');
      styles.push({
        layer: 'syntax',
        content: syntaxResult.content,
        source: syntaxPath,
        resolvedPath: syntaxResult.resolvedPath,
        size: syntaxResult.size
      });
      logger.debug('aggregate', 'info', 'Loaded syntax stylesheet (system)', { path: syntaxPath });
    } catch (error) {
      // Syntax CSS is system-provided and REQUIRED when highlighting is enabled - fail fast if missing
      logger.error('aggregate', 'failure', 'System syntax stylesheet not found', {
        path: syntaxPath,
        error: error.message
      });
      throw new Error(`System syntax stylesheet not found: ${syntaxPath}. This indicates a misconfigured or incomplete installation.`);
    }
  }

  // ==========================================================================
  // Layer 5: Profile-specific styles
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

  // Layer 6: Frontmatter inline styles (added by caller if present)
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
