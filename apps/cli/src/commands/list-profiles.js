/**
 * @pagemd/cli/commands/list-profiles
 * List available profile manifests
 *
 * Scans:
 * 1. {projectRoot}/.pagemd/profiles/ (workspace overrides)
 * 2. {projectRoot}/templates/profiles/ (project defaults)
 *
 * Outputs:
 * - Default: human-readable list with id, description, extends
 * - --json: JSON array of profile objects
 * - --verbose: Full profile details
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import yaml from 'js-yaml';
import { createLogger } from '@pagemd/core';

const logger = createLogger('cli');

/**
 * Yargs command name
 */
export const command = 'list-profiles';

/**
 * Yargs command aliases
 */
export const aliases = ['profiles', 'lp'];

/**
 * Yargs command description
 */
export const describe = 'List available profiles';

/**
 * Yargs command builder
 */
export const builder = {
  json: {
    type: 'boolean',
    describe: 'Output as JSON array',
    default: false
  },
  verbose: {
    alias: 'v',
    type: 'boolean',
    describe: 'Show full profile details',
    default: false
  }
};

/**
 * Load profile from file
 * @param {string} filePath - Absolute path to profile file
 * @returns {object|null} Profile object or null if load fails
 */
function loadProfileFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    let profile;

    if (filePath.endsWith('.json')) {
      profile = JSON.parse(content);
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      profile = yaml.load(content);
    } else {
      logger.warn('profiles', 'skip', 'Unsupported file extension', { file: filePath });
      return null;
    }

    return profile;
  } catch (err) {
    logger.error('profiles', 'failure', 'Failed to load profile', {
      file: filePath,
      error: err.message
    });
    return null;
  }
}

/**
 * Scan directory for profile files
 * @param {string} dirPath - Directory to scan
 * @returns {object[]} Array of profile objects with metadata
 */
function scanProfileDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    logger.trace('profiles', 'skip', 'Directory does not exist', { dir: dirPath });
    return [];
  }

  logger.debug('profiles', 'scanning', 'Scanning profile directory', { dir: dirPath });

  const profiles = [];
  const files = readdirSync(dirPath);

  for (const file of files) {
    // Only process .json, .yaml, .yml files
    if (!/\.(json|yaml|yml)$/.test(file)) {
      continue;
    }

    const filePath = join(dirPath, file);
    const profile = loadProfileFile(filePath);

    if (profile) {
      const filename = basename(file, file.match(/\.(json|yaml|yml)$/)[0]);

      // Warn if profile.id doesn't match filename
      if (profile.id && profile.id !== filename) {
        logger.warn('profiles', 'mismatch', 'Profile ID does not match filename', {
          file,
          profileId: profile.id,
          filename
        });
      }

      profiles.push({
        id: profile.id || filename,
        description: profile.description || null,
        extends: profile.extends || null,
        filePath,
        profile: profile // Full profile for verbose mode
      });
    }
  }

  logger.debug('profiles', 'success', 'Scanned profile directory', {
    dir: dirPath,
    count: profiles.length
  });

  return profiles;
}

/**
 * Discover all available profiles
 * @param {string} projectRoot - Absolute path to project root
 * @returns {object[]} Array of profile objects
 */
function discoverProfiles(projectRoot) {
  logger.info('discovery', 'in-progress', 'Discovering profiles', { projectRoot });

  const allProfiles = new Map(); // Use Map to deduplicate by ID (workspace overrides project)

  // Scan project defaults first
  const projectProfilesDir = join(projectRoot, 'project', 'templates', 'profiles');
  const projectProfiles = scanProfileDirectory(projectProfilesDir);

  for (const profile of projectProfiles) {
    allProfiles.set(profile.id, { ...profile, source: 'project' });
  }

  // Scan workspace overrides (higher priority)
  const workspaceProfilesDir = join(projectRoot, '.pagemd', 'profiles');
  const workspaceProfiles = scanProfileDirectory(workspaceProfilesDir);

  for (const profile of workspaceProfiles) {
    allProfiles.set(profile.id, { ...profile, source: 'workspace' });
  }

  const profiles = Array.from(allProfiles.values());

  logger.info('discovery', 'success', 'Profiles discovered', {
    total: profiles.length,
    project: projectProfiles.length,
    workspace: workspaceProfiles.length
  });

  return profiles;
}

/**
 * Format profiles as human-readable list
 * @param {object[]} profiles - Array of profile objects
 * @param {boolean} verbose - Show full details
 * @returns {string} Formatted output
 */
function formatProfilesList(profiles, verbose) {
  if (profiles.length === 0) {
    return 'No profiles found.';
  }

  const lines = ['Available profiles:'];

  // Sort by id
  const sorted = profiles.sort((a, b) => a.id.localeCompare(b.id));

  for (const profile of sorted) {
    const parts = [`  ${profile.id}`];

    if (profile.description) {
      parts.push(`    ${profile.description}`);
    }

    if (profile.extends) {
      parts.push(`    (extends: ${profile.extends})`);
    }

    if (verbose) {
      parts.push(`    Source: ${profile.source}`);
      parts.push(`    File: ${profile.filePath}`);

      if (profile.profile) {
        // Show key sections
        if (profile.profile.layout) {
          parts.push(`    Layout: ${profile.profile.layout.type}`);
        }

        if (profile.profile.outputs) {
          const enabledOutputs = Object.entries(profile.profile.outputs)
            .filter(([_, config]) => config.enabled)
            .map(([type, _]) => type);

          if (enabledOutputs.length > 0) {
            parts.push(`    Outputs: ${enabledOutputs.join(', ')}`);
          }
        }

        if (profile.profile.validation?.required_fields) {
          parts.push(`    Required fields: ${profile.profile.validation.required_fields.join(', ')}`);
        }
      }
    }

    lines.push(parts.join('\n'));
  }

  return lines.join('\n');
}

/**
 * Command handler
 * @param {object} argv - Yargs arguments
 */
export async function handler(argv) {
  const { json, verbose, projectRoot } = argv;

  logger.trace('command', 'start', 'list-profiles command started', { json, verbose });

  try {
    // Discover profiles
    const profiles = discoverProfiles(projectRoot);

    // Output results
    if (json) {
      // JSON output
      const output = profiles.map(p => ({
        id: p.id,
        description: p.description,
        extends: p.extends,
        source: p.source,
        filePath: p.filePath,
        ...(verbose ? { profile: p.profile } : {})
      }));

      console.log(JSON.stringify(output, null, 2));
      logger.info('command', 'success', 'list-profiles completed (JSON)', {
        count: profiles.length
      });
    } else {
      // Human-readable output
      const output = formatProfilesList(profiles, verbose);
      console.log(output);
      logger.info('command', 'success', 'list-profiles completed', {
        count: profiles.length
      });
    }
  } catch (err) {
    logger.error('command', 'failure', 'list-profiles failed', {
      error: err.message,
      stack: err.stack
    });
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
