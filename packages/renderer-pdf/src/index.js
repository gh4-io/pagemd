/**
 * @pagemd/renderer-pdf
 * PDF rendering orchestration using Puppeteer + Paged.js
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLogger, resolvePath, findProjectRoot } from '@pagemd/core';
import { renderDocument } from '@pagemd/renderer-web';
import { launchBrowser, closeBrowser, detectChrome } from './browser.js';
import { getPagedJsScript, injectPagedJs, getPagedJsConfig } from './pagedjs.js';
import {
  createDebugDir,
  shouldSaveDebug,
  saveDebugHtml,
  saveDebugScreenshot,
  cleanupDebugArtifacts
} from './debug.js';

const logger = createLogger('renderer.pdf');

/**
 * Render markdown file to PDF
 * @param {string} markdownPath - Path to markdown file
 * @param {object} options - Rendering options
 * @param {string} [options.profile='standard_letter'] - Profile ID
 * @param {string} [options.output] - Output path (default: alongside source with .pdf)
 * @param {boolean} [options.debug=false] - Enable debug artifacts
 * @param {'browser'|'cli'} [options.pagedjs='browser'] - Paged.js mode
 * @param {boolean} [options.headless=true] - Run headless
 * @param {object} [options.pdfOptions] - Additional PDF generation options
 * @returns {Promise<{pdfPath: string, pages: number}>}
 */
export async function renderPdf(markdownPath, options = {}) {
  const {
    profile = 'standard_letter',
    output,
    debug = false,
    pagedjs = 'browser',
    headless = true,
    pdfOptions = {},
    projectRoot
  } = options;

  logger.info('render.start', 'started', `Rendering PDF from ${markdownPath}`, {
    profile,
    pagedjs,
    debug
  });

  let browser = null;
  let debugDir = null;

  try {
    // Step 1: Render HTML using renderer-web
    logger.debug('render.html', 'started', 'Rendering HTML from markdown');
    const htmlResult = await renderDocument(markdownPath, {
      profile,
      format: 'html',
      projectRoot
    });

    if (!htmlResult || !htmlResult.html) {
      throw new Error('HTML rendering failed: no HTML content returned');
    }

    logger.debug('render.html', 'success', 'HTML rendered successfully', {
      htmlLength: htmlResult.html.length,
      profile: htmlResult.profile?.id || profile
    });

    // Step 2: Build Paged.js config from profile and frontmatter
    const pagedConfig = getPagedJsConfig(
      htmlResult.profile,
      htmlResult.frontmatter
    );

    // Step 3: Inject Paged.js polyfill into HTML
    logger.debug('render.inject', 'started', 'Injecting Paged.js polyfill');
    const injectedHtml = injectPagedJs(htmlResult.html, {
      pagedConfig,
      autoInit: true,
      mode: pagedjs
    });

    logger.debug('render.inject', 'success', 'Paged.js polyfill injected', {
      originalLength: htmlResult.html.length,
      injectedLength: injectedHtml.length
    });

    // Step 4: Determine output path
    const pdfPath = output || markdownPath.replace(/\.md$/i, '.pdf');
    const absolutePdfPath = path.isAbsolute(pdfPath)
      ? pdfPath
      : path.resolve(process.cwd(), pdfPath);

    // Ensure output directory exists
    await fs.mkdir(path.dirname(absolutePdfPath), { recursive: true });

    // Step 5: Create debug directory if needed
    if (debug || shouldSaveDebug(options, htmlResult.profile)) {
      debugDir = await createDebugDir(absolutePdfPath);
      logger.debug('render.debug', 'enabled', 'Debug artifacts will be saved', {
        debugDir
      });
    }

    // Step 6: Launch browser
    logger.debug('render.browser', 'started', 'Launching browser');
    browser = await launchBrowser({
      headless,
      debug
    });

    // Step 7: Create new page and set content
    logger.debug('render.page', 'started', 'Creating page and setting content');
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 816, // 8.5" at 96 DPI
      height: 1056, // 11" at 96 DPI
      deviceScaleFactor: 1
    });

    // Set content with base URL for relative paths
    const baseUrl = `file://${path.dirname(path.resolve(markdownPath))}/`;
    await page.setContent(injectedHtml, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    logger.debug('render.page', 'success', 'Page content set');

    // Step 8: Wait for Paged.js to complete rendering
    logger.debug('render.pagedjs', 'started', 'Waiting for Paged.js to complete');

    try {
      // Wait for Paged.js completion using the after callback
      // This is more reliable than polling DOM classes
      await page.waitForFunction(
        () => window.__pagedjs_complete === true,
        { timeout: 30000 }
      );

      // Small delay for CSS paint (using setTimeout - waitForTimeout deprecated in Puppeteer 24)
      await new Promise(resolve => setTimeout(resolve, 200));

      logger.debug('render.pagedjs', 'success', 'Paged.js rendering complete');
    } catch (error) {
      // Log what we actually found for debugging
      const domState = await page.evaluate(() => ({
        bodyClasses: document.body.className,
        pagedPagesCount: document.querySelectorAll('.pagedjs_page').length,
        pagedContainer: document.querySelector('.pagedjs_pages') !== null,
        completionFlag: window.__pagedjs_complete
      })).catch(() => ({}));

      logger.warn('render.pagedjs', 'timeout', 'Paged.js rendering may not have completed', {
        error: error.message,
        domState
      });
      // Continue anyway - content may still render
    }

    // Step 9: Save debug artifacts if enabled
    if (debugDir) {
      logger.debug('render.debug', 'started', 'Saving debug artifacts');

      // Save injected HTML
      await saveDebugHtml(injectedHtml, absolutePdfPath, {
        debugDir,
        suffix: '.paged'
      });

      // Save screenshot
      await saveDebugScreenshot(page, absolutePdfPath, {
        debugDir,
        format: 'png',
        fullPage: true
      });

      logger.debug('render.debug', 'success', 'Debug artifacts saved');
    }

    // Step 10: Generate PDF
    logger.debug('render.pdf', 'started', 'Generating PDF');

    const defaultPdfOptions = {
      path: absolutePdfPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      preferCSSPageSize: true // Use @page CSS rules if present
    };

    // Merge with user-provided PDF options
    const finalPdfOptions = {
      ...defaultPdfOptions,
      ...pdfOptions,
      path: absolutePdfPath // Always use resolved path
    };

    await page.pdf(finalPdfOptions);

    logger.debug('render.pdf', 'success', 'PDF generated', {
      path: absolutePdfPath
    });

    // Step 11: Get page count from PDF metadata
    const pdfBuffer = await fs.readFile(absolutePdfPath);
    const pageCount = countPdfPages(pdfBuffer);

    logger.info('render.complete', 'success', `PDF rendering complete: ${pageCount} pages`, {
      pdfPath: absolutePdfPath,
      pages: pageCount
    });

    // Step 12: Close browser
    await closeBrowser(browser);

    return {
      pdfPath: absolutePdfPath,
      pages: pageCount
    };

  } catch (error) {
    logger.error('render.failed', 'error', 'PDF rendering failed', {
      error: error.message,
      stack: error.stack
    });

    // Clean up browser on error
    if (browser) {
      await closeBrowser(browser);
    }

    throw error;
  }
}

/**
 * Count pages in PDF buffer
 * Uses simple regex to count /Type /Page occurrences
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {number} Page count
 */
function countPdfPages(pdfBuffer) {
  try {
    const pdfText = pdfBuffer.toString('latin1');
    const matches = pdfText.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 0;
  } catch (error) {
    logger.warn('pdf.pageCount', 'failed', 'Could not count PDF pages', {
      error: error.message
    });
    return 0;
  }
}

// Re-export utility functions for direct access
export {
  // Browser management
  detectChrome,
  launchBrowser,
  closeBrowser,
  // Paged.js utilities
  getPagedJsScript,
  injectPagedJs,
  getPagedJsConfig,
  // Debug utilities
  createDebugDir,
  shouldSaveDebug,
  saveDebugHtml,
  saveDebugScreenshot,
  cleanupDebugArtifacts
};
