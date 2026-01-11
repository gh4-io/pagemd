/**
 * @pagemd/core/profile-loader
 * Profile loading with inheritance and validation
 *
 * Implements:
 * - Single parent inheritance via extends property
 * - Deep-merge objects (nested properties merged recursively)
 * - Replace arrays (child arrays completely replace parent arrays)
 * - Null values mean "inherit from parent" (preserves parent value)
 * - Circular reference detection
 * - Profile validation (delegated to loadProfileSync)
 */

import { loadProfileSync } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger('profiles');

/**
 * Default profile name
 * @returns {string} Default profile name
 */
export function getDefaultProfile() {
  return 'standard_letter';
}

/**
 * Deep-merge two objects
 * - Objects: deep-merge (recursively merge nested properties)
 * - Arrays: child replaces parent (no merging)
 * - Null values: child null means "inherit from parent" (preserves parent value)
 * @param {object} parent - Parent object
 * @param {object} child - Child object
 * @returns {object} Merged object
 */
function deepMerge(parent, child) {
  // If child is null, preserve parent value (null means "inherit from parent")
  if (child === null) {
    return parent;
  }

  // If parent is not an object or is null, child wins
  if (typeof parent !== 'object' || parent === null) {
    return child;
  }

  // If child is not an object, child wins
  if (typeof child !== 'object') {
    return child;
  }

  // Arrays: child replaces parent entirely (unless child is null, handled above)
  if (Array.isArray(parent) || Array.isArray(child)) {
    return child;
  }

  // Objects: deep merge
  const result = { ...parent };

  for (const key in child) {
    if (child.hasOwnProperty(key)) {
      const childValue = child[key];

      // Skip null values - they mean "inherit from parent"
      if (childValue === null) {
        continue;
      }

      if (typeof childValue === 'object' && !Array.isArray(childValue) &&
          typeof parent[key] === 'object' && parent[key] !== null && !Array.isArray(parent[key])) {
        // Both are objects (not arrays) - recurse
        result[key] = deepMerge(parent[key], childValue);
      } else {
        // Child wins (includes array replacement)
        result[key] = childValue;
      }
    }
  }

  return result;
}

/**
 * Merge two profile objects
 * Deep-merge objects, replace arrays
 * @param {object} parent - Parent profile
 * @param {object} child - Child profile
 * @returns {object} Merged profile
 */
export function mergeProfiles(parent, child) {
  logger.trace('inheritance', 'in-progress', 'Merging profiles', {
    parent: parent.id,
    child: child.id
  });

  const merged = deepMerge(parent, child);

  logger.debug('inheritance', 'success', 'Profiles merged', {
    parent: parent.id,
    child: child.id,
    result: merged.id
  });

  return merged;
}

/**
 * Validate profile structure
 * @param {object} profile - Profile to validate
 * @param {string} filename - Expected filename (without extension)
 * @throws {Error} If validation fails
 */
export function validateProfile(profile, filename) {
  logger.trace('validation', 'in-progress', 'Validating profile', {
    profile: profile.id,
    filename
  });

  // Check profile has id field
  if (!profile.id) {
    const error = new Error(`Profile missing required 'id' field`);
    logger.error('validation', 'failure', 'Profile missing id', { filename });
    throw error;
  }

  // Check id matches filename (strict)
  if (profile.id !== filename) {
    const error = new Error(
      `Profile ID '${profile.id}' does not match filename '${filename}'. Profile ID must match filename exactly.`
    );
    logger.error('validation', 'failure', 'Profile ID mismatch', {
      profileId: profile.id,
      filename
    });
    throw error;
  }

  logger.debug('validation', 'success', 'Profile validated', {
    profile: profile.id,
    filename
  });
}

/**
 * Detect circular inheritance in extends chain
 * @param {string} profileName - Profile to check
 * @param {string[]} chain - Current inheritance chain
 * @param {Function} loadFn - Function to load a profile by name
 * @throws {Error} If circular reference detected
 */
export function detectCircularInheritance(profileName, chain, loadFn) {
  if (chain.includes(profileName)) {
    const cycleStart = chain.indexOf(profileName);
    const cycle = [...chain.slice(cycleStart), profileName];
    const error = new Error(
      `Circular inheritance detected: ${cycle.join(' -> ')}`
    );
    logger.error('inheritance', 'failure', 'Circular inheritance detected', {
      profile: profileName,
      chain,
      cycle
    });
    throw error;
  }

  // Load profile to check if it has extends
  const profile = loadFn(profileName);
  if (!profile) {
    const error = new Error(`Profile not found in inheritance chain: ${profileName}`);
    logger.error('inheritance', 'failure', 'Profile not found', {
      profile: profileName,
      chain
    });
    throw error;
  }

  // If profile extends another, recurse
  if (profile.extends) {
    detectCircularInheritance(profile.extends, [...chain, profileName], loadFn);
  }
}

/**
 * Load and merge profile with inheritance
 * @param {string} profileName - Name of profile to load
 * @param {object} context - Loading context
 * @param {string} [context.searchFrom] - Directory to start search from
 * @param {string} [context.configDir] - Explicit config directory
 * @param {string} [context.cliPath] - CLI package root for built-in resources
 * @returns {Promise<object>} Fully merged profile object
 * @throws {Error} If profile not found or validation fails
 */
export async function loadAndMergeProfile(profileName, context = {}) {
  const { searchFrom = null, configDir = null, cliPath = null } = context;

  logger.info('loading', 'in-progress', 'Loading profile with inheritance', {
    profile: profileName,
    searchFrom,
    configDir,
    cliPath
  });

  // Create loading function for circular detection
  const loadFn = (name) => loadProfileSync(name, searchFrom, configDir, cliPath);

  // Detect circular inheritance before loading
  try {
    detectCircularInheritance(profileName, [], loadFn);
  } catch (err) {
    logger.error('loading', 'failure', 'Circular inheritance check failed', {
      profile: profileName,
      error: err.message
    });
    throw err;
  }

  // Load the base profile (validation handled by loadProfileSync)
  const profile = loadFn(profileName);
  if (!profile) {
    const error = new Error(`Profile not found: ${profileName}`);
    logger.error('loading', 'failure', 'Profile not found', { profile: profileName });
    throw error;
  }

  // If no inheritance, return as-is
  if (!profile.extends) {
    logger.info('loading', 'success', 'Profile loaded (no inheritance)', {
      profile: profileName
    });
    return profile;
  }

  // Load and merge parent chain
  logger.debug('inheritance', 'in-progress', 'Resolving parent chain', {
    profile: profileName,
    extends: profile.extends
  });

  const parent = await loadAndMergeProfile(profile.extends, context);
  const merged = mergeProfiles(parent, profile);

  logger.info('loading', 'success', 'Profile loaded with inheritance', {
    profile: profileName,
    parent: profile.extends
  });

  return merged;
}
