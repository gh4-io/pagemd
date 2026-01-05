/**
 * Template loader and renderer
 * Handles HTML template loading and token replacement
 */

import { readFile } from 'fs/promises';
import { resolvePath, expandTokens, createLogger } from '@pagemd/core';

const logger = createLogger('renderer.web');

/**
 * Load HTML template from profile
 * @param {object} profile - Profile object with layout.template path
 * @param {object} pathContext - Path resolution context
 * @returns {Promise<string>} Template HTML
 */
export async function loadTemplate(profile, pathContext) {
  const templatePath = profile?.layout?.source;
  if (!templatePath) {
    throw new Error('Profile missing layout.source path');
  }

  // Resolve template path using path context
  const resolved = resolvePath(templatePath, pathContext);
  logger.debug(`Loading template: ${resolved}`);

  try {
    const template = await readFile(resolved, 'utf-8');
    logger.debug(`Loaded template (${template.length} chars)`);
    return template;
  } catch (err) {
    logger.error(`Failed to load template: ${err.message}`);
    throw new Error(`Template load failed: ${templatePath} → ${resolved}`);
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
  // Track missing tokens
  const missingTokens = [];

  // Replace {{token}} patterns
  let rendered = template.replace(/\{\{([^}]+)\}\}/g, (match, token) => {
    const trimmed = token.trim();

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

  // Log warnings for missing tokens
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
 * @returns {string} Rendered HTML
 */
export function renderTemplate(template, context) {
  const {
    content = '',
    styles = '',
    metadata = {},
    profile = {},
    pathContext = {}
  } = context;

  // Build token map for replacement
  const tokenData = {
    content,
    styles,
    metadata,
    profile
  };

  logger.debug('Template rendered successfully');
  return processTokens(template, tokenData, pathContext);
}
