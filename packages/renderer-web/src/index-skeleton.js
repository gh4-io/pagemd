/**
 * Index Skeleton Generator
 *
 * Generates an alphabetized index structure from index markers in HTML.
 * The skeleton includes all terms but page numbers are filled in later
 * by generatePdfIndex() after Paged.js pagination.
 *
 * This allows the index to be paginated properly (flow across pages)
 * since the content exists before Paged.js runs.
 */

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate index skeleton from HTML content
 * Creates alphabetized index structure with placeholder page numbers
 *
 * @param {string} html - HTML content containing index markers
 * @param {object} metadata - Document metadata (for index_title)
 * @returns {string} HTML with index placeholder replaced by skeleton
 */
export function generateIndexSkeleton(html, metadata = {}) {
  // Check if index is enabled and placeholder exists
  if (!html.includes('index-placeholder')) {
    return html;
  }

  // Check metadata - index must be explicitly enabled
  if (metadata.index === false) {
    // Remove placeholder if index disabled
    return html.replace(/<div class="index-placeholder"><\/div>/g, '');
  }

  // Extract index markers from HTML
  const markerRegex = /<span class="index-marker" data-term="([^"]*)" data-sort="([^"]*)"><\/span>/g;
  const terms = new Map(); // sortKey -> term

  let match;
  while ((match = markerRegex.exec(html)) !== null) {
    const term = decodeHtmlEntities(match[1]);
    const sortKey = decodeHtmlEntities(match[2]) || term.toLowerCase();
    if (!terms.has(sortKey)) {
      terms.set(sortKey, term);
    }
  }

  if (terms.size === 0) {
    // No terms found - remove placeholder
    return html.replace(/<div class="index-placeholder"><\/div>/g, '');
  }

  // Sort alphabetically and group by first letter
  const sorted = [...terms.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const groups = new Map();

  for (const [sortKey, term] of sorted) {
    const firstChar = sortKey[0] || '?';
    const letter = /[a-zA-Z]/.test(firstChar) ? firstChar.toUpperCase() : '#';
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push({ term, sortKey });
  }

  // Generate index HTML skeleton
  const indexTitle = metadata.index_title || 'Index';
  let indexHtml = '<nav class="book-index">';
  indexHtml += '<h2 class="index-title">' + escapeHtml(indexTitle) + '</h2>';

  // Sort letter groups (# symbols go last)
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    if (a[0] === '#') return 1;
    if (b[0] === '#') return -1;
    return a[0].localeCompare(b[0]);
  });

  for (const [letter, entries] of sortedGroups) {
    indexHtml += '<div class="index-section">';
    indexHtml += '<h3 class="index-letter">' + letter + '</h3>';
    indexHtml += '<dl class="index-entries">';
    for (const entry of entries) {
      // data-sort attribute used by generatePdfIndex() to fill page numbers
      indexHtml += '<dt>' + escapeHtml(entry.term) + '</dt>';
      indexHtml += '<dd class="index-pages" data-sort="' + escapeHtml(entry.sortKey) + '"></dd>';
    }
    indexHtml += '</dl></div>';
  }
  indexHtml += '</nav>';

  // Replace placeholder with skeleton
  return html.replace(/<div class="index-placeholder"><\/div>/, indexHtml);
}

/**
 * Decode HTML entities back to characters
 * @param {string} str - String with HTML entities
 * @returns {string} Decoded string
 */
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default generateIndexSkeleton;
