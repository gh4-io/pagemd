/**
 * @pagemd/core/color-scheme
 * Color scheme resolution for PDF/HTML rendering
 *
 * Resolves color scheme from configuration cascade:
 * Priority: frontmatter > profile > env > default
 */

import { createLogger } from './logger.js';

const logger = createLogger('env');

/**
 * Resolve color scheme from configuration cascade
 *
 * @param {Object} options
 * @param {Object} [options.frontmatter] - Document frontmatter metadata
 * @param {Object} [options.profile] - Profile configuration
 * @param {string} [options.envDefault] - Environment variable value (from PAGEMD_COLOR_SCHEME)
 * @param {'pdf'|'html'} [options.outputFormat='pdf'] - Output format
 * @returns {'light'|'dark'|'auto'}
 *
 * @example
 * // PDF with default (light mode)
 * resolveColorScheme({ outputFormat: 'pdf' })
 * // => 'light'
 *
 * // HTML with default (auto - follows system)
 * resolveColorScheme({ outputFormat: 'html' })
 * // => 'auto'
 *
 * // Profile override
 * resolveColorScheme({
 *   profile: { rendering: { colorScheme: 'dark' } },
 *   outputFormat: 'pdf'
 * })
 * // => 'dark'
 *
 * // Frontmatter override (highest priority)
 * resolveColorScheme({
 *   frontmatter: { colorScheme: 'light' },
 *   profile: { rendering: { colorScheme: 'dark' } },
 *   outputFormat: 'pdf'
 * })
 * // => 'light'
 */
export function resolveColorScheme(options = {}) {
  const {
    frontmatter,
    profile,
    envDefault,
    outputFormat = 'pdf'
  } = options;

  let source = 'default';
  let value = null;

  // Priority 1: Frontmatter has highest priority
  // Check both snake_case (normalized) and camelCase (raw) for compatibility
  if (frontmatter?.color_scheme || frontmatter?.colorScheme) {
    value = frontmatter.color_scheme || frontmatter.colorScheme;
    source = 'frontmatter';
  }
  // Priority 2: Profile configuration
  else if (profile?.rendering?.colorScheme) {
    value = profile.rendering.colorScheme;
    source = 'profile';
  }
  // Priority 3: Environment variable
  else if (envDefault) {
    value = envDefault;
    source = 'environment';
  }
  // Priority 4: Output-format-aware default
  else {
    // PDF: light (print-friendly)
    // HTML: auto (follow system preference)
    value = outputFormat === 'pdf' ? 'light' : 'auto';
    source = `default (${outputFormat})`;
  }

  // Validate and normalize
  const normalized = validateColorScheme(value);

  logger.debug('color_scheme_resolved', 'ok', `Color scheme resolved to '${normalized}'`, {
    source,
    original: value,
    normalized,
    outputFormat
  });

  return normalized;
}

/**
 * Validate and normalize color scheme value
 *
 * @param {*} value - Color scheme value to validate
 * @returns {'light'|'dark'|'auto'}
 *
 * @example
 * validateColorScheme('LIGHT')  // => 'light'
 * validateColorScheme('Dark')   // => 'dark'
 * validateColorScheme('AUTO')   // => 'auto'
 * validateColorScheme('invalid') // => 'light' (default)
 * validateColorScheme(null)     // => 'light' (default)
 */
export function validateColorScheme(value) {
  const valid = ['light', 'dark', 'auto'];

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return 'light';
  }

  // Normalize to lowercase string
  const normalized = String(value).toLowerCase().trim();

  // Return if valid, otherwise default to 'light'
  return valid.includes(normalized) ? normalized : 'light';
}
