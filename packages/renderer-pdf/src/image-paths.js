/**
 * @pagemd/renderer-pdf/image-paths
 * Image path resolution for PDF rendering
 *
 * Strategy 1 (Primary): Inject <base href> tag for relative path resolution
 * Strategy 2 (Fallback): Rewrite relative paths to absolute file:// URLs
 */

import path from 'node:path';
import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.pdf');

/**
 * Normalize path to forward slashes for file:// URLs
 * @param {string} filePath - Path to normalize
 * @returns {string} Path with forward slashes
 */
function normalizePathForUrl(filePath) {
  // Convert Windows backslashes to forward slashes
  return filePath.replace(/\\/g, '/');
}

/**
 * Build file:// URL from absolute path
 * Handles Windows drive letters (C:) and Unix paths
 * @param {string} absolutePath - Absolute file path
 * @returns {string} file:// URL
 */
function toFileUrl(absolutePath) {
  const normalized = normalizePathForUrl(absolutePath);
  // Windows paths need extra slash: file:///C:/path
  // Unix paths: file:///path
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

/**
 * Build base URL from markdown file path
 * @param {string} markdownPath - Path to markdown file
 * @returns {string} Base URL for relative path resolution
 */
export function buildBaseUrl(markdownPath) {
  const absoluteDir = path.dirname(path.resolve(markdownPath));
  const baseUrl = toFileUrl(absoluteDir);
  // Ensure trailing slash for directory base
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

/**
 * Inject <base href> tag into HTML for relative path resolution
 * Primary strategy - simple and handles all resource types (images, CSS, fonts)
 *
 * @param {string} html - HTML content
 * @param {string} markdownPath - Path to source markdown file
 * @returns {string} HTML with <base href> injected
 */
export function injectBaseHref(html, markdownPath) {
  const baseUrl = buildBaseUrl(markdownPath);

  // Check if <base> already exists
  if (/<base\s+href=/i.test(html)) {
    logger.debug('base-href', 'skip', 'Base href already present in HTML');
    return html;
  }

  // Check if <head> exists
  if (!/<head[^>]*>/i.test(html)) {
    logger.warn('base-href', 'skip', 'No <head> tag found in HTML');
    return html;
  }

  // Inject <base href> as first element in <head>
  const baseTag = `<base href="${baseUrl}">`;
  const result = html.replace(
    /(<head[^>]*>)/i,
    `$1\n  ${baseTag}`
  );

  logger.debug('base-href', 'success', `Injected base href: ${baseUrl}`);
  return result;
}

/**
 * Check if a URL is relative (not absolute, data:, or remote)
 * @param {string} url - URL to check
 * @returns {boolean} True if relative
 */
function isRelativeUrl(url) {
  if (!url) return false;
  // Skip absolute URLs, data URIs, and protocol-relative URLs
  if (/^(https?:|data:|file:|\/\/)/i.test(url)) return false;
  // Skip fragment-only URLs
  if (url.startsWith('#')) return false;
  return true;
}

/**
 * Resolve a relative URL to absolute file:// URL
 * @param {string} relativeUrl - Relative URL
 * @param {string} basePath - Base directory path
 * @returns {string} Absolute file:// URL
 */
function resolveToFileUrl(relativeUrl, basePath) {
  // Handle URL-encoded paths
  const decodedUrl = decodeURIComponent(relativeUrl);
  const absolutePath = path.resolve(basePath, decodedUrl);
  return toFileUrl(absolutePath);
}

/**
 * Rewrite relative paths in HTML to absolute file:// URLs
 * Fallback strategy - more precise but requires careful pattern matching
 *
 * Handles:
 * - <img src="...">
 * - <source src="...">
 * - <video src="..."> / <audio src="...">
 * - CSS url(...) in inline styles
 * - background-image in style attributes
 *
 * @param {string} html - HTML content
 * @param {string} markdownPath - Path to source markdown file
 * @returns {{html: string, rewritten: number}} Modified HTML and count of rewritten paths
 */
export function rewriteRelativePaths(html, markdownPath) {
  const basePath = path.dirname(path.resolve(markdownPath));
  let rewrittenCount = 0;

  // Pattern for src attributes: src="..." or src='...'
  const srcPattern = /(\ssrc=["'])([^"']+)(["'])/gi;

  let result = html.replace(srcPattern, (match, prefix, url, suffix) => {
    if (isRelativeUrl(url)) {
      const absoluteUrl = resolveToFileUrl(url, basePath);
      rewrittenCount++;
      logger.trace('path-rewrite', 'rewritten', `${url} → ${absoluteUrl}`);
      return `${prefix}${absoluteUrl}${suffix}`;
    }
    return match;
  });

  // Pattern for CSS url() in style attributes
  // Matches: style="...url(path)..." or style="...url('path')..." or style="...url("path")..."
  const styleUrlPattern = /(style=["'][^"']*url\()(['"]?)([^"')]+)(\2\))/gi;

  result = result.replace(styleUrlPattern, (match, prefix, quote, url, suffix) => {
    if (isRelativeUrl(url)) {
      const absoluteUrl = resolveToFileUrl(url, basePath);
      rewrittenCount++;
      logger.trace('path-rewrite', 'rewritten', `CSS url: ${url} → ${absoluteUrl}`);
      return `${prefix}${quote}${absoluteUrl}${suffix}`;
    }
    return match;
  });

  if (rewrittenCount > 0) {
    logger.debug('path-rewrite', 'success', `Rewrote ${rewrittenCount} relative paths`);
  }

  return { html: result, rewritten: rewrittenCount };
}

/**
 * Prepare HTML for PDF rendering with proper image path resolution
 * Uses base href injection as primary strategy, with path rewriting as fallback
 *
 * @param {string} html - HTML content
 * @param {string} markdownPath - Path to source markdown file
 * @param {object} options - Options
 * @param {boolean} options.useBaseHref - Use base href strategy (default: true)
 * @param {boolean} options.rewritePaths - Also rewrite paths as fallback (default: false)
 * @returns {string} HTML prepared for rendering
 */
export function prepareHtmlForRendering(html, markdownPath, options = {}) {
  const {
    useBaseHref = true,
    rewritePaths = false
  } = options;

  let result = html;

  // Primary strategy: inject <base href>
  if (useBaseHref) {
    result = injectBaseHref(result, markdownPath);
  }

  // Fallback strategy: rewrite paths (can be used in addition to base href for extra safety)
  if (rewritePaths) {
    const { html: rewritten } = rewriteRelativePaths(result, markdownPath);
    result = rewritten;
  }

  return result;
}
