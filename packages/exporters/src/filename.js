/**
 * @pagemd/exporters/filename
 * Tokenized filename expansion and sanitization
 */

import { basename as getBasename, dirname, extname, join, resolve } from 'node:path';
import { createLogger } from '@pagemd/core';

const logger = createLogger('exporter');

/**
 * Supported filename tokens
 * @type {Object.<string, string>}
 */
export const FILENAME_TOKENS = {
  BASENAME: '{basename}',      // Original filename without extension
  DOCUMENT_ID: '{document_id}',
  REVISION: '{revision}',
  TITLE: '{title}',
  STATUS: '{status}',
  DATE: '{date}',              // YYYY-MM-DD format
  TIMESTAMP: '{timestamp}'     // YYYYMMDDHHmmss
};

/**
 * Default filename patterns per format
 * @type {Object.<string, string>}
 */
const DEFAULT_PATTERNS = {
  html: '{basename}.html',
  pdf: '{basename}.pdf',
  png: '{basename}.png',
  jpeg: '{basename}.jpg'
};

/**
 * Invalid filesystem characters (cross-platform)
 * @type {RegExp}
 */
const INVALID_CHARS = /[/\\:*?"<>|]/g;

/**
 * Sanitize filename by removing/replacing invalid characters
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    logger.warn('filename', 'invalid_input', 'Empty or non-string filename provided');
    return 'untitled';
  }

  // Replace invalid chars with underscore
  let sanitized = filename.replace(INVALID_CHARS, '_');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Collapse multiple underscores/dashes
  sanitized = sanitized.replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');

  // Remove leading/trailing underscores or dashes
  sanitized = sanitized.replace(/^[_-]+|[_-]+$/g, '');

  if (!sanitized) {
    logger.warn('filename', 'empty_after_sanitize', 'Filename empty after sanitization', { original: filename });
    return 'untitled';
  }

  logger.trace('filename', 'sanitized', 'Filename sanitized', { original: filename, sanitized });
  return sanitized;
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} [date] - Date to format (defaults to now)
 * @returns {string} Formatted date
 */
function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format timestamp as YYYYMMDDHHmmss
 * @param {Date} [date] - Date to format (defaults to now)
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Expand tokens in filename pattern
 * @param {string} pattern - Filename pattern with {tokens}
 * @param {object} context - Context data for token replacement
 * @param {string} context.basename - Original filename without extension
 * @param {object} [context.metadata] - Metadata object
 * @param {string} [context.format] - Output format (html, pdf, png, jpeg)
 * @returns {string} Expanded and sanitized filename
 */
export function expandFilename(pattern, context) {
  if (!pattern || typeof pattern !== 'string') {
    logger.warn('filename', 'invalid_pattern', 'Invalid filename pattern', { pattern });
    return sanitizeFilename(context?.basename || 'untitled');
  }

  const { basename = 'untitled', metadata: rawMetadata, format = 'pdf' } = context || {};
  const metadata = rawMetadata || {};

  let expanded = pattern;

  // Replace {basename}
  expanded = expanded.replace(/{basename}/g, basename);

  // Replace metadata tokens
  if (metadata.document_id) {
    expanded = expanded.replace(/{document_id}/g, String(metadata.document_id));
  }
  if (metadata.revision !== undefined) {
    expanded = expanded.replace(/{revision}/g, String(metadata.revision));
  }
  if (metadata.title) {
    expanded = expanded.replace(/{title}/g, String(metadata.title));
  }
  if (metadata.status) {
    expanded = expanded.replace(/{status}/g, String(metadata.status));
  }

  // Replace date tokens
  const now = new Date();
  expanded = expanded.replace(/{date}/g, formatDate(now));
  expanded = expanded.replace(/{timestamp}/g, formatTimestamp(now));

  // Remove any remaining unreplaced tokens
  const unreplacedTokens = expanded.match(/{[^}]+}/g);
  if (unreplacedTokens) {
    logger.debug('filename', 'unreplaced_tokens', 'Some tokens could not be replaced', {
      pattern,
      unreplaced: unreplacedTokens
    });
    // Replace unreplaced tokens with empty string
    expanded = expanded.replace(/{[^}]+}/g, '');
  }

  const sanitized = sanitizeFilename(expanded);

  logger.debug('filename', 'expanded', 'Filename pattern expanded', {
    pattern,
    expanded: sanitized,
    context: { basename, format, metadata_keys: Object.keys(metadata) }
  });

  return sanitized;
}

/**
 * Get output filename for a given format
 * @param {string} markdownPath - Path to source markdown file
 * @param {string} format - Output format (html, pdf, png, jpeg)
 * @param {object} profile - Profile configuration
 * @param {object} [metadata] - Document metadata
 * @returns {string} Output filename (basename only, not full path)
 */
export function getOutputFilename(markdownPath, format, profile, metadata = {}) {
  if (!markdownPath || typeof markdownPath !== 'string') {
    logger.error('filename', 'missing_markdown_path', 'Markdown path required');
    throw new Error('Markdown path is required');
  }

  if (!format || typeof format !== 'string') {
    logger.error('filename', 'missing_format', 'Output format required');
    throw new Error('Output format is required');
  }

  // Get basename without extension
  const fullBasename = getBasename(markdownPath);
  const ext = extname(fullBasename);
  const basename = ext ? fullBasename.slice(0, -ext.length) : fullBasename;

  // Get filename pattern from profile or use default
  let pattern = DEFAULT_PATTERNS[format];
  if (profile?.outputs?.[format]?.filename) {
    pattern = profile.outputs[format].filename;
  }

  const context = {
    basename,
    metadata,
    format
  };

  const filename = expandFilename(pattern, context);

  logger.info('filename', 'resolved', 'Output filename resolved', {
    markdownPath,
    format,
    pattern,
    filename
  });

  return filename;
}

/**
 * Get full output path for a given format
 * @param {string} markdownPath - Path to source markdown file
 * @param {string} format - Output format (html, pdf, png, jpeg)
 * @param {object} profile - Profile configuration
 * @param {object} [metadata] - Document metadata
 * @param {object} [options] - Additional options
 * @param {string} [options.outputDir] - Override output directory
 * @returns {string} Full absolute path to output file
 */
export function getOutputPath(markdownPath, format, profile, metadata = {}, options = {}) {
  const filename = getOutputFilename(markdownPath, format, profile, metadata);

  // Determine output directory
  let outputDir;
  if (options.outputDir) {
    outputDir = resolve(options.outputDir);
  } else if (profile?.outputs?.[format]?.outputDir) {
    outputDir = resolve(profile.outputs[format].outputDir);
  } else {
    // Default: same directory as markdown file
    outputDir = dirname(resolve(markdownPath));
  }

  const fullPath = join(outputDir, filename);

  logger.info('filename', 'output_path_resolved', 'Full output path resolved', {
    markdownPath,
    format,
    outputDir,
    filename,
    fullPath
  });

  return fullPath;
}
