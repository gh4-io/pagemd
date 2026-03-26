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
 * @param {number} [minLevel=1] - Minimum heading level (1-6), default 1
 * @returns {Array<{id: string, text: string, level: number}>}
 */
export function extractHeadings(html, maxLevel = 3, minLevel = 1) {
  if (!html || typeof html !== 'string') {
    logger.warn('toc.extract', 'skip', 'Invalid HTML input for heading extraction');
    return [];
  }

  if (maxLevel < 1 || maxLevel > 6) {
    logger.warn('toc.extract', 'warn', `Invalid maxLevel: ${maxLevel}, using default 3`);
    maxLevel = 3;
  }

  if (minLevel < 1 || minLevel > 6) {
    logger.warn('toc.extract', 'warn', `Invalid minLevel: ${minLevel}, using default 1`);
    minLevel = 1;
  }

  const headings = [];
  // Match all headings up to maxLevel, then filter by minLevel
  const headingPattern = new RegExp(`<h([1-${maxLevel}])(?:\\s+([^>]*))?>([^<]+)</h[1-${maxLevel}]>`, 'gi');
  const idPattern = /\bid=["']([^"']+)["']/i;

  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const attrs = match[2] || '';
    const text = match[3].trim();

    if (!text) continue; // Skip empty headings
    if (level < minLevel) continue; // Skip headings below minLevel

    // Extract existing id from attributes, or generate from text
    const idMatch = attrs.match(idPattern);
    const id = idMatch ? idMatch[1] : slugify(text);

    headings.push({
      id,
      text,
      level
    });
  }

  logger.debug('toc.extract', 'ok', `Extracted ${headings.length} headings (levels: ${minLevel}-${maxLevel})`);
  return headings;
}

/**
 * Extract section-scoped headings from HTML starting at a given position
 * Collects headings deeper than the boundary level until a same-or-higher heading is found
 *
 * @param {string} html - Full HTML content
 * @param {number} startIndex - Position in HTML to start scanning from (after the placeholder)
 * @param {number} boundaryLevel - The heading level that defines the section boundary (e.g. 2 for h2)
 * @param {number} [maxLevel=6] - Maximum heading level to include
 * @returns {Array<{id: string, text: string, level: number}>}
 */
export function extractSectionHeadings(html, startIndex, boundaryLevel, maxLevel = 6) {
  const headings = [];
  // Match all headings h1-h6 from startIndex onward
  const headingPattern = /<h([1-6])(?:\s+([^>]*))?>([^<]+)<\/h[1-6]>/gi;
  const idPattern = /\bid=["']([^"']+)["']/i;

  headingPattern.lastIndex = startIndex;

  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const attrs = match[2] || '';
    const text = match[3].trim();

    // Stop at heading at same or higher level as boundary
    if (level <= boundaryLevel) break;

    if (!text) continue;
    if (level > maxLevel) continue;

    const idMatch = attrs.match(idPattern);
    const id = idMatch ? idMatch[1] : slugify(text);

    headings.push({ id, text, level });
  }

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
 * @param {object} [opts] - Additional options
 * @param {boolean} [opts.section=false] - If true, generate section TOC (no title, different class)
 * @returns {string} TOC HTML as <nav class="toc">...</nav>
 */
export function generateTocHtml(headings, title = 'Contents', dataAttrs = {}, opts = {}) {
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

  const navClass = opts.section ? 'toc toc-section' : 'toc';
  const titleHtml = opts.section ? '' : `<h2 class="toc-title">${title}</h2>\n`;

  const html = `<nav class="${navClass}"${dataAttrStr}>
${titleHtml}<ul>
${nestedList}
</ul>
</nav>`;

  logger.debug('toc.generate', 'ok', `Generated ${opts.section ? 'section ' : ''}TOC with ${headings.length} entries`);
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
 * Parse data attributes from a placeholder element's attribute string
 * @param {string} attrStr - Raw attribute string from the placeholder tag
 * @returns {object} Parsed attributes
 */
function parsePlaceholderAttrs(attrStr) {
  const attrs = {};
  const dataLevelsMatch = attrStr.match(/data-levels=["'](\d+)["']/i);
  const dataMinLevelMatch = attrStr.match(/data-min-level=["'](\d+)["']/i);
  const dataPagesMatch = attrStr.match(/data-pages=["']([^"']+)["']/i);
  const dataPageLevelsMatch = attrStr.match(/data-page-levels=["'](\d+)["']/i);
  const dataScopeMatch = attrStr.match(/data-scope=["']([^"']+)["']/i);

  if (dataLevelsMatch) attrs.levels = parseInt(dataLevelsMatch[1], 10);
  if (dataMinLevelMatch) attrs.minLevel = parseInt(dataMinLevelMatch[1], 10);
  if (dataPagesMatch) attrs.pages = dataPagesMatch[1];
  if (dataPageLevelsMatch) attrs.pageLevels = dataPageLevelsMatch[1];
  if (dataScopeMatch) attrs.scope = dataScopeMatch[1];

  return attrs;
}

/**
 * Find the heading immediately before a given position in HTML
 * @param {string} html - HTML content
 * @param {number} placeholderIndex - Position of the placeholder in the HTML
 * @returns {{level: number, endIndex: number}|null} The heading level and its end position, or null
 */
function findPrecedingHeading(html, placeholderIndex) {
  const headingPattern = /<h([1-6])(?:\s+[^>]*)?>([^<]+)<\/h[1-6]>/gi;
  let lastMatch = null;

  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    // Stop if we've passed the placeholder position
    if (match.index >= placeholderIndex) break;
    lastMatch = {
      level: parseInt(match[1], 10),
      endIndex: match.index + match[0].length
    };
  }

  return lastMatch;
}

/**
 * Fill TOC placeholders in HTML
 * Handles global TOC (full document) and section-scoped TOC (local headings)
 * Replaces <div class="toc-placeholder"></div> with generated TOC
 * Also ensures headings have IDs for anchor links
 *
 * @param {string} html - HTML with .toc-placeholder div(s)
 * @param {object} options - TOC configuration from frontmatter
 * @param {string} [options.title='Contents'] - TOC title
 * @param {number} [options.levels=3] - Maximum heading level to include
 * @param {number} [options.minLevel=2] - Minimum heading level to include (default skips h1)
 * @returns {string} HTML with TOC(s) filled in
 */
export function fillTocPlaceholder(html, options = {}) {
  const { title = 'Contents', levels: optLevels = 3, minLevel: optMinLevel = 2 } = options;

  if (!html || typeof html !== 'string') {
    logger.warn('toc.fill', 'skip', 'Invalid HTML input');
    return html;
  }

  // Find all placeholders
  const placeholderPattern = /<div\s+class=["']toc-placeholder["']([^>]*)><\/div>/gi;
  const placeholders = [];
  let match;
  while ((match = placeholderPattern.exec(html)) !== null) {
    placeholders.push({
      fullMatch: match[0],
      attrs: parsePlaceholderAttrs(match[1] || ''),
      index: match.index
    });
  }

  if (placeholders.length === 0) {
    logger.debug('toc.fill', 'skip', 'No TOC placeholder found in HTML');
    return html;
  }

  // Step 1: Add IDs to all headings (h1-h6) so anchor links work
  let result = addHeadingIds(html, 6);

  // Process section TOCs first (back-to-front to preserve indices)
  // Then process global TOC
  const globalPlaceholders = placeholders.filter(p => p.attrs.scope !== 'section');
  const sectionPlaceholders = placeholders.filter(p => p.attrs.scope === 'section');

  // Process section TOCs (back-to-front to maintain string indices)
  for (let i = sectionPlaceholders.length - 1; i >= 0; i--) {
    const placeholder = sectionPlaceholders[i];
    const maxLevel = placeholder.attrs.levels || optLevels;

    // Re-find the placeholder in the (possibly modified) result
    const phIdx = result.indexOf(placeholder.fullMatch);
    if (phIdx === -1) continue;

    // Find the heading immediately before this placeholder
    const preceding = findPrecedingHeading(result, phIdx);
    if (!preceding) {
      // No preceding heading - remove placeholder
      result = result.replace(placeholder.fullMatch, '');
      logger.warn('toc.fill.section', 'skip', 'No preceding heading found for section TOC');
      continue;
    }

    const boundaryLevel = preceding.level;
    const sectionHeadings = extractSectionHeadings(result, phIdx + placeholder.fullMatch.length, boundaryLevel, maxLevel);

    if (sectionHeadings.length === 0) {
      result = result.replace(placeholder.fullMatch, '');
      logger.debug('toc.fill.section', 'skip', 'No sub-headings found for section TOC');
      continue;
    }

    const sectionTocHtml = generateTocHtml(sectionHeadings, '', {}, { section: true });
    result = result.replace(placeholder.fullMatch, sectionTocHtml);
    logger.info('toc.fill.section', 'ok', `Section TOC filled with ${sectionHeadings.length} entries`);
  }

  // Process global TOC placeholders
  for (const placeholder of globalPlaceholders) {
    const levels = placeholder.attrs.levels || optLevels;
    const minLevel = placeholder.attrs.minLevel || optMinLevel;

    // Preserve directive attributes for PDF renderer
    const dataAttrs = {};
    if (placeholder.attrs.pages !== undefined) {
      dataAttrs.pages = placeholder.attrs.pages;
    }
    if (placeholder.attrs.pageLevels !== undefined) {
      dataAttrs.pageLevels = placeholder.attrs.pageLevels;
    }

    logger.debug('toc.fill', 'config', `TOC levels: ${minLevel}-${levels}, directive attrs: ${JSON.stringify(dataAttrs)}`);

    const headings = extractHeadings(result, levels, minLevel);

    if (headings.length === 0) {
      logger.warn('toc.fill', 'skip', 'No headings found for TOC generation');
      result = result.replace(placeholder.fullMatch, '');
      continue;
    }

    const tocHtml = generateTocHtml(headings, title, dataAttrs);
    result = result.replace(placeholder.fullMatch, tocHtml);
    logger.info('toc.fill', 'ok', `TOC placeholder filled with ${headings.length} entries (levels: ${minLevel}-${levels})`);
  }

  return result;
}
