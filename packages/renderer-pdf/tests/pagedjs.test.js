/**
 * Tests for @pagemd/renderer-pdf/pagedjs
 * Paged.js polyfill injection and configuration management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { getPagedJsScript, getPagedJsConfig, injectPagedJs } from '../src/pagedjs.js';

// Mock logger
vi.mock('@pagemd/core', () => ({
  createLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('getPagedJsScript', () => {
  it('should return absolute path to paged.polyfill.js', () => {
    const scriptPath = getPagedJsScript();
    expect(scriptPath).toContain('paged.polyfill.js');
    expect(scriptPath).toContain('node_modules/pagedjs/dist');
  });

  it('should return path that exists on filesystem', () => {
    const scriptPath = getPagedJsScript();
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('should return consistent path across multiple calls', () => {
    const path1 = getPagedJsScript();
    const path2 = getPagedJsScript();
    expect(path1).toBe(path2);
  });

  it('should return path from node_modules relative to package', () => {
    const scriptPath = getPagedJsScript();
    expect(scriptPath).toMatch(/node_modules[/\\]pagedjs[/\\]dist[/\\]paged\.polyfill\.js$/);
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
      renderTo: undefined
    });
  });

  it('should return defaults when both inputs are null', () => {
    const config = getPagedJsConfig(null, null);
    expect(config).toEqual({
      auto: true,
      spread: 'none',
      orient: 'portrait',
      before: undefined,
      after: undefined,
      renderTo: undefined
    });
  });

  it('should return defaults when both inputs are undefined', () => {
    const config = getPagedJsConfig(undefined, undefined);
    expect(config).toEqual({
      auto: true,
      spread: 'none',
      orient: 'portrait',
      before: undefined,
      after: undefined,
      renderTo: undefined
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

  it('should prioritize top-level pagedjs over nested renderer.pagedjs', () => {
    const profile = {
      pagedjs: {
        spread: 'left'
      },
      renderer: {
        pagedjs: {
          spread: 'right'
        }
      }
    };
    const config = getPagedJsConfig(profile, {});
    expect(config.spread).toBe('left');
  });

  it('should handle all config options from profile', () => {
    const profile = {
      pagedjs: {
        auto: false,
        spread: 'right',
        orient: 'landscape',
        renderTo: '#output'
      }
    };
    const config = getPagedJsConfig(profile, {});
    expect(config.auto).toBe(false);
    expect(config.spread).toBe('right');
    expect(config.orient).toBe('landscape');
    expect(config.renderTo).toBe('#output');
  });

  it('should handle all config options from frontmatter', () => {
    const frontmatter = {
      pagedjs: {
        auto: false,
        spread: 'left',
        orient: 'landscape',
        renderTo: '.container'
      }
    };
    const config = getPagedJsConfig({}, frontmatter);
    expect(config.auto).toBe(false);
    expect(config.spread).toBe('left');
    expect(config.orient).toBe('landscape');
    expect(config.renderTo).toBe('.container');
  });

  it('should preserve undefined for optional hooks', () => {
    const config = getPagedJsConfig({}, {});
    expect(config.before).toBeUndefined();
    expect(config.after).toBeUndefined();
  });

  it('should allow setting hooks via profile', () => {
    const beforeHook = () => console.log('before');
    const afterHook = () => console.log('after');

    const profile = {
      pagedjs: {
        before: beforeHook,
        after: afterHook
      }
    };
    const config = getPagedJsConfig(profile, {});
    expect(config.before).toBe(beforeHook);
    expect(config.after).toBe(afterHook);
  });

  it('should override profile hooks with frontmatter hooks', () => {
    const profileHook = () => console.log('profile');
    const frontmatterHook = () => console.log('frontmatter');

    const profile = {
      pagedjs: {
        after: profileHook
      }
    };
    const frontmatter = {
      pagedjs: {
        after: frontmatterHook
      }
    };
    const config = getPagedJsConfig(profile, frontmatter);
    expect(config.after).toBe(frontmatterHook);
  });
});

describe('injectPagedJs', () => {
  const simpleHtml = '<html><body><h1>Test</h1></body></html>';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should inject script tags before closing body tag', () => {
    const result = injectPagedJs(simpleHtml);
    expect(result).toContain('<script');
    expect(result).toContain('PagedConfig');
    expect(result.indexOf('</body>')).toBeGreaterThan(result.indexOf('PagedConfig'));
  });

  it('should inject polyfill script reference in browser mode', () => {
    const result = injectPagedJs(simpleHtml, { mode: 'browser' });
    expect(result).toContain('paged.polyfill.js');
  });

  it('should not inject polyfill script reference in cli mode', () => {
    const result = injectPagedJs(simpleHtml, { mode: 'cli' });
    expect(result).not.toContain('paged.polyfill.js');
  });

  it('should default to browser mode', () => {
    const result = injectPagedJs(simpleHtml);
    expect(result).toContain('paged.polyfill.js');
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
    expect(result).not.toContain('window.PagedConfig');
  });

  it('should default to autoInit true', () => {
    const result = injectPagedJs(simpleHtml);
    expect(result).toContain('window.PagedConfig');
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

  it('should use default PagedConfig when not provided', () => {
    const result = injectPagedJs(simpleHtml);
    expect(result).toContain('"auto": true');
  });

  it('should properly format JSON in PagedConfig', () => {
    const config = {
      auto: true,
      spread: 'none',
      orient: 'portrait'
    };
    const result = injectPagedJs(simpleHtml, { pagedConfig: config });

    // Parse the injected config
    const match = result.match(/window\.PagedConfig = ({[\s\S]*?});/);
    expect(match).toBeTruthy();

    const parsedConfig = JSON.parse(match[1]);
    expect(parsedConfig).toEqual(config);
  });

  it('should add default after callback when not provided', () => {
    const result = injectPagedJs(simpleHtml);
    expect(result).toContain('window.PagedConfig.after');
    expect(result).toContain('Paged.js rendering complete');
  });

  it('should inject before last closing body tag in complex HTML', () => {
    const complexHtml = `
      <html>
        <head><title>Test</title></head>
        <body>
          <div>Content</div>
          <script>console.log("existing script");</script>
        </body>
      </html>
    `;

    const result = injectPagedJs(complexHtml);
    const bodyCloseIndex = result.lastIndexOf('</body>');
    const configIndex = result.indexOf('window.PagedConfig');

    expect(configIndex).toBeLessThan(bodyCloseIndex);
    expect(configIndex).toBeGreaterThan(0);
  });

  it('should preserve existing HTML structure', () => {
    const html = '<html><head><title>Test</title></head><body><h1>Title</h1><p>Content</p></body></html>';
    const result = injectPagedJs(html);

    expect(result).toContain('<title>Test</title>');
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>Content</p>');
  });

  it('should handle multiple script injections in browser mode', () => {
    const result = injectPagedJs(simpleHtml, { mode: 'browser', autoInit: true });

    // Should have polyfill script tag
    expect(result.match(/<script[^>]*src=/g)).toHaveLength(1);

    // Should have config script tag
    expect(result.match(/<script>/g)).toHaveLength(1);
  });

  it('should inject only config script when mode is cli', () => {
    const result = injectPagedJs(simpleHtml, { mode: 'cli', autoInit: true });

    // Should not have polyfill script tag
    expect(result).not.toContain('<script src=');

    // Should have config script tag
    expect(result).toContain('<script>');
    expect(result).toContain('window.PagedConfig');
  });

  it('should handle empty HTML string', () => {
    const result = injectPagedJs('');
    expect(result).toContain('<script');
  });

  it('should handle HTML with only opening body tag', () => {
    const html = '<html><body><h1>Test</h1>';
    const result = injectPagedJs(html);
    expect(result).toContain('PagedConfig');
    expect(result.endsWith('</script>')).toBe(true);
  });

  it('should reference correct polyfill path', () => {
    const result = injectPagedJs(simpleHtml, { mode: 'browser' });
    expect(result).toContain('./node_modules/pagedjs/dist/paged.polyfill.js');
  });

  it('should preserve whitespace and formatting around injection point', () => {
    const html = '<html>\n<body>\n<h1>Test</h1>\n</body>\n</html>';
    const result = injectPagedJs(html);

    expect(result).toContain('\n</body>');
  });

  it('should handle renderTo option in config', () => {
    const config = {
      auto: true,
      renderTo: '#content'
    };
    const result = injectPagedJs(simpleHtml, { pagedConfig: config });
    expect(result).toContain('"renderTo": "#content"');
  });

  it('should handle before and after hooks in config', () => {
    const config = {
      auto: true,
      before: null,
      after: null
    };
    const result = injectPagedJs(simpleHtml, { pagedConfig: config });
    expect(result).toContain('"before": null');
    expect(result).toContain('"after": null');
  });
});
