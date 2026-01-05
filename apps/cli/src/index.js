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

// Import commands
import * as buildCommand from './commands/build.js';
import * as validateCommand from './commands/validate.js';
import * as listProfilesCommand from './commands/list-profiles.js';

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

yargs(hideBin(process.argv))
  .scriptName('pagemd')
  .usage('$0 <command> [options]')
  .command(buildCommand)
  .command(validateCommand)
  .command(listProfilesCommand)
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
