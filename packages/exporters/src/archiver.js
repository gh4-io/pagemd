/**
 * @pagemd/exporters - Document Archiver
 * Packages source markdown files + all dependencies into a ZIP archive
 * for distribution, backup, or sharing.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import archiver from 'archiver';
import {
  createLogger,
  loadProfileSync,
  findProjectRoot,
  createPathContext,
  resolveResource,
  expandTokens,
  RESOURCE_EXTENSIONS
} from '@pagemd/core';
import { extractFrontmatter, normalizeMetadata } from '@pagemd/parser';

const logger = createLogger('exporter');

/**
 * @typedef {Object} DependencyFile
 * @property {string} absolutePath - Source location on disk
 * @property {string} archivePath - Path inside the ZIP (forward slashes)
 * @property {string} type - 'markdown' | 'profile' | 'template' | 'layout' | 'style' | 'font' | 'asset' | 'config'
 * @property {string} source - 'frontmatter' | 'profile' | 'content' | 'directory'
 * @property {boolean} isSystem - True if from cliPath (excluded by default)
 */

/**
 * Check if a file path is a system resource (bundled with PageMD)
 * @param {string} filePath - Absolute file path
 * @param {string} cliPath - CLI package root path
 * @returns {boolean}
 */
export function isSystemResource(filePath, cliPath) {
  if (!filePath || !cliPath) return false;
  const normalizedFile = path.normalize(filePath);
  // Ensure cliPath ends with separator for prefix matching
  let normalizedCli = path.normalize(cliPath);
  if (!normalizedCli.endsWith(path.sep)) {
    normalizedCli += path.sep;
  }
  return normalizedFile.startsWith(normalizedCli) || normalizedFile === path.normalize(cliPath);
}

/**
 * Map an absolute file path to a path inside the archive
 * @param {string} absolutePath - Absolute source path
 * @param {string} projectRoot - Project root directory
 * @param {string} resourceType - Type of resource for fallback directory
 * @param {Map<string, number>} collisionMap - Tracks filename collisions
 * @returns {string} Archive-internal path (forward slashes)
 */
export function mapToArchivePath(absolutePath, projectRoot, resourceType, collisionMap = new Map()) {
  const normalized = path.normalize(absolutePath);

  // Files within project root: preserve relative path
  if (projectRoot && normalized.startsWith(path.normalize(projectRoot) + path.sep)) {
    const rel = path.relative(projectRoot, normalized);
    return rel.split(path.sep).join('/');
  }

  // Files outside project root: place under assets/ or resource type dir
  const basename = path.basename(normalized);
  const targetDir = resourceType === 'asset' ? 'assets' : resourceType;
  const key = `${targetDir}/${basename}`;

  const count = collisionMap.get(key) || 0;
  collisionMap.set(key, count + 1);

  if (count === 0) {
    return `${targetDir}/${basename}`;
  }

  const ext = path.extname(basename);
  const name = path.basename(basename, ext);
  return `${targetDir}/${name}-${count + 1}${ext}`;
}

/**
 * Check if a reference is an external URL or data URI (should be skipped)
 * @param {string} ref - Reference string
 * @returns {boolean}
 */
function isExternalRef(ref) {
  if (!ref) return true;
  return /^(https?:|data:|blob:|#)/.test(ref.trim());
}

/**
 * Extract image references from raw markdown content
 * @param {string} markdown - Raw markdown text
 * @returns {string[]} Array of relative image paths
 */
function extractMarkdownImageRefs(markdown) {
  const refs = [];
  // Markdown image syntax: ![alt](path)
  const mdImageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = mdImageRegex.exec(markdown)) !== null) {
    const ref = match[1].split(/\s+/)[0]; // strip title
    if (!isExternalRef(ref)) {
      refs.push(ref);
    }
  }
  // HTML img tags in markdown: <img src="path">
  const htmlImgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((match = htmlImgRegex.exec(markdown)) !== null) {
    if (!isExternalRef(match[1])) {
      refs.push(match[1]);
    }
  }
  return refs;
}

/**
 * Extract url() references from CSS content
 * @param {string} css - CSS text
 * @returns {string[]} Array of relative URL paths
 */
function extractCSSUrlRefs(css) {
  if (!css) return [];
  const refs = [];
  const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi;
  let match;
  while ((match = urlRegex.exec(css)) !== null) {
    if (!isExternalRef(match[1])) {
      refs.push(match[1]);
    }
  }
  return refs;
}

/**
 * Safely resolve a resource path, returning null if not found
 * @param {string} name - Resource name or path
 * @param {string} type - Resource type
 * @param {object} context - Path context
 * @returns {{resolvedPath: string}|null}
 */
function safeResolveResource(name, type, context) {
  try {
    return resolveResource(name, type, context);
  } catch {
    return null;
  }
}

/**
 * Read file contents, returning null on failure
 * @param {string} filePath - Absolute path
 * @returns {Promise<string|null>}
 */
async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Check if a path exists on disk
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively collect all files in a directory
 * @param {string} dirPath - Directory path
 * @returns {Promise<string[]>} Array of absolute file paths
 */
async function walkDirectory(dirPath) {
  const results = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await walkDirectory(fullPath);
        results.push(...subFiles);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory not accessible
  }
  return results;
}

/**
 * Collect all dependencies for one or more markdown files
 * @param {string[]} markdownPaths - Absolute paths to markdown files
 * @param {object} options - Collection options
 * @param {string} [options.profile] - Profile override (CLI -p flag)
 * @param {string} [options.cliPath] - CLI package root for system resources
 * @param {boolean} [options.includeSystem=false] - Include system resources
 * @returns {Promise<{files: DependencyFile[], warnings: string[], projectRoot: string|null}>}
 */
export async function collectDependencies(markdownPaths, options = {}) {
  const {
    profile: profileOverride,
    cliPath = null,
    includeSystem = false
  } = options;

  const files = new Map(); // keyed by absolutePath for dedup
  const warnings = [];
  const collisionMap = new Map();

  // Determine project root from first markdown file
  const firstMdDir = path.dirname(markdownPaths[0]);
  const projectRoot = findProjectRoot(firstMdDir) || firstMdDir;

  logger.debug('collect', 'start', `Collecting dependencies for ${markdownPaths.length} file(s)`, {
    projectRoot,
    includeSystem
  });

  /**
   * Add a file to the collection (deduplicates by absolute path)
   */
  function addFile(absolutePath, type, source) {
    const normalized = path.normalize(absolutePath);
    if (files.has(normalized)) return;

    const system = isSystemResource(normalized, cliPath);
    const archivePath = mapToArchivePath(normalized, projectRoot, type, collisionMap);

    files.set(normalized, {
      absolutePath: normalized,
      archivePath,
      type,
      source,
      isSystem: system
    });
  }

  /**
   * Resolve and add a resource by name/path
   * @returns {string|null} Resolved absolute path, or null
   */
  function resolveAndAdd(name, resourceType, context, source) {
    if (!name) return null;

    // Expand tokens first
    let expanded;
    try {
      expanded = expandTokens(name, context);
    } catch {
      expanded = name;
    }

    // Try as absolute/relative path first
    const asAbsolute = path.isAbsolute(expanded) ? expanded : null;
    if (asAbsolute) {
      addFile(asAbsolute, resourceType === 'templates' ? 'template' :
        resourceType === 'layouts' ? 'layout' :
          resourceType === 'profiles' ? 'profile' :
            resourceType === 'styles' ? 'style' : 'asset', source);
      return asAbsolute;
    }

    // Try resource resolution
    const result = safeResolveResource(expanded, resourceType, context);
    if (result && result.resolvedPath) {
      const typeMap = {
        templates: 'template',
        layouts: 'layout',
        profiles: 'profile',
        styles: 'style'
      };
      addFile(result.resolvedPath, typeMap[resourceType] || 'asset', source);
      return result.resolvedPath;
    }

    warnings.push(`Could not resolve ${resourceType} resource: ${name}`);
    return null;
  }

  // Process each markdown file
  for (const mdPath of markdownPaths) {
    const absoluteMdPath = path.resolve(mdPath);
    addFile(absoluteMdPath, 'markdown', 'content');

    // Read and parse frontmatter
    const content = await safeReadFile(absoluteMdPath);
    if (!content) {
      warnings.push(`Could not read markdown file: ${mdPath}`);
      continue;
    }

    const { metadata: rawMetadata, content: markdownContent } = extractFrontmatter(content);
    const metadata = normalizeMetadata(rawMetadata || {});
    const mdDir = path.dirname(absoluteMdPath);

    // Determine profile
    const profileId = profileOverride || metadata.pipeline_profile || 'standard_letter';

    // Content-embedded images (collect regardless of profile availability)
    const imageRefs = extractMarkdownImageRefs(markdownContent || content);
    for (const ref of imageRefs) {
      const absPath = path.resolve(mdDir, ref);
      if (await pathExists(absPath)) {
        addFile(absPath, 'asset', 'content');
      } else {
        warnings.push(`Image not found: ${ref} (referenced in ${path.basename(mdPath)})`);
      }
    }

    // Load profile
    const profile = loadProfileSync(profileId, mdDir, projectRoot, cliPath);
    if (!profile) {
      warnings.push(`Profile not found: ${profileId}`);
      continue;
    }

    // Create path context
    const context = createPathContext({
      workingPath: mdDir,
      workspacePath: projectRoot,
      manifestPath: profile._manifestDir || projectRoot,
      cliPath
    });

    // Collect profile file itself
    if (profile._manifestDir) {
      const profileExts = RESOURCE_EXTENSIONS.profiles || ['.json', '.yaml', '.yml'];
      for (const ext of profileExts) {
        const profileFilePath = path.join(profile._manifestDir, profile.id + ext);
        if (await pathExists(profileFilePath)) {
          addFile(profileFilePath, 'profile', 'profile');
          break;
        }
      }
    }

    // Walk profile inheritance chain
    let currentProfile = profile;
    const visited = new Set([profileId]);
    while (currentProfile && currentProfile.extends) {
      const parentId = currentProfile.extends;
      if (visited.has(parentId)) break;
      visited.add(parentId);

      const parentProfile = loadProfileSync(parentId, mdDir, projectRoot, cliPath);
      if (!parentProfile) {
        warnings.push(`Parent profile not found: ${parentId} (extended by ${currentProfile.id || profileId})`);
        break;
      }

      if (parentProfile._manifestDir) {
        const profileExts = RESOURCE_EXTENSIONS.profiles || ['.json', '.yaml', '.yml'];
        for (const ext of profileExts) {
          const parentFilePath = path.join(parentProfile._manifestDir, parentId + ext);
          if (await pathExists(parentFilePath)) {
            addFile(parentFilePath, 'profile', 'profile');
            break;
          }
        }
      }

      currentProfile = parentProfile;
    }

    // Collect profile resources
    const resources = profile.resources || {};

    if (resources.template) {
      resolveAndAdd(resources.template, 'templates', { ...context, sourceType: 'profile' }, 'profile');
    }

    if (resources.layout) {
      resolveAndAdd(resources.layout, 'layouts', { ...context, sourceType: 'profile' }, 'profile');
    }

    if (Array.isArray(resources.css)) {
      for (const cssRef of resources.css) {
        const resolvedPath = resolveAndAdd(cssRef, 'styles', { ...context, sourceType: 'profile' }, 'profile');
        if (resolvedPath) {
          const cssContent = await safeReadFile(resolvedPath);
          const urlRefs = extractCSSUrlRefs(cssContent);
          for (const ref of urlRefs) {
            const absRef = path.resolve(path.dirname(resolvedPath), ref);
            if (await pathExists(absRef)) {
              addFile(absRef, 'asset', 'profile');
            } else {
              warnings.push(`CSS url() reference not found: ${ref} (in ${path.basename(resolvedPath)})`);
            }
          }
        }
      }
    }

    if (Array.isArray(resources.fonts)) {
      for (const fontRef of resources.fonts) {
        resolveAndAdd(fontRef, 'styles', { ...context, sourceType: 'profile' }, 'profile');
      }
    }

    if (Array.isArray(resources.assets)) {
      for (const assetRef of resources.assets) {
        let expanded;
        try {
          expanded = expandTokens(assetRef, context);
        } catch {
          expanded = assetRef;
        }
        const absPath = path.isAbsolute(expanded)
          ? expanded
          : path.resolve(profile._manifestDir || mdDir, expanded);
        if (await pathExists(absPath)) {
          addFile(absPath, 'asset', 'profile');
        } else {
          warnings.push(`Profile asset not found: ${assetRef}`);
        }
      }
    }

    // Frontmatter styles
    if (Array.isArray(metadata.styles) && metadata.styles.length > 0) {
      for (const styleRef of metadata.styles) {
        const resolvedPath = resolveAndAdd(styleRef, 'styles', context, 'frontmatter');
        if (resolvedPath) {
          const cssContent = await safeReadFile(resolvedPath);
          const urlRefs = extractCSSUrlRefs(cssContent);
          for (const ref of urlRefs) {
            const absRef = path.resolve(path.dirname(resolvedPath), ref);
            if (await pathExists(absRef)) {
              addFile(absRef, 'asset', 'frontmatter');
            }
          }
        }
      }
    }
  }

  // Check for .pagemd/ directory at project root and markdown dirs
  const pagemdDirs = new Set();
  pagemdDirs.add(path.join(projectRoot, '.pagemd'));
  for (const mdPath of markdownPaths) {
    pagemdDirs.add(path.join(path.dirname(path.resolve(mdPath)), '.pagemd'));
  }

  for (const pagemdDir of pagemdDirs) {
    if (await pathExists(pagemdDir)) {
      const dirFiles = await walkDirectory(pagemdDir);
      for (const filePath of dirFiles) {
        addFile(filePath, 'config', 'directory');
      }
    }
  }

  // Filter system resources unless includeSystem is set
  const collectedFiles = Array.from(files.values());
  const filteredFiles = includeSystem
    ? collectedFiles
    : collectedFiles.filter(f => !f.isSystem);

  const excluded = collectedFiles.length - filteredFiles.length;
  if (excluded > 0) {
    logger.debug('collect', 'filter', `Excluded ${excluded} system resource(s)`, { excluded });
  }

  logger.info('collect', 'complete', `Collected ${filteredFiles.length} file(s)`, {
    total: filteredFiles.length,
    excluded,
    warnings: warnings.length
  });

  return { files: filteredFiles, warnings, projectRoot };
}

/**
 * Create a ZIP archive from collected dependency files
 * @param {DependencyFile[]} files - Files to include
 * @param {string} outputPath - Output ZIP file path
 * @param {object} [manifestData] - Optional manifest metadata to include
 * @returns {Promise<{archivePath: string, fileCount: number, totalSize: number}>}
 */
export async function createArchive(files, outputPath, manifestData = null) {
  const absoluteOutput = path.resolve(outputPath);

  // Ensure output directory exists
  await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(absoluteOutput);
    const archive = archiver('zip', { zlib: { level: 9 } });

    let totalSize = 0;
    let fileCount = 0;

    output.on('close', () => {
      totalSize = archive.pointer();
      resolve({
        archivePath: absoluteOutput,
        fileCount,
        totalSize
      });
    });

    archive.on('error', (err) => {
      reject(new Error(`Archive creation failed: ${err.message}`));
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        logger.warn('archive', 'missing', `File not found during archival: ${err.message}`);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    // Add each dependency file
    for (const file of files) {
      archive.file(file.absolutePath, { name: file.archivePath });
      fileCount++;
    }

    // Add manifest if provided
    if (manifestData) {
      const manifestJson = JSON.stringify(manifestData, null, 2);
      archive.append(manifestJson, { name: 'manifest.json' });
      fileCount++;
    }

    archive.finalize();
  });
}

/**
 * Build manifest metadata for the archive
 * @param {DependencyFile[]} files - Collected files
 * @param {object} options - Options
 * @returns {object} Manifest data
 */
function buildManifest(files, options = {}) {
  const markdownFiles = files.filter(f => f.type === 'markdown');
  const profileFiles = files.filter(f => f.type === 'profile');

  return {
    version: '1.0',
    created: new Date().toISOString(),
    generator: 'pagemd-archiver',
    files: markdownFiles.map(f => ({
      path: f.archivePath,
      type: f.type
    })),
    profiles: profileFiles.map(f => f.archivePath),
    dependencies: files
      .filter(f => f.type !== 'markdown')
      .map(f => ({
        path: f.archivePath,
        type: f.type,
        source: f.source
      })),
    totalFiles: files.length
  };
}

/**
 * High-level orchestrator: collect dependencies and create archive
 * @param {string[]} markdownPaths - Paths to markdown files
 * @param {object} options - Archive options
 * @param {string} [options.output] - Output ZIP path
 * @param {string} [options.profile] - Profile override
 * @param {string} [options.cliPath] - CLI path for resource resolution
 * @param {boolean} [options.includeSystem=false] - Include system resources
 * @param {boolean} [options.dryRun=false] - List files without creating ZIP
 * @returns {Promise<{archivePath: string|null, fileCount: number, totalSize: number, files: DependencyFile[], warnings: string[], manifest: object}>}
 */
export async function exportToArchive(markdownPaths, options = {}) {
  const {
    output,
    dryRun = false,
    ...collectOptions
  } = options;

  logger.info('archive', 'start', `Archiving ${markdownPaths.length} file(s)`, {
    dryRun,
    output
  });

  // Collect all dependencies
  const { files, warnings, projectRoot } = await collectDependencies(markdownPaths, collectOptions);

  if (files.length === 0) {
    throw new Error('No files to archive');
  }

  // Build manifest
  const manifest = buildManifest(files, options);

  // Dry-run mode: return collected info without creating ZIP
  if (dryRun) {
    return {
      archivePath: null,
      fileCount: files.length,
      totalSize: 0,
      files,
      warnings,
      manifest
    };
  }

  // Determine output path
  const defaultName = path.basename(markdownPaths[0], path.extname(markdownPaths[0])) + '.pagemd.zip';
  const outputPath = output || path.join(path.dirname(markdownPaths[0]), defaultName);

  // Create archive
  const result = await createArchive(files, outputPath, manifest);

  logger.info('archive', 'complete', `Archive created: ${result.archivePath}`, {
    fileCount: result.fileCount,
    totalSize: result.totalSize
  });

  return {
    ...result,
    files,
    warnings,
    manifest
  };
}
