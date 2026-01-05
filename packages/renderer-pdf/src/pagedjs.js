/**
 * @pagemd/renderer-pdf/pagedjs
 * Paged.js polyfill injection and configuration management
 *
 * Provides utilities for bundling and injecting Paged.js runtime into HTML,
 * supporting both in-browser polyfill mode and optional CLI prepass execution.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.pdf');

// Cache for Paged.js polyfill content (loaded once per process)
let pagedPolyfillCache = null;

/**
 * Get absolute path to bundled Paged.js polyfill script
 * @returns {string} Absolute path to paged.polyfill.js
 */
export function getPagedJsScript() {
  // Resolve from node_modules/pagedjs/dist/paged.polyfill.js
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);

  // Navigate from packages/renderer-pdf/src to project root, then into node_modules
  const scriptPath = join(currentDir, '../../../node_modules/pagedjs/dist/paged.polyfill.js');

  logger.trace('pagedjs.getScript', 'resolved', 'Located Paged.js polyfill', { scriptPath });

  return scriptPath;
}

/**
 * Get Paged.js polyfill content (cached after first load)
 * Reads the polyfill file and caches it for subsequent calls
 * @returns {string} Paged.js polyfill JavaScript content
 */
export function getPagedPolyfillContent() {
  if (!pagedPolyfillCache) {
    const scriptPath = getPagedJsScript();
    pagedPolyfillCache = readFileSync(scriptPath, 'utf-8');
    logger.debug('pagedjs.polyfill', 'loaded', 'Cached Paged.js polyfill content', {
      size: pagedPolyfillCache.length,
      path: scriptPath
    });
  }
  return pagedPolyfillCache;
}

/**
 * Build PagedConfig object from profile and frontmatter
 * Precedence: frontmatter > profile > defaults
 *
 * @param {object} profile - Profile manifest with optional pagedjs config
 * @param {object} frontmatter - Markdown frontmatter with optional pagedjs config
 * @returns {object} PagedConfig object for Paged.js initialization
 */
export function getPagedJsConfig(profile, frontmatter) {
  // Default configuration
  const defaults = {
    auto: true,              // Auto-start Paged.js on page load
    spread: 'none',          // Spread mode: 'none' | 'left' | 'right'
    orient: 'portrait',      // Page orientation: 'portrait' | 'landscape'
    before: undefined,       // Hook function called before rendering
    after: undefined,        // Hook function called after rendering
    renderTo: undefined      // Target element for rendered output
  };

  // Extract config from profile
  const profileConfig = profile?.pagedjs || profile?.renderer?.pagedjs || {};

  // Extract config from frontmatter
  const frontmatterConfig = frontmatter?.pagedjs || {};

  // Merge with precedence: frontmatter > profile > defaults
  const config = {
    ...defaults,
    ...profileConfig,
    ...frontmatterConfig,
    // Add TOC configuration from frontmatter
    toc: {
      includePageNumbers: frontmatter?.toc_page_numbers ?? true,
      levels: frontmatter?.toc_levels ?? 3,
      pageLevels: frontmatter?.toc_page_levels ?? frontmatter?.toc_levels ?? 3
    }
  };

  logger.debug('pagedjs.getConfig', 'merged', 'Built PagedConfig from sources', {
    hasProfileConfig: Object.keys(profileConfig).length > 0,
    hasFrontmatterConfig: Object.keys(frontmatterConfig).length > 0,
    finalConfig: config
  });

  return config;
}

/**
 * Inject Paged.js polyfill script into HTML string
 * Inserts script tag before closing </body> with optional PagedConfig
 *
 * @param {string} html - HTML string to inject into
 * @param {object} [options] - Injection options
 * @param {object} [options.pagedConfig] - PagedConfig object to inline
 * @param {boolean} [options.autoInit=true] - Whether to auto-initialize Paged.js
 * @param {string} [options.mode='browser'] - Execution mode: 'browser' | 'cli'
 * @returns {string} Modified HTML with Paged.js injected
 */
export function injectPagedJs(html, options = {}) {
  const {
    pagedConfig = { auto: true },
    autoInit = true,
    mode = 'browser'
  } = options;

  logger.trace('pagedjs.inject', 'started', 'Injecting Paged.js polyfill', {
    mode,
    autoInit,
    configKeys: Object.keys(pagedConfig)
  });

  // Build script content
  const scriptParts = [];

  // IMPORTANT: Config MUST come before polyfill - Paged.js reads PagedConfig on load
  if (autoInit) {
    const configJson = JSON.stringify(pagedConfig, null, 2);

    scriptParts.push(`<script>
  // Completion flag for Puppeteer detection
  window.__pagedjs_complete = false;

  // PagedConfig for Paged.js initialization (must be set before polyfill loads)
  window.PagedConfig = ${configJson};

  /**
   * Generate TOC with optional page numbers for PDF output
   * Updates existing nav.toc or fills .toc-placeholder
   * Page numbers are added only if config.toc.includePageNumbers is true
   */
  function generatePdfToc() {
    // Check for existing TOC (from HTML renderer) or placeholder
    const existingToc = document.querySelector('nav.toc');
    const placeholder = document.querySelector('.toc-placeholder');

    if (!existingToc && !placeholder) return;

    // Read configuration from PagedConfig, with directive attributes as override
    // Directive attrs may be on nav.toc (after toc.js processing) or .toc-placeholder
    const config = window.PagedConfig;
    const tocElement = existingToc || placeholder;

    // Directive data-pages overrides frontmatter toc_page_numbers
    const directivePages = tocElement?.dataset.pages;
    const includePageNumbers = directivePages !== undefined
      ? directivePages === 'true'
      : (config.toc?.includePageNumbers ?? true);
    // Directive data-levels overrides frontmatter toc_levels (only on placeholder, nav.toc already has structure)
    const placeholderLevels = placeholder?.dataset.levels;
    const maxLevel = placeholderLevels
      ? parseInt(placeholderLevels)
      : (config.toc?.levels ?? 3);
    // Directive data-page-levels overrides frontmatter toc_page_levels (which headings get page numbers)
    const directivePageLevels = tocElement?.dataset.pageLevels;
    const pageLevels = directivePageLevels
      ? parseInt(directivePageLevels)
      : (config.toc?.pageLevels ?? maxLevel);

    // Build heading-to-page map by walking paginated content
    // Uses pageLevels to determine which heading levels get page numbers
    const headingPageMap = new Map();
    const pages = document.querySelectorAll('.pagedjs_page');

    pages.forEach((page, pageIndex) => {
      const pageNum = pageIndex + 1;
      const selector = Array.from({length: pageLevels}, (_, i) => 'h' + (i + 1)).join(',');
      page.querySelectorAll(selector).forEach(h => {
        if (h.id) {
          headingPageMap.set(h.id, pageNum);
        }
      });
    });

    // If existing TOC, just add page numbers to links
    // Handle fragmented TOC (Paged.js may split across pages)
    if (existingToc) {
      const allTocs = document.querySelectorAll('nav.toc');
      let matched = 0;

      allTocs.forEach(toc => {
        toc.querySelectorAll('a[href^="#"]').forEach(link => {
          const targetId = link.getAttribute('href').substring(1);
          const pageNum = headingPageMap.get(targetId);
          // Only add page numbers if enabled and not already present
          if (includePageNumbers && pageNum && !link.querySelector('.toc-page')) {
            const pageSpan = document.createElement('span');
            pageSpan.className = 'toc-page';
            pageSpan.textContent = pageNum;
            link.appendChild(pageSpan);
            matched++;
          }
        });
      });
      console.log('PDF TOC updated with', matched, 'page numbers');
      return;
    }

    // Otherwise generate from scratch (placeholder case)
    const headings = [];
    document.querySelectorAll('.pagedjs_page').forEach((page, pageIndex) => {
      const pageNum = pageIndex + 1;
      const selector = Array.from({length: maxLevel}, (_, i) => 'h' + (i + 1)).join(',');
      page.querySelectorAll(selector).forEach(h => {
        const id = h.id || h.textContent.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]/g, '');
        headings.push({
          id,
          text: h.textContent.trim(),
          level: parseInt(h.tagName.substring(1)),
          page: pageNum
        });
      });
    });

    if (headings.length === 0) {
      placeholder.remove();
      return;
    }

    // Generate nested TOC with optional page numbers
    let html = '<nav class="toc"><h2 class="toc-title">Contents</h2><ul>';
    let currentLevel = 0;

    headings.forEach(h => {
      while (currentLevel < h.level) {
        if (currentLevel > 0) html += '<ul>';
        currentLevel++;
      }
      while (currentLevel > h.level) {
        html += '</ul></li>';
        currentLevel--;
      }
      html += '<li><a href="#' + h.id + '">' + h.text;
      // Only include page number span if enabled AND heading level is within pageLevels
      if (includePageNumbers && h.level <= pageLevels) {
        html += '<span class="toc-page">' + h.page + '</span>';
      }
      html += '</a>';
    });

    while (currentLevel > 0) {
      html += '</li></ul>';
      currentLevel--;
    }
    html += '</nav>';

    placeholder.outerHTML = html;
    console.log('PDF TOC generated with', headings.length, 'entries');
  }

  /**
   * Fill page numbers in pre-generated index skeleton
   * The skeleton is generated by renderer-web for proper pagination.
   * This function fills in the actual page numbers after Paged.js runs.
   *
   * Note: Paged.js fragments elements across pages, so .book-index may appear
   * as multiple fragments. We must search ALL fragments for index entries.
   */
  function generatePdfIndex() {
    // Check if any index structure exists (may be fragmented across pages)
    const indexEntries = document.querySelectorAll('.book-index .index-pages[data-sort]');
    if (indexEntries.length === 0) {
      // No skeleton entries - check for old-style placeholder
      const placeholder = document.querySelector('.index-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      return;
    }

    const pageNumbers = new Map(); // sortKey -> Set of page numbers

    // Walk all pages to find index markers and collect page numbers
    document.querySelectorAll('.pagedjs_page').forEach((page, pageIndex) => {
      const pageNum = pageIndex + 1;
      page.querySelectorAll('.index-marker').forEach(marker => {
        const sortKey = marker.dataset.sort || marker.dataset.term?.toLowerCase() || '';
        if (sortKey) {
          if (!pageNumbers.has(sortKey)) {
            pageNumbers.set(sortKey, new Set());
          }
          pageNumbers.get(sortKey).add(pageNum);
        }
      });
    });

    // Fill in page numbers for each index entry (across all fragments)
    let filledCount = 0;

    indexEntries.forEach(dd => {
      const sortKey = dd.dataset.sort;
      const pages = pageNumbers.get(sortKey);
      if (pages && pages.size > 0) {
        const pageList = [...pages].sort((a, b) => a - b).join(', ');
        dd.textContent = pageList;
        filledCount++;
      } else {
        dd.textContent = '—'; // Em dash for terms with no page refs
      }
    });

    console.log('PDF Index: filled page numbers for', filledCount, 'of', indexEntries.length, 'terms');
  }

  // Set completion flag when Paged.js finishes, after generating TOC and Index
  window.PagedConfig.after = (flow) => {
    console.log('Paged.js rendering complete:', flow.total, 'pages');
    generatePdfToc();
    generatePdfIndex();
    window.__pagedjs_complete = true;
  };
</script>`);
  }

  // For browser mode, inline the polyfill content directly
  // This ensures it works in Puppeteer headless context without external dependencies
  if (mode === 'browser') {
    const polyfillContent = getPagedPolyfillContent();
    scriptParts.push(`<script>${polyfillContent}</script>`);
    logger.trace('pagedjs.inject', 'polyfill-inlined', 'Inlined Paged.js polyfill', {
      size: polyfillContent.length
    });
  }

  const scriptBlock = scriptParts.join('\n');

  // Inject before closing </body> tag
  const bodyCloseIndex = html.lastIndexOf('</body>');

  if (bodyCloseIndex === -1) {
    logger.warn('pagedjs.inject', 'no-body-tag', 'No </body> tag found, appending to end of HTML');
    return html + '\n' + scriptBlock;
  }

  const modifiedHtml =
    html.slice(0, bodyCloseIndex) +
    scriptBlock + '\n' +
    html.slice(bodyCloseIndex);

  logger.debug('pagedjs.inject', 'success', 'Paged.js polyfill injected into HTML', {
    originalLength: html.length,
    modifiedLength: modifiedHtml.length,
    injectionPoint: bodyCloseIndex
  });

  return modifiedHtml;
}
