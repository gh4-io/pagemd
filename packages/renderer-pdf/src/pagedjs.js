/**
 * @pagemd/renderer-pdf/pagedjs
 * Paged.js polyfill injection and configuration management
 *
 * Provides utilities for bundling and injecting Paged.js runtime into HTML,
 * supporting both in-browser polyfill mode and optional CLI prepass execution.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.pdf');

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
    ...frontmatterConfig
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

  // For browser mode, load the polyfill from bundled file
  // Note: In actual HTML, we'll need to either inline the script or serve it
  // For now, we reference it via a relative path that assumes it's been copied
  // to the output directory or is accessible via node_modules
  if (mode === 'browser') {
    // Add polyfill script tag
    scriptParts.push('<script src="./node_modules/pagedjs/dist/paged.polyfill.js"></script>');
  }

  // Add configuration and initialization
  if (autoInit) {
    const configJson = JSON.stringify(pagedConfig, null, 2);

    scriptParts.push(`<script>
  // PagedConfig for Paged.js initialization
  window.PagedConfig = ${configJson};

  // Optional: Add callback placeholder
  if (window.PagedConfig.after === undefined) {
    window.PagedConfig.after = (flow) => {
      console.log('Paged.js rendering complete:', flow.total, 'pages');
    };
  }
</script>`);
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
