/**
 * @pagemd/renderer-web
 * Main document assembler - orchestrates HTML rendering pipeline
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse, parseFile } from '@pagemd/parser';
import {
  loadProfileSync,
  createPathContext,
  findProjectRoot,
  createLogger,
  addResource,
  resolvePath,
  resolveResourcePath
} from '@pagemd/core';
import { loadTemplate, renderTemplate } from './template.js';
import { buildStyleBlock } from './styles.js';

const logger = createLogger('renderer.web');

/**
 * Load frontmatter CSS files and concatenate content
 * @param {string[]} stylePaths - Array of CSS file paths from metadata.styles
 * @param {object} pathContext - Path resolution context
 * @returns {Promise<{css: string, resources: Array}>} Combined CSS and resource metadata
 */
async function loadFrontmatterStyles(stylePaths, pathContext) {
  if (!stylePaths || !Array.isArray(stylePaths) || stylePaths.length === 0) {
    return { css: '', resources: [] };
  }

  const cssChunks = [];
  const resources = [];

  for (const stylePath of stylePaths) {
    try {
      const resolved = resolveResourcePath(stylePath, pathContext);
      const content = await fs.readFile(resolved, 'utf-8');
      cssChunks.push(content);
      resources.push({
        layer: 'frontmatter',
        source: stylePath,
        resolvedPath: resolved,
        size: content.length
      });
      logger.debug('frontmatter-css', 'success', `Loaded frontmatter CSS: ${stylePath}`, {
        resolved,
        size: content.length
      });
    } catch (error) {
      logger.warn('frontmatter-css', 'failure', `Failed to load frontmatter CSS: ${stylePath}`, {
        error: error.message
      });
      // Continue with other files - don't fail the entire render
    }
  }

  return {
    css: cssChunks.join('\n'),
    resources
  };
}

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

  // Create path context (include manifestDir from profile for ${manifestDir} token)
  const pathContext = createPathContext({
    markdownDir: markdownPath ? path.dirname(markdownPath) : null,
    projectRoot,
    manifestDir: profile._manifestDir
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
 * @param {object} options.debugMetadata - Debug metadata collector (optional)
 * @returns {Promise<{html: string, metadata: object, profile: object}>} Rendered document
 */
export async function renderDocument(markdownPath, options = {}) {
  logger.info(`Rendering document: ${markdownPath}`);
  const { debugMetadata } = options;

  // Step 1: Parse markdown file
  logger.debug('Step 1: Parsing markdown');
  const { content, html, metadata } = await parseFile(markdownPath, options);

  // Step 2: Create render context (loads profile, creates path context)
  logger.debug('Step 2: Creating render context');
  const context = createRenderContext({ ...options, markdownPath });
  const { profile, pathContext } = context;

  // Step 3: Load HTML template (with metadata if debug mode)
  logger.debug('Step 3: Loading template');
  const templateResult = await loadTemplate(profile, pathContext, {
    returnMetadata: !!debugMetadata
  });

  let template;
  if (debugMetadata && typeof templateResult === 'object') {
    template = templateResult.template;
    addResource(debugMetadata, {
      name: profile?.layout?.source || 'template',
      path: templateResult.resolvedPath,
      source: profile?.layout?.source,
      type: 'template',
      size: templateResult.size
    });
  } else {
    template = templateResult;
  }

  // Step 4: Load frontmatter styles (if any specified in metadata.styles)
  logger.debug('Step 4: Loading frontmatter styles');
  const frontmatterStyles = await loadFrontmatterStyles(metadata.styles, pathContext);

  // Step 5: Build CSS style block (with metadata if debug mode)
  logger.debug('Step 5: Building styles');
  const styleResult = await buildStyleBlock(profile, pathContext, {
    returnMetadata: !!debugMetadata,
    frontmatterCSS: frontmatterStyles.css || undefined
  });

  let styles;
  if (debugMetadata && typeof styleResult === 'object') {
    styles = styleResult.styleBlock;
    // Add CSS resources to debug metadata
    for (const res of styleResult.resources) {
      addResource(debugMetadata, {
        name: res.source,
        path: res.resolvedPath,
        source: res.source,
        layer: res.layer,
        type: 'css',
        size: res.size
      });
    }
    // Add frontmatter CSS resources to debug metadata
    for (const res of frontmatterStyles.resources) {
      addResource(debugMetadata, {
        name: res.source,
        path: res.resolvedPath,
        source: res.source,
        layer: 'frontmatter',
        type: 'css',
        size: res.size
      });
    }
  } else {
    styles = styleResult;
  }

  // Step 6: Render template with content, styles, and metadata
  logger.debug('Step 6: Rendering template');
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

  // Step 4: Load frontmatter styles (if any specified in metadata.styles)
  logger.debug('Step 4: Loading frontmatter styles');
  const frontmatterStyles = await loadFrontmatterStyles(metadata.styles, pathContext);

  // Step 5: Build CSS style block
  logger.debug('Step 5: Building styles');
  const styles = await buildStyleBlock(profile, pathContext, {
    frontmatterCSS: frontmatterStyles.css || undefined
  });

  // Step 6: Render template with content, styles, and metadata
  logger.debug('Step 6: Rendering template');
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
