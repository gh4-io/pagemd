#!/usr/bin/env node

/**
 * @pagemd/cli - Main entry point
 * Command-line interface for PageMD pipeline
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createLogger, setLogLevel } from '@pagemd/core';

// Import commands
import * as buildCommand from './commands/build.js';
import * as validateCommand from './commands/validate.js';
import * as listProfilesCommand from './commands/list-profiles.js';

const logger = createLogger('cli');

// Set log level from environment or default
const logLevel = process.env.PAGEMD_LOG_LEVEL || 'INFO';
setLogLevel(logLevel);

logger.debug('init', 'start', 'PageMD CLI starting', { version: '0.1.0' });

yargs(hideBin(process.argv))
  .scriptName('pagemd')
  .usage('$0 <command> [options]')
  .command(buildCommand)
  .command(validateCommand)
  .command(listProfilesCommand)
  .demandCommand(1, 'You must specify a command')
  .option('log-level', {
    describe: 'Set log level',
    choices: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'],
    default: 'INFO',
    global: true
  })
  .middleware((argv) => {
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
