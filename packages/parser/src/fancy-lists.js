/**
 * @pagemd/parser/fancy-lists
 * Fancy list support (letters, Roman numerals)
 */

import { markdownItFancyListPlugin as baseFancyListPlugin } from 'markdown-it-fancy-lists'

/**
 * Map of type attribute values to CSS class names
 * Case-sensitive: 'a' vs 'A' produce different classes
 */
const TYPE_TO_CLASS = {
  'a': 'list-lower-alpha',
  'A': 'list-upper-alpha',
  'i': 'list-lower-roman',
  'I': 'list-upper-roman'
  // Note: '1' (decimal) is browser default, no class needed
}

/**
 * Enhanced fancy list plugin that adds CSS classes for reliable styling
 * Browsers treat type attribute as case-insensitive, but we need case-sensitive
 * styling (a→lowercase, A→uppercase). This plugin adds classes that CSS can target.
 *
 * @param {MarkdownIt} md - markdown-it instance
 */
export function markdownItFancyListPlugin(md) {
  // Apply the base fancy-lists plugin first
  md.use(baseFancyListPlugin)

  // Store the original renderer (or create a proxy if none exists)
  const defaultRenderer = md.renderer.rules.ordered_list_open ||
    function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options)
    }

  // Override the ordered_list_open renderer to add CSS classes
  md.renderer.rules.ordered_list_open = function(tokens, idx, options, env, self) {
    const token = tokens[idx]

    // Get the type attribute value (case-sensitive at token level)
    const typeAttr = token.attrGet('type')

    if (typeAttr && TYPE_TO_CLASS[typeAttr]) {
      // Add the corresponding CSS class
      token.attrJoin('class', TYPE_TO_CLASS[typeAttr])
    }

    // Call the original renderer
    return defaultRenderer(tokens, idx, options, env, self)
  }
}

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
