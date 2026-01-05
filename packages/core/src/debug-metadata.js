/**
 * @pagemd/core/debug-metadata
 * Debug metadata collection for enhanced build summary
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * @typedef {Object} DebugResourceInfo
 * @property {string} name - Resource identifier/name
 * @property {string} path - Full resolved absolute path
 * @property {string} [source] - Original path from profile/manifest (before token expansion)
 * @property {string} [layer] - CSS layer name (base, primary, layout, profile, frontmatter)
 * @property {number} size - File size in bytes
 * @property {'css'|'font'|'asset'|'template'|'profile'} type - Resource type
 */

/**
 * @typedef {Object} DebugDirectoryContext
 * @property {string} projectRoot - Detected/configured project root
 * @property {string} [outputDir] - Output directory for this build
 * @property {string} [debugDir] - Debug artifacts directory (if debug enabled)
 * @property {string} [manifestDir] - Profile manifest directory
 * @property {string} [markdownDir] - Source markdown file directory
 */

/**
 * @typedef {Object} DebugFileResult
 * @property {string} inputPath - Source markdown path
 * @property {string} profileId - Profile used for this file
 * @property {string} [profilePath] - Full path to profile manifest
 * @property {Array<{format: string, path: string, size?: number}>} outputs - Generated outputs
 * @property {number} duration - Render time in ms
 * @property {string[]} debugArtifacts - Paths to debug artifacts created
 */

/**
 * @typedef {Object} DebugMetadata
 * @property {boolean} debugEnabled - Whether debug mode is active
 * @property {DebugDirectoryContext} directories - Directory context
 * @property {DebugResourceInfo[]} resources - All loaded resources with paths and sizes
 * @property {DebugFileResult[]} fileResults - Per-file breakdown
 */

// File size cache to avoid redundant stat calls
const fileSizeCache = new Map();

/**
 * Create empty debug metadata collector
 * @param {boolean} debugEnabled - Whether debug mode is active
 * @returns {DebugMetadata}
 */
export function createDebugMetadata(debugEnabled = false) {
  return {
    debugEnabled,
    directories: {
      projectRoot: ''
    },
    resources: [],
    fileResults: []
  };
}

/**
 * Add resource info to metadata
 * @param {DebugMetadata} metadata
 * @param {DebugResourceInfo} resource
 */
export function addResource(metadata, resource) {
  if (!metadata || !metadata.debugEnabled) return;

  // Avoid duplicate entries for same path
  const exists = metadata.resources.some(r => r.path === resource.path && r.type === resource.type);
  if (!exists) {
    metadata.resources.push(resource);
  }
}

/**
 * Set directory context
 * @param {DebugMetadata} metadata
 * @param {DebugDirectoryContext} directories
 */
export function setDirectoryContext(metadata, directories) {
  if (!metadata || !metadata.debugEnabled) return;
  metadata.directories = { ...metadata.directories, ...directories };
}

/**
 * Add file result
 * @param {DebugMetadata} metadata
 * @param {DebugFileResult} fileResult
 */
export function addFileResult(metadata, fileResult) {
  if (!metadata || !metadata.debugEnabled) return;
  metadata.fileResults.push(fileResult);
}

/**
 * Get file size for path (with caching)
 * @param {string} filePath
 * @returns {Promise<number>} File size in bytes, or 0 if file doesn't exist
 */
export async function getFileSize(filePath) {
  if (!filePath) return 0;

  // Normalize path for cache key
  const normalizedPath = path.normalize(filePath);

  if (fileSizeCache.has(normalizedPath)) {
    return fileSizeCache.get(normalizedPath);
  }

  try {
    const stats = await fs.stat(normalizedPath);
    const size = stats.size;
    fileSizeCache.set(normalizedPath, size);
    return size;
  } catch {
    // File doesn't exist or can't be accessed
    fileSizeCache.set(normalizedPath, 0);
    return 0;
  }
}

/**
 * Get file size synchronously (with caching)
 * @param {string} filePath
 * @returns {number} File size in bytes, or 0 if file doesn't exist
 */
export function getFileSizeSync(filePath) {
  if (!filePath) return 0;

  const normalizedPath = path.normalize(filePath);

  if (fileSizeCache.has(normalizedPath)) {
    return fileSizeCache.get(normalizedPath);
  }

  try {
    const fsSync = require('fs');
    const stats = fsSync.statSync(normalizedPath);
    const size = stats.size;
    fileSizeCache.set(normalizedPath, size);
    return size;
  } catch {
    fileSizeCache.set(normalizedPath, 0);
    return 0;
  }
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format debug summary for console output (integrated with build summary)
 * @param {DebugMetadata} metadata
 * @param {Object} buildResults - Standard build results
 * @param {number} buildResults.success - Successful build count
 * @param {number} buildResults.failed - Failed build count
 * @param {number} buildResults.totalFiles - Total files processed
 * @param {Array} buildResults.outputs - Output files
 * @param {string} duration - Build duration string
 * @param {Object} [overrides] - Active overrides (CLI, env, meta)
 * @returns {string} Formatted debug summary
 */
export function formatDebugSummary(metadata, buildResults, duration, overrides = {}) {
  if (!metadata || !metadata.debugEnabled) {
    return '';
  }

  const lines = [];
  const width = 70;

  // Header
  lines.push('');
  lines.push('='.repeat(width));
  lines.push('  DEBUG MODE ACTIVE');
  lines.push('='.repeat(width));

  // Build Summary (integrated - right after header)
  lines.push('');
  lines.push('Build Summary:');
  lines.push(`  Total files: ${buildResults.totalFiles || 0}`);
  lines.push(`  Successful: ${buildResults.success || 0}`);
  lines.push(`  Failed: ${buildResults.failed || 0}`);
  lines.push(`  Total outputs: ${buildResults.outputs?.length || 0}`);
  lines.push(`  Duration: ${duration}`);

  // Overrides section (only show if there are active overrides)
  const activeOverrides = Object.entries(overrides).filter(([_, v]) => v !== undefined && v !== null);
  if (activeOverrides.length > 0) {
    lines.push('');
    lines.push('Overrides:');
    for (const [key, value] of activeOverrides) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  // Directory Context
  lines.push('');
  lines.push('Directory Context:');
  const dirs = metadata.directories;
  if (dirs.projectRoot) lines.push(`  Project Root:  ${dirs.projectRoot}`);
  if (dirs.outputDir) lines.push(`  Output Dir:    ${dirs.outputDir}`);
  if (dirs.debugDir) lines.push(`  Debug Dir:     ${dirs.debugDir}`);
  if (dirs.markdownDir) lines.push(`  Markdown Dir:  ${dirs.markdownDir}`);

  // Resources - organized by type, shown in load order
  if (metadata.resources.length > 0) {
    lines.push('');
    lines.push('Loaded Resources:');

    // Separate CSS by category: styles (base, primary, profile) vs layouts
    const styles = metadata.resources
      .filter(r => r.type === 'css' && ['base', 'primary', 'profile', 'frontmatter'].includes(r.layer))
      .sort((a, b) => {
        const order = ['base', 'primary', 'profile', 'frontmatter'];
        return (order.indexOf(a.layer) ?? 99) - (order.indexOf(b.layer) ?? 99);
      });

    const layouts = metadata.resources.filter(r => r.type === 'css' && r.layer === 'layout');
    const templates = metadata.resources.filter(r => r.type === 'template');
    const other = metadata.resources.filter(r => !['css', 'template'].includes(r.type));

    // Styles section (base → primary → profile → frontmatter)
    if (styles.length > 0) {
      lines.push('  Styles (merge order):');
      for (const res of styles) {
        const sizeStr = formatBytes(res.size || 0);
        const layerStr = res.layer ? ` [${res.layer}]` : '';
        lines.push(`    ${layerStr} ${res.source || res.name || path.basename(res.path)}`);
        lines.push(`           ${res.path} (${sizeStr})`);
      }
    }

    // Layouts section (Paged.js @page rules)
    if (layouts.length > 0) {
      lines.push('  Layouts (@page rules):');
      for (const res of layouts) {
        const sizeStr = formatBytes(res.size || 0);
        lines.push(`    [layout] ${res.source || res.name || path.basename(res.path)}`);
        lines.push(`           ${res.path} (${sizeStr})`);
      }
    }

    // Templates section
    if (templates.length > 0) {
      lines.push('  Templates:');
      for (const res of templates) {
        const sizeStr = formatBytes(res.size || 0);
        lines.push(`    [template] ${res.source || res.name || path.basename(res.path)}`);
        lines.push(`          ${res.path} (${sizeStr})`);
      }
    }

    // Other resources
    if (other.length > 0) {
      lines.push('  Other:');
      for (const res of other) {
        const sizeStr = formatBytes(res.size || 0);
        lines.push(`    [${res.type}] ${res.source || res.name || path.basename(res.path)}`);
        lines.push(`          ${res.path} (${sizeStr})`);
      }
    }
  }

  // Per-file Breakdown
  if (metadata.fileResults.length > 0) {
    lines.push('');
    lines.push('Per-File Breakdown:');
    for (const file of metadata.fileResults) {
      lines.push(`  ${path.basename(file.inputPath)}`);
      lines.push(`    Profile: ${file.profileId}`);
      lines.push(`    Duration: ${file.duration}ms`);

      if (file.outputs && file.outputs.length > 0) {
        const outputStrs = file.outputs.map(o => o.format);
        lines.push(`    Outputs: ${outputStrs.join(', ')}`);
      }

      if (file.debugArtifacts && file.debugArtifacts.length > 0) {
        lines.push('    Debug artifacts:');
        for (const artifact of file.debugArtifacts) {
          lines.push(`      - ${path.basename(artifact)}`);
        }
      }
    }
  }

  // Separator at the very end
  lines.push('');
  lines.push('-'.repeat(width));

  return lines.join('\n');
}

/**
 * Clear the file size cache (useful for testing)
 */
export function clearFileSizeCache() {
  fileSizeCache.clear();
}
