/**
 * @pagemd/exporters/screenshots
 * Screenshot capture using Puppeteer for PNG and JPEG outputs
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '@pagemd/core';

const logger = createLogger('exporter');

/**
 * Default screenshot options by format
 */
const DEFAULT_OPTIONS = {
  png: {
    fullPage: true,
    omitBackground: false,
    quality: undefined // PNG doesn't use quality
  },
  jpeg: {
    fullPage: true,
    omitBackground: false,
    quality: 90
  }
};

/**
 * Capture screenshot from Puppeteer page
 * @param {object} page - Puppeteer page instance
 * @param {object} options - Screenshot options
 * @param {string} [options.format='png'] - Output format ('png' or 'jpeg')
 * @param {number} [options.quality=90] - JPEG quality (0-100, ignored for PNG)
 * @param {boolean} [options.fullPage=true] - Capture full page or viewport only
 * @param {boolean} [options.omitBackground=false] - Transparent background (PNG only)
 * @returns {Promise<Buffer>} Screenshot buffer
 */
export async function captureScreenshot(page, options = {}) {
  const format = (options.format || 'png').toLowerCase();

  if (format !== 'png' && format !== 'jpeg') {
    logger.error('captureScreenshot', 'failure', `Invalid format: ${format}`, { format });
    throw new Error(`Invalid screenshot format: ${format}. Must be 'png' or 'jpeg'.`);
  }

  const defaults = DEFAULT_OPTIONS[format];
  const screenshotOptions = {
    type: format,
    fullPage: options.fullPage !== undefined ? options.fullPage : defaults.fullPage,
    omitBackground: options.omitBackground !== undefined ? options.omitBackground : defaults.omitBackground
  };

  // Only set quality for JPEG
  if (format === 'jpeg') {
    screenshotOptions.quality = options.quality !== undefined ? options.quality : defaults.quality;
  }

  logger.debug('captureScreenshot', 'start', `Capturing ${format.toUpperCase()} screenshot`, {
    format,
    fullPage: screenshotOptions.fullPage,
    quality: screenshotOptions.quality
  });

  try {
    const buffer = await page.screenshot(screenshotOptions);

    logger.info('captureScreenshot', 'success', `Screenshot captured (${buffer.length} bytes)`, {
      format,
      size: buffer.length
    });

    return buffer;
  } catch (error) {
    logger.error('captureScreenshot', 'failure', `Screenshot capture failed: ${error.message}`, {
      format,
      error: error.message
    });
    throw error;
  }
}

/**
 * Capture and save screenshot to file
 * @param {object} page - Puppeteer page instance
 * @param {string} outputPath - Output file path
 * @param {object} [options] - Screenshot options (see captureScreenshot)
 * @returns {Promise<object>} Result object { path, format, size }
 */
export async function saveScreenshot(page, outputPath, options = {}) {
  // Determine format from extension if not specified
  const ext = path.extname(outputPath).toLowerCase().replace('.', '');
  const format = options.format || ext || 'png';

  if (format !== 'png' && format !== 'jpeg' && format !== 'jpg') {
    logger.error('saveScreenshot', 'failure', `Invalid format: ${format}`, { outputPath, format });
    throw new Error(`Invalid screenshot format: ${format}. Must be 'png' or 'jpeg'.`);
  }

  // Normalize jpeg/jpg to jpeg
  const normalizedFormat = format === 'jpg' ? 'jpeg' : format;

  logger.info('saveScreenshot', 'start', `Saving screenshot to ${outputPath}`, {
    outputPath,
    format: normalizedFormat
  });

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    logger.error('saveScreenshot', 'failure', `Failed to create output directory: ${error.message}`, {
      outputDir,
      error: error.message
    });
    throw error;
  }

  // Capture screenshot
  const buffer = await captureScreenshot(page, { ...options, format: normalizedFormat });

  // Write to file
  try {
    await fs.writeFile(outputPath, buffer);

    const result = {
      path: outputPath,
      format: normalizedFormat,
      size: buffer.length
    };

    logger.info('saveScreenshot', 'success', `Screenshot saved (${buffer.length} bytes)`, result);

    return result;
  } catch (error) {
    logger.error('saveScreenshot', 'failure', `Failed to write screenshot: ${error.message}`, {
      outputPath,
      error: error.message
    });
    throw error;
  }
}

/**
 * Capture each page of document separately
 * @param {object} page - Puppeteer page instance
 * @param {string} outputDir - Output directory for screenshots
 * @param {string} basename - Base filename (without extension)
 * @param {object} [options] - Screenshot options
 * @param {string} [options.format='png'] - Output format
 * @param {number} [options.pageCount] - Total page count (if known, otherwise auto-detect)
 * @returns {Promise<Array>} Array of { path, page, format } objects
 */
export async function capturePageScreenshots(page, outputDir, basename, options = {}) {
  const format = (options.format || 'png').toLowerCase();
  const ext = format === 'jpeg' ? 'jpeg' : 'png';

  logger.info('capturePageScreenshots', 'start', `Capturing multi-page screenshots`, {
    outputDir,
    basename,
    format
  });

  // Ensure output directory exists
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    logger.error('capturePageScreenshots', 'failure', `Failed to create output directory: ${error.message}`, {
      outputDir,
      error: error.message
    });
    throw error;
  }

  // Auto-detect page count if not provided
  let pageCount = options.pageCount;
  if (!pageCount) {
    try {
      // Try to get page count from Paged.js if available
      pageCount = await page.evaluate(() => {
        if (window.PagedPolyfill && window.PagedPolyfill.chunker) {
          return window.PagedPolyfill.chunker.total;
        }
        // Fallback: count elements with page-breaking CSS
        const pages = document.querySelectorAll('.pagedjs_page');
        return pages.length || 1;
      });

      logger.debug('capturePageScreenshots', 'info', `Auto-detected ${pageCount} pages`, { pageCount });
    } catch (error) {
      logger.warn('capturePageScreenshots', 'warning', `Could not auto-detect page count, defaulting to 1`, {
        error: error.message
      });
      pageCount = 1;
    }
  }

  const results = [];

  // Capture each page
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const filename = `${basename}-page-${pageNum}.${ext}`;
    const outputPath = path.join(outputDir, filename);

    try {
      // For multi-page documents, we may need to scroll to or select specific pages
      // This is a simplified version; real implementation may need page navigation
      logger.debug('capturePageScreenshots', 'progress', `Capturing page ${pageNum}/${pageCount}`, {
        pageNum,
        pageCount
      });

      const buffer = await captureScreenshot(page, options);
      await fs.writeFile(outputPath, buffer);

      results.push({
        path: outputPath,
        page: pageNum,
        format
      });

      logger.trace('capturePageScreenshots', 'success', `Page ${pageNum} saved`, {
        path: outputPath,
        size: buffer.length
      });
    } catch (error) {
      logger.error('capturePageScreenshots', 'failure', `Failed to capture page ${pageNum}: ${error.message}`, {
        pageNum,
        error: error.message
      });
      throw error;
    }
  }

  logger.info('capturePageScreenshots', 'success', `Captured ${results.length} pages`, {
    count: results.length,
    outputDir
  });

  return results;
}

/**
 * Get screenshot options from profile configuration
 * @param {string} format - Output format ('png' or 'jpeg')
 * @param {object} profile - Profile configuration object
 * @returns {object} Merged screenshot options with defaults
 */
export function getScreenshotOptions(format, profile = {}) {
  const normalizedFormat = format.toLowerCase();

  if (normalizedFormat !== 'png' && normalizedFormat !== 'jpeg') {
    logger.error('getScreenshotOptions', 'failure', `Invalid format: ${format}`, { format });
    throw new Error(`Invalid screenshot format: ${format}. Must be 'png' or 'jpeg'.`);
  }

  const defaults = DEFAULT_OPTIONS[normalizedFormat];
  const profileOutputs = profile.outputs || {};
  const formatConfig = profileOutputs[normalizedFormat] || {};

  const options = {
    format: normalizedFormat,
    fullPage: formatConfig.fullPage !== undefined ? formatConfig.fullPage : defaults.fullPage,
    omitBackground: formatConfig.omitBackground !== undefined ? formatConfig.omitBackground : defaults.omitBackground
  };

  // Only include quality for JPEG
  if (normalizedFormat === 'jpeg') {
    options.quality = formatConfig.quality !== undefined ? formatConfig.quality : defaults.quality;
  }

  logger.debug('getScreenshotOptions', 'success', `Screenshot options resolved for ${format}`, {
    format: normalizedFormat,
    options
  });

  return options;
}
