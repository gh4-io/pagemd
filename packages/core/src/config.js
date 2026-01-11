/**
 * @pagemd/core/config
 * Config loader using cosmiconfig for PageMD
 *
 * Loads config from:
 * 1. Markdown file directory (.pagemrc, .pagemrc.json, .pagemrc.yaml, pagemd.config.js)
 * 2. Explicit config directory (if provided)
 * 3. Project root
 *
 * Profile search:
 * 1. .pagemd/profiles/<name>.{json,yaml,yml}
 * 2. project/profiles/<name>.{json,yaml,yml}
 */

import { cosmiconfig } from 'cosmiconfig';
import { cosmiconfigSync } from 'cosmiconfig';
import yaml from 'js-yaml';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve, isAbsolute, extname } from 'path';
import { createLogger } from './logger.js';
import { resolveResource } from './path-resolver.js';

const logger = createLogger('io');

// Cache for loaded configs
const configCache = new Map();
const profileCache = new Map();

/**
 * Create cosmiconfig explorer for project config
 * @returns {object} Cosmiconfig explorer
 */
function createProjectExplorer() {
  return cosmiconfig('pagemd', {
    searchPlaces: [
      '.pagemrc',
      '.pagemrc.json',
      '.pagemrc.yaml',
      '.pagemrc.yml',
      'pagemd.config.js',
      'pagemd.config.json',
      'pagemd.config.yaml',
      'pagemd.config.yml'
    ],
    loaders: {
      '.yaml': (filepath) => yaml.load(readFileSync(filepath, 'utf8')),
      '.yml': (filepath) => yaml.load(readFileSync(filepath, 'utf8'))
    }
  });
}

/**
 * Load project-level config
 * @param {string} cwd - Current working directory to search from
 * @returns {Promise<object|null>} Config object or null if not found
 */
export async function loadProjectConfig(cwd) {
  const searchPath = resolve(cwd);
  const cacheKey = `project:${searchPath}`;

  // Check cache
  if (configCache.has(cacheKey)) {
    logger.debug('config', 'cache-hit', 'Project config loaded from cache', { cwd: searchPath });
    return configCache.get(cacheKey);
  }

  logger.trace('config', 'searching', 'Searching for project config', { cwd: searchPath });

  try {
    const explorer = createProjectExplorer();
    const result = await explorer.search(searchPath);

    if (result && result.config) {
      logger.info('config', 'success', 'Project config loaded', {
        file: result.filepath,
        cwd: searchPath
      });
      configCache.set(cacheKey, result.config);
      return result.config;
    }

    logger.debug('config', 'not-found', 'No project config found', { cwd: searchPath });
    configCache.set(cacheKey, null);
    return null;
  } catch (err) {
    logger.error('config', 'failure', 'Failed to load project config', {
      cwd: searchPath,
      error: err.message
    });
    throw new Error(`Failed to load project config from ${searchPath}: ${err.message}`);
  }
}

/**
 * Load project-level config synchronously
 * @param {string} cwd - Current working directory to search from
 * @returns {object|null} Config object or null if not found
 */
export function loadProjectConfigSync(cwd) {
  const searchPath = resolve(cwd);
  const cacheKey = `project:${searchPath}`;

  // Check cache
  if (configCache.has(cacheKey)) {
    logger.debug('config', 'cache-hit', 'Project config loaded from cache', { cwd: searchPath });
    return configCache.get(cacheKey);
  }

  logger.trace('config', 'searching', 'Searching for project config', { cwd: searchPath });

  try {
    const explorer = cosmiconfigSync('pagemd', {
      searchPlaces: [
        '.pagemrc',
        '.pagemrc.json',
        '.pagemrc.yaml',
        '.pagemrc.yml',
        'pagemd.config.js',
        'pagemd.config.json',
        'pagemd.config.yaml',
        'pagemd.config.yml'
      ],
      loaders: {
        '.yaml': (filepath) => yaml.load(readFileSync(filepath, 'utf8')),
        '.yml': (filepath) => yaml.load(readFileSync(filepath, 'utf8'))
      }
    });

    const result = explorer.search(searchPath);

    if (result && result.config) {
      logger.info('config', 'success', 'Project config loaded', {
        file: result.filepath,
        cwd: searchPath
      });
      configCache.set(cacheKey, result.config);
      return result.config;
    }

    logger.debug('config', 'not-found', 'No project config found', { cwd: searchPath });
    configCache.set(cacheKey, null);
    return null;
  } catch (err) {
    logger.error('config', 'failure', 'Failed to load project config', {
      cwd: searchPath,
      error: err.message
    });
    throw new Error(`Failed to load project config from ${searchPath}: ${err.message}`);
  }
}

/**
 * Search for profile in multiple locations
 * @param {string} profileName - Name of the profile (without extension)
 * @param {string[]} searchPaths - Directories to search in order
 * @returns {string|null} Path to profile file or null if not found
 */
function findProfilePath(profileName, searchPaths) {
  const extensions = ['.json', '.yaml', '.yml'];

  for (const searchPath of searchPaths) {
    for (const ext of extensions) {
      const profilePath = join(searchPath, `${profileName}${ext}`);
      if (existsSync(profilePath)) {
        return profilePath;
      }
    }
  }

  return null;
}

/**
 * Detect if input is a file path vs profile ID
 * @param {string} input - User input (profile ID or file path)
 * @returns {boolean} True if input appears to be a file path
 */
function isFilePath(input) {
  if (!input || typeof input !== 'string') return false;
  if (input.includes('/') || input.includes('\\')) return true;
  const lower = input.toLowerCase();
  return lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml');
}

/**
 * Load profile from direct file path
 * @param {string} profilePath - Path to profile file (absolute or relative)
 * @param {string} [baseDir] - Base directory for resolving relative paths (defaults to cwd)
 * @returns {object|null} Profile object or null if not found
 */
function loadProfileFromPath(profilePath, baseDir = null) {
  logger.trace('profiles', 'path-resolve', 'Resolving profile file path', { path: profilePath, baseDir });

  // Normalize path separators (convert backslashes to forward slashes on Unix)
  // This handles Windows-style paths like "subdir\file.json" on Unix
  const normalizedPath = profilePath.replace(/\\/g, '/');

  // Resolve to absolute path using baseDir if provided (e.g., markdown file's directory)
  let resolvedPath;
  if (isAbsolute(normalizedPath)) {
    resolvedPath = normalizedPath;
  } else {
    const base = baseDir || process.cwd();
    resolvedPath = resolve(base, normalizedPath);
  }

  // If no extension, try common extensions
  if (!extname(resolvedPath)) {
    const extensions = ['.json', '.yaml', '.yml'];
    for (const ext of extensions) {
      const pathWithExt = `${resolvedPath}${ext}`;
      if (existsSync(pathWithExt)) {
        resolvedPath = pathWithExt;
        logger.trace('profiles', 'path-ext-found', 'Profile file found with extension', {
          original: profilePath,
          resolved: resolvedPath
        });
        break;
      }
    }
  }

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    logger.warn('profiles', 'path-not-found', 'Profile file path does not exist', {
      input: profilePath,
      resolved: resolvedPath
    });
    return null;
  }

  try {
    logger.debug('profiles', 'path-loading', 'Loading profile from file path', {
      path: resolvedPath
    });

    const content = readFileSync(resolvedPath, 'utf8');
    let profile;

    if (resolvedPath.endsWith('.json')) {
      profile = JSON.parse(content);
    } else if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
      profile = yaml.load(content);
    } else {
      throw new Error(`Unsupported profile file extension: ${resolvedPath}`);
    }

    // Attach manifest directory for token resolution (e.g., ${manifestDir})
    profile._manifestDir = dirname(resolvedPath);

    logger.info('profiles', 'path-success', 'Profile loaded from file path', {
      path: resolvedPath,
      id: profile.id,
      manifestDir: profile._manifestDir
    });

    return profile;
  } catch (err) {
    logger.error('profiles', 'path-failure', 'Failed to load profile from file path', {
      path: resolvedPath,
      error: err.message
    });
    throw new Error(`Failed to load profile from ${resolvedPath}: ${err.message}`);
  }
}

/**
 * Load a profile manifest
 * @param {string} profileName - Name of the profile to load
 * @param {string} [searchFrom] - Directory to start search from (markdown file dir)
 * @param {string} [configDir] - Explicit config directory
 * @param {string} [cliPath] - CLI package root for bundled defaults
 * @returns {Promise<object|null>} Profile object or null if not found
 */
export async function loadProfile(profileName, searchFrom = null, configDir = null, cliPath = null) {
  // Check if input is a file path
  if (isFilePath(profileName)) {
    logger.trace('profiles', 'path-mode', 'Profile input detected as file path', { profile: profileName });
    const cacheKey = `profile-path:${resolve(process.cwd(), profileName)}`;
    if (profileCache.has(cacheKey)) {
      logger.debug('profiles', 'cache-hit', 'Profile loaded from cache (path)', { profile: profileName });
      return profileCache.get(cacheKey);
    }
    const profile = loadProfileFromPath(profileName);
    profileCache.set(cacheKey, profile);
    return profile;
  }

  const cacheKey = `profile:${profileName}:${searchFrom || 'default'}:${configDir || 'default'}:${cliPath || 'default'}`;

  // Check cache
  if (profileCache.has(cacheKey)) {
    logger.debug('profiles', 'cache-hit', 'Profile loaded from cache', { profile: profileName });
    return profileCache.get(cacheKey);
  }

  logger.trace('profiles', 'searching', 'Searching for profile', {
    profile: profileName,
    searchFrom,
    configDir,
    cliPath
  });

  // Build context for resolveResource
  const context = {
    workingPath: searchFrom,
    workspacePath: configDir || searchFrom || process.cwd(),
    cliPath,
    sourceType: 'cli'
  };

  try {
    const { resolvedPath } = resolveResource(profileName, 'profiles', context);

    logger.debug('profiles', 'loading', 'Loading profile from file', {
      profile: profileName,
      file: resolvedPath
    });

    const content = readFileSync(resolvedPath, 'utf8');
    let profile;

    if (resolvedPath.endsWith('.json')) {
      profile = JSON.parse(content);
    } else if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
      profile = yaml.load(content);
    } else {
      throw new Error(`Unsupported profile file extension: ${resolvedPath}`);
    }

    // Attach manifest directory for token resolution (e.g., ${manifestDir})
    profile._manifestDir = dirname(resolvedPath);

    logger.info('profiles', 'success', 'Profile loaded', {
      profile: profileName,
      file: resolvedPath,
      id: profile.id,
      manifestDir: profile._manifestDir
    });

    // Validate profile.id matches filename
    if (profile.id !== profileName) {
      logger.warn('profiles', 'mismatch', 'Profile ID does not match filename', {
        profile: profileName,
        profileId: profile.id,
        file: resolvedPath
      });
    }

    profileCache.set(cacheKey, profile);
    return profile;
  } catch (err) {
    logger.error('profiles', 'failure', 'Failed to load profile', {
      profile: profileName,
      error: err.message
    });

    // If resolveResource failed, cache null result
    profileCache.set(cacheKey, null);

    // Re-throw if it's not a "not found" error
    if (!err.message.includes('not found')) {
      throw new Error(`Failed to load profile ${profileName}: ${err.message}`);
    }

    return null;
  }
}

/**
 * Load a profile manifest synchronously
 * @param {string} profileName - Name of the profile to load
 * @param {string} [searchFrom] - Directory to start search from (markdown file dir)
 * @param {string} [configDir] - Explicit config directory
 * @param {string} [cliPath] - CLI package root for bundled defaults
 * @returns {object|null} Profile object or null if not found
 */
export function loadProfileSync(profileName, searchFrom = null, configDir = null, cliPath = null) {
  // Early validation: treat null/empty/whitespace as "use default"
  if (!profileName || (typeof profileName === 'string' && profileName.trim() === '')) {
    logger.debug('profiles', 'default', 'No profile specified, using default', {
      input: profileName
    });
    return loadProfileSync('standard_letter', searchFrom, configDir, cliPath);
  }

  // Check if input is a file path
  if (isFilePath(profileName)) {
    logger.trace('profiles', 'path-mode', 'Profile input detected as file path', { profile: profileName, searchFrom });
    // Use searchFrom as base directory for relative paths (e.g., markdown file's directory)
    const baseDir = searchFrom || process.cwd();
    const cacheKey = `profile-path:${resolve(baseDir, profileName)}`;
    if (profileCache.has(cacheKey)) {
      logger.debug('profiles', 'cache-hit', 'Profile loaded from cache (path)', { profile: profileName });
      return profileCache.get(cacheKey);
    }
    const profile = loadProfileFromPath(profileName, baseDir);
    profileCache.set(cacheKey, profile);
    return profile;
  }

  const cacheKey = `profile:${profileName}:${searchFrom || 'default'}:${configDir || 'default'}:${cliPath || 'default'}`;

  // Check cache
  if (profileCache.has(cacheKey)) {
    logger.debug('profiles', 'cache-hit', 'Profile loaded from cache', { profile: profileName });
    return profileCache.get(cacheKey);
  }

  logger.trace('profiles', 'searching', 'Searching for profile', {
    profile: profileName,
    searchFrom,
    configDir,
    cliPath
  });

  // Build context for resolveResource
  const context = {
    workingPath: searchFrom,
    workspacePath: configDir || searchFrom || process.cwd(),
    cliPath,
    sourceType: 'cli'
  };

  try {
    const { resolvedPath } = resolveResource(profileName, 'profiles', context);

    logger.debug('profiles', 'loading', 'Loading profile from file', {
      profile: profileName,
      file: resolvedPath
    });

    const content = readFileSync(resolvedPath, 'utf8');
    let profile;

    if (resolvedPath.endsWith('.json')) {
      profile = JSON.parse(content);
    } else if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
      profile = yaml.load(content);
    } else {
      throw new Error(`Unsupported profile file extension: ${resolvedPath}`);
    }

    // Attach manifest directory for token resolution (e.g., ${manifestDir})
    profile._manifestDir = dirname(resolvedPath);

    logger.info('profiles', 'success', 'Profile loaded', {
      profile: profileName,
      file: resolvedPath,
      id: profile.id,
      manifestDir: profile._manifestDir
    });

    // Validate profile.id matches filename
    if (profile.id !== profileName) {
      logger.warn('profiles', 'mismatch', 'Profile ID does not match filename', {
        profile: profileName,
        profileId: profile.id,
        file: resolvedPath
      });
    }

    profileCache.set(cacheKey, profile);
    return profile;
  } catch (err) {
    logger.error('profiles', 'failure', 'Failed to load profile', {
      profile: profileName,
      error: err.message
    });

    // If resolveResource failed, cache null result
    profileCache.set(cacheKey, null);

    // Re-throw if it's not a "not found" error
    if (!err.message.includes('not found')) {
      throw new Error(`Failed to load profile ${profileName}: ${err.message}`);
    }

    return null;
  }
}

/**
 * Load a config file by name from search paths
 * @param {string} searchFrom - Directory to start search from
 * @param {string} configName - Name of config to load (without extension)
 * @returns {Promise<object|null>} Config object or null if not found
 */
export async function loadConfig(searchFrom, configName) {
  // For now, delegate to loadProfile as config files are primarily profiles
  // This can be extended for other config types in the future
  return loadProfile(configName, searchFrom);
}

/**
 * Load a config file by name synchronously
 * @param {string} searchFrom - Directory to start search from
 * @param {string} configName - Name of config to load (without extension)
 * @returns {object|null} Config object or null if not found
 */
export function loadConfigSync(searchFrom, configName) {
  return loadProfileSync(configName, searchFrom);
}

/**
 * Clear all cached configs and profiles
 */
export function clearConfigCache() {
  const configCount = configCache.size;
  const profileCount = profileCache.size;

  configCache.clear();
  profileCache.clear();

  logger.debug('config', 'cleared', 'Config cache cleared', {
    configs: configCount,
    profiles: profileCount
  });
}
