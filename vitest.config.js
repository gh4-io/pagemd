/**
 * Vitest Configuration for PageMD Monorepo
 */

import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // Vite optimizations
  optimizeDeps: {
    include: ['gray-matter', 'markdown-it', 'markdown-it-attrs']
  },

  test: {
    // Global test settings
    globals: true,

    // Test environment
    environment: 'node',

    // Server configuration for deps
    server: {
      deps: {
        inline: ['gray-matter', 'js-yaml', 'esprima', 'argparse'],
        external: ['esprima']
      }
    },

    // Include patterns
    include: [
      'packages/*/tests/**/*.test.js',
      'tests/**/*.test.js'
    ],

    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'packages/*/src/**/*.js'
      ],
      exclude: [
        '**/node_modules/**',
        '**/tests/**'
      ]
    },

    // Timeout settings
    testTimeout: 30000,
    hookTimeout: 30000,

    // Reporter
    reporter: ['verbose'],

    // Workspace-aware
    root: '.',

    // Alias for imports
    alias: {
      '@pagemd/core': resolve(__dirname, 'packages/core/src/index.js'),
      '@pagemd/parser': resolve(__dirname, 'packages/parser/src/index.js'),
      '@pagemd/renderer-web': resolve(__dirname, 'packages/renderer-web/src/index.js'),
      '@pagemd/renderer-pdf': resolve(__dirname, 'packages/renderer-pdf/src/index.js'),
      '@pagemd/exporters': resolve(__dirname, 'packages/exporters/src/index.js'),
      '@pagemd/theme-kit': resolve(__dirname, 'packages/theme-kit/src/index.js')
    }
  }
});
