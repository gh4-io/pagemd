/**
 * @pagemd/core/path-resolver
 * Path resolution utilities with token expansion and priority-based lookup
 *
 * Resolution Order (Priority):
 * 1. Markdown file directory
 * 2. Config directory
 * 3. Project root
 *
 * Supported Tokens:
 * - ${manifestDir}    - Directory containing profile manifest
 * - ${projectRoot}    - Project root directory
 * - ${workspaceFolder} - VS Code workspace (or project root in CLI)
 * - ${markdownDir}    - Directory of source Markdown file
 */

import path from 'node:path';
import fs from 'node:fs';
import { createLogger } from './logger.js';
import { RESOURCE_PATHS } from './paths.js';

const logger = createLogger('io');

/**
 * Create a path resolution context
 * @param {object} options - Context options
 * @param {string} [options.markdownDir] - Directory containing source .md file
 * @param {string} [options.configDir] - Directory containing config files
 * @param {string} [options.projectRoot] - Project root directory
 * @param {string} [options.manifestDir] - Directory containing profile manifest
 * @param {string} [options.workspaceFolder] - VS Code workspace folder
 * @returns {object} Path context object
 */
export function createPathContext(options = {}) {
  const {
    markdownDir = null,
    configDir = null,
    projectRoot = null,
    manifestDir = null,
    workspaceFolder = null
  } = options;

  const context = {
    markdownDir,
    configDir,
    projectRoot: projectRoot || workspaceFolder,
    manifestDir,
    workspaceFolder: workspaceFolder || projectRoot
  };

  logger.trace('path-resolver', 'success', 'Created path context', context);
  return context;
}

/**
 * Expand ${token} variables in a path string
 * @param {string} pathString - Path with potential tokens
 * @param {object} context - Path resolution context
 * @returns {string} Path with tokens expanded
 */
export function expandTokens(pathString, context) {
  if (!pathString) return pathString;

  const tokenMap = {
    manifestDir: context.manifestDir,
    projectRoot: context.projectRoot,
    workspaceFolder: context.workspaceFolder,
    markdownDir: context.markdownDir
  };

  let expanded = pathString;
  let hadTokens = false;

  for (const [token, value] of Object.entries(tokenMap)) {
    const pattern = new RegExp(`\\$\\{${token}\\}`, 'g');
    if (pattern.test(expanded)) {
      hadTokens = true;
      if (!value) {
        const error = new Error(`Token \${${token}} used but not defined in context`);
        logger.error('path-resolver', 'failure', `Undefined token: \${${token}}`, { pathString });
        throw error;
      }
      expanded = expanded.replace(pattern, value);
    }
  }

  if (hadTokens) {
    logger.debug('path-resolver', 'success', 'Expanded path tokens', {
      original: pathString,
      expanded
    });
  }

  return expanded;
}

/**
 * Find project root by looking for marker files
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null} Project root path or null if not found
 */
export function findProjectRoot(startDir) {
  const markerFiles = ['package.json', '.git', '.pagemdrc'];
  let currentDir = path.resolve(startDir);
  const rootDir = path.parse(currentDir).root;

  logger.trace('path-resolver', 'in-progress', `Searching for project root from ${startDir}`);

  while (currentDir !== rootDir) {
    for (const marker of markerFiles) {
      const markerPath = path.join(currentDir, marker);
      try {
        const stat = fs.statSync(markerPath);
        if (stat.isFile() || (marker === '.git' && stat.isDirectory())) {
          logger.debug('path-resolver', 'success', `Found project root via ${marker}`, {
            projectRoot: currentDir,
            marker: markerPath
          });
          return currentDir;
        }
      } catch (err) {
        // Marker not found, continue
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  logger.warn('path-resolver', 'failure', 'No project root found', { startDir });
  return null;
}

/**
 * Resolve a resource path using priority order
 * 1. markdownDir
 * 2. configDir
 * 3. projectRoot
 *
 * @param {string} relativePath - Relative path to resource
 * @param {object} context - Path resolution context
 * @returns {string} Absolute path to resource
 * @throws {Error} If resource not found in any priority location
 */
export function resolveResourcePath(relativePath, context) {
  const searchDirs = [
    context.markdownDir,
    context.configDir,
    context.projectRoot
  ].filter(Boolean); // Remove null/undefined entries

  if (searchDirs.length === 0) {
    const error = new Error('No search directories available in context');
    logger.error('path-resolver', 'failure', 'Empty context for resource resolution', { relativePath });
    throw error;
  }

  logger.trace('path-resolver', 'in-progress', `Resolving resource: ${relativePath}`, {
    searchDirs
  });

  for (const dir of searchDirs) {
    const candidate = path.resolve(dir, relativePath);
    try {
      if (fs.existsSync(candidate)) {
        logger.debug('path-resolver', 'success', `Resolved resource in ${path.basename(dir)}`, {
          relativePath,
          resolvedPath: candidate,
          searchDir: dir
        });
        return candidate;
      }
    } catch (err) {
      logger.trace('path-resolver', 'failure', `Access check failed for ${candidate}`, {
        error: err.message
      });
    }
  }

  const error = new Error(`Resource not found: ${relativePath}`);
  error.searchedPaths = searchDirs.map(dir => path.resolve(dir, relativePath));
  logger.error('path-resolver', 'failure', 'Resource not found in any location', {
    relativePath,
    searchedPaths: error.searchedPaths
  });
  throw error;
}

/**
 * Derive package root from CLI's __dirname location.
 * Works for both development and npm-installed CLI.
 * @param {string} cliDirname - __dirname from CLI entry point (apps/cli/src/)
 * @returns {string} Absolute path to package root (project folder)
 */
export function getPackageRootFromCli(cliDirname) {
  // From apps/cli/src/ go up 3 levels to project/
  const derived = path.resolve(cliDirname, '../../..');

  // Verify structure exists by checking profiles folder
  const profilesPath = path.join(derived, RESOURCE_PATHS.profiles);
  if (!fs.existsSync(profilesPath)) {
    // Fallback: maybe we're in a different structure, try finding it
    logger.warn('path-resolver', 'package-root', 'Profiles not found at expected location', {
      expected: profilesPath,
      derived
    });
  }

  return derived;
}

/**
 * Resolve a path string with token expansion
 * @param {string} pathString - Path to resolve (may contain tokens)
 * @param {object} context - Path resolution context
 * @returns {string} Absolute resolved path
 */
export function resolvePath(pathString, context) {
  if (!pathString) {
    const error = new Error('Cannot resolve empty path');
    logger.error('path-resolver', 'failure', 'Empty path string provided');
    throw error;
  }

  // First expand tokens
  const expanded = expandTokens(pathString, context);

  // If already absolute, normalize and return
  // (normalization handles mixed separators from token expansion)
  if (path.isAbsolute(expanded)) {
    const normalized = path.normalize(expanded);
    logger.debug('path-resolver', 'success', 'Resolved absolute path', {
      original: pathString,
      resolved: normalized
    });
    return normalized;
  }

  // Relative path - resolve against projectRoot (or first available context dir)
  const baseDir = context.projectRoot || context.configDir || context.markdownDir;
  if (!baseDir) {
    const error = new Error('No base directory available in context for path resolution');
    logger.error('path-resolver', 'failure', 'No base directory in context', {
      pathString,
      context
    });
    throw error;
  }

  const resolved = path.resolve(baseDir, expanded);
  logger.debug('path-resolver', 'success', 'Resolved relative path', {
    original: pathString,
    expanded,
    resolved,
    baseDir
  });

  return resolved;
}
