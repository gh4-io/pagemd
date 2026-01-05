/**
 * @pagemd/cli/commands/build
 * Build command - converts markdown to output formats (HTML, PDF, PNG, JPEG)
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createLogger } from '@pagemd/core';
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
    default: 'html,pdf'
  },
  profile: {
    alias: 'p',
    describe: 'Profile ID to use',
    type: 'string',
    default: 'standard_letter'
  },
  'output-dir': {
    alias: 'd',
    describe: 'Output directory (default: same as input)',
    type: 'string'
  },
  debug: {
    describe: 'Enable debug artifacts',
    type: 'boolean',
    default: false
  },
  pagedjs: {
    describe: 'Paged.js mode (browser or cli)',
    type: 'string',
    choices: ['browser', 'cli'],
    default: 'browser'
  }
};

/**
 * Command handler
 * @param {object} argv - Command arguments from yargs
 */
export async function handler(argv) {
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

    // Step 5: Process each markdown file
    const results = {
      success: 0,
      failed: 0,
      outputs: []
    };

    for (const markdownFile of markdownFiles) {
      console.log(`\nProcessing: ${markdownFile}`);

      try {
        const fileResults = await buildDocument(markdownFile, {
          formats,
          profile,
          outputDir,
          debug,
          pagedjs
        });

        results.success++;
        results.outputs.push(...fileResults);

        console.log(`  ✓ Success: ${fileResults.length} outputs created`);
      } catch (error) {
        results.failed++;
        logger.error('build', 'failure', `Failed to build ${markdownFile}: ${error.message}`, {
          file: markdownFile,
          error: error.message
        });
        console.error(`  ✗ Failed: ${error.message}`);
      }
    }

    // Step 6: Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Build Summary:`);
    console.log(`  Total files: ${markdownFiles.length}`);
    console.log(`  Successful: ${results.success}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Total outputs: ${results.outputs.length}`);
    console.log(`${'='.repeat(60)}\n`);

    logger.info('build', 'success', `Build complete: ${results.success}/${markdownFiles.length} successful`, {
      total: markdownFiles.length,
      success: results.success,
      failed: results.failed,
      outputs: results.outputs.length
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
 * @returns {Promise<object[]>} Array of output file info objects
 */
async function buildDocument(markdownPath, options) {
  const { formats, profile, outputDir, debug, pagedjs } = options;

  const baseOutputPath = outputDir
    ? path.join(outputDir, path.basename(markdownPath, '.md'))
    : markdownPath.replace(/\.md$/i, '');

  const outputs = [];
  let browser = null;

  try {
    // HTML output
    if (formats.includes('html')) {
      const htmlPath = `${baseOutputPath}.html`;
      logger.debug('build.html', 'start', `Generating HTML: ${htmlPath}`);

      const result = await renderDocument(markdownPath, { profile });

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
        output: pdfPath,
        debug,
        pagedjs
      });

      outputs.push({
        format: 'pdf',
        path: result.pdfPath,
        pages: result.pages
      });

      logger.info('build.pdf', 'success', `PDF generated: ${pdfPath} (${result.pages} pages)`);
    }

    // PNG/JPEG outputs (require browser reuse)
    const imageFormats = formats.filter(f => f === 'png' || f === 'jpeg');

    if (imageFormats.length > 0) {
      logger.debug('build.images', 'start', `Generating images: ${imageFormats.join(', ')}`);

      // Render HTML first
      const htmlResult = await renderDocument(markdownPath, { profile });

      // Launch browser for screenshots
      browser = await launchBrowser({ headless: true, debug });
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: 816,
        height: 1056,
        deviceScaleFactor: 1
      });

      // Set content
      const baseUrl = `file://${path.dirname(path.resolve(markdownPath))}/`;
      await page.setContent(htmlResult.html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Capture each image format
      for (const format of imageFormats) {
        const imagePath = `${baseOutputPath}.${format}`;
        logger.debug(`build.${format}`, 'start', `Generating ${format.toUpperCase()}: ${imagePath}`);

        const screenshotOpts = getScreenshotOptions(format, htmlResult.profile);
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

    return outputs;

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
