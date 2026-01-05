/**
 * @pagemd/core/resource-discovery
 * Discover and enumerate PageMD resources (profiles, templates, layouts, styles)
 *
 * Scans:
 * 1. {projectRoot}/project/{type}/ (project defaults)
 * 2. {projectRoot}/.pagemd/{type}/ (workspace overrides, if includeWorkspace)
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';
import yaml from 'js-yaml';
import { createLogger } from './logger.js';
import { RESOURCE_PATHS } from './paths.js';

const logger = createLogger('discovery');

/**
 * File extensions for each resource type
 * @constant {Object}
 */
const RESOURCE_EXTENSIONS = {
  profiles: ['.json', '.yaml', '.yml'],
  templates: ['.html'],
  layouts: ['.css'],
  styles: ['.css']
};

/**
 * Valid resource types
 * @constant {string[]}
 */
export const RESOURCE_TYPES = Object.keys(RESOURCE_PATHS);

/**
 * Load resource content (for profiles only - JSON/YAML)
 * @param {string} filePath - Absolute path to resource file
 * @returns {object|null} Parsed content or null if not applicable/failed
 */
function loadResourceContent(filePath) {
  const ext = extname(filePath).toLowerCase();

  // Only parse JSON/YAML files
  if (!['.json', '.yaml', '.yml'].includes(ext)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf8');

    if (ext === '.json') {
      return JSON.parse(content);
    } else {
      return yaml.load(content);
    }
  } catch (err) {
    logger.warn('load', 'failure', 'Failed to parse resource', {
      file: filePath,
      error: err.message
    });
    return null;
  }
}

/**
 * Scan a directory for resources of a given type
 * @param {string} dirPath - Directory to scan
 * @param {string} type - Resource type (profiles, templates, layouts, styles)
 * @param {string} source - Source label ('project' or 'workspace')
 * @returns {object[]} Array of resource objects
 */
function scanDirectory(dirPath, type, source) {
  if (!existsSync(dirPath)) {
    logger.trace('scan', 'skip', 'Directory does not exist', { dir: dirPath });
    return [];
  }

  const extensions = RESOURCE_EXTENSIONS[type];
  if (!extensions) {
    logger.warn('scan', 'skip', 'Unknown resource type', { type });
    return [];
  }

  logger.debug('scan', 'in-progress', 'Scanning directory', { dir: dirPath, type });

  const resources = [];

  try {
    const files = readdirSync(dirPath);

    for (const file of files) {
      const ext = extname(file).toLowerCase();

      // Skip files that don't match expected extensions
      if (!extensions.includes(ext)) {
        continue;
      }

      const filePath = join(dirPath, file);

      // Skip directories
      let stats;
      try {
        stats = statSync(filePath);
        if (stats.isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }

      // Extract name without extension
      const name = basename(file, ext);

      // Build resource object
      const resource = {
        name,
        path: filePath,
        source,
        size: stats.size,
        extension: ext
      };

      // For profiles, add parsed content fields
      if (type === 'profiles') {
        const content = loadResourceContent(filePath);
        if (content) {
          resource.id = content.id || name;
          resource.description = content.description || null;
          resource.extends = content.extends || null;
          resource.content = content;

          // Warn if profile.id doesn't match filename
          if (content.id && content.id !== name) {
            logger.warn('scan', 'mismatch', 'Profile ID does not match filename', {
              file,
              profileId: content.id,
              filename: name
            });
          }
        } else {
          resource.id = name;
          resource.description = null;
          resource.extends = null;
          resource.content = null;
        }
      }

      resources.push(resource);
    }
  } catch (err) {
    logger.error('scan', 'failure', 'Failed to scan directory', {
      dir: dirPath,
      error: err.message
    });
    return [];
  }

  logger.debug('scan', 'success', 'Directory scanned', {
    dir: dirPath,
    count: resources.length
  });

  return resources;
}

/**
 * Discover resources of a given type
 * @param {string} type - Resource type: 'profiles', 'templates', 'layouts', 'styles'
 * @param {string} projectRoot - Absolute path to project root
 * @param {object} [options={}] - Discovery options
 * @param {boolean} [options.includeWorkspace=false] - Include .pagemd/ workspace resources
 * @returns {object[]} Array of resource objects sorted by name
 *
 * Resource object shape:
 * - name: string (filename without extension)
 * - path: string (absolute file path)
 * - source: 'project' | 'workspace'
 * - size: number (bytes)
 * - extension: string (e.g., '.json', '.css')
 *
 * For profiles only:
 * - id: string (profile.id or filename)
 * - description: string|null
 * - extends: string|null
 * - content: object|null (parsed profile)
 */
export function discoverResources(type, projectRoot, options = {}) {
  const { includeWorkspace = false } = options;

  // Validate type
  if (!RESOURCE_TYPES.includes(type)) {
    throw new Error(
      `Unknown resource type: '${type}'. Valid types: ${RESOURCE_TYPES.join(', ')}`
    );
  }

  logger.info('discover', 'in-progress', 'Discovering resources', {
    type,
    projectRoot,
    includeWorkspace
  });

  const resourceMap = new Map(); // Deduplicate by name (workspace overrides project)

  // Scan project directory first
  // Note: projectRoot already points to the project/ folder (from getPackageRootFromCli)
  const projectDir = join(projectRoot, RESOURCE_PATHS[type]);
  const projectResources = scanDirectory(projectDir, type, 'project');

  for (const resource of projectResources) {
    resourceMap.set(resource.name, resource);
  }

  // Scan workspace directory if requested (higher priority)
  if (includeWorkspace) {
    const workspaceDir = join(projectRoot, '.pagemd', RESOURCE_PATHS[type]);
    const workspaceResources = scanDirectory(workspaceDir, type, 'workspace');

    for (const resource of workspaceResources) {
      resourceMap.set(resource.name, resource);
    }
  }

  const resources = Array.from(resourceMap.values());

  // Sort by name
  resources.sort((a, b) => a.name.localeCompare(b.name));

  logger.info('discover', 'success', 'Resources discovered', {
    type,
    total: resources.length,
    project: projectResources.length,
    workspace: includeWorkspace ? resources.length - projectResources.length : 0
  });

  return resources;
}

/**
 * Get resource directories for a type
 * @param {string} type - Resource type
 * @param {string} projectRoot - Absolute path to project root
 * @returns {object} Directory paths { project, workspace }
 */
export function getResourceDirectories(type, projectRoot) {
  if (!RESOURCE_TYPES.includes(type)) {
    throw new Error(
      `Unknown resource type: '${type}'. Valid types: ${RESOURCE_TYPES.join(', ')}`
    );
  }

  return {
    project: join(projectRoot, RESOURCE_PATHS[type]),
    workspace: join(projectRoot, '.pagemd', RESOURCE_PATHS[type])
  };
}
