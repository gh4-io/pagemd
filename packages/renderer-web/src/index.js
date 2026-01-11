/**
 * @pagemd/renderer-web
 * Main document assembler - orchestrates HTML rendering pipeline
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse, parseFile } from '@pagemd/parser';
import {
  loadAndMergeProfile,
  createPathContext,
  findProjectRoot,
  createLogger,
  addResource,
  resolvePath,
  resolveResourcePath,
  resolveResource,
  expandTokens,
  resolveColorScheme
} from '@pagemd/core';
import { loadTemplate, renderTemplate } from './template.js';
import { buildStyleBlock } from './styles.js';
import { fillTocPlaceholder } from './toc.js';
import { generateIndexSkeleton } from './index-skeleton.js';
import { generatePageLayoutCSS } from './page-layout.js';

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

  // Build resource resolution context
  const resourceContext = {
    workingPath: pathContext.markdownDir,
    workspacePath: pathContext.projectRoot || pathContext.workspaceFolder,
    manifestPath: pathContext.manifestDir,
    cliPath: pathContext.cliPath,
    sourceType: 'frontmatter'
  };

  for (const stylePath of stylePaths) {
    // First expand tokens in the style path
    const expanded = expandTokens(stylePath, pathContext);

    let resolvedPath;
    try {
      const result = resolveResource(expanded, 'styles', resourceContext);
      resolvedPath = result.resolvedPath;
    } catch (error) {
      // Enhance error with context for user-friendly message
      const enhancedError = new Error(
        `Missing frontmatter stylesheet: ${stylePath}\n` +
        `Source: Document frontmatter 'styles' array\n` +
        (error.searchedPaths
          ? `Searched in:\n${error.searchedPaths.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}`
          : `Details: ${error.message}`)
      );
      enhancedError.cause = error;
      logger.error('frontmatter-css', 'failure', enhancedError.message);
      throw enhancedError;
    }

    const content = await fs.readFile(resolvedPath, 'utf-8');
    cssChunks.push(content);
    resources.push({
      layer: 'frontmatter',
      source: stylePath,
      resolvedPath,
      size: content.length
    });
    logger.debug('frontmatter-css', 'success', `Loaded frontmatter CSS: ${stylePath}`, {
      resolved: resolvedPath,
      size: content.length
    });
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
 * @param {string} [options.cliPath] - CLI package root for bundled defaults
 * @returns {Promise<object>} Render context with pathContext, profile, and options
 */
export async function createRenderContext(options) {
  const {
    markdownPath,
    profile: profileId = 'standard_letter',
    projectRoot = findProjectRoot(markdownPath || process.cwd()),
    cliPath = null
  } = options;

  // Determine search base for profile resolution:
  // - For relative paths in frontmatter, use markdown directory
  // - For named profiles, use project root
  const markdownDir = markdownPath ? path.dirname(markdownPath) : null;

  // Load profile with inheritance - loadAndMergeProfile(profileName, context)
  const profile = await loadAndMergeProfile(profileId, {
    searchFrom: markdownDir || projectRoot,
    configDir: projectRoot,
    cliPath
  });
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // Create path context (include manifestDir from profile for ${manifestDir} token)
  const pathContext = createPathContext({
    markdownDir,
    projectRoot,
    manifestDir: profile._manifestDir,
    cliPath
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

  // Step 1b: Resolve profile (frontmatter > options > default)
  // Frontmatter profile takes precedence over CLI -p flag for per-document choice
  // Note: Parser normalizes 'profile' → 'pipeline_profile'
  const profileToUse = metadata.pipeline_profile || options.profile;
  if (metadata.pipeline_profile) {
    logger.debug(`Using profile from frontmatter: ${metadata.pipeline_profile}`);
  }

  // Step 2: Create render context (loads profile with inheritance, creates path context)
  logger.debug('Step 2: Creating render context');
  const context = await createRenderContext({
    ...options,
    profile: profileToUse,  // Use frontmatter profile if present
    markdownPath
  });
  const { profile, pathContext } = context;

  // Step 3: Load HTML template (with metadata if debug mode)
  logger.debug('Step 3: Loading template');
  const templateResult = await loadTemplate(profile, pathContext, {
    returnMetadata: !!debugMetadata,
    cliPath: options.cliPath
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

  // Step 4: Merge profile defaults with frontmatter metadata
  logger.debug('Step 4: Merging metadata with profile defaults');
  const mergedMetadata = {
    ...(profile.metadata?.defaults || {}),
    ...metadata
  };

  // Step 5: Load frontmatter styles (if any specified in metadata.styles)
  logger.debug('Step 5: Loading frontmatter styles');
  const frontmatterStyles = await loadFrontmatterStyles(mergedMetadata.styles, pathContext);

  // Step 5b: Generate page layout CSS (headers, footers, page numbers)
  const pageLayoutCSS = generatePageLayoutCSS(mergedMetadata);
  const combinedFrontmatterCSS = [pageLayoutCSS, frontmatterStyles.css]
    .filter(Boolean)
    .join('\n');

  // Step 6: Build CSS style block (with metadata if debug mode)
  logger.debug('Step 6: Building styles');
  const styleResult = await buildStyleBlock(profile, pathContext, {
    returnMetadata: !!debugMetadata,
    frontmatterCSS: combinedFrontmatterCSS || undefined
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

  // Step 6b: Resolve color scheme for HTML rendering
  logger.debug('Step 6b: Resolving color scheme');
  const colorScheme = resolveColorScheme({
    frontmatter: mergedMetadata,
    profile,
    envDefault: process.env.PAGEMD_COLOR_SCHEME,
    outputFormat: 'html'
  });

  // Step 7: Render template with content, styles, and metadata
  logger.debug('Step 7: Rendering template');
  const renderedHtml = renderTemplate(template, {
    content: html,
    styles,
    metadata: mergedMetadata,
    profile,
    pathContext,
    colorScheme
  });

  // Step 8: Fill TOC placeholder if present (using metadata.toc settings)
  logger.debug('Step 8: Processing TOC placeholder');
  const tocOptions = {
    title: mergedMetadata.toc_title || 'Contents',
    levels: mergedMetadata.toc_levels || 3
  };
  const withToc = fillTocPlaceholder(renderedHtml, tocOptions);

  // Step 9: Generate index skeleton if present (for proper pagination in PDF)
  logger.debug('Step 9: Processing index skeleton');
  const finalHtml = generateIndexSkeleton(withToc, mergedMetadata);

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
 * @param {string} options.markdownPath - Logical markdown file path for path resolution (optional)
 * @returns {Promise<{html: string, metadata: object}>} Rendered document
 */
export async function renderMarkdown(markdown, options = {}) {
  logger.info('Rendering markdown string');

  // Step 1: Parse markdown string
  logger.debug('Step 1: Parsing markdown');
  const { content, html, metadata: parsedMetadata } = parse(markdown, options);

  // Step 1b: Resolve profile (frontmatter > options > default)
  // Frontmatter profile takes precedence over CLI -p flag for per-document choice
  // Note: Parser normalizes 'profile' → 'pipeline_profile'
  const profileToUse = parsedMetadata.pipeline_profile || options.profile;
  if (parsedMetadata.pipeline_profile) {
    logger.debug(`Using profile from frontmatter: ${parsedMetadata.pipeline_profile}`);
  }

  // Step 2: Create render context (loads profile with inheritance, without markdownPath)
  logger.debug('Step 2: Creating render context');
  const context = await createRenderContext({
    ...options,
    profile: profileToUse  // Use frontmatter profile if present
  });
  const { profile, pathContext } = context;

  // Step 3: Load HTML template
  logger.debug('Step 3: Loading template');
  const template = await loadTemplate(profile, pathContext, {
    cliPath: options.cliPath
  });

  // Step 4: Merge profile defaults with frontmatter metadata
  logger.debug('Step 4: Merging metadata with profile defaults');
  const mergedMetadata = {
    ...(profile.metadata?.defaults || {}),
    ...parsedMetadata,
    ...options.metadata
  };

  // Step 5: Load frontmatter styles (if any specified in metadata.styles)
  logger.debug('Step 5: Loading frontmatter styles');
  const frontmatterStyles = await loadFrontmatterStyles(mergedMetadata.styles, pathContext);

  // Step 5b: Generate page layout CSS (headers, footers, page numbers)
  const pageLayoutCSS = generatePageLayoutCSS(mergedMetadata);
  const combinedFrontmatterCSS = [pageLayoutCSS, frontmatterStyles.css]
    .filter(Boolean)
    .join('\n');

  // Step 6: Build CSS style block
  logger.debug('Step 6: Building styles');
  const styles = await buildStyleBlock(profile, pathContext, {
    frontmatterCSS: combinedFrontmatterCSS || undefined
  });

  // Step 7: Render template with content, styles, and metadata
  logger.debug('Step 7: Rendering template');
  const renderedHtml = renderTemplate(template, {
    content: html,
    styles,
    metadata: mergedMetadata,
    profile,
    pathContext
  });

  // Step 8: Fill TOC placeholder if present (using metadata.toc settings)
  logger.debug('Step 8: Processing TOC placeholder');
  const tocOptions = {
    title: mergedMetadata.toc_title || 'Contents',
    levels: mergedMetadata.toc_levels || 3
  };
  const withToc = fillTocPlaceholder(renderedHtml, tocOptions);

  // Step 9: Generate index skeleton if present (for proper pagination in PDF)
  logger.debug('Step 9: Processing index skeleton');
  const finalHtml = generateIndexSkeleton(withToc, mergedMetadata);

  logger.info('Markdown rendered successfully');

  return {
    html: finalHtml,
    metadata: mergedMetadata
  };
}

// Re-export template and style functions for direct use
export { loadTemplate, processTokens, renderTemplate } from './template.js';
export { buildStyleBlock, formatStyleTag, minifyCSS, inlineStyles } from './styles.js';
export { extractHeadings, generateTocHtml, fillTocPlaceholder } from './toc.js';
export { generateIndexSkeleton } from './index-skeleton.js';
export { generatePageLayoutCSS } from './page-layout.js';
