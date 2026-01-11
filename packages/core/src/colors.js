/**
 * @pagemd/core/colors
 * Color utilities for logger output
 *
 * Color behavior controlled by:
 * - PAGEMD_LOG_COLOR=1/true/yes: Force colors ON (even when piped)
 * - PAGEMD_LOG_COLOR=0/false/no: Force colors OFF
 * - Unset: Auto-detect based on TTY
 *
 * Uses raw ANSI escape codes to avoid ES module hoisting issues with
 * color libraries that cache detection at import time.
 */

/**
 * ANSI escape codes for terminal colors
 */
const ANSI = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

/**
 * Check if colors should be enabled
 * @returns {boolean} Whether to use colors
 */
function shouldUseColors() {
  const envValue = process.env.PAGEMD_LOG_COLOR;

  // If explicitly set, use that value
  if (envValue !== undefined && envValue !== '') {
    const lower = envValue.toLowerCase();
    if (lower === '1' || lower === 'true' || lower === 'yes') {
      return true;
    }
    if (lower === '0' || lower === 'false' || lower === 'no') {
      return false;
    }
  }

  // Auto-detect: use colors if stdout is a TTY
  return process.stdout.isTTY === true;
}

/**
 * Create a color function that respects PAGEMD_LOG_COLOR setting
 * @param {string} ansiCode - ANSI escape code for the color
 * @returns {function} Function that applies color when enabled
 */
function createColorFn(ansiCode) {
  return (text) => shouldUseColors() ? `${ansiCode}${text}${ANSI.reset}` : String(text);
}

/**
 * Color functions for log components
 */
export const colors = {
  // Timestamp - green
  timestamp: createColorFn(ANSI.green),

  // Level colors
  levelFatal: createColorFn(ANSI.red),
  levelError: createColorFn(ANSI.red),
  levelWarn: createColorFn(ANSI.yellow),
  levelInfo: createColorFn(ANSI.cyan),
  levelDebug: createColorFn(ANSI.gray),
  levelTrace: createColorFn(ANSI.gray),

  // App name - cyan
  app: createColorFn(ANSI.cyan),

  // Result colors
  resultSuccess: createColorFn(ANSI.green),
  resultFail: createColorFn(ANSI.red),
  resultWarn: createColorFn(ANSI.yellow),
  resultDefault: createColorFn(ANSI.white),

  // Component colors
  module: createColorFn(ANSI.white),
  section: createColorFn(ANSI.white),
  message: createColorFn(ANSI.white),
  data: createColorFn(ANSI.gray),

  // Delimiters (kept for backward compatibility if needed)
  delimiter: createColorFn(ANSI.gray)
};

/**
 * Get the appropriate color function for a log level
 * @param {string} level - Log level (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
 * @returns {string} Colored level string
 */
export function colorLevel(level) {
  if (level === undefined || level === null) {
    return colors.resultDefault('undefined');
  }
  const upperLevel = String(level).toUpperCase();
  switch (upperLevel) {
    case 'FATAL':
      return colors.levelFatal(level);
    case 'ERROR':
      return colors.levelError(level);
    case 'WARN':
      return colors.levelWarn(level);
    case 'INFO':
      return colors.levelInfo(level);
    case 'DEBUG':
      return colors.levelDebug(level);
    case 'TRACE':
      return colors.levelTrace(level);
    default:
      return colors.resultDefault(level);
  }
}

/**
 * Get the appropriate color function for a result value
 * @param {string} result - Result status
 * @returns {string} Colored result string
 */
export function colorResult(result) {
  if (result === undefined || result === null) {
    return colors.resultDefault('undefined');
  }
  const lowerResult = String(result).toLowerCase();

  // Success indicators
  if (lowerResult === 'success' || lowerResult === 'ok' || lowerResult === 'done') {
    return colors.resultSuccess(result);
  }

  // Failure indicators
  if (lowerResult === 'fail' || lowerResult === 'failure' || lowerResult === 'error') {
    return colors.resultFail(result);
  }

  // Warning/skip indicators
  if (lowerResult === 'warn' || lowerResult === 'warning' || lowerResult === 'skip' || lowerResult === 'partial') {
    return colors.resultWarn(result);
  }

  // Default (white) for other values
  return colors.resultDefault(result);
}

/**
 * Check if colors are currently enabled (for testing/debugging)
 * @returns {boolean} Current color state
 */
export function isColorsEnabled() {
  return shouldUseColors();
}
