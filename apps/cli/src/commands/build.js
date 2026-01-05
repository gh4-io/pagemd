/**
 * @pagemd/cli/commands/build
 * Build command - converts markdown to output formats (HTML, PDF, PNG, JPEG)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  createLogger,
  getEnv,
  findProjectRoot,
  createDebugMetadata,
  setDirectoryContext,
  addFileResult,
  formatDebugSummary,
  validateOutputDir,
  isInteractive
} from '@pagemd/core';
import { renderDocument } from '@pagemd/renderer-web';
import { renderPdf } from '@pagemd/renderer-pdf';
import { launchBrowser, closeBrowser } from '@pagemd/renderer-pdf';
import { saveScreenshot, getScreenshotOptions } from '@pagemd/exporters';

const logger = createLogger('cli');

/**
 * Yargs command definition
 */
export const command = 'build <input>';
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

export const builder = {
  input: {
    describe: 'Input markdown file or directory',
    type: 'string',
    demandOption: true
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
    output: outputFormats,
    profile,
    'output-dir': outputDir,
    debug,
    pagedjs
  } = argv;

  logger.info('build', 'start', `Building markdown: ${input}`, {
    input,
    formats: outputFormats,
    profile,
    debug
  });

  try {
    // Step 1: Resolve input path
    const inputPath = path.isAbsolute(input)
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

    // Step 3: Collect markdown files
    let markdownFiles = [];

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

    // Step 6: Create debug metadata if debug mode enabled
    const debugMetadata = debug ? createDebugMetadata(true) : null;

    if (debugMetadata) {
      // Set directory context for debug output
      const projectRootPath = argv.projectRoot || findProjectRoot(inputPath);
      const resolvedOutputDir = outputDir
        ? path.resolve(process.cwd(), outputDir)
        : path.dirname(inputPath);

      setDirectoryContext(debugMetadata, {
        projectRoot: projectRootPath,
        outputDir: resolvedOutputDir,
        debugDir: debug ? path.join(resolvedOutputDir, 'debug') : null,
        markdownDir: path.dirname(inputPath)
      });
    }

    // Step 6: Process each markdown file
    const results = {
      success: 0,
      failed: 0,
      outputs: []
    };

    for (const markdownFile of markdownFiles) {
      console.log(`\nProcessing: ${markdownFile}`);
      const fileStartTime = Date.now();

      try {
        const fileResults = await buildDocument(markdownFile, {
          formats,
          profile,
          outputDir,
          debug,
          pagedjs,
          projectRoot: argv.projectRoot,
          debugMetadata
        });

        results.success++;
        results.outputs.push(...fileResults.outputs);

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

        console.log(`  ✓ Success: ${fileResults.outputs.length} outputs created`);
      } catch (error) {
        results.failed++;
        logger.error('build', 'failure', `Failed to build ${markdownFile}: ${error.message}`, {
          file: markdownFile,
          error: error.message
        });
        console.error(`  ✗ Failed: ${error.message}`);
      }
    }

    // Step 7: Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display unified debug summary if debug mode is active
    if (debugMetadata) {
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

      const debugSummary = formatDebugSummary(debugMetadata, buildResults, `${duration}s`, overrides);
      console.log(debugSummary);
    } else {
      // Standard summary (only shown when debug mode is OFF)
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Build Summary:`);
      console.log(`  Total files: ${markdownFiles.length}`);
      console.log(`  Successful: ${results.success}`);
      console.log(`  Failed: ${results.failed}`);
      console.log(`  Total outputs: ${results.outputs.length}`);
      console.log(`  Duration: ${duration}s`);
      console.log(`${'='.repeat(60)}\n`);
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
 * @param {string} markdownPath - Path to markdown file
 * @param {object} options - Build options
 * @param {string[]} options.formats - Output formats
 * @param {string} options.profile - Profile ID
 * @param {string} options.outputDir - Output directory override
 * @param {boolean} options.debug - Enable debug mode
 * @param {string} options.pagedjs - Paged.js mode
 * @param {string} options.projectRoot - Project root directory
 * @param {object} options.debugMetadata - Debug metadata collector (optional)
 * @returns {Promise<{outputs: object[], profileId: string, profilePath?: string, debugArtifacts: string[]}>}
 */
async function buildDocument(markdownPath, options) {
  const { formats, profile, outputDir, debug, pagedjs, projectRoot, debugMetadata } = options;

  const baseOutputPath = outputDir
    ? path.join(outputDir, path.basename(markdownPath, '.md'))
    : markdownPath.replace(/\.md$/i, '');

  const outputs = [];
  const debugArtifacts = [];
  let browser = null;
  let resolvedProfileId = profile;
  let resolvedProfilePath = null;

  try {
    // HTML output
    if (formats.includes('html')) {
      const htmlPath = `${baseOutputPath}.html`;
      logger.debug('build.html', 'start', `Generating HTML: ${htmlPath}`);

      const result = await renderDocument(markdownPath, {
        profile,
        projectRoot,
        debugMetadata
      });

      // Capture profile info from result
      if (result.profile) {
        resolvedProfileId = result.profile.id || profile;
        resolvedProfilePath = result.profile._manifestDir
          ? path.join(result.profile._manifestDir, `${resolvedProfileId}.json`)
          : null;
      }

      // Ensure output directory exists
      await fs.mkdir(path.dirname(htmlPath), { recursive: true });

      await fs.writeFile(htmlPath, result.html, 'utf-8');

      outputs.push({
        format: 'html',
        path: htmlPath,
        size: result.html.length
      });

      logger.info('build.html', 'success', `HTML generated: ${htmlPath}`);
    }

    // PDF output
    if (formats.includes('pdf')) {
      const pdfPath = `${baseOutputPath}.pdf`;
      logger.debug('build.pdf', 'start', `Generating PDF: ${pdfPath}`);

      const result = await renderPdf(markdownPath, {
        profile,
        projectRoot,
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
    }

    // PNG/JPEG outputs (require browser reuse)
    const imageFormats = formats.filter(f => f === 'png' || f === 'jpeg');

    if (imageFormats.length > 0) {
      logger.debug('build.images', 'start', `Generating images: ${imageFormats.join(', ')}`);

      // Render HTML first
      const htmlResult = await renderDocument(markdownPath, {
        profile,
        projectRoot
      });

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
      const baseUrl = `file://${path.dirname(path.resolve(markdownPath))}/`;
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
      debugArtifacts
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
