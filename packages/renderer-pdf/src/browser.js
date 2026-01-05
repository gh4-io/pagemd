/**
 * @pagemd/renderer-pdf/browser
 * Browser management for PDF rendering with Puppeteer
 *
 * Prefers system Chrome; falls back to bundled Chromium when Chrome unavailable or fails.
 */

import puppeteer from 'puppeteer';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.pdf');

/**
 * Detect system Chrome installation across platforms
 * @returns {string|null} Path to Chrome executable or null if not found
 */
export function detectChrome() {
  const platform = process.platform;
  const chromePaths = [];

  // Windows paths
  if (platform === 'win32') {
    chromePaths.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`
    );
  }
  // macOS paths
  else if (platform === 'darwin') {
    chromePaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
    );
  }
  // Linux paths
  else if (platform === 'linux') {
    chromePaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    );

    // Try using `which` command on Linux
    try {
      const whichResult = execSync('which google-chrome || which google-chrome-stable || which chromium || which chromium-browser', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      if (whichResult) {
        chromePaths.unshift(whichResult);
      }
    } catch (err) {
      // which command failed, continue with static paths
    }
  }

  // Check each path
  for (const path of chromePaths) {
    if (path && existsSync(path)) {
      logger.debug('chrome_detected', 'ok', `Found Chrome at ${path}`);
      return path;
    }
  }

  logger.debug('chrome_detection', 'none', 'No system Chrome found, will use bundled Chromium');
  return null;
}

/**
 * Launch Puppeteer browser with Chrome preference
 * @param {Object} options - Launch options
 * @param {boolean} [options.headless=true] - Run in headless mode
 * @param {boolean} [options.debug=false] - Show browser for debugging
 * @param {string} [options.executablePath] - Override executable path
 * @param {Array<string>} [options.args] - Additional browser args
 * @returns {Promise<import('puppeteer').Browser>} Puppeteer browser instance
 */
export async function launchBrowser(options = {}) {
  const {
    headless = true,
    debug = false,
    executablePath: userExecutablePath,
    args = []
  } = options;

  // Build base launch config
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    ...args
  ];
  const baseConfig = {
    headless: debug ? false : headless,
    args: baseArgs
  };

  let browser = null;
  let usedChrome = false;

  // 1. Try user-provided executable path
  if (userExecutablePath) {
    try {
      logger.info('browser_launch', 'start', `Launching browser with user-provided path: ${userExecutablePath}`);
      browser = await puppeteer.launch({
        ...baseConfig,
        executablePath: userExecutablePath
      });
      usedChrome = true;
      logger.info('browser_launch', 'ok', `Browser launched successfully with user path`);
    } catch (err) {
      logger.warn('browser_launch', 'fail', `Failed to launch with user path: ${err.message}`);
      browser = null;
    }
  }

  // 2. Try system Chrome
  if (!browser) {
    const chromePath = detectChrome();
    if (chromePath) {
      try {
        logger.info('browser_launch', 'start', `Attempting to launch system Chrome`);
        browser = await puppeteer.launch({
          ...baseConfig,
          executablePath: chromePath
        });
        usedChrome = true;
        logger.info('browser_launch', 'ok', `System Chrome launched successfully`);
      } catch (err) {
        logger.warn('browser_launch', 'fail', `Failed to launch system Chrome: ${err.message}`);
        browser = null;
      }
    }
  }

  // 3. Fallback to bundled Chromium
  if (!browser) {
    try {
      logger.info('browser_launch', 'start', `Falling back to bundled Chromium`);
      browser = await puppeteer.launch(baseConfig);
      logger.info('browser_launch', 'ok', `Bundled Chromium launched successfully`);
    } catch (err) {
      logger.error('browser_launch', 'fail', `Failed to launch bundled Chromium: ${err.message}`);
      throw new Error(`Failed to launch browser: ${err.message}`);
    }
  }

  // Log final browser info
  const browserType = usedChrome ? 'Chrome' : 'Chromium';
  const version = await browser.version();
  logger.info('browser_ready', 'ok', `${browserType} ${version} ready (headless: ${baseConfig.headless})`);

  return browser;
}

/**
 * Safely close browser instance
 * @param {import('puppeteer').Browser} browser - Browser instance to close
 * @returns {Promise<void>}
 */
export async function closeBrowser(browser) {
  if (!browser) {
    logger.debug('browser_close', 'skip', 'No browser instance to close');
    return;
  }

  try {
    logger.debug('browser_close', 'start', 'Closing browser');
    await browser.close();
    logger.debug('browser_close', 'ok', 'Browser closed successfully');
  } catch (err) {
    logger.warn('browser_close', 'fail', `Error closing browser: ${err.message}`);
    // Don't throw - browser may already be closed or in bad state
  }
}
