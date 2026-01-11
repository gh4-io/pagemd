/**
 * @pagemd/parser/fancy-lists
 * Fancy list support (letters, Roman numerals)
 */

import { markdownItFancyListPlugin } from 'markdown-it-fancy-lists'

export { markdownItFancyListPlugin }

/**
 * Check if fancy lists are enabled
 * Priority: options > env var > default (false)
 *
 * @param {Object} [options={}] - Parser options
 * @param {boolean} [options.fancyLists] - Explicit enable/disable (camelCase)
 * @param {boolean} [options.fancy_lists] - Explicit enable/disable (snake_case)
 * @returns {boolean} True if fancy lists should be enabled
 */
export function isFancyListsEnabled(options = {}) {
  // Frontmatter/profile override takes priority (camelCase)
  if (options.fancyLists !== undefined) {
    return Boolean(options.fancyLists)
  }

  // Frontmatter/profile override takes priority (snake_case)
  if (options.fancy_lists !== undefined) {
    return Boolean(options.fancy_lists)
  }

  // Fall back to env var (default: false - opt-in)
  const value = process.env.PAGEMD_FANCY_LISTS
  if (value === undefined || value === null || value === '') {
    return false
  }

  const lower = String(value).toLowerCase().trim()
  return lower === '1' || lower === 'true' || lower === 'yes'
}
