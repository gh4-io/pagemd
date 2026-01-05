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
 * 2. project/templates/profiles/<name>.{json,yaml,yml}
 */

import { cosmiconfig } from 'cosmiconfig';
import { cosmiconfigSync } from 'cosmiconfig';
import yaml from 'js-yaml';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { createLogger } from './logger.js';

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
 * Load a profile manifest
 * @param {string} profileName - Name of the profile to load
 * @param {string} [searchFrom] - Directory to start search from (markdown file dir)
 * @param {string} [configDir] - Explicit config directory
 * @returns {Promise<object|null>} Profile object or null if not found
 */
export async function loadProfile(profileName, searchFrom = null, configDir = null) {
  const cacheKey = `profile:${profileName}:${searchFrom || 'default'}:${configDir || 'default'}`;

  // Check cache
  if (profileCache.has(cacheKey)) {
    logger.debug('profiles', 'cache-hit', 'Profile loaded from cache', { profile: profileName });
    return profileCache.get(cacheKey);
  }

  logger.trace('profiles', 'searching', 'Searching for profile', {
    profile: profileName,
    searchFrom,
    configDir
  });

  // Build search paths in priority order
  const searchPaths = [];

  // 1. Markdown file directory .pagemd/profiles/
  if (searchFrom) {
    searchPaths.push(join(searchFrom, '.pagemd', 'profiles'));
  }

  // 2. Explicit config directory profiles/
  if (configDir) {
    searchPaths.push(join(configDir, 'profiles'));
  }

  // 3. Project root .pagemd/profiles/
  const projectRoot = process.cwd();
  searchPaths.push(join(projectRoot, '.pagemd', 'profiles'));

  // 4. Project templates profiles/
  searchPaths.push(join(projectRoot, 'templates', 'profiles'));

  // Find profile file
  const profilePath = findProfilePath(profileName, searchPaths);

  if (!profilePath) {
    logger.warn('profiles', 'not-found', 'Profile not found', {
      profile: profileName,
      searchPaths
    });
    profileCache.set(cacheKey, null);
    return null;
  }

  try {
    logger.debug('profiles', 'loading', 'Loading profile from file', {
      profile: profileName,
      file: profilePath
    });

    const content = readFileSync(profilePath, 'utf8');
    let profile;

    if (profilePath.endsWith('.json')) {
      profile = JSON.parse(content);
    } else if (profilePath.endsWith('.yaml') || profilePath.endsWith('.yml')) {
      profile = yaml.load(content);
    } else {
      throw new Error(`Unsupported profile file extension: ${profilePath}`);
    }

    logger.info('profiles', 'success', 'Profile loaded', {
      profile: profileName,
      file: profilePath,
      id: profile.id
    });

    // Validate profile.id matches filename
    if (profile.id !== profileName) {
      logger.warn('profiles', 'mismatch', 'Profile ID does not match filename', {
        profile: profileName,
        profileId: profile.id,
        file: profilePath
      });
    }

    profileCache.set(cacheKey, profile);
    return profile;
  } catch (err) {
    logger.error('profiles', 'failure', 'Failed to load profile', {
      profile: profileName,
      file: profilePath,
      error: err.message
    });
    throw new Error(`Failed to load profile ${profileName} from ${profilePath}: ${err.message}`);
  }
}

/**
 * Load a profile manifest synchronously
 * @param {string} profileName - Name of the profile to load
 * @param {string} [searchFrom] - Directory to start search from (markdown file dir)
 * @param {string} [configDir] - Explicit config directory
 * @returns {object|null} Profile object or null if not found
 */
export function loadProfileSync(profileName, searchFrom = null, configDir = null) {
  const cacheKey = `profile:${profileName}:${searchFrom || 'default'}:${configDir || 'default'}`;

  // Check cache
  if (profileCache.has(cacheKey)) {
    logger.debug('profiles', 'cache-hit', 'Profile loaded from cache', { profile: profileName });
    return profileCache.get(cacheKey);
  }

  logger.trace('profiles', 'searching', 'Searching for profile', {
    profile: profileName,
    searchFrom,
    configDir
  });

  // Build search paths in priority order
  const searchPaths = [];

  // 1. Markdown file directory .pagemd/profiles/
  if (searchFrom) {
    searchPaths.push(join(searchFrom, '.pagemd', 'profiles'));
  }

  // 2. Explicit config directory profiles/
  if (configDir) {
    searchPaths.push(join(configDir, 'profiles'));
  }

  // 3. Project root .pagemd/profiles/
  const projectRoot = process.cwd();
  searchPaths.push(join(projectRoot, '.pagemd', 'profiles'));

  // 4. Project templates profiles/
  searchPaths.push(join(projectRoot, 'templates', 'profiles'));

  // Find profile file
  const profilePath = findProfilePath(profileName, searchPaths);

  if (!profilePath) {
    logger.warn('profiles', 'not-found', 'Profile not found', {
      profile: profileName,
      searchPaths
    });
    profileCache.set(cacheKey, null);
    return null;
  }

  try {
    logger.debug('profiles', 'loading', 'Loading profile from file', {
      profile: profileName,
      file: profilePath
    });

    const content = readFileSync(profilePath, 'utf8');
    let profile;

    if (profilePath.endsWith('.json')) {
      profile = JSON.parse(content);
    } else if (profilePath.endsWith('.yaml') || profilePath.endsWith('.yml')) {
      profile = yaml.load(content);
    } else {
      throw new Error(`Unsupported profile file extension: ${profilePath}`);
    }

    logger.info('profiles', 'success', 'Profile loaded', {
      profile: profileName,
      file: profilePath,
      id: profile.id
    });

    // Validate profile.id matches filename
    if (profile.id !== profileName) {
      logger.warn('profiles', 'mismatch', 'Profile ID does not match filename', {
        profile: profileName,
        profileId: profile.id,
        file: profilePath
      });
    }

    profileCache.set(cacheKey, profile);
    return profile;
  } catch (err) {
    logger.error('profiles', 'failure', 'Failed to load profile', {
      profile: profileName,
      file: profilePath,
      error: err.message
    });
    throw new Error(`Failed to load profile ${profileName} from ${profilePath}: ${err.message}`);
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
