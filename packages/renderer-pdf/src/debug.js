/**
 * @pagemd/renderer-pdf/debug
 * Debug artifact management for PDF rendering
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '@pagemd/core/logger.js';

const logger = createLogger('renderer.pdf');

/**
 * Create debug directory if it doesn't exist
 * @param {string} basePath - Base output path
 * @returns {Promise<string>} Debug directory path
 */
export async function createDebugDir(basePath) {
  const debugDir = path.join(path.dirname(basePath), 'debug');

  try {
    await fs.mkdir(debugDir, { recursive: true });
    logger.debug('debug', 'success', 'Created debug directory', { path: debugDir });
    return debugDir;
  } catch (error) {
    logger.error('debug', 'failure', 'Failed to create debug directory', {
      path: debugDir,
      error: error.message
    });
    throw error;
  }
}

/**
 * Check if debug artifacts should be saved
 * @param {object} options - Render options
 * @param {object} profile - Profile configuration
 * @returns {boolean} True if debug artifacts should be saved
 */
export function shouldSaveDebug(options, profile) {
  // Check explicit debug flag in options
  if (options?.debug === true) {
    return true;
  }

  // Check profile debugArtifacts setting
  if (profile?.debugArtifacts === true) {
    return true;
  }

  return false;
}

/**
 * Save pre-PDF HTML snapshot for debugging
 * @param {string} html - HTML content to save
 * @param {string} outputPath - Original output path (used for naming)
 * @param {object} [options={}] - Save options
 * @param {string} [options.debugDir] - Custom debug directory (default: auto-create)
 * @param {string} [options.suffix='.paged'] - Filename suffix before .html
 * @returns {Promise<string>} Path to saved debug HTML file
 */
export async function saveDebugHtml(html, outputPath, options = {}) {
  const basename = path.basename(outputPath, path.extname(outputPath));
  const suffix = options.suffix || '.paged';
  const filename = `${basename}${suffix}.html`;

  // Determine debug directory
  let debugDir;
  if (options.debugDir) {
    debugDir = options.debugDir;
  } else {
    debugDir = await createDebugDir(outputPath);
  }

  const debugPath = path.join(debugDir, filename);

  try {
    await fs.writeFile(debugPath, html, 'utf-8');
    logger.debug('debug', 'success', 'Saved debug HTML snapshot', {
      path: debugPath,
      size: html.length
    });
    return debugPath;
  } catch (error) {
    logger.error('debug', 'failure', 'Failed to save debug HTML', {
      path: debugPath,
      error: error.message
    });
    throw error;
  }
}

/**
 * Save page screenshot for visual debugging
 * @param {object} page - Puppeteer page instance
 * @param {string} outputPath - Original output path (used for naming)
 * @param {object} [options={}] - Screenshot options
 * @param {string} [options.debugDir] - Custom debug directory
 * @param {string} [options.format='png'] - Image format (png or jpeg)
 * @param {number} [options.quality] - JPEG quality (1-100, ignored for PNG)
 * @param {boolean} [options.fullPage=true] - Capture full scrollable page
 * @returns {Promise<string>} Path to saved screenshot
 */
export async function saveDebugScreenshot(page, outputPath, options = {}) {
  const basename = path.basename(outputPath, path.extname(outputPath));
  const format = options.format || 'png';
  const filename = `${basename}.screenshot.${format}`;

  // Determine debug directory
  let debugDir;
  if (options.debugDir) {
    debugDir = options.debugDir;
  } else {
    debugDir = await createDebugDir(outputPath);
  }

  const screenshotPath = path.join(debugDir, filename);

  try {
    const screenshotOptions = {
      path: screenshotPath,
      type: format,
      fullPage: options.fullPage !== false
    };

    // Add quality for JPEG
    if (format === 'jpeg' && options.quality) {
      screenshotOptions.quality = options.quality;
    }

    await page.screenshot(screenshotOptions);

    logger.debug('debug', 'success', 'Saved debug screenshot', {
      path: screenshotPath,
      format,
      fullPage: screenshotOptions.fullPage
    });

    return screenshotPath;
  } catch (error) {
    logger.error('debug', 'failure', 'Failed to save debug screenshot', {
      path: screenshotPath,
      error: error.message
    });
    throw error;
  }
}

/**
 * Remove debug artifacts for a specific output
 * @param {string} basePath - Base output path
 * @param {object} [options={}] - Cleanup options
 * @param {boolean} [options.removeDir=false] - Remove entire debug directory
 * @returns {Promise<void>}
 */
export async function cleanupDebugArtifacts(basePath, options = {}) {
  const debugDir = path.join(path.dirname(basePath), 'debug');
  const basename = path.basename(basePath, path.extname(basePath));

  try {
    // Check if debug directory exists
    try {
      await fs.access(debugDir);
    } catch {
      logger.trace('debug', 'skipped', 'Debug directory does not exist', { path: debugDir });
      return;
    }

    if (options.removeDir) {
      // Remove entire debug directory
      await fs.rm(debugDir, { recursive: true, force: true });
      logger.debug('debug', 'success', 'Removed debug directory', { path: debugDir });
    } else {
      // Remove specific artifacts for this basename
      const files = await fs.readdir(debugDir);
      const toRemove = files.filter(f => f.startsWith(basename));

      for (const file of toRemove) {
        const filePath = path.join(debugDir, file);
        await fs.unlink(filePath);
        logger.trace('debug', 'success', 'Removed debug artifact', { path: filePath });
      }

      logger.debug('debug', 'success', 'Cleaned up debug artifacts', {
        count: toRemove.length,
        basename
      });
    }
  } catch (error) {
    logger.warn('debug', 'failure', 'Failed to cleanup debug artifacts', {
      path: debugDir,
      error: error.message
    });
    // Don't throw - cleanup failures shouldn't break the pipeline
  }
}
