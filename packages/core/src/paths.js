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
 * @constant {Object}
 */
export const DEFAULT_FILES = {
  baseCSS: 'styles/base.css',
  primaryCSS: 'styles/primary.css',
  syntaxCSS: 'styles/syntax/shiki-base.css',
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
