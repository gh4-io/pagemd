/**
 * @pagemd/exporters
 * Main orchestrator for exporting markdown to all enabled output formats
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLogger, loadProfileSync, findProjectRoot } from '@pagemd/core';
import { renderDocument } from '@pagemd/renderer-web';
import { renderPdf, launchBrowser, closeBrowser } from '@pagemd/renderer-pdf';

// Import internal modules
import {
  OUTPUT_MODES,
  getOutputMode,
  shouldOutput,
  getEnabledFormats,
  getOutputDir
} from './modes.js';

import {
  FILENAME_TOKENS,
  expandFilename,
  sanitizeFilename,
  getOutputFilename,
  getOutputPath
} from './filename.js';

import {
  captureScreenshot,
  saveScreenshot,
  capturePageScreenshots,
  getScreenshotOptions
} from './screenshots.js';

import {
  collectAssets,
  deduplicateAssets,
  copyAssets,
  createAssetMap,
  rewriteAssetPaths,
  rewriteCSSAssetPaths,
  injectStylesheet,
  removeInlineStyles,
  generateOutputFilename,
  slugify
} from './bundler.js';

import {
  exportToArchive,
  collectDependencies,
  createArchive,
  isSystemResource,
  mapToArchivePath
} from './archiver.js';

const logger = createLogger('exporter');

/**
 * Export markdown to all enabled output formats
 * @param {string} markdownPath - Path to markdown file
 * @param {object} options - Export options
 * @param {string} [options.profile='standard_letter'] - Profile ID
 * @param {string[]} [options.formats] - Formats to output (overrides profile)
 * @param {string} [options.outputDir] - Output directory
 * @param {boolean} [options.debug=false] - Enable debug mode
 * @param {object} [options.modes] - Mode overrides per format
 * @returns {Promise<{outputs: Array<{format: string, path: string, size?: number}>, metadata: object}>}
 */
export async function exportDocument(markdownPath, options = {}) {
  const {
    profile: profileId = 'standard_letter',
    formats = null,
    outputDir = null,
    debug = false,
    modes = {},
    cliPath = null
  } = options;

  logger.info('export.start', 'started', `Exporting document: ${markdownPath}`, {
    profile: profileId,
    requestedFormats: formats,
    outputDir,
    debug
  });

  // Validate markdown path
  const absoluteMarkdownPath = path.resolve(markdownPath);
  try {
    await fs.access(absoluteMarkdownPath);
  } catch (error) {
    logger.error('export.validation', 'failure', `Markdown file not found: ${markdownPath}`, {
      path: absoluteMarkdownPath
    });
    throw new Error(`Markdown file not found: ${markdownPath}`);
  }

  // Load profile
  const projectRoot = findProjectRoot(absoluteMarkdownPath);
  const profile = loadProfileSync(profileId, projectRoot, projectRoot);

  if (!profile) {
    logger.error('export.profile', 'failure', `Profile not found: ${profileId}`, {
      profileId,
      projectRoot
    });
    throw new Error(`Profile not found: ${profileId}`);
  }

  logger.debug('export.profile', 'success', `Profile loaded: ${profile.id}`, {
    profileId: profile.id
  });

  // Build options object with overrides
  const exportOptions = {
    ...options,
    formats,
    outputDir,
    modes
  };

  // Determine which formats to export
  const enabledFormats = getEnabledFormats(profile, exportOptions);

  if (enabledFormats.length === 0) {
    logger.warn('export.formats', 'empty', 'No formats enabled for export', {
      profile: profileId,
      requestedFormats: formats
    });
    return {
      outputs: [],
      metadata: {}
    };
  }

  logger.info('export.formats', 'success', `Exporting to formats: ${enabledFormats.join(', ')}`, {
    formats: enabledFormats
  });

  const outputs = [];
  let metadata = {};
  let browser = null;

  try {
    // Process each enabled format
    for (const format of enabledFormats) {
      logger.debug('export.format', 'started', `Exporting to ${format.toUpperCase()}`, { format });

      switch (format) {
        case 'html': {
          const result = await exportToHtml(absoluteMarkdownPath, {
            profile: profileId,
            outputDir,
            debug
          });
          outputs.push(result);
          metadata = result.metadata || metadata;
          logger.info('export.format', 'success', `HTML export complete: ${result.path}`, {
            format: 'html',
            path: result.path
          });
          break;
        }

        case 'pdf': {
          const result = await exportToPdf(absoluteMarkdownPath, {
            profile: profileId,
            outputDir,
            debug,
            cliPath
          });
          outputs.push(result);
          metadata = result.metadata || metadata;
          logger.info('export.format', 'success', `PDF export complete: ${result.path}`, {
            format: 'pdf',
            path: result.path
          });
          break;
        }

        case 'png':
        case 'jpeg': {
          // For images, we need a browser instance
          // Reuse browser if already launched
          if (!browser) {
            logger.debug('export.browser', 'started', 'Launching browser for image export');
            browser = await launchBrowser({ headless: true, debug });
          }

          const result = await exportToImage(absoluteMarkdownPath, format, {
            profile: profileId,
            outputDir,
            debug,
            browser // Pass browser instance to reuse
          });
          outputs.push(result);
          metadata = result.metadata || metadata;
          logger.info('export.format', 'success', `${format.toUpperCase()} export complete: ${result.path}`, {
            format,
            path: result.path
          });
          break;
        }

        default:
          logger.warn('export.format', 'unsupported', `Unsupported format: ${format}`, { format });
      }
    }

    // Close browser if it was launched
    if (browser) {
      logger.debug('export.browser', 'cleanup', 'Closing browser');
      await closeBrowser(browser);
    }

    logger.info('export.complete', 'success', `Export complete: ${outputs.length} outputs`, {
      formats: outputs.map(o => o.format),
      count: outputs.length
    });

    return {
      outputs,
      metadata
    };

  } catch (error) {
    logger.error('export.failed', 'error', `Export failed: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });

    // Cleanup browser on error
    if (browser) {
      await closeBrowser(browser);
    }

    throw error;
  }
}

/**
 * Export markdown to HTML only
 * @param {string} markdownPath - Path to markdown file
 * @param {object} options - Export options
 * @param {string} [options.profile='standard_letter'] - Profile ID
 * @param {string} [options.outputDir] - Output directory
 * @param {boolean} [options.debug=false] - Enable debug mode
 * @returns {Promise<{format: string, path: string, size: number, metadata: object}>}
 */
export async function exportToHtml(markdownPath, options = {}) {
  const {
    profile: profileId = 'standard_letter',
    outputDir = null,
    debug = false
  } = options;

  logger.info('export.html', 'started', `Exporting to HTML: ${markdownPath}`, {
    profile: profileId
  });

  // Resolve paths
  const absoluteMarkdownPath = path.resolve(markdownPath);
  const projectRoot = findProjectRoot(absoluteMarkdownPath);
  const profile = loadProfileSync(profileId, projectRoot, projectRoot);

  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // Render HTML using renderer-web
  const { html, metadata } = await renderDocument(absoluteMarkdownPath, {
    profile: profileId,
    debug
  });

  // Determine output path
  const outputPath = getOutputPath(absoluteMarkdownPath, 'html', profile, metadata, {
    outputDir
  });

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Write HTML to file
  await fs.writeFile(outputPath, html, 'utf8');

  const stats = await fs.stat(outputPath);

  logger.info('export.html', 'success', `HTML exported: ${outputPath}`, {
    path: outputPath,
    size: stats.size
  });

  return {
    format: 'html',
    path: outputPath,
    size: stats.size,
    metadata
  };
}

/**
 * Export markdown to PDF only
 * @param {string} markdownPath - Path to markdown file
 * @param {object} options - Export options
 * @param {string} [options.profile='standard_letter'] - Profile ID
 * @param {string} [options.outputDir] - Output directory
 * @param {boolean} [options.debug=false] - Enable debug mode
 * @param {object} [options.pdfOptions] - Additional PDF generation options
 * @returns {Promise<{format: string, path: string, size: number, pages: number, metadata: object}>}
 */
export async function exportToPdf(markdownPath, options = {}) {
  const {
    profile: profileId = 'standard_letter',
    outputDir = null,
    debug = false,
    pdfOptions = {},
    cliPath = null
  } = options;

  logger.info('export.pdf', 'started', `Exporting to PDF: ${markdownPath}`, {
    profile: profileId
  });

  // Resolve paths
  const absoluteMarkdownPath = path.resolve(markdownPath);
  const projectRoot = findProjectRoot(absoluteMarkdownPath);
  const profile = loadProfileSync(profileId, projectRoot, projectRoot);

  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // Determine output path
  // Note: We need to get metadata first, but renderPdf will render the document
  // For now, use empty metadata; renderer-pdf will handle the full flow
  const outputPath = getOutputPath(absoluteMarkdownPath, 'pdf', profile, {}, {
    outputDir
  });

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Render PDF using renderer-pdf
  const { pdfPath, pages } = await renderPdf(absoluteMarkdownPath, {
    profile: profileId,
    output: outputPath,
    debug,
    pdfOptions,
    cliPath
  });

  const stats = await fs.stat(pdfPath);

  logger.info('export.pdf', 'success', `PDF exported: ${pdfPath}`, {
    path: pdfPath,
    size: stats.size,
    pages
  });

  return {
    format: 'pdf',
    path: pdfPath,
    size: stats.size,
    pages,
    metadata: {} // PDF renderer doesn't return metadata yet
  };
}

/**
 * Export markdown to image (PNG or JPEG)
 * @param {string} markdownPath - Path to markdown file
 * @param {string} format - Image format ('png' or 'jpeg')
 * @param {object} options - Export options
 * @param {string} [options.profile='standard_letter'] - Profile ID
 * @param {string} [options.outputDir] - Output directory
 * @param {boolean} [options.debug=false] - Enable debug mode
 * @param {object} [options.browser] - Existing browser instance to reuse
 * @param {object} [options.screenshotOptions] - Screenshot options override
 * @returns {Promise<{format: string, path: string, size: number, metadata: object}>}
 */
export async function exportToImage(markdownPath, format, options = {}) {
  const {
    profile: profileId = 'standard_letter',
    outputDir = null,
    debug = false,
    browser = null,
    screenshotOptions = {}
  } = options;

  // Validate format
  const normalizedFormat = format.toLowerCase();
  if (normalizedFormat !== 'png' && normalizedFormat !== 'jpeg') {
    throw new Error(`Invalid image format: ${format}. Must be 'png' or 'jpeg'.`);
  }

  logger.info('export.image', 'started', `Exporting to ${normalizedFormat.toUpperCase()}: ${markdownPath}`, {
    profile: profileId,
    format: normalizedFormat
  });

  // Resolve paths
  const absoluteMarkdownPath = path.resolve(markdownPath);
  const projectRoot = findProjectRoot(absoluteMarkdownPath);
  const profile = loadProfileSync(profileId, projectRoot, projectRoot);

  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  // Render HTML using renderer-web
  const { html, metadata } = await renderDocument(absoluteMarkdownPath, {
    profile: profileId,
    debug
  });

  // Determine output path
  const outputPath = getOutputPath(absoluteMarkdownPath, normalizedFormat, profile, metadata, {
    outputDir
  });

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // Launch browser if not provided
  let ownBrowser = false;
  let browserInstance = browser;

  if (!browserInstance) {
    logger.debug('export.image', 'browser', 'Launching browser for screenshot');
    browserInstance = await launchBrowser({ headless: true, debug });
    ownBrowser = true;
  }

  try {
    // Create page and load HTML
    const page = await browserInstance.newPage();

    // Set viewport based on profile or defaults
    await page.setViewport({
      width: 816,  // 8.5" at 96 DPI
      height: 1056, // 11" at 96 DPI
      deviceScaleFactor: 1
    });

    // Load HTML content
    const baseUrl = `file://${path.dirname(absoluteMarkdownPath)}/`;
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for any dynamic content to render
    await page.waitForTimeout(500);

    // Get screenshot options from profile
    const defaultScreenshotOptions = getScreenshotOptions(normalizedFormat, profile);
    const finalOptions = {
      ...defaultScreenshotOptions,
      ...screenshotOptions,
      format: normalizedFormat
    };

    // Capture and save screenshot
    const result = await saveScreenshot(page, outputPath, finalOptions);

    // Close page
    await page.close();

    // Close browser if we launched it
    if (ownBrowser) {
      await closeBrowser(browserInstance);
    }

    logger.info('export.image', 'success', `${normalizedFormat.toUpperCase()} exported: ${outputPath}`, {
      path: outputPath,
      size: result.size,
      format: normalizedFormat
    });

    return {
      format: normalizedFormat,
      path: outputPath,
      size: result.size,
      metadata
    };

  } catch (error) {
    // Close browser on error if we launched it
    if (ownBrowser && browserInstance) {
      await closeBrowser(browserInstance);
    }
    throw error;
  }
}

/**
 * Export multiple markdown files to a bundled static site
 * Creates a self-contained directory with:
 * - HTML files with slugified names
 * - Shared styles-shared.css for common CSS layers (base, primary, syntax)
 * - Per-profile styles-{profileId}.css for profile-specific layers (layout, profile)
 * - assets/ directory with copied images, fonts, etc.
 * - Wikilinks converted to .html links with slugs
 *
 * ## Multi-Profile Support
 *
 * When bundling files with DIFFERENT profiles (e.g., alerts, SOPs, technical docs),
 * the bundler creates separate CSS files for each profile:
 *
 * ```
 * dist/
 * ├── styles-shared.css     # base + primary + syntax (shared by all)
 * ├── styles-alert.css      # layout + profile for alert-profile
 * ├── styles-sop.css        # layout + profile for sop-profile
 * ├── alert-doc.html        # <link href="styles-shared.css"> + <link href="styles-alert.css">
 * └── sop-doc.html          # <link href="styles-shared.css"> + <link href="styles-sop.css">
 * ```
 *
 * This prevents style collisions when different document types have different:
 * - Page layouts (@page rules, margins)
 * - Visual styling (fonts, colors, spacing)
 *
 * @param {string|string[]} markdownPaths - Single path or array of markdown file paths
 * @param {object} options - Export options
 * @param {string} [options.outputDir='./dist'] - Output directory for the bundle
 * @param {string} [options.profile] - Default profile ID (can be overridden per-file via frontmatter)
 * @param {boolean} [options.debug=false] - Enable debug mode
 * @param {string} [options.cliPath] - CLI path for resource resolution
 * @returns {Promise<{outputDir: string, files: Array<{input: string, output: string, profile: string}>, sharedStylesPath: string, profileStyles: Map<string, string>, assetsCount: number, errors: string[]}>}
 */
export async function exportToBundle(markdownPaths, options = {}) {
  const {
    outputDir = './dist',
    profile: defaultProfileId = 'standard_letter',
    debug = false,
    cliPath = null
  } = options;

  // Normalize to array
  const paths = Array.isArray(markdownPaths) ? markdownPaths : [markdownPaths];

  if (paths.length === 0) {
    throw new Error('No markdown files provided for bundling');
  }

  logger.info('bundle.start', 'started', `Bundling ${paths.length} files to ${outputDir}`, {
    files: paths.length,
    defaultProfile: defaultProfileId
  });

  // Resolve output directory
  const absoluteOutputDir = path.resolve(outputDir);
  await fs.mkdir(absoluteOutputDir, { recursive: true });

  const files = [];
  const errors = [];
  const allAssets = [];

  // Track CSS by profile for multi-profile support
  // Key: profileId, Value: { sharedCSS, profileCSS, written: boolean }
  const profileCSS = new Map();
  let sharedCSSWritten = false;
  let sharedCSSContent = null;

  // Process each markdown file
  for (const mdPath of paths) {
    const absoluteMdPath = path.resolve(mdPath);
    const markdownDir = path.dirname(absoluteMdPath);

    try {
      logger.debug('bundle.render', 'started', `Rendering: ${mdPath}`);

      // Render with split CSS extraction for multi-profile support
      // Each file may use a different profile (via frontmatter or default)
      const { html, metadata, profile, splitCSS } = await renderDocument(absoluteMdPath, {
        profile: defaultProfileId,
        extractCSS: 'split',  // Use split mode for multi-profile support
        wikilinkSlugs: true,
        debug,
        cliPath
      });

      const actualProfileId = splitCSS?.profileId || profile?.id || defaultProfileId;

      // Track this profile's CSS if not already seen
      if (!profileCSS.has(actualProfileId) && splitCSS) {
        profileCSS.set(actualProfileId, {
          sharedCSS: splitCSS.sharedCSS,
          profileCSS: splitCSS.profileCSS,
          written: false
        });

        // Save shared CSS content (identical for all profiles)
        if (!sharedCSSContent && splitCSS.sharedCSS) {
          sharedCSSContent = splitCSS.sharedCSS;
        }

        logger.debug('bundle.profile', 'new', `New profile detected: ${actualProfileId}`, {
          profileId: actualProfileId,
          sharedSize: splitCSS.sharedCSS?.length || 0,
          profileSize: splitCSS.profileCSS?.length || 0
        });
      }

      // Collect assets from this file's HTML
      const cssForAssetScan = profileCSS.get(actualProfileId)?.profileCSS || '';
      const assets = collectAssets(html, cssForAssetScan + (sharedCSSContent || ''), markdownDir);
      allAssets.push(...assets);

      // Generate output filename
      const outputFilename = generateOutputFilename(absoluteMdPath);
      const outputPath = path.join(absoluteOutputDir, outputFilename);

      // Create asset map for path rewriting
      const assetMap = createAssetMap(assets);

      // Rewrite asset paths in HTML
      let processedHtml = rewriteAssetPaths(html, assetMap);

      // Remove inline styles (except frontmatter)
      processedHtml = removeInlineStyles(processedHtml, true);

      // Inject both stylesheet links: shared first, then profile-specific
      // Order matters for CSS cascade (shared foundation, then profile customization)
      const stylesheets = [
        './styles-shared.css',
        `./styles-${slugify(actualProfileId)}.css`
      ];
      processedHtml = injectStylesheet(processedHtml, stylesheets);

      // Write HTML file
      await fs.writeFile(outputPath, processedHtml, 'utf-8');

      files.push({
        input: mdPath,
        output: outputFilename,
        profile: actualProfileId
      });

      logger.debug('bundle.render', 'success', `Rendered: ${mdPath} → ${outputFilename}`, {
        profile: actualProfileId
      });

    } catch (error) {
      const msg = `Failed to process ${mdPath}: ${error.message}`;
      errors.push(msg);
      logger.error('bundle.render', 'failure', msg);
    }
  }

  // Build asset map for CSS path rewriting
  const dedupedAssets = deduplicateAssets(allAssets);
  const assetMap = createAssetMap(dedupedAssets);

  // Write shared CSS (once, identical for all profiles)
  let sharedStylesPath = null;
  if (sharedCSSContent) {
    sharedStylesPath = path.join(absoluteOutputDir, 'styles-shared.css');
    const processedSharedCSS = rewriteCSSAssetPaths(sharedCSSContent, assetMap);
    await fs.writeFile(sharedStylesPath, processedSharedCSS, 'utf-8');
    logger.info('bundle.css', 'success', `Wrote styles-shared.css (${processedSharedCSS.length} bytes)`);
  }

  // Write per-profile CSS files
  const profileStylesWritten = new Map();
  for (const [profileId, cssData] of profileCSS) {
    if (cssData.profileCSS && !cssData.written) {
      const profileStylesPath = path.join(absoluteOutputDir, `styles-${slugify(profileId)}.css`);
      const processedProfileCSS = rewriteCSSAssetPaths(cssData.profileCSS, assetMap);
      await fs.writeFile(profileStylesPath, processedProfileCSS, 'utf-8');
      cssData.written = true;
      profileStylesWritten.set(profileId, profileStylesPath);
      logger.info('bundle.css', 'success', `Wrote styles-${slugify(profileId)}.css (${processedProfileCSS.length} bytes)`);
    }
  }

  // Copy all assets (deduplicated)
  const copyResult = await copyAssets(dedupedAssets, absoluteOutputDir);

  if (copyResult.errors.length > 0) {
    errors.push(...copyResult.errors);
  }

  // Summary logging
  const uniqueProfiles = [...profileCSS.keys()];
  logger.info('bundle.complete', 'success', `Bundle complete: ${files.length} files, ${uniqueProfiles.length} profiles, ${copyResult.copied} assets`, {
    outputDir: absoluteOutputDir,
    files: files.length,
    profiles: uniqueProfiles,
    assets: copyResult.copied,
    errors: errors.length
  });

  return {
    outputDir: absoluteOutputDir,
    files,
    sharedStylesPath,
    profileStyles: profileStylesWritten,
    assetsCount: copyResult.copied,
    errors
  };
}

// Re-export all utility functions from internal modules

// modes.js exports
export {
  OUTPUT_MODES,
  getOutputMode,
  shouldOutput,
  getEnabledFormats,
  getOutputDir
};

// filename.js exports
export {
  FILENAME_TOKENS,
  expandFilename,
  sanitizeFilename,
  getOutputFilename,
  getOutputPath
};

// screenshots.js exports
export {
  captureScreenshot,
  saveScreenshot,
  capturePageScreenshots,
  getScreenshotOptions
};

// bundler.js exports
export {
  collectAssets,
  deduplicateAssets,
  copyAssets,
  createAssetMap,
  rewriteAssetPaths,
  rewriteCSSAssetPaths,
  injectStylesheet,
  removeInlineStyles,
  generateOutputFilename,
  slugify
};

// archiver.js exports
export {
  exportToArchive,
  collectDependencies,
  createArchive,
  isSystemResource,
  mapToArchivePath
};
