/**
 * @pagemd/exporters/bundler
 * Utilities for bundling static sites with shared assets
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLogger } from '@pagemd/core';
import { slugify } from '@pagemd/parser';

const logger = createLogger('exporter');

// Re-export slugify for convenience
export { slugify };

/**
 * @typedef {Object} Asset
 * @property {string} type - Asset type ('image', 'font', 'other')
 * @property {string} src - Absolute source path
 * @property {string} dest - Destination path relative to output dir (e.g., 'assets/image.png')
 * @property {string} originalRef - Original reference from HTML/CSS
 */

/**
 * Check if a path is relative (not absolute, not data URI, not external URL)
 * @param {string} src - Path to check
 * @returns {boolean} True if path is relative
 */
function isRelativePath(src) {
  if (!src) return false;
  // Skip data URIs
  if (src.startsWith('data:')) return false;
  // Skip external URLs
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(src)) return false;
  // Skip absolute paths starting with /
  if (src.startsWith('/')) return false;
  return true;
}

/**
 * Collect all assets referenced in HTML and CSS
 * @param {string} html - HTML content
 * @param {string} css - CSS content (if external)
 * @param {string} markdownDir - Source directory for resolving relative paths
 * @returns {Asset[]} Array of assets with source and destination paths
 */
export function collectAssets(html, css, markdownDir) {
  const assets = [];
  const seenDests = new Set();

  /**
   * Add asset to collection, handling filename collisions
   * @param {string} type - Asset type
   * @param {string} src - Source reference
   */
  function addAsset(type, src) {
    if (!isRelativePath(src)) return;

    // Resolve absolute source path
    const absoluteSrc = path.resolve(markdownDir, src);
    const basename = path.basename(src);
    let dest = `assets/${basename}`;

    // Handle filename collisions with -2, -3 suffixes
    if (seenDests.has(dest)) {
      const ext = path.extname(basename);
      const name = path.basename(basename, ext);
      let counter = 2;
      while (seenDests.has(`assets/${name}-${counter}${ext}`)) {
        counter++;
      }
      dest = `assets/${name}-${counter}${ext}`;
    }

    seenDests.add(dest);

    assets.push({
      type,
      src: absoluteSrc,
      dest,
      originalRef: src
    });
  }

  // Find all <img src="..."> in HTML
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    addAsset('image', match[1]);
  }

  // Find all <source src="..."> in HTML (for video/audio)
  const sourceRegex = /<source[^>]+src=["']([^"']+)["']/gi;
  while ((match = sourceRegex.exec(html)) !== null) {
    addAsset('media', match[1]);
  }

  // Find all url(...) in CSS
  if (css) {
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi;
    while ((match = urlRegex.exec(css)) !== null) {
      const src = match[1];
      // Determine type based on extension
      const ext = path.extname(src).toLowerCase();
      const fontExts = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
      const type = fontExts.includes(ext) ? 'font' : 'other';
      addAsset(type, src);
    }
  }

  logger.debug('assets', 'collected', `Found ${assets.length} assets`, {
    images: assets.filter(a => a.type === 'image').length,
    fonts: assets.filter(a => a.type === 'font').length,
    other: assets.filter(a => a.type === 'other' || a.type === 'media').length
  });

  return assets;
}

/**
 * Deduplicate assets by absolute source path
 * @param {Asset[]} assets - Array of assets
 * @returns {Asset[]} Deduplicated assets
 */
export function deduplicateAssets(assets) {
  const seen = new Map();

  for (const asset of assets) {
    if (!seen.has(asset.src)) {
      seen.set(asset.src, asset);
    }
  }

  return Array.from(seen.values());
}

/**
 * Copy assets to output directory
 * @param {Asset[]} assets - Asset list from collectAssets()
 * @param {string} outputDir - Output directory
 * @returns {Promise<{copied: number, failed: number, errors: string[]}>} Copy results
 */
export async function copyAssets(assets, outputDir) {
  const assetsDir = path.join(outputDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  let copied = 0;
  let failed = 0;
  const errors = [];

  for (const asset of assets) {
    const destPath = path.join(outputDir, asset.dest);

    try {
      // Ensure destination directory exists
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(asset.src, destPath);
      copied++;
      logger.debug('assets', 'copied', `Copied: ${asset.originalRef} → ${asset.dest}`);
    } catch (error) {
      failed++;
      const msg = `Failed to copy ${asset.originalRef}: ${error.message}`;
      errors.push(msg);
      logger.warn('assets', 'copy-failed', msg);
    }
  }

  logger.info('assets', 'summary', `Copied ${copied} assets, ${failed} failed`);

  return { copied, failed, errors };
}

/**
 * Create asset map from original reference to bundled path
 * @param {Asset[]} assets - Asset list
 * @returns {Map<string, string>} Map from original ref to bundled path
 */
export function createAssetMap(assets) {
  const map = new Map();
  for (const asset of assets) {
    map.set(asset.originalRef, asset.dest);
  }
  return map;
}

/**
 * Rewrite asset paths in HTML to point to bundled assets/
 * @param {string} html - HTML content
 * @param {Map<string, string>} assetMap - Map from original ref to bundled path
 * @returns {string} HTML with rewritten asset paths
 */
export function rewriteAssetPaths(html, assetMap) {
  let result = html;

  for (const [original, bundled] of assetMap) {
    // Escape special regex characters in the original path
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace in src attributes
    const srcRegex = new RegExp(`(src=["'])${escaped}(["'])`, 'gi');
    result = result.replace(srcRegex, `$1${bundled}$2`);

    // Replace in href attributes (for image links)
    const hrefRegex = new RegExp(`(href=["'])${escaped}(["'])`, 'gi');
    result = result.replace(hrefRegex, `$1${bundled}$2`);
  }

  return result;
}

/**
 * Rewrite asset paths in CSS to point to bundled assets/
 * @param {string} css - CSS content
 * @param {Map<string, string>} assetMap - Map from original ref to bundled path
 * @returns {string} CSS with rewritten asset paths
 */
export function rewriteCSSAssetPaths(css, assetMap) {
  let result = css;

  for (const [original, bundled] of assetMap) {
    // Escape special regex characters
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace in url() references
    const urlRegex = new RegExp(`url\\(['"]?${escaped}['"]?\\)`, 'gi');
    result = result.replace(urlRegex, `url(${bundled})`);
  }

  return result;
}

/**
 * Inject external stylesheet link into HTML
 * Adds <link> tag to <head> - does NOT remove existing inline styles
 * (inline styles may contain frontmatter CSS which is per-document)
 * @param {string} html - HTML content
 * @param {string} stylePath - Relative path to styles.css (e.g., './styles.css')
 * @returns {string} HTML with stylesheet link added
 */
export function injectStylesheet(html, stylePath) {
  const linkTag = `<link rel="stylesheet" href="${stylePath}">`;

  // Insert before </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `  ${linkTag}\n</head>`);
  }

  // Fallback: insert at start of <body>
  if (html.includes('<body')) {
    return html.replace(/<body([^>]*)>/, `<body$1>\n  ${linkTag}`);
  }

  // Last resort: prepend to HTML
  logger.warn('bundler', 'no-head', 'No <head> or <body> found, prepending stylesheet link');
  return linkTag + '\n' + html;
}

/**
 * Remove all inline <style> tags except those marked as frontmatter
 * Used when CSS is extracted to external file
 * @param {string} html - HTML content
 * @param {boolean} keepFrontmatter - Keep frontmatter styles inline (default: true)
 * @returns {string} HTML with inline styles removed
 */
export function removeInlineStyles(html, keepFrontmatter = true) {
  if (keepFrontmatter) {
    // Remove <style> tags except those with data-layer="frontmatter"
    return html.replace(/<style(?![^>]*data-layer="frontmatter")[^>]*>[\s\S]*?<\/style>\s*/gi, '');
  }
  // Remove all <style> tags
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>\s*/gi, '');
}

/**
 * Generate output filename from markdown path using slugify
 * @param {string} markdownPath - Path to markdown file
 * @returns {string} Slugified filename with .html extension
 */
export function generateOutputFilename(markdownPath) {
  const basename = path.basename(markdownPath, path.extname(markdownPath));
  const slug = slugify(basename);
  return `${slug}.html`;
}
