/**
 * @pagemd/cli/commands/create
 * Create a new PageMD resource (profile, style, layout, template, or markdown)
 *
 * Features:
 * - Creates files with non-interfering scaffolding (commented out by default)
 * - Can copy from existing resource with --source
 * - Can inject reference into markdown frontmatter with --input
 * - Markdown creates a single file with basic frontmatter (use init for md + profile)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import {
  createLogger,
  discoverResources,
  getResourceDirectories
} from '@pagemd/core';
import { extractFrontmatter } from '@pagemd/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('cli');

/**
 * Yargs command definition
 */
export const command = 'create <resource>';
export const aliases = ['add'];
export const describe = 'Create a new PageMD resource (profile, style, layout, template, markdown)';

export const builder = {
  resource: {
    describe: 'Type of resource to create',
    type: 'string',
    choices: ['profile', 'style', 'layout', 'template', 'markdown'],
    demandOption: true
  },
  source: {
    alias: 's',
    describe: 'Resource ID to copy from (base template)',
    type: 'string'
  },
  output: {
    alias: 'o',
    describe: 'Output filename',
    type: 'string'
  },
  input: {
    alias: 'i',
    describe: 'Markdown file to inject reference into',
    type: 'string'
  },
  force: {
    describe: 'Overwrite existing files and/or frontmatter',
    type: 'boolean',
    default: false
  }
};

/**
 * Resource type to file extension mapping
 */
const RESOURCE_EXTENSIONS = {
  profile: '.json',
  style: '.css',
  layout: '.css',
  template: '.html',
  markdown: '.md'
};

/**
 * Resource type to discovery type mapping
 */
const DISCOVERY_TYPES = {
  profile: 'profiles',
  style: 'styles',
  layout: 'layouts',
  template: 'templates',
  markdown: null // Markdown files are not discovered as resources
};

/**
 * Frontmatter field mapping for injection
 */
const FRONTMATTER_FIELDS = {
  profile: 'pipeline_profile',
  style: 'styles',
  layout: null, // Not directly referenced in frontmatter
  template: null, // Not directly referenced in frontmatter
  markdown: null // N/A - markdown is the target, not a reference
};

/**
 * Check if path exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if exists
 */
async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load scaffold template
 * @param {string} resourceType - Resource type
 * @returns {Promise<string>} Scaffold content
 */
async function loadScaffold(resourceType) {
  const scaffoldPath = path.join(__dirname, 'scaffolds', `${resourceType}${RESOURCE_EXTENSIONS[resourceType]}`);
  try {
    return await fs.readFile(scaffoldPath, 'utf-8');
  } catch (err) {
    logger.warn('create', 'scaffold', `Scaffold not found: ${scaffoldPath}`, { error: err.message });
    return getDefaultScaffold(resourceType);
  }
}

/**
 * Get default scaffold if file not found
 * @param {string} resourceType - Resource type
 * @returns {string} Default scaffold content
 */
function getDefaultScaffold(resourceType) {
  switch (resourceType) {
    case 'style':
      return '/* Custom PageMD style */\n';
    case 'layout':
      return '/* Custom PageMD layout */\n@page {\n  /* Add @page rules here */\n}\n';
    case 'template':
      return '<!DOCTYPE html>\n<html>\n<head>{{styles}}</head>\n<body>{{content}}</body>\n</html>\n';
    case 'profile':
      return JSON.stringify({ id: '{{name}}', description: 'Custom profile' }, null, 2);
    case 'markdown':
      return getMarkdownScaffold();
    default:
      return '';
  }
}

/**
 * Generate markdown scaffold content with placeholders
 * @returns {string} Markdown content with {{name}} placeholders
 */
function getMarkdownScaffold() {
  const date = new Date().toISOString().split('T')[0];

  return `---
title: "{{title}}"
document_id: {{document_id}}
revision: 1
status: Draft
effective_date: ${date}
profile: standard_letter
---

# {{title}}

Add your content here.
`;
}

/**
 * Find existing resource by ID
 * @param {string} resourceType - Resource type (profile, style, etc.)
 * @param {string} sourceId - Source resource ID
 * @param {string} projectRoot - Project root path
 * @returns {Promise<object|null>} Resource object or null
 */
async function findResource(resourceType, sourceId, projectRoot) {
  const discoveryType = DISCOVERY_TYPES[resourceType];
  const resources = discoverResources(discoveryType, projectRoot, { includeWorkspace: true });
  return resources.find(r => r.name === sourceId) || null;
}

/**
 * Update markdown frontmatter with resource reference
 * @param {string} mdPath - Path to markdown file
 * @param {string} resourceType - Resource type
 * @param {string} resourcePath - Path to new resource
 * @param {boolean} force - Overwrite existing value
 */
async function injectFrontmatter(mdPath, resourceType, resourcePath, force) {
  const field = FRONTMATTER_FIELDS[resourceType];
  if (!field) {
    logger.info('create', 'skip-inject', `Resource type '${resourceType}' not supported for frontmatter injection`);
    return;
  }

  // Read markdown file
  const content = await fs.readFile(mdPath, 'utf-8');
  const { metadata, content: body, raw } = extractFrontmatter(content);

  // Get relative path for reference
  const mdDir = path.dirname(mdPath);
  const relativePath = path.relative(mdDir, resourcePath);

  // Check if field already exists
  if (field === 'styles') {
    // Array field
    const existingStyles = metadata.styles || [];
    if (existingStyles.includes(relativePath)) {
      logger.info('create', 'skip-inject', 'Style already in frontmatter', { path: relativePath });
      return;
    }
    if (!Array.isArray(metadata.styles)) {
      metadata.styles = [];
    }
    metadata.styles.push(relativePath);
  } else {
    // String field
    if (metadata[field] && !force) {
      throw new Error(`Frontmatter field '${field}' already exists. Use --force to overwrite.`);
    }
    metadata[field] = relativePath;
  }

  // Rebuild frontmatter
  const yaml = Object.entries(metadata)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) return `${key}: []`;
        return `${key}:\n${value.map(v => `  - ${JSON.stringify(v)}`).join('\n')}`;
      }
      if (typeof value === 'string') return `${key}: ${JSON.stringify(value)}`;
      return `${key}: ${value}`;
    })
    .join('\n');

  const newContent = `---\n${yaml}\n---\n${body}`;
  await fs.writeFile(mdPath, newContent, 'utf-8');

  logger.info('create', 'inject', `Updated frontmatter in ${mdPath}`, { field, value: relativePath });
}

/**
 * Command handler
 * @param {object} argv - Yargs arguments
 */
export async function handler(argv) {
  const { resource, source, output, input, force, projectRoot } = argv;

  logger.trace('command', 'start', 'create command started', {
    resource,
    source,
    output,
    input,
    force
  });

  try {
    // Determine output path
    const ext = RESOURCE_EXTENSIONS[resource];
    let outputPath;

    if (output) {
      // User specified output
      outputPath = path.resolve(process.cwd(), output);
      // Add extension if not present
      if (!outputPath.endsWith(ext)) {
        outputPath += ext;
      }
    } else if (source) {
      // Name based on source
      outputPath = path.resolve(process.cwd(), `${source}${ext}`);
    } else {
      // Default name
      outputPath = path.resolve(process.cwd(), `custom-${resource}${ext}`);
    }

    // Check if output exists
    if (await exists(outputPath)) {
      if (!force) {
        throw new Error(`File already exists: ${outputPath}. Use --force to overwrite.`);
      }
      logger.warn('create', 'overwrite', 'Overwriting existing file', { path: outputPath });
    }

    // Get content
    let content;
    const name = path.basename(outputPath, ext);

    if (source) {
      // Copy from existing resource
      const sourceResource = await findResource(resource, source, projectRoot);
      if (!sourceResource) {
        throw new Error(`Source resource not found: ${source}`);
      }
      content = await fs.readFile(sourceResource.path, 'utf-8');

      // For profile, update the ID
      if (resource === 'profile') {
        try {
          const parsed = JSON.parse(content);
          parsed.id = name;
          parsed.description = `Based on ${source}`;
          content = JSON.stringify(parsed, null, 2);
        } catch {
          // Not valid JSON, use as-is
        }
      }

      logger.info('create', 'copy', `Copied from ${source}`, { source: sourceResource.path });
    } else {
      // Use scaffold
      content = await loadScaffold(resource);
      // Replace placeholders
      content = content.replace(/\{\{name\}\}/g, name);

      // Additional placeholders for markdown
      if (resource === 'markdown') {
        const title = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const documentId = name.toUpperCase().replace(/[^A-Z0-9]/g, '-');
        const date = new Date().toISOString().split('T')[0];
        content = content.replace(/\{\{title\}\}/g, title);
        content = content.replace(/\{\{document_id\}\}/g, documentId);
        content = content.replace(/\{\{date\}\}/g, date);
      }
    }

    // Write file
    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(`\nCreated ${resource}: ${outputPath}`);

    // Inject into markdown if requested
    if (input) {
      const inputPath = path.resolve(process.cwd(), input);
      if (!await exists(inputPath)) {
        throw new Error(`Input markdown file not found: ${inputPath}`);
      }

      try {
        await injectFrontmatter(inputPath, resource, outputPath, force);
        console.log(`Updated frontmatter in: ${inputPath}`);
      } catch (err) {
        console.error(`Warning: ${err.message}`);
      }
    }

    logger.info('command', 'success', 'create completed', { resource, path: outputPath });

  } catch (err) {
    logger.error('command', 'failure', 'create failed', {
      error: err.message,
      stack: err.stack
    });
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}
