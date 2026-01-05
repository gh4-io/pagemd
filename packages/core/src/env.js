/**
 * @pagemd/core/env
 * Centralized environment variable handling for PageMD
 *
 * Precedence: CLI flags > env vars > frontmatter > profile > defaults
 * All PAGEMD_* variables are read once and cached.
 */

import path from 'path'
import os from 'os'

/** @type {Object|null} Cached env config (null = not loaded) */
let envConfig = null

/**
 * Valid log levels for PAGEMD_LOG_LEVEL
 */
const VALID_LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF']

/**
 * Valid output formats for PAGEMD_OUTPUT_FORMAT
 */
const VALID_OUTPUT_FORMATS = ['html', 'pdf', 'png', 'jpeg']

/**
 * Valid Paged.js modes for PAGEMD_PAGEDJS_MODE
 */
const VALID_PAGEDJS_MODES = ['browser', 'cli']

/**
 * Environment variable schema with types, defaults, and validation
 */
export const ENV_SCHEMA = {
  // Core configuration
  PAGEMD_PROFILE: { type: 'string', default: 'standard_letter', description: 'Default profile ID or path' },
  PAGEMD_OUTPUT_DIR: { type: 'path', default: null, description: 'Default output directory' },
  PAGEMD_OUTPUT_FORMAT: { type: 'array', default: ['html', 'pdf'], separator: ',', description: 'Comma-separated output formats' },
  PAGEMD_LOG_LEVEL: { type: 'enum', default: 'WARN', values: VALID_LOG_LEVELS, description: 'Logging verbosity' },
  PAGEMD_DEBUG: { type: 'boolean', default: false, description: 'Enable debug artifacts' },

  // Browser/PDF configuration
  PAGEMD_BROWSER_PATH: { type: 'path', default: null, description: 'Explicit Chrome/Chromium path' },
  PAGEMD_KEEP_CHROME: { type: 'boolean', default: false, description: 'Keep browser alive between renders' },
  PAGEMD_HEADLESS: { type: 'boolean', default: true, description: 'Browser headless mode' },
  PAGEMD_PAGEDJS_MODE: { type: 'enum', default: 'browser', values: VALID_PAGEDJS_MODES, description: 'Paged.js mode' },
  PAGEMD_TIMEOUT: { type: 'number', default: 30000, min: 1000, max: 600000, description: 'Rendering timeout (ms)' },

  // Output configuration
  PAGEMD_JPEG_QUALITY: { type: 'number', default: 90, min: 1, max: 100, description: 'JPEG output quality' },

  // Path configuration
  PAGEMD_PROJECT_ROOT: { type: 'path', default: null, description: 'Override project root detection' },
  PAGEMD_CONFIG_DIR: { type: 'path', default: null, description: 'Additional config search path' }
}

/**
 * Parse boolean from environment value
 * @param {string|undefined} value - Environment variable value
 * @param {boolean} defaultValue - Default if unset
 * @returns {boolean}
 */
export function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  const lower = String(value).toLowerCase().trim()
  if (lower === '1' || lower === 'true' || lower === 'yes') {
    return true
  }
  if (lower === '0' || lower === 'false' || lower === 'no') {
    return false
  }
  return defaultValue
}

/**
 * Parse number from environment value with bounds validation
 * @param {string|undefined} value - Environment variable value
 * @param {number} defaultValue - Default if unset/invalid
 * @param {number} [min] - Minimum allowed value
 * @param {number} [max] - Maximum allowed value
 * @returns {number}
 */
export function parseNumber(value, defaultValue, min, max) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  const num = parseInt(value, 10)
  if (isNaN(num)) {
    return defaultValue
  }
  if (min !== undefined && num < min) {
    return min
  }
  if (max !== undefined && num > max) {
    return max
  }
  return num
}

/**
 * Parse array from comma-separated environment value
 * @param {string|undefined} value - Environment variable value
 * @param {string[]} defaultValue - Default if unset
 * @param {string} [separator=','] - Separator character
 * @returns {string[]}
 */
export function parseArray(value, defaultValue, separator = ',') {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  return String(value)
    .split(separator)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)
}

/**
 * Normalize path for cross-platform compatibility
 * - Converts backslashes to forward slashes
 * - Expands ~ to home directory
 * - Resolves relative paths from cwd
 * @param {string|undefined} value - Path value
 * @returns {string|null}
 */
export function normalizePath(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  let normalized = String(value).trim()

  // Expand ~ to home directory
  if (normalized.startsWith('~')) {
    normalized = path.join(os.homedir(), normalized.slice(1))
  }

  // Expand %USERPROFILE% on Windows
  if (normalized.includes('%USERPROFILE%')) {
    normalized = normalized.replace(/%USERPROFILE%/gi, os.homedir())
  }

  // Normalize separators to forward slashes (internal consistency)
  normalized = normalized.replace(/\\/g, '/')

  return normalized
}

/**
 * Load environment configuration (cached after first call)
 * @returns {Object} Frozen environment configuration object
 */
export function loadEnvConfig() {
  if (envConfig !== null) {
    return envConfig
  }

  const config = {}
  const warnings = []

  for (const [envName, schema] of Object.entries(ENV_SCHEMA)) {
    const value = process.env[envName]
    const key = envNameToKey(envName)

    switch (schema.type) {
      case 'string':
        config[key] = value !== undefined && value !== '' ? String(value) : schema.default
        break

      case 'boolean':
        config[key] = parseBoolean(value, schema.default)
        break

      case 'number':
        config[key] = parseNumber(value, schema.default, schema.min, schema.max)
        if (value !== undefined && value !== '' && config[key] !== parseInt(value, 10)) {
          warnings.push(`${envName}: value "${value}" clamped to ${config[key]}`)
        }
        break

      case 'enum':
        if (value !== undefined && value !== '') {
          const upperValue = String(value).toUpperCase()
          if (schema.values.includes(upperValue)) {
            config[key] = upperValue
          } else {
            warnings.push(`${envName}: invalid value "${value}", using default "${schema.default}"`)
            config[key] = schema.default
          }
        } else {
          config[key] = schema.default
        }
        break

      case 'array':
        const parsed = parseArray(value, schema.default, schema.separator || ',')
        // Validate array values if schema defines valid options
        if (envName === 'PAGEMD_OUTPUT_FORMAT') {
          const valid = parsed.filter(f => VALID_OUTPUT_FORMATS.includes(f))
          const invalid = parsed.filter(f => !VALID_OUTPUT_FORMATS.includes(f))
          if (invalid.length > 0) {
            warnings.push(`${envName}: invalid formats ignored: ${invalid.join(', ')}`)
          }
          config[key] = valid.length > 0 ? valid : schema.default
        } else {
          config[key] = parsed
        }
        break

      case 'path':
        config[key] = normalizePath(value) || schema.default
        break

      default:
        config[key] = value || schema.default
    }
  }

  // Store warnings for later access
  config._warnings = warnings

  // Freeze to prevent modification
  envConfig = Object.freeze(config)

  return envConfig
}

/**
 * Convert PAGEMD_VAR_NAME to varName (camelCase)
 * @param {string} envName - Environment variable name
 * @returns {string} Camel case key
 */
function envNameToKey(envName) {
  // Remove PAGEMD_ prefix and convert to camelCase
  const withoutPrefix = envName.replace(/^PAGEMD_/, '')
  return withoutPrefix
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Get a specific env config value by key
 * @param {string} key - Config key in camelCase (e.g., 'profile', 'outputDir')
 * @returns {*} Config value
 */
export function getEnv(key) {
  const config = loadEnvConfig()
  return config[key]
}

/**
 * Get all env config values (for debugging/logging)
 * @returns {Object} All config values (frozen)
 */
export function getAllEnv() {
  return loadEnvConfig()
}

/**
 * Get env config warnings (invalid/clamped values)
 * @returns {string[]} Warning messages
 */
export function getEnvWarnings() {
  const config = loadEnvConfig()
  return config._warnings || []
}

/**
 * Reset env config cache (for testing)
 */
export function resetEnvConfig() {
  envConfig = null
}

/**
 * Merge CLI options with env vars (CLI takes precedence)
 * @param {Object} cliOptions - Options from CLI arguments
 * @returns {Object} Merged options
 */
export function mergeWithEnv(cliOptions = {}) {
  const env = loadEnvConfig()

  return {
    // Profile: CLI > env > default
    profile: cliOptions.profile || env.profile,

    // Output directory: CLI > env > null (alongside input)
    outputDir: cliOptions.outputDir || cliOptions['output-dir'] || env.outputDir,

    // Output formats: CLI > env > default
    output: cliOptions.output || env.outputFormat.join(','),

    // Debug: CLI > env > default
    debug: cliOptions.debug !== undefined ? cliOptions.debug : env.debug,

    // Pagedjs mode: CLI > env > default
    pagedjs: cliOptions.pagedjs || env.pagedjsMode.toLowerCase(),

    // Headless: env only (no CLI flag currently)
    headless: env.headless,

    // Timeout: env > default (profile can override later)
    timeout: env.timeout,

    // Browser path: env only
    browserPath: env.browserPath,

    // Keep Chrome: env only
    keepChrome: env.keepChrome,

    // JPEG quality: env > default
    jpegQuality: env.jpegQuality,

    // Project root: env only
    projectRoot: cliOptions.projectRoot || env.projectRoot,

    // Log level: CLI > env > default
    logLevel: cliOptions.logLevel || env.logLevel
  }
}
