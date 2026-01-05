/**
 * @pagemd/exporters/modes tests
 * Tests for output mode handling and format selection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OUTPUT_MODES,
  getOutputMode,
  shouldOutput,
  getEnabledFormats,
  getOutputDir
} from '../src/modes.js';
import path from 'node:path';

describe('OUTPUT_MODES constant', () => {
  it('defines all expected modes', () => {
    expect(OUTPUT_MODES.ACTIVE_ONLY).toBe('ACTIVE_ONLY');
    expect(OUTPUT_MODES.ALWAYS).toBe('ALWAYS');
    expect(OUTPUT_MODES.DISABLED).toBe('DISABLED');
  });

  it('has exactly 3 modes', () => {
    expect(Object.keys(OUTPUT_MODES)).toHaveLength(3);
  });
});

describe('getOutputMode', () => {
  describe('format validation', () => {
    it('returns DISABLED for unsupported formats', () => {
      const profile = {};
      expect(getOutputMode('docx', profile)).toBe(OUTPUT_MODES.DISABLED);
      expect(getOutputMode('txt', profile)).toBe(OUTPUT_MODES.DISABLED);
      expect(getOutputMode('invalid', profile)).toBe(OUTPUT_MODES.DISABLED);
    });

    it('accepts all supported formats', () => {
      const profile = {};
      const supportedFormats = ['html', 'pdf', 'png', 'jpeg'];
      supportedFormats.forEach(format => {
        const mode = getOutputMode(format, profile);
        expect(Object.values(OUTPUT_MODES)).toContain(mode);
      });
    });
  });

  describe('priority order: options > profile > defaults', () => {
    it('uses options.modes override when provided', () => {
      const profile = {
        outputs: {
          pdf: { mode: OUTPUT_MODES.ALWAYS }
        }
      };
      const options = {
        modes: {
          pdf: OUTPUT_MODES.DISABLED
        }
      };

      expect(getOutputMode('pdf', profile, options)).toBe(OUTPUT_MODES.DISABLED);
    });

    it('uses profile mode when no options override', () => {
      const profile = {
        outputs: {
          html: { mode: OUTPUT_MODES.ALWAYS }
        }
      };

      expect(getOutputMode('html', profile)).toBe(OUTPUT_MODES.ALWAYS);
    });

    it('uses default mode when neither options nor profile specified', () => {
      const profile = {};

      // Defaults per code: pdf=ACTIVE_ONLY, others=DISABLED
      expect(getOutputMode('pdf', profile)).toBe(OUTPUT_MODES.ACTIVE_ONLY);
      expect(getOutputMode('html', profile)).toBe(OUTPUT_MODES.DISABLED);
      expect(getOutputMode('png', profile)).toBe(OUTPUT_MODES.DISABLED);
      expect(getOutputMode('jpeg', profile)).toBe(OUTPUT_MODES.DISABLED);
    });

    it('ignores invalid mode in options override', () => {
      const profile = {
        outputs: {
          pdf: { mode: OUTPUT_MODES.ALWAYS }
        }
      };
      const options = {
        modes: {
          pdf: 'INVALID_MODE'
        }
      };

      // Should fall through to profile
      expect(getOutputMode('pdf', profile, options)).toBe(OUTPUT_MODES.ALWAYS);
    });

    it('ignores invalid mode in profile', () => {
      const profile = {
        outputs: {
          html: { mode: 'MAYBE' }
        }
      };

      // Should fall through to default
      expect(getOutputMode('html', profile)).toBe(OUTPUT_MODES.DISABLED);
    });
  });

  describe('edge cases', () => {
    it('handles missing profile gracefully', () => {
      expect(getOutputMode('pdf', null)).toBe(OUTPUT_MODES.ACTIVE_ONLY);
      expect(getOutputMode('pdf', undefined)).toBe(OUTPUT_MODES.ACTIVE_ONLY);
    });

    it('handles empty profile object', () => {
      expect(getOutputMode('pdf', {})).toBe(OUTPUT_MODES.ACTIVE_ONLY);
    });

    it('handles partial profile.outputs', () => {
      const profile = {
        outputs: {
          pdf: {}  // No mode specified
        }
      };
      expect(getOutputMode('pdf', profile)).toBe(OUTPUT_MODES.ACTIVE_ONLY);
    });

    it('handles empty options.modes', () => {
      const profile = {};
      const options = { modes: {} };
      expect(getOutputMode('pdf', profile, options)).toBe(OUTPUT_MODES.ACTIVE_ONLY);
    });
  });
});

describe('shouldOutput', () => {
  describe('ALWAYS mode', () => {
    it('returns true regardless of options.formats', () => {
      const profile = {
        outputs: {
          pdf: { mode: OUTPUT_MODES.ALWAYS }
        }
      };

      expect(shouldOutput('pdf', profile)).toBe(true);
      expect(shouldOutput('pdf', profile, {})).toBe(true);
      expect(shouldOutput('pdf', profile, { formats: [] })).toBe(true);
      expect(shouldOutput('pdf', profile, { formats: ['html'] })).toBe(true);
    });
  });

  describe('DISABLED mode', () => {
    it('returns false even when explicitly requested', () => {
      const profile = {
        outputs: {
          html: { mode: OUTPUT_MODES.DISABLED }
        }
      };

      expect(shouldOutput('html', profile)).toBe(false);
      expect(shouldOutput('html', profile, { formats: ['html'] })).toBe(false);
      expect(shouldOutput('html', profile, { formats: ['html', 'pdf'] })).toBe(false);
    });
  });

  describe('ACTIVE_ONLY mode', () => {
    it('returns true only when format is in options.formats array', () => {
      const profile = {
        outputs: {
          pdf: { mode: OUTPUT_MODES.ACTIVE_ONLY }
        }
      };

      expect(shouldOutput('pdf', profile)).toBe(false);
      expect(shouldOutput('pdf', profile, {})).toBe(false);
      expect(shouldOutput('pdf', profile, { formats: [] })).toBe(false);
      expect(shouldOutput('pdf', profile, { formats: ['html'] })).toBe(false);
      expect(shouldOutput('pdf', profile, { formats: ['pdf'] })).toBe(true);
      expect(shouldOutput('pdf', profile, { formats: ['pdf', 'html'] })).toBe(true);
    });

    it('handles non-array options.formats gracefully', () => {
      const profile = {
        outputs: {
          pdf: { mode: OUTPUT_MODES.ACTIVE_ONLY }
        }
      };

      expect(shouldOutput('pdf', profile, { formats: 'pdf' })).toBe(false);
      expect(shouldOutput('pdf', profile, { formats: null })).toBe(false);
      expect(shouldOutput('pdf', profile, { formats: undefined })).toBe(false);
    });
  });

  describe('unknown mode handling', () => {
    it('returns false for unknown modes', () => {
      const options = {
        modes: {
          pdf: 'UNKNOWN_MODE'
        }
      };

      // Will get default mode for PDF, then check
      expect(shouldOutput('pdf', {}, options)).toBe(false);
    });
  });

  describe('integration with getOutputMode', () => {
    it('respects mode overrides from options', () => {
      const profile = {
        outputs: {
          html: { mode: OUTPUT_MODES.DISABLED }
        }
      };
      const options = {
        modes: {
          html: OUTPUT_MODES.ALWAYS
        }
      };

      expect(shouldOutput('html', profile, options)).toBe(true);
    });

    it('uses default mode for PDF (ACTIVE_ONLY)', () => {
      const profile = {};

      expect(shouldOutput('pdf', profile)).toBe(false);
      expect(shouldOutput('pdf', profile, { formats: ['pdf'] })).toBe(true);
    });

    it('uses default mode for HTML (DISABLED)', () => {
      const profile = {};

      expect(shouldOutput('html', profile)).toBe(false);
      expect(shouldOutput('html', profile, { formats: ['html'] })).toBe(false);
    });
  });
});

describe('getEnabledFormats', () => {
  it('returns empty array when all formats disabled', () => {
    const profile = {
      outputs: {
        html: { mode: OUTPUT_MODES.DISABLED },
        pdf: { mode: OUTPUT_MODES.DISABLED },
        png: { mode: OUTPUT_MODES.DISABLED },
        jpeg: { mode: OUTPUT_MODES.DISABLED }
      }
    };

    expect(getEnabledFormats(profile)).toEqual([]);
  });

  it('returns formats set to ALWAYS', () => {
    const profile = {
      outputs: {
        html: { mode: OUTPUT_MODES.ALWAYS },
        pdf: { mode: OUTPUT_MODES.ALWAYS }
      }
    };

    const enabled = getEnabledFormats(profile);
    expect(enabled).toContain('html');
    expect(enabled).toContain('pdf');
    expect(enabled).not.toContain('png');
    expect(enabled).not.toContain('jpeg');
  });

  it('returns ACTIVE_ONLY formats when explicitly requested', () => {
    const profile = {
      outputs: {
        pdf: { mode: OUTPUT_MODES.ACTIVE_ONLY },
        png: { mode: OUTPUT_MODES.ACTIVE_ONLY }
      }
    };
    const options = {
      formats: ['pdf', 'png']
    };

    const enabled = getEnabledFormats(profile, options);
    expect(enabled).toContain('pdf');
    expect(enabled).toContain('png');
    expect(enabled).toHaveLength(2);
  });

  it('excludes ACTIVE_ONLY formats not in request', () => {
    const profile = {
      outputs: {
        pdf: { mode: OUTPUT_MODES.ACTIVE_ONLY },
        png: { mode: OUTPUT_MODES.ACTIVE_ONLY }
      }
    };
    const options = {
      formats: ['pdf']  // Only requesting PDF
    };

    const enabled = getEnabledFormats(profile, options);
    expect(enabled).toContain('pdf');
    expect(enabled).not.toContain('png');
    expect(enabled).toHaveLength(1);
  });

  it('combines ALWAYS and ACTIVE_ONLY correctly', () => {
    const profile = {
      outputs: {
        html: { mode: OUTPUT_MODES.ALWAYS },
        pdf: { mode: OUTPUT_MODES.ACTIVE_ONLY },
        png: { mode: OUTPUT_MODES.DISABLED }
      }
    };
    const options = {
      formats: ['pdf']
    };

    const enabled = getEnabledFormats(profile, options);
    expect(enabled).toContain('html');  // ALWAYS
    expect(enabled).toContain('pdf');   // ACTIVE_ONLY + requested
    expect(enabled).not.toContain('png');  // DISABLED
  });

  it('filters out DISABLED even if requested', () => {
    const profile = {
      outputs: {
        html: { mode: OUTPUT_MODES.DISABLED }
      }
    };
    const options = {
      formats: ['html']
    };

    const enabled = getEnabledFormats(profile, options);
    expect(enabled).not.toContain('html');
  });

  it('uses defaults for formats not in profile', () => {
    const profile = {};
    const options = {
      formats: ['pdf']  // Default is ACTIVE_ONLY
    };

    const enabled = getEnabledFormats(profile, options);
    expect(enabled).toContain('pdf');
    expect(enabled).not.toContain('html');  // Default is DISABLED
  });

  it('returns in consistent order', () => {
    const profile = {
      outputs: {
        jpeg: { mode: OUTPUT_MODES.ALWAYS },
        html: { mode: OUTPUT_MODES.ALWAYS },
        pdf: { mode: OUTPUT_MODES.ALWAYS },
        png: { mode: OUTPUT_MODES.ALWAYS }
      }
    };

    const enabled = getEnabledFormats(profile);
    // Should be in order: html, pdf, png, jpeg (from SUPPORTED_FORMATS)
    expect(enabled).toEqual(['html', 'pdf', 'png', 'jpeg']);
  });
});

describe('getOutputDir', () => {
  const testMarkdownPath = '/project/docs/example.md';

  describe('priority: options > profile > default', () => {
    it('uses options.outputDir when provided', () => {
      const profile = {
        outputs: {
          directory: '/profile/output'
        }
      };
      const options = {
        outputDir: '/custom/output'
      };

      const result = getOutputDir(testMarkdownPath, profile, options);
      expect(result).toBe(path.resolve('/custom/output'));
    });

    it('uses profile.outputs.directory when no options override', () => {
      const profile = {
        outputs: {
          directory: '/profile/output'
        }
      };

      const result = getOutputDir(testMarkdownPath, profile);
      expect(result).toBe(path.resolve('/profile/output'));
    });

    it('uses markdown directory as default', () => {
      const profile = {};

      const result = getOutputDir(testMarkdownPath, profile);
      expect(result).toBe(path.resolve('/project/docs'));
    });
  });

  describe('path resolution', () => {
    it('resolves relative paths in options.outputDir', () => {
      const options = {
        outputDir: './output'
      };

      const result = getOutputDir(testMarkdownPath, {}, options);
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('output');
    });

    it('resolves relative paths in profile.outputs.directory', () => {
      const profile = {
        outputs: {
          directory: '../build'
        }
      };

      const result = getOutputDir(testMarkdownPath, profile);
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('build');
    });

    it('handles absolute paths in options.outputDir', () => {
      const options = {
        outputDir: '/absolute/path/output'
      };

      const result = getOutputDir(testMarkdownPath, {}, options);
      expect(result).toBe(path.resolve('/absolute/path/output'));
    });

    it('handles absolute paths in profile.outputs.directory', () => {
      const profile = {
        outputs: {
          directory: '/absolute/profile/output'
        }
      };

      const result = getOutputDir(testMarkdownPath, profile);
      expect(result).toBe(path.resolve('/absolute/profile/output'));
    });
  });

  describe('edge cases', () => {
    it('handles missing profile gracefully', () => {
      const result = getOutputDir(testMarkdownPath, null);
      expect(result).toBe(path.resolve('/project/docs'));
    });

    it('handles empty profile object', () => {
      const result = getOutputDir(testMarkdownPath, {});
      expect(result).toBe(path.resolve('/project/docs'));
    });

    it('handles empty options object', () => {
      const profile = {
        outputs: {
          directory: '/profile/output'
        }
      };

      const result = getOutputDir(testMarkdownPath, profile, {});
      expect(result).toBe(path.resolve('/profile/output'));
    });

    it('handles markdown path with no directory component', () => {
      const result = getOutputDir('example.md', {});
      // Should return current directory resolved
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('handles markdown path with spaces', () => {
      const pathWithSpaces = '/project/my documents/example.md';
      const result = getOutputDir(pathWithSpaces, {});
      expect(result).toBe(path.resolve('/project/my documents'));
    });

    it('normalizes paths with multiple slashes', () => {
      const options = {
        outputDir: '/output//subdir///'
      };

      const result = getOutputDir(testMarkdownPath, {}, options);
      expect(path.isAbsolute(result)).toBe(true);
      expect(result).not.toContain('//');
    });
  });

  describe('cross-platform compatibility', () => {
    it('returns absolute paths on all platforms', () => {
      const result = getOutputDir(testMarkdownPath, {});
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('handles Windows-style paths when resolved', () => {
      const options = {
        outputDir: 'C:\\output\\dir'
      };

      const result = getOutputDir(testMarkdownPath, {}, options);
      expect(path.isAbsolute(result)).toBe(true);
    });
  });
});
