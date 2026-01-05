/**
 * @pagemd/cli/commands/list
 * List available PageMD resources (profiles, templates, layouts, styles)
 *
 * Scans:
 * 1. {projectRoot}/project/{type}/ (project defaults)
 * 2. {projectRoot}/.pagemd/{type}/ (workspace overrides, with --all)
 *
 * Outputs:
 * - Default: human-readable list
 * - --json: JSON array of resource objects
 * - --verbose: Full details (paths, sizes)
 */

import {
  createLogger,
  discoverResources,
  RESOURCE_TYPES,
  formatBytes
} from '@pagemd/core';

const logger = createLogger('cli');

/**
 * Yargs command definition
 */
export const command = 'list [resource]';
export const aliases = ['ls'];
export const describe = 'List available resources (profiles, templates, layouts, styles)';

export const builder = (yargs) => {
  return yargs
    .positional('resource', {
      describe: 'Resource type to list',
      type: 'string',
      choices: RESOURCE_TYPES
    })
    .option('json', {
      alias: 'j',
      describe: 'Output as JSON array',
      type: 'boolean',
      default: false
    })
    .option('verbose', {
      describe: 'Show full details (paths, sizes)',
      type: 'boolean',
      default: false
    })
    .option('all', {
      alias: 'a',
      describe: 'Include workspace resources (.pagemd/)',
      type: 'boolean',
      default: false
    })
    .check((argv) => {
      if (!argv.resource) {
        throw new Error('Resource type required. Choose from: profiles, templates, layouts, styles');
      }
      return true;
    });
};

/**
 * Format resources as human-readable list
 * @param {object[]} resources - Array of resource objects
 * @param {string} type - Resource type
 * @param {boolean} verbose - Show full details
 * @returns {string} Formatted output
 */
function formatResourceList(resources, type, verbose) {
  if (resources.length === 0) {
    return `No ${type} found.`;
  }

  const lines = [`Available ${type}:`];

  for (const resource of resources) {
    const parts = [];

    // Primary line: name (and id for profiles if different)
    if (type === 'profiles' && resource.id && resource.id !== resource.name) {
      parts.push(`  ${resource.name} (id: ${resource.id})`);
    } else {
      parts.push(`  ${resource.name}`);
    }

    // Profile-specific fields
    if (type === 'profiles') {
      if (resource.description) {
        parts.push(`    ${resource.description}`);
      }
      if (resource.extends) {
        parts.push(`    (extends: ${resource.extends})`);
      }
    }

    // Verbose details
    if (verbose) {
      parts.push(`    Source: ${resource.source}`);
      parts.push(`    Path: ${resource.path}`);
      parts.push(`    Size: ${formatBytes(resource.size)}`);

      // Profile-specific verbose info
      if (type === 'profiles' && resource.content) {
        const content = resource.content;

        if (content.layout?.type) {
          parts.push(`    Layout: ${content.layout.type}`);
        }

        if (content.outputs) {
          const enabledOutputs = Object.entries(content.outputs)
            .filter(([, config]) => config.enabled)
            .map(([outputType]) => outputType);

          if (enabledOutputs.length > 0) {
            parts.push(`    Outputs: ${enabledOutputs.join(', ')}`);
          }
        }

        if (content.validation?.required_fields) {
          parts.push(`    Required fields: ${content.validation.required_fields.join(', ')}`);
        }
      }
    }

    lines.push(parts.join('\n'));
  }

  return lines.join('\n');
}

/**
 * Format resources as JSON
 * @param {object[]} resources - Array of resource objects
 * @param {string} type - Resource type
 * @param {boolean} verbose - Include full content
 * @returns {object[]} JSON-serializable array
 */
function formatResourceJson(resources, type, verbose) {
  return resources.map(resource => {
    const output = {
      name: resource.name,
      source: resource.source,
      path: resource.path,
      size: resource.size
    };

    // Profile-specific fields
    if (type === 'profiles') {
      output.id = resource.id;
      output.description = resource.description;
      output.extends = resource.extends;

      if (verbose && resource.content) {
        output.content = resource.content;
      }
    }

    return output;
  });
}

/**
 * Command handler
 * @param {object} argv - Yargs arguments
 */
export async function handler(argv) {
  const { resource, json, verbose, all, projectRoot } = argv;

  logger.trace('command', 'start', 'list command started', {
    resource,
    json,
    verbose,
    all
  });

  try {
    // Discover resources
    const resources = discoverResources(resource, projectRoot, {
      includeWorkspace: all
    });

    // Output results
    if (json) {
      const output = formatResourceJson(resources, resource, verbose);
      console.log(JSON.stringify(output, null, 2));

      logger.info('command', 'success', 'list completed (JSON)', {
        type: resource,
        count: resources.length
      });
    } else {
      const output = formatResourceList(resources, resource, verbose);
      console.log(output);

      logger.info('command', 'success', 'list completed', {
        type: resource,
        count: resources.length
      });
    }
  } catch (err) {
    logger.error('command', 'failure', 'list failed', {
      error: err.message,
      stack: err.stack
    });
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
