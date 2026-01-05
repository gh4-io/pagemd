/**
 * @pagemd/renderer-web
 * Main document assembler - orchestrates HTML rendering pipeline
 */

import { parse, parseFile } from '@pagemd/parser';
import {
  loadProfileSync,
  createPathContext,
  findProjectRoot,
  createLogger
} from '@pagemd/core';
import { loadTemplate, renderTemplate } from './template.js';
import { buildStyleBlock } from './styles.js';

const logger = createLogger('renderer.web');

/**
 * Create rendering context from options
 * @param {object} options - Rendering options
 * @param {string} options.markdownPath - Path to markdown file (optional for string rendering)
 * @param {string} options.profile - Profile ID to use
 * @param {string} options.projectRoot - Project root directory
 * @returns {object} Render context with pathContext, profile, and options
 */
export function createRenderContext(options) {
  const {
    markdownPath,
    profile: profileId = 'standard_letter',
    projectRoot = findProjectRoot(markdownPath || process.cwd())
  } = options;

  // Load profile - loadProfileSync(profileName, searchFrom, configDir)
  const profile = loadProfileSync(profileId, projectRoot, projectRoot);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // Create path context
  const pathContext = createPathContext({
    markdownPath,
    projectRoot
  });

  logger.debug(`Render context created: profile=${profile.id}, root=${projectRoot}`);

  return {
    pathContext,
    profile,
    options
  };
}

/**
 * Render markdown file to HTML document
 * @param {string} markdownPath - Path to markdown file
 * @param {object} options - Rendering options
 * @param {string} options.profile - Profile ID (default: 'standard_letter')
 * @param {string} options.outputPath - Output path (optional)
 * @param {string} options.projectRoot - Project root (auto-detected if not provided)
 * @returns {Promise<{html: string, metadata: object, profile: object}>} Rendered document
 */
export async function renderDocument(markdownPath, options = {}) {
  logger.info(`Rendering document: ${markdownPath}`);

  // Step 1: Parse markdown file
  logger.debug('Step 1: Parsing markdown');
  const { content, html, metadata } = await parseFile(markdownPath, options);

  // Step 2: Create render context (loads profile, creates path context)
  logger.debug('Step 2: Creating render context');
  const context = createRenderContext({ ...options, markdownPath });
  const { profile, pathContext } = context;

  // Step 3: Load HTML template
  logger.debug('Step 3: Loading template');
  const template = await loadTemplate(profile, pathContext);

  // Step 4: Build CSS style block
  logger.debug('Step 4: Building styles');
  const styles = await buildStyleBlock(profile, pathContext);

  // Step 5: Render template with content, styles, and metadata
  logger.debug('Step 5: Rendering template');
  const finalHtml = renderTemplate(template, {
    content: html,
    styles,
    metadata,
    profile,
    pathContext
  });

  logger.info('Document rendered successfully');

  return {
    html: finalHtml,
    metadata,
    profile
  };
}

/**
 * Render markdown string to HTML (not from file)
 * @param {string} markdown - Raw markdown content
 * @param {object} options - Rendering options
 * @param {string} options.profile - Profile ID (default: 'standard_letter')
 * @param {object} options.metadata - Additional metadata to merge
 * @param {string} options.projectRoot - Project root (default: cwd)
 * @returns {Promise<{html: string, metadata: object}>} Rendered document
 */
export async function renderMarkdown(markdown, options = {}) {
  logger.info('Rendering markdown string');

  // Step 1: Parse markdown string
  logger.debug('Step 1: Parsing markdown');
  const { content, html, metadata: parsedMetadata } = parse(markdown, options);

  // Merge provided metadata with parsed metadata
  const metadata = { ...parsedMetadata, ...options.metadata };

  // Step 2: Create render context (without markdownPath)
  logger.debug('Step 2: Creating render context');
  const context = createRenderContext(options);
  const { profile, pathContext } = context;

  // Step 3: Load HTML template
  logger.debug('Step 3: Loading template');
  const template = await loadTemplate(profile, pathContext);

  // Step 4: Build CSS style block
  logger.debug('Step 4: Building styles');
  const styles = await buildStyleBlock(profile, pathContext);

  // Step 5: Render template with content, styles, and metadata
  logger.debug('Step 5: Rendering template');
  const finalHtml = renderTemplate(template, {
    content: html,
    styles,
    metadata,
    profile,
    pathContext
  });

  logger.info('Markdown rendered successfully');

  return {
    html: finalHtml,
    metadata
  };
}

// Re-export template and style functions for direct use
export { loadTemplate, processTokens, renderTemplate } from './template.js';
export { buildStyleBlock, formatStyleTag, minifyCSS, inlineStyles } from './styles.js';
