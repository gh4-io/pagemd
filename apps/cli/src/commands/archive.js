/**
 * @pagemd/cli/commands/archive
 * Archive command - packages source markdown + dependencies into a ZIP
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  createLogger,
  getEnv,
  getTimestamp
} from '@pagemd/core';
import { exportToArchive } from '@pagemd/exporters';

const logger = createLogger('cli');

/**
 * Print CLI message with timestamp and [PageMD-CLI] prefix
 * @param {string} message - Message to print
 */
function cliLog(message) {
  console.log(`${getTimestamp()} [PageMD-CLI] ${message}`);
}

/**
 * Print indented sub-item
 * @param {string} message - Message to print
 */
function cliLogIndent(message) {
  console.log(`\t${message}`);
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// Get env var defaults
const envProfile = getEnv('profile') || undefined;

/**
 * Yargs command definition
 */
export const command = 'archive <input>';
export const aliases = ['arc'];
export const describe = 'Archive source files with all dependencies into a ZIP';

export const builder = {
  input: {
    describe: 'Input markdown file or directory',
    type: 'string',
    demandOption: true
  },
  output: {
    alias: 'o',
    describe: 'Output ZIP file path (default: <input-name>.pagemd.zip)',
    type: 'string'
  },
  profile: {
    alias: 'p',
    describe: 'Profile ID to use (overrides frontmatter)',
    type: 'string',
    default: envProfile
  },
  'include-system': {
    describe: 'Include system resources (base.css, templates, etc.) in archive',
    type: 'boolean',
    default: false
  },
  'dry-run': {
    describe: 'List files that would be archived without creating ZIP',
    type: 'boolean',
    default: false
  }
};

/**
 * Collect markdown files from input path (file or directory)
 * @param {string} inputPath - File or directory path
 * @returns {Promise<string[]>} Array of absolute markdown file paths
 */
async function collectMarkdownFiles(inputPath) {
  const absolutePath = path.resolve(inputPath);
  const stat = await fs.stat(absolutePath);

  if (stat.isFile()) {
    return [absolutePath];
  }

  if (stat.isDirectory()) {
    const entries = await fs.readdir(absolutePath);
    const mdFiles = entries
      .filter(e => /\.(md|markdown)$/i.test(e))
      .map(e => path.join(absolutePath, e))
      .sort();

    if (mdFiles.length === 0) {
      throw new Error(`No markdown files found in directory: ${inputPath}`);
    }
    return mdFiles;
  }

  throw new Error(`Input is not a file or directory: ${inputPath}`);
}

/**
 * Command handler
 * @param {object} argv - Command arguments from yargs
 */
export async function handler(argv) {
  const startTime = Date.now();

  const {
    input,
    output,
    profile,
    'include-system': includeSystem,
    'dry-run': dryRun,
    cliPath
  } = argv;

  logger.info('archive', 'start', `Archive command started`, { input, output, profile, dryRun });

  try {
    // Collect markdown files
    const markdownFiles = await collectMarkdownFiles(input);

    cliLog(`Archiving ${markdownFiles.length} file(s)...`);
    for (const f of markdownFiles) {
      cliLogIndent(`${path.basename(f)}`);
    }

    // Run archive
    const result = await exportToArchive(markdownFiles, {
      output,
      profile,
      cliPath,
      includeSystem,
      dryRun
    });

    // Show warnings
    if (result.warnings.length > 0) {
      console.log();
      cliLog(`Warnings (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        cliLogIndent(`⚠ ${warning}`);
      }
    }

    // Dry-run: show file list grouped by type
    if (dryRun) {
      console.log();
      cliLog('Dry run - files that would be archived:');
      console.log();

      const byType = {};
      for (const file of result.files) {
        if (!byType[file.type]) byType[file.type] = [];
        byType[file.type].push(file);
      }

      const typeOrder = ['markdown', 'profile', 'template', 'layout', 'style', 'font', 'asset', 'config'];
      for (const type of typeOrder) {
        const group = byType[type];
        if (!group || group.length === 0) continue;
        console.log(`  ${type} (${group.length}):`);
        for (const file of group) {
          console.log(`    ${file.archivePath}`);
        }
      }

      console.log();
      cliLog(`Total: ${result.fileCount} file(s)`);
      return;
    }

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log();
    cliLog(`✓ Archive created successfully`);
    cliLogIndent(`Output: ${result.archivePath}`);
    cliLogIndent(`Files: ${result.fileCount}`);
    cliLogIndent(`Size: ${formatSize(result.totalSize)}`);
    cliLogIndent(`Time: ${duration}s`);

    logger.info('archive', 'complete', 'Archive created', {
      archivePath: result.archivePath,
      fileCount: result.fileCount,
      totalSize: result.totalSize,
      duration
    });

  } catch (error) {
    logger.error('archive', 'failure', error.message, { stack: error.stack });
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}
