/**
 * @pagemd/exporters/modes
 * Output mode determination and format selection logic
 *
 * Modes:
 * - ACTIVE_ONLY: Generate only when explicitly requested
 * - ALWAYS: Always generate this output type
 * - DISABLED: Never generate this output type
 *
 * Default mode is ACTIVE_ONLY for PDF, DISABLED for others.
 * Default output location is alongside source Markdown.
 */

import path from 'node:path';
import { createLogger } from '@pagemd/core';

const logger = createLogger('exporter');

/**
 * Output mode constants
 * @enum {string}
 */
export const OUTPUT_MODES = {
  ACTIVE_ONLY: 'ACTIVE_ONLY',  // Only output when explicitly requested
  ALWAYS: 'ALWAYS',            // Always generate this output type
  DISABLED: 'DISABLED'         // Never generate this output type
};

/**
 * Supported output formats
 * @constant {string[]}
 */
const SUPPORTED_FORMATS = ['html', 'pdf', 'png', 'jpeg'];

/**
 * Default mode per format
 * @constant {object}
 */
const DEFAULT_MODES = {
  pdf: OUTPUT_MODES.ACTIVE_ONLY,
  html: OUTPUT_MODES.DISABLED,
  png: OUTPUT_MODES.DISABLED,
  jpeg: OUTPUT_MODES.DISABLED
};

/**
 * Get output mode for a format
 * @param {string} format - Format name (html, pdf, png, jpeg)
 * @param {object} profile - Profile configuration
 * @param {object} [options={}] - CLI/API options
 * @param {object} [options.modes] - Mode overrides per format
 * @returns {string} Output mode (ACTIVE_ONLY, ALWAYS, or DISABLED)
 */
export function getOutputMode(format, profile, options = {}) {
  // Validate format
  if (!SUPPORTED_FORMATS.includes(format)) {
    logger.warn('mode-resolver', 'invalid-format', `Unsupported format: ${format}`, { format });
    return OUTPUT_MODES.DISABLED;
  }

  // 1. Check options override first
  if (options.modes && options.modes[format]) {
    const mode = options.modes[format];
    if (Object.values(OUTPUT_MODES).includes(mode)) {
      logger.debug('mode-resolver', 'success', `Using mode override for ${format}: ${mode}`, { format, mode });
      return mode;
    }
  }

  // 2. Check profile outputs configuration
  if (profile?.outputs?.[format]?.mode) {
    const mode = profile.outputs[format].mode;
    if (Object.values(OUTPUT_MODES).includes(mode)) {
      logger.debug('mode-resolver', 'success', `Using profile mode for ${format}: ${mode}`, { format, mode });
      return mode;
    }
  }

  // 3. Fall back to default
  const defaultMode = DEFAULT_MODES[format] || OUTPUT_MODES.DISABLED;
  logger.trace('mode-resolver', 'success', `Using default mode for ${format}: ${defaultMode}`, { format, mode: defaultMode });
  return defaultMode;
}

/**
 * Determine if a format should be output
 * @param {string} format - Format name
 * @param {object} profile - Profile configuration
 * @param {object} [options={}] - CLI/API options
 * @param {string[]} [options.formats] - Explicitly requested formats
 * @returns {boolean} True if format should be generated
 */
export function shouldOutput(format, profile, options = {}) {
  const mode = getOutputMode(format, profile, options);

  switch (mode) {
    case OUTPUT_MODES.ALWAYS:
      logger.debug('output-decision', 'success', `Format ${format} set to ALWAYS`, { format });
      return true;

    case OUTPUT_MODES.DISABLED:
      logger.debug('output-decision', 'skipped', `Format ${format} disabled`, { format });
      return false;

    case OUTPUT_MODES.ACTIVE_ONLY:
      // Check if explicitly requested
      const isRequested = !!(options.formats && Array.isArray(options.formats) && options.formats.includes(format));
      logger.debug('output-decision', isRequested ? 'success' : 'skipped',
        `Format ${format} is ACTIVE_ONLY, requested: ${isRequested}`,
        { format, requested: isRequested });
      return isRequested;

    default:
      logger.warn('output-decision', 'invalid-mode', `Unknown mode ${mode} for ${format}, disabling`, { format, mode });
      return false;
  }
}

/**
 * Get list of formats that should be output
 * @param {object} profile - Profile configuration
 * @param {object} [options={}] - CLI/API options
 * @param {string[]} [options.formats] - Explicitly requested formats
 * @returns {string[]} Array of format names to generate
 */
export function getEnabledFormats(profile, options = {}) {
  const enabledFormats = SUPPORTED_FORMATS.filter(format =>
    shouldOutput(format, profile, options)
  );

  logger.info('format-selection', 'success', `Enabled formats: ${enabledFormats.join(', ') || 'none'}`, {
    enabled: enabledFormats,
    total: SUPPORTED_FORMATS.length
  });

  return enabledFormats;
}

/**
 * Get output directory for generated files
 * @param {string} markdownPath - Absolute path to source Markdown file
 * @param {object} profile - Profile configuration
 * @param {object} [options={}] - CLI/API options
 * @param {string} [options.outputDir] - Explicit output directory override
 * @returns {string} Absolute path to output directory
 */
export function getOutputDir(markdownPath, profile, options = {}) {
  // 1. Check options override first
  if (options.outputDir) {
    const resolved = path.resolve(options.outputDir);
    logger.debug('output-dir', 'success', `Using options outputDir: ${resolved}`, { source: 'options', path: resolved });
    return resolved;
  }

  // 2. Check profile outputs.directory
  if (profile?.outputs?.directory) {
    const resolved = path.resolve(profile.outputs.directory);
    logger.debug('output-dir', 'success', `Using profile outputs.directory: ${resolved}`, { source: 'profile', path: resolved });
    return resolved;
  }

  // 3. Default: directory of markdown file (resolved to absolute)
  const markdownDir = path.resolve(path.dirname(markdownPath));
  logger.debug('output-dir', 'success', `Using markdown directory: ${markdownDir}`, { source: 'default', path: markdownDir });
  return markdownDir;
}
