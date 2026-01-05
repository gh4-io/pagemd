/**
 * @pagemd/core/prompts
 * Cross-platform CLI prompting utilities
 */

import { promises as fs } from 'fs';
import path from 'path';
import readline from 'readline';

/**
 * Check if a directory exists
 * @param {string} dirPath - Directory path to check
 * @returns {Promise<boolean>} True if directory exists
 */
export async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Prompt user via stdin/stdout
 * @param {string} question - Question to ask
 * @returns {Promise<string>} User's answer (trimmed, lowercase)
 */
function promptUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Validate output directory and prompt user if it doesn't exist
 *
 * @param {string} outputDir - Output directory path
 * @param {object} [options={}] - Options
 * @param {boolean} [options.autoCreate=false] - Auto-create without prompting
 * @param {boolean} [options.silent=false] - Skip prompting (exit if not exists)
 * @returns {Promise<{exists: boolean, created: boolean, path: string, abort: boolean}>}
 */
export async function validateOutputDir(outputDir, options = {}) {
  const { autoCreate = false, silent = false } = options;

  // Normalize path for cross-platform compatibility
  const normalizedPath = path.resolve(outputDir);

  const result = {
    exists: false,
    created: false,
    path: normalizedPath,
    abort: false
  };

  // Check if directory exists
  result.exists = await directoryExists(normalizedPath);

  if (result.exists) {
    return result;
  }

  // Directory doesn't exist - handle based on options
  if (autoCreate) {
    await fs.mkdir(normalizedPath, { recursive: true });
    result.created = true;
    return result;
  }

  if (silent) {
    result.abort = true;
    return result;
  }

  // Interactive prompt
  console.log(`\nOutput directory does not exist: ${normalizedPath}`);
  console.log('');
  console.log('  [E] Exit (default)');
  console.log('  [C] Create directory and continue');
  console.log('');

  const answer = await promptUser('Choice [E/c]: ');

  if (answer === 'c' || answer === 'create') {
    try {
      await fs.mkdir(normalizedPath, { recursive: true });
      result.created = true;
      console.log(`Created: ${normalizedPath}\n`);
    } catch (error) {
      console.error(`Failed to create directory: ${error.message}`);
      result.abort = true;
    }
  } else {
    // Default: exit
    result.abort = true;
  }

  return result;
}

/**
 * Check if stdin is interactive (TTY)
 * @returns {boolean} True if stdin is interactive
 */
export function isInteractive() {
  return process.stdin.isTTY === true;
}
