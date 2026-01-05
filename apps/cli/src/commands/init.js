/**
 * @pagemd/cli/commands/init
 * Initialize a new PageMD project, profile, or markdown file
 *
 * Creates:
 * - project: Full project folder with markdown, profile, and stub directories
 * - profile: Single profile manifest file
 * - markdown: Single markdown file with frontmatter
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  createLogger,
  getDefaultProfile,
  loadAndMergeProfile,
  findProjectRoot
} from '@pagemd/core';

const logger = createLogger('cli');

/**
 * Yargs command definition
 */
export const command = 'init [name]';
export const aliases = ['new'];
export const describe = 'Initialize a new PageMD project, profile, or markdown file';

export const builder = {
  name: {
    describe: 'Name for the project/profile/document',
    type: 'string',
    default: 'my-pagemd-project'
  },
  type: {
    alias: 't',
    describe: 'Type of resource to create',
    type: 'string',
    choices: ['project', 'profile', 'markdown'],
    default: 'project'
  },
  template: {
    describe: 'Base template/profile to use',
    type: 'string',
    default: getDefaultProfile()
  },
  output: {
    alias: 'o',
    describe: 'Output location (default: current directory)',
    type: 'string'
  },
  force: {
    describe: 'Overwrite existing files',
    type: 'boolean',
    default: false
  }
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
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Generate starter markdown content
 * @param {string} name - Document name
 * @param {string} profileId - Profile to use
 * @returns {string} Markdown content
 */
function generateMarkdown(name, profileId) {
  const title = name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const date = new Date().toISOString().split('T')[0];

  return `---
document_id: ${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}
title: "${title}"
revision: 1
status: Draft
effective_date: ${date}
owner: ""
approver: ""
category: ""
tags: []
pipeline_profile: ${profileId}
---

# ${title}

## Overview

Add your content here.

## Details

- Item 1
- Item 2
- Item 3

## Conclusion

Summary of the document.
`;
}

/**
 * Generate profile manifest
 * @param {string} name - Profile name
 * @param {object} baseProfile - Base profile to extend
 * @returns {object} Profile object
 */
function generateProfile(name, baseProfile) {
  return {
    id: name,
    description: `Custom profile based on ${baseProfile?.id || getDefaultProfile()}`,
    extends: baseProfile?.id || getDefaultProfile(),
    layout: {
      type: 'letter',
      css: '${projectRoot}/layouts/letter.css'
    },
    outputs: {
      pdf: { enabled: true, mode: 'ACTIVE_ONLY' },
      html: { enabled: false },
      png: { enabled: false },
      jpeg: { enabled: false }
    }
  };
}

/**
 * Initialize a full project
 * @param {string} name - Project name
 * @param {string} outputDir - Output directory
 * @param {string} templateId - Template profile ID
 * @param {boolean} force - Overwrite existing
 * @param {string} projectRoot - PageMD project root
 */
async function initProject(name, outputDir, templateId, force, projectRoot) {
  const projectPath = path.join(outputDir, name);

  // Check if exists
  if (await exists(projectPath)) {
    if (!force) {
      throw new Error(`Directory already exists: ${projectPath}. Use --force to overwrite.`);
    }
    logger.warn('init', 'overwrite', 'Overwriting existing directory', { path: projectPath });
  }

  // Create project structure
  await ensureDir(projectPath);
  await ensureDir(path.join(projectPath, 'styles'));
  await ensureDir(path.join(projectPath, 'layouts'));
  await ensureDir(path.join(projectPath, 'templates'));

  // Load base profile for reference
  let baseProfile = null;
  try {
    baseProfile = await loadAndMergeProfile(templateId, { searchFrom: projectRoot });
  } catch {
    logger.warn('init', 'template', `Template profile '${templateId}' not found, using defaults`);
  }

  // Create markdown file
  const mdPath = path.join(projectPath, `${name}.md`);
  await fs.writeFile(mdPath, generateMarkdown(name, templateId), 'utf-8');
  logger.debug('init', 'create', 'Created markdown file', { path: mdPath });

  // Create profile
  const profilePath = path.join(projectPath, `${name}.json`);
  const profile = generateProfile(name, baseProfile);
  await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
  logger.debug('init', 'create', 'Created profile', { path: profilePath });

  // Create stub files
  const stubCSS = `/* ${name} custom styles */\n\n/* Add your custom CSS here */\n`;
  await fs.writeFile(path.join(projectPath, 'styles', `${name}.css`), stubCSS, 'utf-8');

  const stubLayout = `/* ${name} layout overrides */\n\n/* @page rules go here */\n`;
  await fs.writeFile(path.join(projectPath, 'layouts', `${name}.css`), stubLayout, 'utf-8');

  console.log(`\nCreated PageMD project: ${projectPath}`);
  console.log(`\nFiles created:`);
  console.log(`  ${name}.md           - Starter markdown document`);
  console.log(`  ${name}.json         - Profile manifest`);
  console.log(`  styles/${name}.css   - Custom styles (empty)`);
  console.log(`  layouts/${name}.css  - Layout overrides (empty)`);
  console.log(`  templates/           - HTML templates (empty)`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${name}`);
  console.log(`  pagemd build ${name}.md`);
}

/**
 * Initialize a profile file
 * @param {string} name - Profile name
 * @param {string} outputDir - Output directory
 * @param {string} templateId - Template profile ID
 * @param {boolean} force - Overwrite existing
 * @param {string} projectRoot - PageMD project root
 */
async function initProfile(name, outputDir, templateId, force, projectRoot) {
  const profilePath = path.join(outputDir, `${name}.json`);

  // Check if exists
  if (await exists(profilePath)) {
    if (!force) {
      throw new Error(`Profile already exists: ${profilePath}. Use --force to overwrite.`);
    }
    logger.warn('init', 'overwrite', 'Overwriting existing profile', { path: profilePath });
  }

  // Load base profile
  let baseProfile = null;
  try {
    baseProfile = await loadAndMergeProfile(templateId, { searchFrom: projectRoot });
  } catch {
    logger.warn('init', 'template', `Template profile '${templateId}' not found, using defaults`);
  }

  // Create profile
  const profile = generateProfile(name, baseProfile);
  await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf-8');

  console.log(`\nCreated profile: ${profilePath}`);
  console.log(`\nExtends: ${profile.extends}`);
}

/**
 * Initialize a markdown file
 * @param {string} name - Document name
 * @param {string} outputDir - Output directory
 * @param {string} templateId - Profile to reference
 * @param {boolean} force - Overwrite existing
 */
async function initMarkdown(name, outputDir, templateId, force) {
  const mdPath = path.join(outputDir, `${name}.md`);

  // Check if exists
  if (await exists(mdPath)) {
    if (!force) {
      throw new Error(`File already exists: ${mdPath}. Use --force to overwrite.`);
    }
    logger.warn('init', 'overwrite', 'Overwriting existing file', { path: mdPath });
  }

  // Create markdown file
  await fs.writeFile(mdPath, generateMarkdown(name, templateId), 'utf-8');

  console.log(`\nCreated markdown file: ${mdPath}`);
  console.log(`\nProfile: ${templateId}`);
}

/**
 * Command handler
 * @param {object} argv - Yargs arguments
 */
export async function handler(argv) {
  const { name, type, template, output, force, projectRoot } = argv;

  logger.trace('command', 'start', 'init command started', {
    name,
    type,
    template,
    output,
    force
  });

  try {
    const outputDir = output ? path.resolve(process.cwd(), output) : process.cwd();

    switch (type) {
      case 'project':
        await initProject(name, outputDir, template, force, projectRoot);
        break;
      case 'profile':
        await initProfile(name, outputDir, template, force, projectRoot);
        break;
      case 'markdown':
        await initMarkdown(name, outputDir, template, force);
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    logger.info('command', 'success', 'init completed', { type, name });

  } catch (err) {
    logger.error('command', 'failure', 'init failed', {
      error: err.message,
      stack: err.stack
    });
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}
