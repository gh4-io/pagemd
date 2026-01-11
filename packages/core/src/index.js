/**
 * @pagemd/core
 * Core utilities for PageMD pipeline
 */

export { createLogger, setLogLevel, getLogLevel, getTimestamp } from './logger.js';
export {
  loadEnvConfig,
  getEnv,
  getAllEnv,
  getEnvWarnings,
  resetEnvConfig,
  mergeWithEnv,
  parseBoolean,
  parseNumber,
  parseArray,
  normalizePath,
  ENV_SCHEMA
} from './env.js';
export {
  loadConfig,
  loadConfigSync,
  loadProjectConfig,
  loadProjectConfigSync,
  loadProfile,
  loadProfileSync,
  clearConfigCache
} from './config.js';
export {
  createPathContext,
  resolvePath,
  resolveResourcePath,
  resolveResource,
  expandTokens,
  findProjectRoot,
  getPackageRootFromCli,
  buildSearchPaths,
  findResourceWithDuplicateCheck,
  RESOURCE_EXTENSIONS
} from './path-resolver.js';
export {
  loadAndMergeProfile,
  mergeProfiles,
  validateProfile,
  detectCircularInheritance,
  getDefaultProfile
} from './profile-loader.js';
export {
  createDebugMetadata,
  addResource,
  setDirectoryContext,
  addFileResult,
  getFileSize,
  getFileSizeSync,
  formatBytes,
  formatDebugSummary,
  clearFileSizeCache
} from './debug-metadata.js';
export { RESOURCE_PATHS, DEFAULT_FILES, getResourcePath } from './paths.js';
export {
  directoryExists,
  validateOutputDir,
  isInteractive
} from './prompts.js';
export {
  discoverResources,
  getResourceDirectories,
  RESOURCE_TYPES
} from './resource-discovery.js';
export {
  resolveColorScheme,
  validateColorScheme
} from './color-scheme.js';
