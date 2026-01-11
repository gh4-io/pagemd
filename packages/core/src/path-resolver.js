/**
 * @pagemd/core/path-resolver
 * Path resolution utilities with token expansion and priority-based lookup
 *
 * Legacy Resolution Order (resolveResourcePath):
 * 1. Markdown file directory
 * 2. Config directory
 * 3. Project root
 *
 * Unified Resolution Order (resolveResource - NEW):
 * 0. Manifest path (if sourceType='profile' and relative path)
 * 1. Working path (markdown location) - ./, ./.pagemd/{type}/, ./{type}/
 * 2. Workspace path (project root) - ./, ./.pagemd/{type}/, ./{type}/
 * 3. Home path (~/.pagemd/{type}/)
 * 4. CLI path (bundled defaults in {type}/)
 *
 * Supported Tokens (canonical names):
 * - ${workingPath}     - Directory of source Markdown file
 * - ${workspacePath}   - Project/workspace root directory
 * - ${manifestPath}    - Directory containing profile manifest
 * - ${homePath}        - User home directory
 * - ${cliPath}         - CLI package location
 *
 * Backward-compatible aliases:
 * - ${markdownDir}     - Alias for ${workingPath}
 * - ${projectRoot}     - Alias for ${workspacePath}
 * - ${manifestDir}     - Alias for ${manifestPath}
 * - ${workspaceFolder} - Alias for ${workspacePath}
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createLogger } from './logger.js';
import { RESOURCE_PATHS } from './paths.js';

const logger = createLogger('io');

/**
 * Extension inference mappings per resource type
 */
export const RESOURCE_EXTENSIONS = {
  profiles: ['.json', '.yaml', '.yml'],
  templates: ['.html', '.htm'],
  layouts: ['.css'],
  styles: ['.css'],
  assets: [] // No inference, require exact name
};

/**
 * Known subdirectories to search for each resource type
 * Only 'styles' supports subdirectory search (presets, syntax, vendor)
 */
export const RESOURCE_SUBDIRS = {
  styles: ['presets', 'syntax', 'vendor'],
  layouts: [],
  templates: [],
  profiles: [],
  assets: []
};

/**
 * Create a path resolution context
 *
 * Supports both canonical and legacy parameter names for backward compatibility.
 *
 * @param {object} options - Context options
 *
 * Canonical parameters:
 * @param {string} [options.workingPath] - Directory containing source .md file
 * @param {string} [options.workspacePath] - Project/workspace root directory
 * @param {string} [options.manifestPath] - Directory containing profile manifest
 * @param {string} [options.homePath] - User home directory (auto-populated if not provided)
 * @param {string} [options.cliPath] - CLI package root for bundled defaults
 *
 * Legacy parameters (backward-compatible aliases):
 * @param {string} [options.markdownDir] - Alias for workingPath
 * @param {string} [options.projectRoot] - Alias for workspacePath
 * @param {string} [options.manifestDir] - Alias for manifestPath
 * @param {string} [options.workspaceFolder] - Alias for workspacePath
 * @param {string} [options.configDir] - Deprecated (use workspacePath)
 *
 * @returns {object} Path context object with both canonical and legacy names
 */
export function createPathContext(options = {}) {
  // Extract both canonical and legacy names
  const {
    // Canonical names
    workingPath,
    workspacePath,
    manifestPath,
    homePath,
    cliPath,
    // Legacy names
    markdownDir,
    projectRoot,
    manifestDir,
    workspaceFolder,
    configDir
  } = options;

  // Determine canonical values (prefer canonical, fallback to legacy)
  const resolvedWorkingPath = workingPath || markdownDir || null;
  const resolvedWorkspacePath = workspacePath || projectRoot || workspaceFolder || null;
  const resolvedManifestPath = manifestPath || manifestDir || null;
  const resolvedHomePath = homePath || os.homedir();
  const resolvedCliPath = cliPath || null;
  const resolvedConfigDir = configDir || null; // Keep separate for backward compatibility

  // Build context with both canonical and legacy names for full backward compatibility
  // If explicit legacy values provided, preserve them; otherwise alias to canonical
  const context = {
    // Canonical names
    workingPath: resolvedWorkingPath,
    workspacePath: resolvedWorkspacePath,
    manifestPath: resolvedManifestPath,
    homePath: resolvedHomePath,
    cliPath: resolvedCliPath,
    // Legacy names: preserve explicit values, otherwise alias to canonical
    markdownDir: markdownDir ?? resolvedWorkingPath,
    projectRoot: projectRoot ?? resolvedWorkspacePath,
    manifestDir: manifestDir ?? resolvedManifestPath,
    workspaceFolder: workspaceFolder ?? resolvedWorkspacePath,
    configDir: resolvedConfigDir // Preserve as separate field for legacy code
  };

  logger.trace('path-resolver', 'success', 'Created path context', context);
  return context;
}

/**
 * Expand ${token} variables in a path string
 *
 * Supports both canonical and legacy token names for backward compatibility.
 *
 * Canonical tokens:
 * - ${workingPath}   - Markdown directory
 * - ${workspacePath} - Workspace/project root
 * - ${manifestPath}  - Profile manifest directory
 * - ${homePath}      - User home directory
 * - ${cliPath}       - CLI package location
 *
 * Legacy tokens (backward-compatible aliases):
 * - ${markdownDir}     - Alias for ${workingPath}
 * - ${projectRoot}     - Alias for ${workspacePath}
 * - ${manifestDir}     - Alias for ${manifestPath}
 * - ${workspaceFolder} - Alias for ${workspacePath}
 *
 * @param {string} pathString - Path with potential tokens
 * @param {object} context - Path resolution context
 * @returns {string} Path with tokens expanded
 */
export function expandTokens(pathString, context) {
  if (!pathString) return pathString;

  // Token map with both canonical and legacy names
  // Legacy names point to same values as canonical for consistency
  const tokenMap = {
    // Canonical tokens
    workingPath: context.workingPath,
    workspacePath: context.workspacePath,
    manifestPath: context.manifestPath,
    homePath: context.homePath,
    cliPath: context.cliPath,
    // Legacy tokens (aliases)
    markdownDir: context.markdownDir,
    projectRoot: context.projectRoot,
    manifestDir: context.manifestDir,
    workspaceFolder: context.workspaceFolder
  };

  let expanded = pathString;
  let hadTokens = false;

  for (const [token, value] of Object.entries(tokenMap)) {
    const pattern = new RegExp(`\\$\\{${token}\\}`, 'g');
    if (pattern.test(expanded)) {
      hadTokens = true;
      if (!value) {
        // Check if this is a legacy token and suggest canonical equivalent
        const canonicalSuggestion = {
          markdownDir: 'workingPath',
          projectRoot: 'workspacePath',
          manifestDir: 'manifestPath',
          workspaceFolder: 'workspacePath'
        }[token];

        const suggestion = canonicalSuggestion
          ? ` (consider using \${${canonicalSuggestion}} instead)`
          : '';

        const error = new Error(`Token \${${token}} used but not defined in context${suggestion}`);
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
 * Works for both development (apps/cli/src/) and bundled CLI (bin/).
 *
 * Detection logic:
 * 1. Check if resources exist at same level as __dirname (bundled mode)
 * 2. Fall back to 3 levels up (source mode: apps/cli/src/ → project/)
 *
 * @param {string} cliDirname - __dirname from CLI entry point
 * @returns {string} Absolute path to package root (contains profiles/, templates/, etc.)
 */
export function getPackageRootFromCli(cliDirname) {
  // Check bundled mode first: resources directly in same directory as CLI
  const bundledProfilesPath = path.join(cliDirname, RESOURCE_PATHS.profiles);
  if (fs.existsSync(bundledProfilesPath)) {
    logger.debug('path-resolver', 'package-root', 'Using bundled mode (resources in CLI directory)', {
      packageRoot: cliDirname
    });
    return cliDirname;
  }

  // Source mode: from apps/cli/src/ go up 3 levels to project/
  const derived = path.resolve(cliDirname, '../../..');

  // Verify structure exists by checking profiles folder
  const profilesPath = path.join(derived, RESOURCE_PATHS.profiles);
  if (!fs.existsSync(profilesPath)) {
    logger.warn('path-resolver', 'package-root', 'Profiles not found at expected location', {
      expected: profilesPath,
      derived
    });
  } else {
    logger.debug('path-resolver', 'package-root', 'Using source mode (3 levels up)', {
      packageRoot: derived
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

/**
 * Build search paths for resource resolution with deduplication
 *
 * Search order:
 * 0. workingPath (markdown location)
 * 1. manifestPath (if sourceType='profile' and path is relative)
 * 2. workspacePath (project/workspace root)
 * 3. homePath (~/.pagemd/{type}/)
 * 4. cliPath (bundled defaults in {type}/)
 *
 * Each location (except home and CLI) searches three patterns:
 * - ./
 * - ./{resourceType}/
 * - ./.pagemd/{resourceType}/
 *
 * @param {string} resourceType - Type: 'profiles', 'templates', 'layouts', 'styles'
 * @param {object} context - Path contexts
 * @param {string} [context.workingPath] - Markdown file directory
 * @param {string} [context.workspacePath] - Project/workspace root
 * @param {string} [context.manifestPath] - Profile location for profile-supplied paths
 * @param {string} [context.homePath] - User home directory (defaults to os.homedir())
 * @param {string} [context.cliPath] - CLI package root
 * @param {string} [context.sourceType] - 'frontmatter' | 'profile' | 'cli'
 * @returns {string[]} Ordered array of search paths (deduplicated)
 */
export function buildSearchPaths(resourceType, context) {
  const paths = [];
  const seen = new Set(); // Avoid duplicate paths

  /**
   * Add path to search list if not already seen
   * @param {string} p - Path to add
   */
  function addPath(p) {
    const normalized = path.normalize(p);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      paths.push(normalized);
    }
  }

  /**
   * Add search patterns for a location
   * For styles: also searches presets/, syntax/, vendor/ subdirectories
   * @param {string} basePath - Base directory
   */
  function addLocationPaths(basePath) {
    addPath(basePath);                                     // ./
    addPath(path.join(basePath, resourceType));            // ./{type}/
    addPath(path.join(basePath, '.pagemd', resourceType)); // ./.pagemd/{type}/

    // Add subdirectory patterns for styles (presets, syntax, vendor)
    const subdirs = RESOURCE_SUBDIRS[resourceType] || [];
    for (const subdir of subdirs) {
      addPath(path.join(basePath, resourceType, subdir));            // ./styles/presets/
      addPath(path.join(basePath, '.pagemd', resourceType, subdir)); // ./.pagemd/styles/presets/
    }
  }

  // 0. Working path (markdown location) - document-local resources first
  if (context.workingPath) {
    addLocationPaths(context.workingPath);
  }

  // 1. If from profile (relative path), search manifest location
  if (context.sourceType === 'profile' && context.manifestPath) {
    addLocationPaths(context.manifestPath);
  }

  // 2. Workspace path (deduplication via Set handles same-path cases)
  if (context.workspacePath) {
    addLocationPaths(context.workspacePath);
  }

  // 3. Home path (only .pagemd subfolder, not root)
  const homePath = context.homePath || os.homedir();
  addPath(path.join(homePath, '.pagemd', resourceType));
  // Add subdirectories for home path (styles only)
  const homeSubdirs = RESOURCE_SUBDIRS[resourceType] || [];
  for (const subdir of homeSubdirs) {
    addPath(path.join(homePath, '.pagemd', resourceType, subdir));
  }

  // 4. CLI path (bundled defaults - only {type}/ subfolder)
  if (context.cliPath) {
    addPath(path.join(context.cliPath, resourceType));
    // Add subdirectories for CLI path (styles only)
    const cliSubdirs = RESOURCE_SUBDIRS[resourceType] || [];
    for (const subdir of cliSubdirs) {
      addPath(path.join(context.cliPath, resourceType, subdir));
    }
  }

  logger.trace('path-resolver', 'success', `Built search paths for ${resourceType}`, {
    resourceType,
    pathCount: paths.length,
    paths
  });

  return paths;
}

/**
 * Find resource with extension inference and duplicate detection
 *
 * For each search directory:
 * 1. Try exact resource name
 * 2. If no extension, try adding resource-type-specific extensions
 *
 * @param {string} resourceName - Resource filename (e.g., "my-style.css" or "my-style")
 * @param {string[]} searchPaths - Ordered array of directories to search
 * @param {string} resourceType - Type: 'profiles', 'templates', 'layouts', 'styles'
 * @returns {{ found: string|null, duplicates: string[] }} Result with path or duplicate list
 */
export function findResourceWithDuplicateCheck(resourceName, searchPaths, resourceType) {
  const found = [];

  for (const dir of searchPaths) {
    // Try exact name first
    const exactPath = path.join(dir, resourceName);
    if (fs.existsSync(exactPath)) {
      found.push(exactPath);
      continue; // Found exact match, move to next dir
    }

    // Try with extension inference if no extension present
    if (!path.extname(resourceName)) {
      const extensions = RESOURCE_EXTENSIONS[resourceType] || [];
      for (const ext of extensions) {
        const withExt = path.join(dir, resourceName + ext);
        if (fs.existsSync(withExt)) {
          found.push(withExt);
          break; // Found match with extension, move to next dir
        }
      }
    }
  }

  if (found.length === 0) {
    logger.debug('path-resolver', 'failure', `Resource not found: ${resourceName}`, {
      resourceName,
      resourceType,
      searchedPaths: searchPaths
    });
    return { found: null, duplicates: [] };
  }

  if (found.length > 1) {
    logger.warn('path-resolver', 'failure', `Duplicate resources detected: ${resourceName}`, {
      resourceName,
      resourceType,
      duplicates: found
    });
    return { found: null, duplicates: found };
  }

  logger.debug('path-resolver', 'success', `Resolved resource: ${resourceName}`, {
    resourceName,
    resourceType,
    resolvedPath: found[0]
  });
  return { found: found[0], duplicates: [] };
}

/**
 * Resolve resource with full search order and duplicate detection
 *
 * This is the main unified resolver for all resource types.
 * Handles absolute paths, relative paths, and multi-location search.
 *
 * @param {string} resourceName - Resource filename or path
 * @param {string} resourceType - Type: 'profiles', 'templates', 'layouts', 'styles'
 * @param {object} context - All path contexts
 * @param {string} [context.workingPath] - Markdown file directory (required for relative paths)
 * @param {string} [context.workspacePath] - Project/workspace root
 * @param {string} [context.manifestPath] - Profile location for profile-supplied paths
 * @param {string} [context.homePath] - User home directory (defaults to os.homedir())
 * @param {string} [context.cliPath] - CLI package root (required for fallback)
 * @param {string} [context.sourceType] - 'frontmatter' | 'profile' | 'cli' - where path came from
 * @returns {{ resolvedPath: string, searchedPaths: string[] }} Resolved path and search history
 * @throws {Error} If resource not found or duplicates detected
 */
export function resolveResource(resourceName, resourceType, context) {
  logger.trace('path-resolver', 'in-progress', `Resolving resource: ${resourceName}`, {
    resourceName,
    resourceType,
    sourceType: context.sourceType
  });

  // Handle absolute paths - resolve directly without search
  if (path.isAbsolute(resourceName)) {
    if (!fs.existsSync(resourceName)) {
      const error = new Error(`Absolute path not found: ${resourceName}`);
      logger.error('path-resolver', 'failure', 'Absolute resource path not found', {
        resourceName,
        resourceType
      });
      throw error;
    }
    logger.debug('path-resolver', 'success', 'Resolved absolute resource path', {
      resourceName,
      resolvedPath: resourceName
    });
    return { resolvedPath: resourceName, searchedPaths: [] };
  }

  // Handle relative refs (./, ../) - resolve from source location
  if (resourceName.startsWith('./') || resourceName.startsWith('../')) {
    const baseDir = context.manifestPath || context.workingPath || context.workspacePath;
    if (!baseDir) {
      const error = new Error('No base directory available for relative path resolution');
      logger.error('path-resolver', 'failure', 'No base directory in context', {
        resourceName,
        resourceType,
        context
      });
      throw error;
    }
    const resolved = path.resolve(baseDir, resourceName);
    if (!fs.existsSync(resolved)) {
      const error = new Error(`Relative path not found: ${resourceName} (resolved to ${resolved})`);
      logger.error('path-resolver', 'failure', 'Relative resource path not found', {
        resourceName,
        resolvedPath: resolved,
        baseDir
      });
      throw error;
    }
    logger.debug('path-resolver', 'success', 'Resolved relative resource path', {
      resourceName,
      resolvedPath: resolved,
      baseDir
    });
    return { resolvedPath: resolved, searchedPaths: [] };
  }

  // Multi-location search with duplicate detection
  const searchPaths = buildSearchPaths(resourceType, context);
  const { found, duplicates } = findResourceWithDuplicateCheck(resourceName, searchPaths, resourceType);

  // Handle duplicates
  if (duplicates.length > 0) {
    const error = new Error(
      `Duplicate resources found for "${resourceName}":\n` +
      duplicates.map((p, i) => `  ${i + 1}. ${p}`).join('\n') +
      '\n\nPlease use unique names or specify an absolute path.'
    );
    error.duplicates = duplicates;
    logger.error('path-resolver', 'failure', 'Duplicate resources detected', {
      resourceName,
      resourceType,
      duplicates
    });
    throw error;
  }

  // Handle not found
  if (!found) {
    const error = new Error(
      `Resource not found: ${resourceName}\n` +
      `Searched in:\n` +
      searchPaths.map((p, i) => `  ${i + 1}. ${p}`).join('\n')
    );
    error.searchedPaths = searchPaths;
    logger.error('path-resolver', 'failure', 'Resource not found in any location', {
      resourceName,
      resourceType,
      searchedPaths: searchPaths
    });
    throw error;
  }

  logger.debug('path-resolver', 'success', 'Resolved resource via search', {
    resourceName,
    resourceType,
    resolvedPath: found,
    searchedPathCount: searchPaths.length
  });

  return { resolvedPath: found, searchedPaths: searchPaths };
}
