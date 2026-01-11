/**
 * @pagemd/cli/commands/build
 * Build command - converts markdown to output formats (HTML, PDF, PNG, JPEG)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  createLogger,
  getEnv,
  findProjectRoot,
  createDebugMetadata,
  setDirectoryContext,
  addFileResult,
  formatDebugSummary,
  validateOutputDir,
  isInteractive,
  getTimestamp,
  getLogLevel
} from '@pagemd/core';
import { renderDocument, renderMarkdown } from '@pagemd/renderer-web';
import { renderPdf } from '@pagemd/renderer-pdf';
import { launchBrowser, closeBrowser } from '@pagemd/renderer-pdf';
import { saveScreenshot, getScreenshotOptions } from '@pagemd/exporters';

const logger = createLogger('cli');

/**
 * Read markdown content from stdin
 * @returns {Promise<string>} Markdown content
 */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Yargs command definition
 */
export const command = 'build [input]';
export const aliases = ['bld'];
export const describe = 'Build markdown to output formats';

// Get env var defaults (loaded at CLI startup)
const envProfile = getEnv('profile') || 'standard_letter';
const envOutputFormat = getEnv('outputFormat');
const envOutputDir = getEnv('outputDir');
const envDebug = getEnv('debug') || false;
const envPagedjsMode = getEnv('pagedjsMode') || 'browser';
const envHeadless = getEnv('headless') !== false; // default true
const envTimeout = getEnv('timeout') || 30000;
const envJpegQuality = getEnv('jpegQuality') || 90;

// Log level priority for build output decisions
const LOG_LEVEL_PRIORITY = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
  OFF: 99
};

/**
 * Check if build output should be shown based on log level
 * Shows output for any log level except OFF or unset
 * @returns {boolean} True if build output should be shown
 */
function shouldShowBuildOutput() {
  const level = getLogLevel();
  return level !== undefined && level !== null && level !== 'OFF';
}

/**
 * Check if debug report should be shown (DEBUG or TRACE level)
 * @returns {boolean} True if debug report should be shown
 */
function shouldShowDebugReport() {
  const level = getLogLevel();
  if (!level || level === 'OFF') return false;
  const priority = LOG_LEVEL_PRIORITY[level];
  return priority !== undefined && priority <= LOG_LEVEL_PRIORITY.DEBUG;
}

/**
 * Print CLI message with timestamp and [PageMD-CLI] prefix
 * @param {string} message - Message to print
 */
function cliLog(message) {
  console.log(`${getTimestamp()} [PageMD-CLI] ${message}`);
}

/**
 * Print indented sub-item (no prefix, just indentation)
 * @param {string} message - Message to print
 */
function cliLogIndent(message) {
  console.log(`\t${message}`);
}

export const builder = {
  input: {
    describe: 'Input markdown file or directory (omit if using --stdin)',
    type: 'string',
    demandOption: false
  },
  stdin: {
    describe: 'Read markdown from stdin instead of file',
    type: 'boolean',
    default: false
  },
  'base-name': {
    describe: 'Base filename for output when using --stdin (default: stdin)',
    type: 'string',
    default: 'stdin'
  },
  'stdin-path': {
    describe: 'Logical file path for stdin content (enables correct path resolution)',
    type: 'string',
    default: null
  },
  output: {
    alias: 'o',
    describe: 'Output formats (comma-separated: html,pdf,png,jpeg)',
    type: 'string',
    default: Array.isArray(envOutputFormat) ? envOutputFormat.join(',') : 'html,pdf'
  },
  profile: {
    alias: 'p',
    describe: 'Profile ID to use',
    type: 'string',
    default: envProfile
  },
  'output-dir': {
    alias: 'd',
    describe: 'Output directory (default: same as input)',
    type: 'string',
    default: envOutputDir || undefined
  },
  debug: {
    describe: 'Enable debug artifacts',
    type: 'boolean',
    default: envDebug
  },
  pagedjs: {
    describe: 'Paged.js mode (browser or cli)',
    type: 'string',
    choices: ['browser', 'cli'],
    default: envPagedjsMode.toLowerCase()
  },
  stdout: {
    describe: 'Output HTML to stdout (single file, html format only)',
    type: 'boolean',
    default: false
  }
};

/**
 * Command handler
 * @param {object} argv - Command arguments from yargs
 */
export async function handler(argv) {
  // Capture start time for duration tracking
  const startTime = Date.now();

  const {
    input,
    stdin: useStdin,
    'base-name': baseName,
    'stdin-path': stdinPath,
    output: outputFormats,
    profile,
    'output-dir': outputDir,
    debug,
    pagedjs,
    stdout,
    cliPath
  } = argv;

  // Validate input sources - must have exactly one of: input file/dir OR stdin
  if (!input && !useStdin) {
    console.error('Error: Provide <input> file/directory or use --stdin');
    process.exit(1);
  }
  if (input && useStdin) {
    console.error('Error: Cannot use both <input> and --stdin');
    process.exit(1);
  }

  logger.info('build', 'start', `Building markdown: ${useStdin ? '<stdin>' : input}`, {
    input: useStdin ? '<stdin>' : input,
    formats: outputFormats,
    profile,
    debug
  });

  try {
    // Variables set by either stdin or file mode
    let markdownFiles = [];
    let inputPath = null;
    let stdinContent = null;

    if (useStdin) {
      // === STDIN MODE ===
      // Read markdown content from stdin
      stdinContent = await readStdin();

      if (!stdinContent || stdinContent.trim().length === 0) {
        logger.error('build', 'failure', 'No content received from stdin');
        console.error('Error: No content received from stdin');
        process.exit(1);
      }

      logger.debug('build', 'info', `Read ${stdinContent.length} bytes from stdin`);

      // Validate stdout constraints (same as file mode)
      if (stdout) {
        const requestedFormats = outputFormats.split(',').map(f => f.trim().toLowerCase());
        const nonHtmlFormats = requestedFormats.filter(f => f !== 'html');
        if (nonHtmlFormats.length > 0) {
          logger.error('build', 'failure', `--stdout only supports html format, not: ${nonHtmlFormats.join(', ')}`);
          console.error(`Error: --stdout only supports html format. Remove: ${nonHtmlFormats.join(', ')}`);
          process.exit(1);
        }
      }

      // Use virtual path for stdin
      inputPath = '<stdin>';
      markdownFiles = ['<stdin>'];

    } else {
      // === FILE MODE ===
      // Step 1: Resolve input path
      inputPath = path.isAbsolute(input)
        ? input
        : path.resolve(process.cwd(), input);

      // Step 2: Check if input exists
      let inputStat;
      try {
        inputStat = await fs.stat(inputPath);
      } catch (error) {
        logger.error('build', 'failure', `Input not found: ${inputPath}`, {
          input: inputPath,
          error: error.message
        });
        console.error(`Error: Input not found: ${inputPath}`);
        process.exit(1);
      }

      // Step 2b: Validate stdout constraints
      if (stdout) {
        // Stdout mode requires single file input
        if (inputStat.isDirectory()) {
          logger.error('build', 'failure', '--stdout requires single file input, not directory');
          console.error('Error: --stdout requires a single markdown file, not a directory');
          process.exit(1);
        }

        // Stdout mode requires HTML format only
        const requestedFormats = outputFormats.split(',').map(f => f.trim().toLowerCase());
        const nonHtmlFormats = requestedFormats.filter(f => f !== 'html');
        if (nonHtmlFormats.length > 0) {
          logger.error('build', 'failure', `--stdout only supports html format, not: ${nonHtmlFormats.join(', ')}`);
          console.error(`Error: --stdout only supports html format. Remove: ${nonHtmlFormats.join(', ')}`);
          process.exit(1);
        }
      }

      // Step 3: Collect markdown files
      if (inputStat.isDirectory()) {
        logger.debug('build', 'info', `Scanning directory: ${inputPath}`);
        markdownFiles = await findMarkdownFiles(inputPath);

        if (markdownFiles.length === 0) {
          logger.warn('build', 'warning', `No markdown files found in: ${inputPath}`);
          console.warn(`Warning: No markdown files found in: ${inputPath}`);
          return;
        }

        logger.info('build', 'info', `Found ${markdownFiles.length} markdown files`);
      } else {
        // Single file
        if (!inputPath.toLowerCase().endsWith('.md')) {
          logger.error('build', 'failure', `Input is not a markdown file: ${inputPath}`);
          console.error(`Error: Input is not a markdown file: ${inputPath}`);
          process.exit(1);
        }

        markdownFiles = [inputPath];
      }
    }

    // Step 4: Parse output formats
    const formats = outputFormats
      .split(',')
      .map(f => f.trim().toLowerCase())
      .filter(f => ['html', 'pdf', 'png', 'jpeg'].includes(f));

    if (formats.length === 0) {
      logger.error('build', 'failure', `No valid output formats specified: ${outputFormats}`);
      console.error(`Error: No valid output formats. Use: html, pdf, png, jpeg`);
      process.exit(1);
    }

    logger.info('build', 'info', `Output formats: ${formats.join(', ')}`);

    // Step 5: Validate output directory if specified
    if (outputDir) {
      const validation = await validateOutputDir(outputDir, {
        autoCreate: false,
        silent: !isInteractive()
      });

      if (validation.abort) {
        logger.info('build', 'cancelled', 'Build cancelled - output directory does not exist', {
          outputDir: validation.path
        });
        console.log('Build cancelled.');
        process.exit(0);
      }

      if (validation.created) {
        logger.info('build', 'info', `Created output directory: ${validation.path}`);
      }
    }

    // Step 6: Create debug metadata if debug mode enabled OR log level is DEBUG/TRACE
    const enableDebugMetadata = debug || shouldShowDebugReport();
    const debugMetadata = enableDebugMetadata ? createDebugMetadata(true) : null;

    if (debugMetadata) {
      // Set directory context for debug output
      // For stdin mode, use stdinPath for path resolution if provided, otherwise cwd
      const pathForResolution = useStdin && stdinPath ? stdinPath : (useStdin ? process.cwd() : inputPath);
      const baseDir = path.dirname(pathForResolution);
      const projectRootPath = argv.projectRoot || findProjectRoot(pathForResolution);
      const resolvedOutputDir = outputDir
        ? path.resolve(process.cwd(), outputDir)
        : baseDir;

      setDirectoryContext(debugMetadata, {
        projectRoot: projectRootPath,
        outputDir: resolvedOutputDir,
        debugDir: debug ? path.join(resolvedOutputDir, 'debug') : null,
        markdownDir: baseDir
      });
    }

    // Step 6: Process each markdown file
    const results = {
      success: 0,
      failed: 0,
      outputs: []
    };

    // For stdout mode, we capture HTML content to write at the end
    let stdoutContent = null;

    for (const markdownFile of markdownFiles) {
      // Show processing message based on log level (not in stdout mode)
      if (!stdout && shouldShowBuildOutput()) {
        const displayName = markdownFile === '<stdin>' ? '<stdin>' : path.basename(markdownFile);
        cliLog(`Processing: ${displayName}`);
      }
      const fileStartTime = Date.now();

      try {
        const fileResults = await buildDocument(markdownFile, {
          formats,
          profile,
          outputDir,
          debug,
          pagedjs,
          stdout,
          projectRoot: argv.projectRoot,
          debugMetadata,
          // Stdin-specific options
          stdinContent: useStdin ? stdinContent : null,
          baseName: useStdin ? baseName : null,
          stdinPath: useStdin ? stdinPath : null
        });

        results.success++;
        results.outputs.push(...fileResults.outputs);

        // Capture HTML content for stdout mode
        if (stdout && fileResults.htmlContent) {
          stdoutContent = fileResults.htmlContent;
        }

        // Add file result to debug metadata
        if (debugMetadata) {
          addFileResult(debugMetadata, {
            inputPath: markdownFile,
            profileId: fileResults.profileId || profile,
            profilePath: fileResults.profilePath,
            outputs: fileResults.outputs,
            duration: Date.now() - fileStartTime,
            debugArtifacts: fileResults.debugArtifacts || []
          });
        }

        // Show success message based on log level (not in stdout mode)
        if (!stdout && shouldShowBuildOutput()) {
          cliLogIndent(`✓ Success: ${fileResults.outputs.length} outputs created`);
        }
      } catch (error) {
        results.failed++;
        logger.error('build', 'failure', `Failed to build ${markdownFile}: ${error.message}`, {
          file: markdownFile,
          error: error.message
        });
        // Errors always go to stderr (even in stdout mode)
        console.error(`  ✗ Failed: ${error.message}`);
      }
    }

    // Write HTML to stdout if in stdout mode
    if (stdout && stdoutContent) {
      process.stdout.write(stdoutContent);
    }

    // Step 7: Summary (suppressed in stdout mode)
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Show summary based on log level (not in stdout mode)
    if (!stdout && shouldShowBuildOutput()) {
      // Show prefixed header line for summary
      cliLog('Build Summary:');

      // Display full debug report if DEBUG/TRACE level and debugMetadata exists
      if (shouldShowDebugReport() && debugMetadata) {
        // Collect active overrides (only show non-default values)
        const overrides = {};

        // Detect explicit CLI flags by checking process.argv
        const cliArgs = process.argv.slice(2);
        const hasCliDebug = cliArgs.includes('--debug');
        const hasCliProfile = cliArgs.some(arg => arg === '-p' || arg === '--profile' || arg.startsWith('-p=') || arg.startsWith('--profile='));
        const hasCliOutputDir = cliArgs.some(arg => arg === '-d' || arg === '--output-dir' || arg.startsWith('-d=') || arg.startsWith('--output-dir='));
        const hasCliOutput = cliArgs.some(arg => arg === '-o' || arg === '--output' || arg.startsWith('-o=') || arg.startsWith('--output='));
        const hasCliPagedjs = cliArgs.some(arg => arg === '--pagedjs' || arg.startsWith('--pagedjs='));

        // PAGEMD_DEBUG: CLI takes precedence over env
        if (hasCliDebug) {
          overrides['PAGEMD_DEBUG'] = 'true (cli)';
        } else if (envDebug === true) {
          overrides['PAGEMD_DEBUG'] = 'true (env)';
        }

        // PAGEMD_PROFILE: CLI takes precedence over env
        if (hasCliProfile && argv.profile) {
          overrides['PAGEMD_PROFILE'] = `${argv.profile} (cli)`;
        } else if (envProfile !== 'standard_letter') {
          overrides['PAGEMD_PROFILE'] = `${envProfile} (env)`;
        }

        // PAGEMD_OUTPUT_DIR: CLI takes precedence over env
        if (hasCliOutputDir && argv['output-dir']) {
          overrides['PAGEMD_OUTPUT_DIR'] = `${argv['output-dir']} (cli)`;
        } else if (envOutputDir) {
          overrides['PAGEMD_OUTPUT_DIR'] = `${envOutputDir} (env)`;
        }

        // PAGEMD_OUTPUT_FORMAT: CLI takes precedence over env
        if (hasCliOutput && argv.output) {
          overrides['PAGEMD_OUTPUT_FORMAT'] = `${argv.output} (cli)`;
        } else if (envOutputFormat) {
          overrides['PAGEMD_OUTPUT_FORMAT'] = `${Array.isArray(envOutputFormat) ? envOutputFormat.join(',') : envOutputFormat} (env)`;
        }

        // PAGEMD_PAGEDJS_MODE: CLI takes precedence over env
        if (hasCliPagedjs && argv.pagedjs) {
          overrides['PAGEMD_PAGEDJS_MODE'] = `${argv.pagedjs} (cli)`;
        } else if (envPagedjsMode !== 'browser') {
          overrides['PAGEMD_PAGEDJS_MODE'] = `${envPagedjsMode} (env)`;
        }

        // Build results with totalFiles
        const buildResults = {
          ...results,
          totalFiles: markdownFiles.length
        };

        // Output full debug report (no prefix on the block itself)
        const debugSummary = formatDebugSummary(debugMetadata, buildResults, `${duration}s`, overrides);
        console.log(debugSummary);
      } else {
        // Compact summary (INFO level) - indented sub-items
        cliLogIndent(`Total files: ${markdownFiles.length}`);
        cliLogIndent(`Successful: ${results.success}`);
        cliLogIndent(`Failed: ${results.failed}`);
        cliLogIndent(`Total outputs: ${results.outputs.length}`);
        cliLogIndent(`Duration: ${duration}s`);
      }
    }

    logger.info('build', 'success', `Build complete: ${results.success}/${markdownFiles.length} successful`, {
      total: markdownFiles.length,
      success: results.success,
      failed: results.failed,
      outputs: results.outputs.length,
      duration: `${duration}s`
    });

    // Exit with error code if any failed
    if (results.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    logger.fatal('build', 'failure', `Build failed: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    console.error(`\nFatal error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Find all markdown files in directory (non-recursive)
 * @param {string} dirPath - Directory path
 * @returns {Promise<string[]>} Array of absolute paths to markdown files
 */
async function findMarkdownFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const markdownFiles = entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map(entry => path.join(dirPath, entry.name));

  return markdownFiles;
}

/**
 * Build single document to all requested formats
 * @param {string} markdownPath - Path to markdown file (or '<stdin>' for stdin mode)
 * @param {object} options - Build options
 * @param {string[]} options.formats - Output formats
 * @param {string} options.profile - Profile ID
 * @param {string} options.outputDir - Output directory override
 * @param {boolean} options.debug - Enable debug mode
 * @param {string} options.pagedjs - Paged.js mode
 * @param {boolean} options.stdout - Output HTML to stdout instead of file
 * @param {string} options.projectRoot - Project root directory
 * @param {object} options.debugMetadata - Debug metadata collector (optional)
 * @param {string} options.stdinContent - Markdown content from stdin (optional)
 * @param {string} options.baseName - Base filename for stdin output (optional)
 * @param {string} options.stdinPath - Logical file path for stdin content (optional, for path resolution)
 * @returns {Promise<{outputs: object[], profileId: string, profilePath?: string, debugArtifacts: string[], htmlContent?: string}>}
 */
async function buildDocument(markdownPath, options) {
  const { formats, profile, outputDir, debug, pagedjs, stdout, projectRoot, debugMetadata, stdinContent, baseName, stdinPath: logicalStdinPath, cliPath } = options;

  // Determine if we're in stdin mode
  const isStdinMode = markdownPath === '<stdin>' && stdinContent;

  // Calculate base output path
  const baseOutputPath = isStdinMode
    ? (outputDir ? path.join(outputDir, baseName || 'stdin') : path.join(process.cwd(), baseName || 'stdin'))
    : (outputDir ? path.join(outputDir, path.basename(markdownPath, '.md')) : markdownPath.replace(/\.md$/i, ''));

  const outputs = [];
  const debugArtifacts = [];
  let browser = null;
  let resolvedProfileId = profile;
  let resolvedProfilePath = null;
  let htmlContent = null; // For stdout mode

  try {
    // HTML output
    if (formats.includes('html')) {
      const htmlPath = `${baseOutputPath}.html`;
      logger.debug('build.html', 'start', `Generating HTML: ${stdout ? 'stdout' : htmlPath}`);

      // Use renderMarkdown for stdin mode, renderDocument for file mode
      // Pass logicalStdinPath to renderMarkdown for correct path resolution (e.g., relative profile paths)
      const result = isStdinMode
        ? await renderMarkdown(stdinContent, { profile, projectRoot, markdownPath: logicalStdinPath, cliPath, debugMetadata })
        : await renderDocument(markdownPath, { profile, projectRoot, cliPath, debugMetadata });

      // Capture profile info from result
      if (result.profile) {
        resolvedProfileId = result.profile.id || profile;
        resolvedProfilePath = result.profile._manifestDir
          ? path.join(result.profile._manifestDir, `${resolvedProfileId}.json`)
          : null;
      }

      if (stdout) {
        // Stdout mode: capture HTML content, skip file write
        htmlContent = result.html;
        outputs.push({
          format: 'html',
          path: 'stdout',
          size: result.html.length
        });
        logger.info('build.html', 'success', 'HTML generated to stdout');
      } else {
        // Normal mode: write to file
        await fs.mkdir(path.dirname(htmlPath), { recursive: true });
        await fs.writeFile(htmlPath, result.html, 'utf-8');
        outputs.push({
          format: 'html',
          path: htmlPath,
          size: result.html.length
        });
        logger.info('build.html', 'success', `HTML generated: ${htmlPath}`);
      }
    }

    // PDF output
    if (formats.includes('pdf')) {
      const pdfPath = `${baseOutputPath}.pdf`;
      logger.debug('build.pdf', 'start', `Generating PDF: ${pdfPath}`);

      let tempFilePath = null;
      let pdfSourcePath = markdownPath;

      // For stdin mode, write content to temp file (Puppeteer requires file URL)
      if (isStdinMode) {
        tempFilePath = path.join(os.tmpdir(), `pagemd-${randomUUID()}.md`);
        await fs.writeFile(tempFilePath, stdinContent, 'utf-8');
        pdfSourcePath = tempFilePath;
        logger.debug('build.pdf', 'info', `Created temp file for PDF: ${tempFilePath}`);
      }

      try {
        const result = await renderPdf(pdfSourcePath, {
          profile,
          projectRoot: isStdinMode ? process.cwd() : projectRoot,
          output: pdfPath,
          debug,
          pagedjs,
          headless: envHeadless,
          timeout: envTimeout,
          debugMetadata
        });

        outputs.push({
          format: 'pdf',
          path: result.pdfPath,
          pages: result.pages
        });

        // Collect debug artifacts from PDF renderer
        if (result.debugArtifacts) {
          debugArtifacts.push(...result.debugArtifacts);
        }

        logger.info('build.pdf', 'success', `PDF generated: ${pdfPath} (${result.pages} pages)`);
      } finally {
        // Clean up temp file
        if (tempFilePath) {
          await fs.unlink(tempFilePath).catch(() => {});
        }
      }
    }

    // PNG/JPEG outputs (require browser reuse)
    const imageFormats = formats.filter(f => f === 'png' || f === 'jpeg');

    if (imageFormats.length > 0) {
      logger.debug('build.images', 'start', `Generating images: ${imageFormats.join(', ')}`);

      // Render HTML first (use renderMarkdown for stdin mode)
      const htmlResult = isStdinMode
        ? await renderMarkdown(stdinContent, { profile, projectRoot: process.cwd(), cliPath })
        : await renderDocument(markdownPath, { profile, projectRoot, cliPath });

      // Launch browser for screenshots (use env vars for headless mode)
      browser = await launchBrowser({ headless: envHeadless, debug });
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: 816,
        height: 1056,
        deviceScaleFactor: 1
      });

      // Set content (use env var for timeout)
      // For stdin mode, use cwd as base URL for relative resources
      const baseUrl = isStdinMode
        ? `file://${process.cwd()}/`
        : `file://${path.dirname(path.resolve(markdownPath))}/`;
      await page.setContent(htmlResult.html, {
        waitUntil: 'networkidle0',
        timeout: envTimeout
      });

      // Capture each image format
      for (const format of imageFormats) {
        const imagePath = `${baseOutputPath}.${format}`;
        logger.debug(`build.${format}`, 'start', `Generating ${format.toUpperCase()}: ${imagePath}`);

        const screenshotOpts = getScreenshotOptions(format, htmlResult.profile);
        // Apply env var for JPEG quality
        if (format === 'jpeg' && envJpegQuality) {
          screenshotOpts.quality = envJpegQuality;
        }
        const result = await saveScreenshot(page, imagePath, screenshotOpts);

        outputs.push({
          format,
          path: result.path,
          size: result.size
        });

        logger.info(`build.${format}`, 'success', `${format.toUpperCase()} generated: ${imagePath}`);
      }

      // Close browser
      await closeBrowser(browser);
      browser = null;
    }

    return {
      outputs,
      profileId: resolvedProfileId,
      profilePath: resolvedProfilePath,
      debugArtifacts,
      htmlContent // For stdout mode
    };

  } catch (error) {
    // Clean up browser on error
    if (browser) {
      try {
        await closeBrowser(browser);
      } catch (closeError) {
        logger.warn('build', 'warning', `Failed to close browser: ${closeError.message}`);
      }
    }

    throw error;
  }
}
