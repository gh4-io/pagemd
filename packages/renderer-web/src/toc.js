/**
 * Table of Contents (TOC) generation module
 * Extracts headings from HTML and generates nested TOC structure
 */

import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.web');

/**
 * Generate slug from text (for heading IDs)
 * @param {string} text - Heading text
 * @returns {string} Slugified ID
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w-]/g, '')         // Remove non-word chars (except hyphens)
    .replace(/--+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');       // Trim leading/trailing hyphens
}

/**
 * Extract headings from HTML string
 * @param {string} html - HTML content
 * @param {number} maxLevel - Maximum heading level (1-6), default 3
 * @returns {Array<{id: string, text: string, level: number}>}
 */
export function extractHeadings(html, maxLevel = 3) {
  if (!html || typeof html !== 'string') {
    logger.warn('toc.extract', 'skip', 'Invalid HTML input for heading extraction');
    return [];
  }

  if (maxLevel < 1 || maxLevel > 6) {
    logger.warn('toc.extract', 'warn', `Invalid maxLevel: ${maxLevel}, using default 3`);
    maxLevel = 3;
  }

  const headings = [];
  // Pattern captures: level, attributes (including id), text
  const headingPattern = new RegExp(`<h([1-${maxLevel}])(?:\\s+([^>]*))?>([^<]+)</h[1-${maxLevel}]>`, 'gi');
  const idPattern = /\bid=["']([^"']+)["']/i;

  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const attrs = match[2] || '';
    const text = match[3].trim();

    if (!text) continue; // Skip empty headings

    // Extract existing id from attributes, or generate from text
    const idMatch = attrs.match(idPattern);
    const id = idMatch ? idMatch[1] : slugify(text);

    headings.push({
      id,
      text,
      level
    });
  }

  logger.debug('toc.extract', 'ok', `Extracted ${headings.length} headings (max level: ${maxLevel})`);
  return headings;
}

/**
 * Generate nested list HTML from flat headings array
 * @param {Array<{id: string, text: string, level: number}>} headings - Extracted headings
 * @returns {string} Nested <ul> HTML
 */
function buildNestedList(headings) {
  if (headings.length === 0) return '';

  const lines = [];
  let prevLevel = 0;

  for (let i = 0; i < headings.length; i++) {
    const { id, text, level } = headings[i];

    if (level > prevLevel) {
      // Going deeper - open new sublists
      for (let l = prevLevel; l < level; l++) {
        if (l > 0) {
          // Not the first item - open nested <ul> inside previous <li>
          lines.push('<ul>');
        }
        lines.push('<li>');
      }
    } else if (level < prevLevel) {
      // Going shallower - close sublists
      for (let l = prevLevel; l > level; l--) {
        lines.push('</li>');
        lines.push('</ul>');
      }
      // Close previous item at this level, start new one
      lines.push('</li>');
      lines.push('<li>');
    } else if (i > 0) {
      // Same level (and not first item) - close previous, open new
      lines.push('</li>');
      lines.push('<li>');
    }

    // Add the link
    lines.push(`<a href="#${id}">${text}</a>`);
    prevLevel = level;
  }

  // Close all remaining open elements
  for (let l = prevLevel; l > 0; l--) {
    lines.push('</li>');
    if (l > 1) {
      lines.push('</ul>');
    }
  }

  return lines.join('\n');
}

/**
 * Generate TOC HTML with nested lists
 * @param {Array<{id: string, text: string, level: number}>} headings - Extracted headings
 * @param {string} title - TOC title (default "Contents")
 * @param {object} [dataAttrs] - Data attributes to preserve from directive for PDF renderer
 * @returns {string} TOC HTML as <nav class="toc">...</nav>
 */
export function generateTocHtml(headings, title = 'Contents', dataAttrs = {}) {
  if (!headings || headings.length === 0) {
    logger.debug('toc.generate', 'skip', 'No headings provided, skipping TOC generation');
    return '';
  }

  const nestedList = buildNestedList(headings);

  // Build data attributes string for nav.toc (preserves directive settings for PDF renderer)
  let dataAttrStr = '';
  if (dataAttrs.pages !== undefined) {
    dataAttrStr += ` data-pages="${dataAttrs.pages}"`;
  }
  if (dataAttrs.pageLevels !== undefined) {
    dataAttrStr += ` data-page-levels="${dataAttrs.pageLevels}"`;
  }

  const html = `<nav class="toc"${dataAttrStr}>
<h2 class="toc-title">${title}</h2>
<ul>
${nestedList}
</ul>
</nav>`;

  logger.debug('toc.generate', 'ok', `Generated TOC with ${headings.length} entries`);
  return html;
}

/**
 * Add IDs to headings in HTML that don't already have them
 * @param {string} html - HTML content
 * @param {number} maxLevel - Maximum heading level to process (1-6)
 * @returns {string} HTML with heading IDs added
 */
function addHeadingIds(html, maxLevel = 6) {
  const headingPattern = new RegExp(`<h([1-${maxLevel}])(?:\\s+([^>]*))?>([^<]+)</h[1-${maxLevel}]>`, 'gi');

  return html.replace(headingPattern, (match, level, attrs, text) => {
    // Check if ID already exists
    const hasId = attrs && /\bid=/.test(attrs);

    if (hasId) {
      return match; // Keep existing
    }

    const id = slugify(text.trim());
    const newAttrs = attrs ? `${attrs} id="${id}"` : `id="${id}"`;

    return `<h${level} ${newAttrs}>${text}</h${level}>`;
  });
}

/**
 * Fill TOC placeholder in HTML
 * Replaces <div class="toc-placeholder"></div> with generated TOC
 * Also ensures headings have IDs for anchor links
 *
 * @param {string} html - HTML with .toc-placeholder div
 * @param {object} options - {title: 'Contents', levels: 3}
 * @param {string} [options.title='Contents'] - TOC title
 * @param {number} [options.levels=3] - Maximum heading level to include
 * @returns {string} HTML with TOC filled in
 */
export function fillTocPlaceholder(html, options = {}) {
  const { title = 'Contents', levels: optLevels = 3 } = options;

  if (!html || typeof html !== 'string') {
    logger.warn('toc.fill', 'skip', 'Invalid HTML input');
    return html;
  }

  // Check if placeholder exists and extract data-levels attribute
  const placeholderMatch = html.match(/<div\s+class=["']toc-placeholder["']([^>]*)><\/div>/i);

  if (!placeholderMatch) {
    logger.debug('toc.fill', 'skip', 'No TOC placeholder found in HTML');
    return html;
  }

  // Extract data attributes from placeholder (directive overrides frontmatter)
  const attrs = placeholderMatch[1] || '';
  const dataLevelsMatch = attrs.match(/data-levels=["'](\d+)["']/i);
  const dataPagesMatch = attrs.match(/data-pages=["']([^"']+)["']/i);
  const dataPageLevelsMatch = attrs.match(/data-page-levels=["'](\d+)["']/i);

  const levels = dataLevelsMatch ? parseInt(dataLevelsMatch[1], 10) : optLevels;

  // Preserve directive attributes for PDF renderer (passed through nav.toc data attributes)
  const dataAttrs = {};
  if (dataPagesMatch) {
    dataAttrs.pages = dataPagesMatch[1];
  }
  if (dataPageLevelsMatch) {
    dataAttrs.pageLevels = dataPageLevelsMatch[1];
  }

  logger.debug('toc.fill', 'config', `TOC levels: ${levels}, directive attrs: ${JSON.stringify(dataAttrs)}`);

  // Step 1: Add IDs to headings if missing
  const htmlWithIds = addHeadingIds(html, levels);

  // Step 2: Extract headings
  const headings = extractHeadings(htmlWithIds, levels);

  if (headings.length === 0) {
    logger.warn('toc.fill', 'skip', 'No headings found for TOC generation');
    // Remove placeholder
    return htmlWithIds.replace(/<div\s+class=["']toc-placeholder["'][^>]*><\/div>/i, '');
  }

  // Step 3: Generate TOC HTML (with data attributes for PDF renderer)
  const tocHtml = generateTocHtml(headings, title, dataAttrs);

  // Step 4: Replace placeholder
  const result = htmlWithIds.replace(
    /<div\s+class=["']toc-placeholder["'][^>]*><\/div>/i,
    tocHtml
  );

  logger.info('toc.fill', 'ok', `TOC placeholder filled with ${headings.length} entries`);
  return result;
}
