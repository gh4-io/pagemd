/**
 * @pagemd/core/logger
 * Universal logger for PageMD pipeline
 *
 * Log format: YYYY-MM-DD HH:mm:ss.SSS [level] [app] [module][section] result: message; data
 *
 * Color support:
 * - PAGEMD_LOG_COLOR=1/true/yes: Force colors ON
 * - PAGEMD_LOG_COLOR=0/false/no: Force colors OFF
 * - Unset: Auto-detect based on TTY
 */

import { colors, colorLevel, colorResult } from './colors.js';

const LOG_LEVELS = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  OFF: 99
};

const VALID_MODULES = [
  'cli',
  'discovery',
  'env',
  'profiles',
  'layout',
  'parser',
  'validation',
  'renderer.web',
  'renderer.pdf',
  'exporter',
  'io',
  'assets',
  'logging'
];

// Global log level configuration
let globalLogLevel = process.env.NODE_ENV === 'production' ? LOG_LEVELS.OFF : LOG_LEVELS.TRACE;

/**
 * Set the global log level
 * @param {string} level - One of: TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF
 */
export function setLogLevel(level) {
  const upperLevel = level.toUpperCase();
  if (!(upperLevel in LOG_LEVELS)) {
    throw new Error(`Invalid log level: ${level}. Must be one of: ${Object.keys(LOG_LEVELS).join(', ')}`);
  }
  globalLogLevel = LOG_LEVELS[upperLevel];
}

/**
 * Get current log level as string
 * @returns {string} Current log level name
 */
export function getLogLevel() {
  return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === globalLogLevel);
}

/**
 * Format timestamp in bracket-compatible format
 * @returns {string} Timestamp in format: YYYY-MM-DD HH:mm:ss.SSS
 */
export function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`;
}

/**
 * Format log entry with brackets and waterfall logic
 * @param {string} level - Log level
 * @param {string} module - Module name
 * @param {string} section - Section/component within module
 * @param {string} result - Result status (success, failure, etc.)
 * @param {string} message - Log message
 * @param {object} [data] - Optional structured data
 * @returns {string} Formatted log line
 */
function formatLogEntry(level, module, section, result, message, data) {
  const timestamp = getTimestamp();

  // Build metadata: timestamp [app] [level] [module][section]
  const metadata = [
    colors.timestamp(timestamp),
    `[${colors.app('PageMD-CLI')}]`,
    `[${colorLevel(level)}]`,
    `[${colors.module(module)}]`,
    `[${colors.section(section)}]`
  ].join(' ');

  // Waterfall logic for result/message/data
  const hasResult = result !== undefined && result !== null;
  const hasMessage = message !== undefined && message !== null;
  const hasData = data !== undefined && data !== null;

  let payload = '';

  if (hasData) {
    // If data is present, must show result/message/data (even if empty)
    const resultPart = hasResult ? colorResult(result) : '';
    const messagePart = hasMessage ? colors.message(String(message)) : '';
    payload = `${resultPart}: ${messagePart}; ${colors.data(JSON.stringify(data))}`;
  } else if (hasMessage) {
    // If message is present (no data), must show result/message
    const resultPart = hasResult ? colorResult(result) : '';
    payload = `${resultPart}: ${colors.message(String(message))}`;
  } else if (hasResult) {
    // If only result is present
    payload = `${colorResult(result)}:`;
  }
  // If none present, payload stays empty

  return payload ? `${metadata} ${payload}` : metadata;
}

/**
 * Write log entry to output
 * @param {string} formattedLog - Formatted log line
 * @param {string} level - Log level for determining output stream
 */
function writeLog(formattedLog, level) {
  // ERROR and FATAL go to stderr, others to stdout
  if (level === 'ERROR' || level === 'FATAL') {
    console.error(formattedLog);
  } else {
    console.log(formattedLog);
  }
}

/**
 * Create a logger instance for a specific module
 * @param {string} module - Module name (must be in VALID_MODULES)
 * @returns {object} Logger instance with trace/debug/info/warn/error/fatal methods
 */
export function createLogger(module) {
  if (!VALID_MODULES.includes(module)) {
    throw new Error(`Invalid module: ${module}. Must be one of: ${VALID_MODULES.join(', ')}`);
  }

  /**
   * Generic log method
   * @param {string} level - Log level name
   * @param {number} levelValue - Log level numeric value
   * @param {string} section - Section/component within module
   * @param {string} result - Result status
   * @param {string} message - Log message
   * @param {object} [data] - Optional structured data
   */
  function log(level, levelValue, section, result, message, data) {
    if (levelValue < globalLogLevel) {
      return; // Skip if below current log level
    }

    const formattedLog = formatLogEntry(level, module, section, result, message, data);
    writeLog(formattedLog, level);
  }

  return {
    /**
     * Log TRACE level message
     * @param {string} section - Section/component
     * @param {string} result - Result status
     * @param {string} message - Log message
     * @param {object} [data] - Optional data
     */
    trace(section, result, message, data) {
      log('TRACE', LOG_LEVELS.TRACE, section, result, message, data);
    },

    /**
     * Log DEBUG level message
     * @param {string} section - Section/component
     * @param {string} result - Result status
     * @param {string} message - Log message
     * @param {object} [data] - Optional data
     */
    debug(section, result, message, data) {
      log('DEBUG', LOG_LEVELS.DEBUG, section, result, message, data);
    },

    /**
     * Log INFO level message
     * @param {string} section - Section/component
     * @param {string} result - Result status
     * @param {string} message - Log message
     * @param {object} [data] - Optional data
     */
    info(section, result, message, data) {
      log('INFO', LOG_LEVELS.INFO, section, result, message, data);
    },

    /**
     * Log WARN level message
     * @param {string} section - Section/component
     * @param {string} result - Result status
     * @param {string} message - Log message
     * @param {object} [data] - Optional data
     */
    warn(section, result, message, data) {
      log('WARN', LOG_LEVELS.WARN, section, result, message, data);
    },

    /**
     * Log ERROR level message
     * @param {string} section - Section/component
     * @param {string} result - Result status
     * @param {string} message - Log message
     * @param {object} [data] - Optional data
     */
    error(section, result, message, data) {
      log('ERROR', LOG_LEVELS.ERROR, section, result, message, data);
    },

    /**
     * Log FATAL level message
     * @param {string} section - Section/component
     * @param {string} result - Result status
     * @param {string} message - Log message
     * @param {object} [data] - Optional data
     */
    fatal(section, result, message, data) {
      log('FATAL', LOG_LEVELS.FATAL, section, result, message, data);
    }
  };
}
