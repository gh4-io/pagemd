/**
 * @pagemd/core/paths
 * Centralized path configuration for PageMD resources
 *
 * Change these constants to restructure folders without touching other code.
 * All path references throughout the codebase use these instead of hardcoded strings.
 */

/**
 * Resource directory paths (relative to project root)
 * @constant {Object}
 */
export const RESOURCE_PATHS = {
  styles: 'styles',           // project/styles/
  layouts: 'layouts',         // project/layouts/
  templates: 'templates',     // project/templates/
  profiles: 'profiles',       // project/profiles/
};

/**
 * Default file paths for base resources
 *
 * IMPORTANT: These paths should NOT include subdirectory prefixes like 'styles/' or 'styles/syntax/'.
 * The path resolver's buildSearchPaths() already adds these prefixes when constructing search paths.
 * Including them here would result in doubled paths like 'bin/styles/styles/base.css' which don't exist.
 *
 * Subdirectory search (e.g., 'syntax/' within 'styles/') is handled automatically via RESOURCE_SUBDIRS.
 *
 * @constant {Object}
 */
export const DEFAULT_FILES = {
  baseCSS: 'base.css',        // Searched in: styles/base.css
  primaryCSS: 'primary.css',  // Searched in: styles/primary.css
  syntaxCSS: 'shiki-base.css', // Searched in: styles/syntax/shiki-base.css (via subdirs)
};

/**
 * Get the full path for a resource type and filename
 * @param {string} type - Resource type (styles, layouts, templates, profiles)
 * @param {string} filename - Filename within that resource directory
 * @returns {string} Combined path
 */
export function getResourcePath(type, filename) {
  const basePath = RESOURCE_PATHS[type];
  if (!basePath) {
    throw new Error(`Unknown resource type: ${type}`);
  }
  return `${basePath}/${filename}`;
}
