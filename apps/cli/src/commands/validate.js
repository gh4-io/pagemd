/**
 * @pagemd/cli - validate command
 * Non-rendering validation checks for markdown files
 *
 * Validates:
 * - Required metadata fields (profile-driven)
 * - Profile existence and validity
 * - Referenced resource paths (layout, CSS, etc.)
 * - No circular inheritance
 */

import { readdir, stat } from 'fs/promises';
import { resolve, dirname, basename, extname, join } from 'path';
import { existsSync } from 'fs';
import {
  createLogger,
  loadAndMergeProfile,
  getDefaultProfile,
  createPathContext,
  resolvePath,
  findProjectRoot
} from '@pagemd/core';
import { parseFile } from '@pagemd/parser';

const logger = createLogger('cli');

/**
 * Yargs command configuration
 */
export const command = 'validate <input>';
export const describe = 'Validate markdown file(s) without rendering';

export const builder = {
  input: {
    describe: 'File or directory path to validate',
    type: 'string'
  },
  profile: {
    alias: 'p',
    describe: 'Profile ID to use for validation (overrides frontmatter)',
    type: 'string'
  },
  strict: {
    describe: 'Fail on warnings (not just errors)',
    type: 'boolean',
    default: false
  }
};

/**
 * Validate a single markdown file
 * @param {string} filePath - Absolute path to markdown file
 * @param {object} options - Validation options
 * @param {string} [options.profile] - Profile ID override
 * @param {boolean} [options.strict] - Strict mode
 * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>} Validation result
 */
async function validateMarkdownFile(filePath, options = {}) {
  const errors = [];
  const warnings = [];

  logger.debug('validation', 'in-progress', `Validating ${basename(filePath)}`);

  try {
    // Parse markdown and extract frontmatter
    // Use normalizeMetadata: false to check raw frontmatter for required fields
    const { metadata: rawMetadata } = await parseFile(filePath, { normalizeMetadata: false });
    const { metadata: normalizedMetadata } = await parseFile(filePath);

    // Determine profile ID: CLI arg > frontmatter > default
    const profileId = options.profile
      || normalizedMetadata.pipeline_profile
      || normalizedMetadata.layout_template
      || getDefaultProfile();

    logger.trace('validation', 'in-progress', 'Profile resolution', {
      file: basename(filePath),
      profileId,
      source: options.profile ? 'cli' : (normalizedMetadata.pipeline_profile || normalizedMetadata.layout_template ? 'frontmatter' : 'default')
    });

    // Load profile with inheritance (includes circular inheritance check)
    let profile;
    try {
      profile = await loadAndMergeProfile(profileId);
    } catch (err) {
      errors.push(`Profile error: ${err.message}`);
      return { valid: false, errors, warnings };
    }

    // Validate required fields from profile
    // Check against raw metadata to detect truly missing fields (before defaults applied)
    if (profile.validation?.required_fields) {
      const requiredFields = profile.validation.required_fields;
      logger.trace('validation', 'in-progress', 'Checking required fields', {
        requiredFields,
        presentFields: Object.keys(rawMetadata)
      });

      for (const field of requiredFields) {
        // Check raw metadata first (exact match)
        let fieldPresent = field in rawMetadata;

        // If not found, check normalized keys and aliases
        if (!fieldPresent) {
          // Check all possible key variants in raw metadata
          const rawKeys = Object.keys(rawMetadata).map(k => k.toLowerCase().replace(/[_-]/g, ''));
          const normalizedFieldKey = field.toLowerCase().replace(/[_-]/g, '');
          fieldPresent = rawKeys.includes(normalizedFieldKey);
        }

        if (!fieldPresent) {
          errors.push(`Missing required field: ${field} (required by profile ${profileId})`);
          logger.debug('validation', 'failure', `Missing required field: ${field}`, {
            field,
            rawMetadata,
            normalizedMetadata
          });
        } else {
          // Field exists but check if it's empty
          const value = normalizedMetadata[field];
          if (value === '' || value === null || value === undefined) {
            warnings.push(`Required field '${field}' is present but empty`);
          }
        }
      }
    }

    // Create path context for resource resolution
    const markdownDir = dirname(filePath);
    const projectRoot = findProjectRoot(markdownDir) || process.cwd();
    const pathContext = createPathContext({
      markdownDir,
      projectRoot,
      workspaceFolder: projectRoot
    });

    // Validate layout file exists
    if (profile.layout?.source) {
      try {
        const layoutPath = resolvePath(profile.layout.source, pathContext);
        if (!existsSync(layoutPath)) {
          errors.push(`Layout file not found: ${profile.layout.source} (resolved to: ${layoutPath})`);
        }
      } catch (err) {
        errors.push(`Layout path resolution failed: ${err.message}`);
      }
    } else {
      warnings.push(`Profile ${profileId} has no layout.source defined`);
    }

    // Validate CSS resource files
    if (profile.resources?.css) {
      for (const cssPath of profile.resources.css) {
        try {
          const resolvedPath = resolvePath(cssPath, pathContext);
          if (!existsSync(resolvedPath)) {
            errors.push(`CSS file not found: ${cssPath} (resolved to: ${resolvedPath})`);
          }
        } catch (err) {
          errors.push(`CSS path resolution failed for ${cssPath}: ${err.message}`);
        }
      }
    }

    // Validate font files if specified
    if (profile.resources?.fonts) {
      for (const fontPath of profile.resources.fonts) {
        try {
          const resolvedPath = resolvePath(fontPath, pathContext);
          if (!existsSync(resolvedPath)) {
            warnings.push(`Font file not found: ${fontPath}`);
          }
        } catch (err) {
          warnings.push(`Font path resolution failed for ${fontPath}: ${err.message}`);
        }
      }
    }

    // Validate custom CSS from frontmatter
    if (normalizedMetadata.styles) {
      const styles = Array.isArray(normalizedMetadata.styles) ? normalizedMetadata.styles : [normalizedMetadata.styles];
      for (const stylePath of styles) {
        try {
          const resolvedPath = resolvePath(stylePath, pathContext);
          if (!existsSync(resolvedPath)) {
            errors.push(`Custom CSS file not found: ${stylePath} (resolved to: ${resolvedPath})`);
          }
        } catch (err) {
          errors.push(`Custom CSS path resolution failed for ${stylePath}: ${err.message}`);
        }
      }
    }

    const isValid = errors.length === 0 && (options.strict ? warnings.length === 0 : true);

    if (isValid) {
      logger.info('validation', 'success', `Valid: ${basename(filePath)}`);
    } else {
      logger.warn('validation', 'failure', `Invalid: ${basename(filePath)}`, {
        errorCount: errors.length,
        warningCount: warnings.length
      });
    }

    return { valid: isValid, errors, warnings };

  } catch (err) {
    errors.push(`Parse error: ${err.message}`);
    logger.error('validation', 'failure', `Parse failed: ${basename(filePath)}`, { error: err.message });
    return { valid: false, errors, warnings };
  }
}

/**
 * Find all markdown files in a directory (non-recursive)
 * @param {string} dirPath - Absolute directory path
 * @returns {Promise<string[]>} Array of absolute file paths
 */
async function findMarkdownFiles(dirPath) {
  const files = [];
  const entries = await readdir(dirPath);

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stats = await stat(fullPath);

    // Only include top-level .md files
    if (stats.isFile() && extname(entry).toLowerCase() === '.md') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Command handler
 * @param {object} argv - Parsed command-line arguments
 */
export async function handler(argv) {
  const { input, profile, strict } = argv;

  logger.info('validation', 'in-progress', 'Starting validation', {
    input,
    profile: profile || 'auto',
    strict
  });

  try {
    // Resolve input path
    const inputPath = resolve(process.cwd(), input);

    // Check if path exists
    if (!existsSync(inputPath)) {
      logger.error('validation', 'failure', `Input not found: ${inputPath}`);
      console.error(`Error: Input not found: ${input}`);
      process.exit(1);
    }

    // Determine if input is file or directory
    const stats = await stat(inputPath);
    const filesToValidate = [];

    if (stats.isFile()) {
      // Validate single file
      if (extname(inputPath).toLowerCase() !== '.md') {
        logger.error('validation', 'failure', 'Input must be a .md file');
        console.error('Error: Input must be a markdown (.md) file');
        process.exit(1);
      }
      filesToValidate.push(inputPath);
    } else if (stats.isDirectory()) {
      // Find all markdown files in directory
      const mdFiles = await findMarkdownFiles(inputPath);
      if (mdFiles.length === 0) {
        logger.warn('validation', 'success', 'No markdown files found in directory');
        console.log('No markdown files found in directory');
        process.exit(0);
      }
      filesToValidate.push(...mdFiles);
    } else {
      logger.error('validation', 'failure', 'Input must be file or directory');
      console.error('Error: Input must be a file or directory');
      process.exit(1);
    }

    // Validate each file
    const results = [];
    for (const filePath of filesToValidate) {
      const result = await validateMarkdownFile(filePath, { profile, strict });
      results.push({ file: filePath, ...result });
    }

    // Summary output
    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.length - validCount;

    console.log(`\nValidation Summary:`);
    console.log(`  Total files: ${results.length}`);
    console.log(`  Valid: ${validCount}`);
    console.log(`  Invalid: ${invalidCount}`);

    // Detailed results
    for (const result of results) {
      const fileName = basename(result.file);
      const status = result.valid ? '✓' : '✗';

      console.log(`\n${status} ${fileName}`);

      if (result.errors.length > 0) {
        console.log('  Errors:');
        for (const error of result.errors) {
          console.log(`    - ${error}`);
        }
      }

      if (result.warnings.length > 0) {
        console.log('  Warnings:');
        for (const warning of result.warnings) {
          console.log(`    - ${warning}`);
        }
      }
    }

    // Exit with appropriate code
    if (invalidCount > 0) {
      logger.error('validation', 'failure', `Validation failed: ${invalidCount} invalid file(s)`);
      process.exit(1);
    } else {
      logger.info('validation', 'success', `All files valid: ${validCount} file(s)`);
      process.exit(0);
    }

  } catch (err) {
    logger.fatal('validation', 'failure', 'Validation command failed', { error: err.message });
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  }
}
