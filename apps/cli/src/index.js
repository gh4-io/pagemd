#!/usr/bin/env node

/**
 * @pagemd/cli - Main entry point
 * Command-line interface for PageMD pipeline
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createLogger, setLogLevel, getPackageRootFromCli, loadEnvConfig, getEnv, getEnvWarnings } from '@pagemd/core';
import { initHighlighter } from '@pagemd/parser';

// Import commands
import * as buildCommand from './commands/build.js';
import * as validateCommand from './commands/validate.js';
import * as listCommand from './commands/list.js';
import * as inspectCommand from './commands/inspect.js';
import * as initCommand from './commands/init.js';
import * as createCommand from './commands/create.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = getPackageRootFromCli(__dirname);

// Load and cache all PAGEMD_* environment variables
loadEnvConfig();

const logger = createLogger('cli');

// Set log level from environment (centralized via env.js)
const logLevel = getEnv('logLevel') || 'WARN';
setLogLevel(logLevel);

// Log any env var warnings at DEBUG level
const envWarnings = getEnvWarnings();
if (envWarnings.length > 0) {
  envWarnings.forEach(warning => {
    logger.debug('env', 'warning', warning);
  });
}

logger.debug('init', 'start', 'PageMD CLI starting', { version: '0.1.0' });

// Initialize syntax highlighter (async, but only once at startup)
// This enables shiki's sync codeToHtml() in the render loop
if (getEnv('syntaxHighlight') !== false) {
  try {
    await initHighlighter();
    logger.debug('init', 'highlighter', 'Shiki syntax highlighter initialized');
  } catch (err) {
    logger.warn('init', 'highlighter', `Syntax highlighting unavailable: ${err.message}`);
  }
}

// Default command inference: if first arg is a file path (not a known command), assume 'build'
const KNOWN_COMMANDS = ['build', 'bld', 'validate', 'val', 'list', 'ls', 'inspect', 'insp', 'init', 'new', 'create', 'add', 'help', '--help', '-h', '--version', '-v'];
const firstArg = process.argv[2];

if (firstArg && !firstArg.startsWith('-') && !KNOWN_COMMANDS.includes(firstArg)) {
  // First arg looks like a file path, not a command - insert 'build' as default command
  process.argv.splice(2, 0, 'build');
  logger.debug('init', 'default-command', `Inferred 'build' command for: ${firstArg}`);
}

yargs(hideBin(process.argv))
  .scriptName('pagemd')
  .usage('$0 [command] <input> [options]\n\nIf no command is specified, "build" is assumed.')
  .command(buildCommand)
  .command(validateCommand)
  .command(listCommand)
  .command(inspectCommand)
  .command(initCommand)
  .command(createCommand)
  .demandCommand(1, 'You must specify a command')
  .option('log-level', {
    describe: 'Set log level (default: WARN, or PAGEMD_LOG_LEVEL env var)',
    choices: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'],
    global: true
  })
  .middleware((argv) => {
    // Pass projectRoot to all commands
    argv.projectRoot = PROJECT_ROOT;

    if (argv.logLevel) {
      setLogLevel(argv.logLevel);
    }
  })
  .help()
  .alias('h', 'help')
  .version('0.1.0')
  .alias('v', 'version')
  .epilog('PageMD - Markdown to PDF/HTML pipeline\nhttps://github.com/gh4-io/pagemd')
  .strict()
  .fail((msg, err, yargs) => {
    if (err) {
      logger.error('cli', 'failure', err.message, { stack: err.stack });
      console.error(`Error: ${err.message}`);
    } else {
      console.error(msg);
      console.error();
      yargs.showHelp();
    }
    process.exit(1);
  })
  .parse();
