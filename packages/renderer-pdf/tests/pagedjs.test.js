/**
 * Tests for @pagemd/renderer-pdf/pagedjs
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { getPagedJsScript, getPagedJsConfig, injectPagedJs } from '../src/pagedjs.js';

describe('getPagedJsScript', () => {
  it('should return absolute path to paged.polyfill.js', () => {
    const scriptPath = getPagedJsScript();
    expect(scriptPath).toContain('paged.polyfill.js');
    // Path should be either bundled (vendor/) or source (node_modules/pagedjs/dist/)
    const isBundledPath = scriptPath.includes('vendor');
    const isSourcePath = scriptPath.includes('node_modules/pagedjs/dist');
    expect(isBundledPath || isSourcePath).toBe(true);
  });

  it('should return path that exists on filesystem', () => {
    const scriptPath = getPagedJsScript();
    expect(existsSync(scriptPath)).toBe(true);
  });
});

describe('getPagedJsConfig', () => {
  it('should return default config when no inputs provided', () => {
    const config = getPagedJsConfig({}, {});
    expect(config).toEqual({
      auto: true,
      spread: 'none',
      orient: 'portrait',
      before: undefined,
      after: undefined,
      renderTo: undefined,
      toc: {
        includePageNumbers: true,
        levels: 3,
        pageLevels: 3
      }
    });
  });

  it('should merge profile config over defaults', () => {
    const profile = {
      pagedjs: {
        spread: 'left',
        orient: 'landscape'
      }
    };
    const config = getPagedJsConfig(profile, {});
    expect(config.spread).toBe('left');
    expect(config.orient).toBe('landscape');
    expect(config.auto).toBe(true); // Default preserved
  });

  it('should merge frontmatter config over profile and defaults', () => {
    const profile = {
      pagedjs: {
        spread: 'left',
        auto: true
      }
    };
    const frontmatter = {
      pagedjs: {
        auto: false,
        orient: 'landscape'
      }
    };
    const config = getPagedJsConfig(profile, frontmatter);
    expect(config.auto).toBe(false); // Frontmatter wins
    expect(config.spread).toBe('left'); // Profile preserved
    expect(config.orient).toBe('landscape'); // Frontmatter wins
  });

  it('should handle nested renderer.pagedjs in profile', () => {
    const profile = {
      renderer: {
        pagedjs: {
          spread: 'right'
        }
      }
    };
    const config = getPagedJsConfig(profile, {});
    expect(config.spread).toBe('right');
  });

  it('should include TOC config from frontmatter', () => {
    const frontmatter = {
      toc_page_numbers: false,
      toc_levels: 2
    };
    const config = getPagedJsConfig({}, frontmatter);
    expect(config.toc).toEqual({
      includePageNumbers: false,
      levels: 2,
      pageLevels: 2
    });
  });

  it('should use default TOC config when frontmatter omits TOC fields', () => {
    const config = getPagedJsConfig({}, {});
    expect(config.toc).toEqual({
      includePageNumbers: true,
      levels: 3,
      pageLevels: 3
    });
  });

  it('should handle partial TOC config from frontmatter', () => {
    const frontmatter = {
      toc_levels: 4
      // toc_page_numbers omitted, should use default true
    };
    const config = getPagedJsConfig({}, frontmatter);
    expect(config.toc).toEqual({
      includePageNumbers: true,
      levels: 4,
      pageLevels: 4
    });
  });

  it('should handle separate toc_page_levels from frontmatter', () => {
    const frontmatter = {
      toc_levels: 3,
      toc_page_levels: 2
    };
    const config = getPagedJsConfig({}, frontmatter);
    expect(config.toc).toEqual({
      includePageNumbers: true,
      levels: 3,
      pageLevels: 2
    });
  });
});

describe('injectPagedJs', () => {
  const simpleHtml = '<html><body><h1>Test</h1></body></html>';

  it('should inject script tags before closing body tag', () => {
    const result = injectPagedJs(simpleHtml);
    expect(result).toContain('<script');
    expect(result).toContain('PagedConfig');
    expect(result.indexOf('</body>')).toBeGreaterThan(result.indexOf('PagedConfig'));
  });

  it('should inline polyfill content in browser mode', () => {
    const result = injectPagedJs(simpleHtml, { mode: 'browser' });
    // Polyfill is inlined (not referenced) for Puppeteer headless compatibility
    expect(result).toContain('window.Paged');
  });

  it('should include PagedConfig when autoInit is true', () => {
    const result = injectPagedJs(simpleHtml, {
      pagedConfig: { auto: true, spread: 'left' },
      autoInit: true
    });
    expect(result).toContain('window.PagedConfig');
    expect(result).toContain('"spread": "left"');
  });

  it('should not include PagedConfig when autoInit is false', () => {
    const result = injectPagedJs(simpleHtml, { autoInit: false });
    // Check we don't SET PagedConfig (polyfill may still reference it internally)
    expect(result).not.toContain('window.PagedConfig =');
  });

  it('should handle HTML without body tag by appending to end', () => {
    const htmlNoBody = '<html><h1>Test</h1></html>';
    const result = injectPagedJs(htmlNoBody);
    expect(result).toContain('PagedConfig');
    expect(result.endsWith('</script>')).toBe(true);
  });

  it('should inject custom PagedConfig options', () => {
    const customConfig = {
      auto: false,
      spread: 'right',
      orient: 'landscape'
    };
    const result = injectPagedJs(simpleHtml, { pagedConfig: customConfig });
    expect(result).toContain('"auto": false');
    expect(result).toContain('"spread": "right"');
    expect(result).toContain('"orient": "landscape"');
  });
});
