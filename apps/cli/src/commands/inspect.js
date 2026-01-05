/**
 * @pagemd/cli/commands/inspect
 * Inspect document configuration - shows merged profile, metadata, and resources
 *
 * Displays the final merged configuration that would be used when building a document,
 * combining CLI flags, frontmatter, profile settings, and defaults.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  createLogger,
  getEnv,
  loadAndMergeProfile,
  getDefaultProfile,
  findProjectRoot,
  formatBytes
} from '@pagemd/core';
import { extractFrontmatter, normalizeMetadata } from '@pagemd/parser';

const logger = createLogger('cli');

/**
 * Yargs command definition
 */
export const command = 'inspect <input>';
export const aliases = ['insp'];
export const describe = 'Inspect document configuration and merged settings';

// Get env var defaults
const envProfile = getEnv('profile') || getDefaultProfile();

export const builder = {
  input: {
    describe: 'Input markdown file to inspect',
    type: 'string',
    demandOption: true
  },
  profile: {
    alias: 'p',
    describe: 'Profile override (ignores frontmatter)',
    type: 'string'
  },
  json: {
    describe: 'Output as JSON',
    type: 'boolean',
    default: false
  },
  section: {
    alias: 's',
    describe: 'Section to show',
    type: 'string',
    choices: ['profile', 'metadata', 'resources', 'outputs', 'all'],
    default: 'all'
  }
};

/**
 * Format section header
 * @param {string} title - Section title
 * @returns {string} Formatted header
 */
function sectionHeader(title) {
  return `\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`;
}

/**
 * Format object as indented lines
 * @param {object} obj - Object to format
 * @param {number} indent - Indentation level
 * @returns {string} Formatted lines
 */
function formatObject(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${pad}${key}: null`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      lines.push(formatObject(value, indent + 1));
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`);
      } else if (value.every(v => typeof v !== 'object')) {
        lines.push(`${pad}${key}: [${value.join(', ')}]`);
      } else {
        lines.push(`${pad}${key}:`);
        value.forEach((item, i) => {
          if (typeof item === 'object') {
            lines.push(`${pad}  - [${i}]:`);
            lines.push(formatObject(item, indent + 2));
          } else {
            lines.push(`${pad}  - ${item}`);
          }
        });
      }
    } else {
      lines.push(`${pad}${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format profile section
 * @param {object} profile - Merged profile
 * @returns {string} Formatted profile info
 */
function formatProfileSection(profile) {
  const lines = [sectionHeader('Profile')];

  lines.push(`  ID: ${profile.id}`);
  if (profile.description) {
    lines.push(`  Description: ${profile.description}`);
  }
  if (profile.extends) {
    lines.push(`  Extends: ${profile.extends}`);
  }

  if (profile.layout) {
    lines.push(`  Layout:`);
    lines.push(`    Type: ${profile.layout.type || 'default'}`);
    if (profile.layout.css) {
      lines.push(`    CSS: ${profile.layout.css}`);
    }
    if (profile.layout.paper_size) {
      lines.push(`    Paper: ${profile.layout.paper_size}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format metadata section
 * @param {object} metadata - Document metadata
 * @returns {string} Formatted metadata
 */
function formatMetadataSection(metadata) {
  const lines = [sectionHeader('Document Metadata')];

  // Show key metadata fields first
  const keyFields = ['document_id', 'title', 'revision', 'author', 'date'];
  for (const field of keyFields) {
    if (metadata[field]) {
      lines.push(`  ${field}: ${metadata[field]}`);
    }
  }

  // Show remaining fields
  const remaining = Object.entries(metadata)
    .filter(([key]) => !keyFields.includes(key))
    .filter(([_, value]) => value !== null && value !== undefined);

  if (remaining.length > 0) {
    lines.push('');
    lines.push('  Other fields:');
    for (const [key, value] of remaining) {
      if (typeof value === 'object') {
        lines.push(`    ${key}:`);
        lines.push(formatObject(value, 3));
      } else {
        lines.push(`    ${key}: ${value}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format resources section
 * @param {object} profile - Profile with resources
 * @returns {string} Formatted resources
 */
function formatResourcesSection(profile) {
  const lines = [sectionHeader('Resources')];

  const resources = profile.resources || {};

  if (resources.css && resources.css.length > 0) {
    lines.push('  CSS files:');
    resources.css.forEach(css => {
      lines.push(`    - ${css}`);
    });
  }

  if (resources.template) {
    lines.push(`  Template: ${resources.template}`);
  }

  if (resources.fonts && resources.fonts.length > 0) {
    lines.push('  Fonts:');
    resources.fonts.forEach(font => {
      lines.push(`    - ${font}`);
    });
  }

  if (resources.highlight_theme) {
    lines.push(`  Highlight theme: ${resources.highlight_theme}`);
  }

  if (Object.keys(resources).length === 0) {
    lines.push('  (no resources configured)');
  }

  return lines.join('\n');
}

/**
 * Format outputs section
 * @param {object} profile - Profile with outputs
 * @returns {string} Formatted outputs
 */
function formatOutputsSection(profile) {
  const lines = [sectionHeader('Outputs')];

  const outputs = profile.outputs || {};

  if (Object.keys(outputs).length === 0) {
    lines.push('  (no outputs configured)');
    return lines.join('\n');
  }

  for (const [format, config] of Object.entries(outputs)) {
    const enabled = config.enabled !== false;
    const status = enabled ? '✓' : '✗';
    lines.push(`  ${status} ${format.toUpperCase()}`);

    if (enabled && typeof config === 'object') {
      const configEntries = Object.entries(config)
        .filter(([key]) => key !== 'enabled');

      for (const [key, value] of configEntries) {
        lines.push(`      ${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Command handler
 * @param {object} argv - Yargs arguments
 */
export async function handler(argv) {
  const { input, profile: profileOverride, json, section, projectRoot } = argv;

  logger.trace('command', 'start', 'inspect command started', {
    input,
    profileOverride,
    json,
    section
  });

  try {
    // Resolve input path
    const inputPath = path.resolve(process.cwd(), input);

    // Check file exists
    try {
      await fs.access(inputPath);
    } catch {
      console.error(`Error: File not found: ${inputPath}`);
      process.exit(1);
    }

    // Read and parse frontmatter
    const content = await fs.readFile(inputPath, 'utf-8');
    const { metadata: rawMetadata } = extractFrontmatter(content);
    const metadata = normalizeMetadata(rawMetadata);

    // Determine profile to use (CLI > frontmatter > env > default)
    const profileId = profileOverride
      || metadata.pipeline_profile
      || envProfile
      || getDefaultProfile();

    // Load and merge profile
    let profile = null;
    let profileError = null;
    try {
      profile = await loadAndMergeProfile(profileId, { searchFrom: projectRoot });
    } catch (err) {
      profileError = err.message;
      logger.warn('command', 'profile-error', `Profile '${profileId}' not found or invalid`, {
        error: err.message
      });
    }

    // Build inspection result
    const result = {
      input: {
        path: inputPath,
        filename: path.basename(inputPath)
      },
      profileId,
      profileSource: profileOverride ? 'cli' : (metadata.pipeline_profile ? 'frontmatter' : 'default'),
      profileError,
      profile,
      metadata,
      resources: profile?.resources || {},
      outputs: profile?.outputs || {}
    };

    // JSON output
    if (json) {
      console.log(JSON.stringify(result, null, 2));
      logger.info('command', 'success', 'inspect completed (JSON)', { input });
      return;
    }

    // Human-readable output
    const lines = [];

    // Header
    lines.push(sectionHeader('PageMD Document Inspection'));
    lines.push(`  File: ${result.input.filename}`);
    lines.push(`  Path: ${result.input.path}`);
    lines.push(`  Profile: ${profileId} (from ${result.profileSource})`);

    if (profileError) {
      lines.push(`  ⚠ Profile Error: ${profileError}`);
    }

    // Sections
    if (section === 'all' || section === 'profile') {
      if (profile) {
        lines.push(formatProfileSection(profile));
      } else {
        lines.push(sectionHeader('Profile'));
        lines.push('  (profile not available)');
      }
    }

    if (section === 'all' || section === 'metadata') {
      lines.push(formatMetadataSection(metadata));
    }

    if (section === 'all' || section === 'resources') {
      if (profile) {
        lines.push(formatResourcesSection(profile));
      } else {
        lines.push(sectionHeader('Resources'));
        lines.push('  (profile not available)');
      }
    }

    if (section === 'all' || section === 'outputs') {
      if (profile) {
        lines.push(formatOutputsSection(profile));
      } else {
        lines.push(sectionHeader('Outputs'));
        lines.push('  (profile not available)');
      }
    }

    lines.push('');
    console.log(lines.join('\n'));

    logger.info('command', 'success', 'inspect completed', { input });

  } catch (err) {
    logger.error('command', 'failure', 'inspect failed', {
      error: err.message,
      stack: err.stack
    });
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
