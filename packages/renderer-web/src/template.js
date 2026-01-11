/**
 * Template loader and renderer
 * Handles HTML template loading and token replacement
 */

import { readFile } from 'fs/promises';
import { resolvePath, expandTokens, createLogger, resolveResource } from '@pagemd/core';

const logger = createLogger('renderer.web');

/**
 * Default template path from standard_letter profile
 * Used as fallback when profile doesn't specify resources.template
 */
const DEFAULT_TEMPLATE_PATH = '${projectRoot}/templates/standard_letter.html';

/**
 * @typedef {Object} TemplateResult
 * @property {string} template - Template HTML content
 * @property {string} resolvedPath - Full resolved path to template file
 * @property {number} size - File size in bytes
 */

/**
 * Load HTML template from profile
 * @param {object} profile - Profile object with resources.template or layout.source path
 * @param {object} pathContext - Path resolution context
 * @param {object} [options={}] - Options
 * @param {boolean} [options.returnMetadata=false] - Return full result with metadata
 * @param {string} [options.cliPath] - CLI package root for bundled defaults
 * @returns {Promise<string|TemplateResult>} Template HTML or full result with metadata
 */
export async function loadTemplate(profile, pathContext, options = {}) {
  // Primary: resources.template, Fallback: layout.source (legacy), then default template
  let templatePath = profile?.resources?.template || profile?.layout?.source;

  // Fallback to default template when not specified or explicitly null
  if (!templatePath) {
    templatePath = DEFAULT_TEMPLATE_PATH;
    const profileId = profile?.id || 'unknown';
    logger.info(`Profile '${profileId}' missing template - using default: ${templatePath}`);
  }

  try {
    // First expand tokens in the template path
    const expanded = expandTokens(templatePath, pathContext);
    logger.debug(`Template path after token expansion: ${expanded}`);

    // Build context for resolveResource
    const context = {
      workingPath: pathContext.markdownDir,
      workspacePath: pathContext.projectRoot || pathContext.workspaceFolder,
      manifestPath: profile._manifestDir || pathContext.manifestDir,
      cliPath: options.cliPath || pathContext.cliPath,
      sourceType: 'profile'
    };

    const { resolvedPath } = resolveResource(expanded, 'templates', context);
    logger.debug(`Loading template: ${resolvedPath}`);

    const template = await readFile(resolvedPath, 'utf-8');
    logger.debug(`Loaded template (${template.length} chars)`);

    if (options.returnMetadata) {
      const { stat } = await import('fs/promises');
      const stats = await stat(resolvedPath);
      return {
        template,
        resolvedPath,
        size: stats.size
      };
    }

    return template;
  } catch (err) {
    logger.error(`Failed to load template: ${err.message}`);
    throw new Error(`Template load failed: ${templatePath}`);
  }
}

/**
 * Process nested object access for tokens like {{metadata.title}}
 * @param {object} obj - Object to traverse
 * @param {string} path - Dot-notation path
 * @returns {*} Value or undefined
 */
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let value = obj;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Process template tokens with data
 * Handles {{token}} replacement including nested access and path expansion
 *
 * @param {string} template - Template string with {{tokens}}
 * @param {object} data - Data object for token replacement
 * @param {object} [pathContext] - Optional path context for path token expansion
 * @returns {string} Processed template
 */
export function processTokens(template, data, pathContext = null) {
  // Known path tokens that should be preserved for expandTokens
  const pathTokens = ['PROJECT_ROOT', 'MARKDOWN_DIR', 'CONFIG_DIR', 'MANIFEST_DIR', 'WORKSPACE_FOLDER'];

  // Track missing tokens
  const missingTokens = [];

  // Replace {{token}} patterns
  let rendered = template.replace(/\{\{([^}]+)\}\}/g, (match, token) => {
    const trimmed = token.trim();

    // Preserve path tokens for later expansion by expandTokens
    if (pathTokens.includes(trimmed)) {
      return match; // Keep original {{TOKEN}} format
    }

    // Handle nested access (e.g., metadata.title, meta.document_id)
    if (trimmed.includes('.')) {
      const value = getNestedValue(data, trimmed);

      if (value === undefined || value === null) {
        missingTokens.push(trimmed);
        return '';
      }

      return String(value);
    }

    // Direct access
    if (trimmed in data) {
      const value = data[trimmed];
      return value === null || value === undefined ? '' : String(value);
    }

    missingTokens.push(trimmed);
    return '';
  });

  // Expand path tokens if context provided
  if (pathContext) {
    rendered = expandTokens(rendered, pathContext);
  }

  // Log warnings for missing tokens (excluding path tokens)
  if (missingTokens.length > 0) {
    const uniqueMissing = Array.from(new Set(missingTokens));
    logger.warn(`Missing template tokens: ${uniqueMissing.join(', ')}`);
  }

  logger.debug('Template tokens processed');
  return rendered;
}

/**
 * Render template with content and metadata
 * @param {string} template - HTML template string
 * @param {object} context - Rendering context
 * @param {string} context.content - Rendered HTML content
 * @param {string} context.styles - CSS style block
 * @param {object} context.metadata - Document metadata
 * @param {object} context.profile - Active profile
 * @param {object} context.pathContext - Path resolution context
 * @param {string} [context.colorScheme] - Resolved color scheme (light|dark|auto)
 * @returns {string} Rendered HTML
 */
export function renderTemplate(template, context) {
  const {
    content = '',
    styles = '',
    metadata = {},
    profile = {},
    pathContext = {},
    colorScheme
  } = context;

  // Build token map for replacement
  const tokenData = {
    content,
    styles,
    metadata,
    profile
  };

  let result = processTokens(template, tokenData, pathContext);

  // Inject data-color-scheme attribute on <html> tag if colorScheme is provided
  if (colorScheme) {
    result = result.replace(
      /<html(\s+[^>]*)?>/i,
      (match, attrs) => {
        // If there are existing attributes, append to them
        if (attrs) {
          return `<html${attrs} data-color-scheme="${colorScheme}">`;
        }
        // No existing attributes
        return `<html data-color-scheme="${colorScheme}">`;
      }
    );
    logger.debug(`Injected data-color-scheme="${colorScheme}" attribute`);
  }

  logger.debug('Template rendered successfully');
  return result;
}
