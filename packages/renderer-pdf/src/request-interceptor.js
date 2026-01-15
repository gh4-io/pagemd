/**
 * @pagemd/renderer-pdf/request-interceptor
 * Intercepts file:// URLs and serves local file content
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.pdf');

// MIME type mapping
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.css': 'text/css',
  '.js': 'application/javascript',
  default: 'application/octet-stream'
};

/**
 * Get MIME type for a file path based on extension
 * @param {string} filePath - Path to file
 * @returns {string} MIME type
 */
export function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || MIME_TYPES.default;
}

/**
 * Convert file:// URL to filesystem path
 * Handles both Windows (file:///C:/...) and Unix (file:///home/...) formats
 * @param {string} fileUrl - File URL to convert
 * @returns {string|null} Filesystem path, or null if not a file URL
 */
export function fileUrlToPath(fileUrl) {
  if (!fileUrl.startsWith('file://')) return null;
  let filePath = fileUrl.slice(7);
  // Windows: file:///C:/Users/... → /C:/Users/... → C:/Users/...
  if (/^\/[A-Za-z]:/.test(filePath)) {
    filePath = filePath.slice(1); // Remove leading slash
  }
  return path.normalize(decodeURIComponent(filePath));
}

/**
 * Setup request interception to serve local files
 * Intercepts file:// URLs and serves content directly
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} options - Options (reserved for future use)
 * @returns {Promise<void>}
 */
export async function setupRequestInterception(page, options = {}) {
  await page.setRequestInterception(true);

  page.on('request', async (request) => {
    // Check if another handler already responded
    if (request.isInterceptResolutionHandled()) return;

    const url = request.url();

    // Pass through non-file URLs to browser
    if (!url.startsWith('file://')) {
      request.continue();
      return;
    }

    const filePath = fileUrlToPath(url);
    if (!filePath) {
      request.abort('failed');
      return;
    }

    try {
      const content = await fs.readFile(filePath);
      const mimeType = getMimeType(filePath);

      logger.trace('intercept.request', 'served', `Served ${url}`, {
        path: filePath,
        size: content.length,
        mimeType
      });

      // Double-check handler state before responding
      if (!request.isInterceptResolutionHandled()) {
        request.respond({
          status: 200,
          contentType: mimeType,
          body: content
        });
      }
    } catch (error) {
      logger.warn('intercept.request', 'error', `Failed: ${url}: ${error.message}`);
      // Don't fail entire render for missing resource
      if (!request.isInterceptResolutionHandled()) {
        request.abort(error.code === 'ENOENT' ? 'blockedbyclient' : 'failed');
      }
    }
  });

  logger.debug('intercept.setup', 'success', 'Request interception enabled');
}
