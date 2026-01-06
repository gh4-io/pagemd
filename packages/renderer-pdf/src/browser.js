/**
 * @pagemd/renderer-pdf/browser
 * Browser management for PDF rendering with Puppeteer
 *
 * Requires system Chrome/Chromium (puppeteer-core has no bundled browser).
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createLogger } from '@pagemd/core';

const logger = createLogger('renderer.pdf');

/**
 * Check for missing shared libraries and return helpful error message
 * @param {string} errorMessage - Original error message from Puppeteer
 * @returns {string} Enhanced error message with fix instructions, or original if not a library issue
 */
function enhanceLibraryError(errorMessage) {
  // Only enhance on Linux
  if (process.platform !== 'linux') {
    return errorMessage;
  }

  // Check if this is a shared library error
  const libMatch = errorMessage.match(/error while loading shared libraries: ([^:]+)/);
  if (libMatch) {
    const missingLib = libMatch[1];
    return `Missing system library: ${missingLib}

Chrome requires system libraries that are not installed.

To fix, run:
  sudo apt install -y libnss3 libnspr4 libasound2 libatk-bridge2.0-0 libdrm2 libgbm1 libxkbcommon0

Then try again.`;
  }

  // Check for other common Chrome launch failures on Linux
  if (errorMessage.includes('No usable sandbox') || errorMessage.includes('SUID sandbox')) {
    return `Chrome sandbox error.

To fix, either:
1. Run with --no-sandbox (less secure, already attempted)
2. Set up kernel unprivileged user namespaces:
   echo 1 | sudo tee /proc/sys/kernel/unprivileged_userns_clone

Original error: ${errorMessage}`;
  }

  return errorMessage;
}

// Cached browser instance for PAGEMD_KEEP_CHROME mode
let cachedBrowser = null;
let browserPersistenceEnabled = null;

/**
 * Check if browser persistence is enabled via env var
 * Works on Linux/Windows/macOS
 * @returns {boolean}
 */
function isBrowserPersistenceEnabled() {
  if (browserPersistenceEnabled === null) {
    const envVal = process.env.PAGEMD_KEEP_CHROME;
    browserPersistenceEnabled = envVal === '1' || envVal === 'true';
    if (browserPersistenceEnabled) {
      logger.info('browser_persist', 'enabled', 'Browser persistence enabled via PAGEMD_KEEP_CHROME');
    }
  }
  return browserPersistenceEnabled;
}

// Cleanup on process exit
process.on('exit', () => {
  if (cachedBrowser) {
    try {
      cachedBrowser.close();
    } catch (e) {
      // Ignore - process exiting anyway
    }
  }
});

// Handle SIGINT/SIGTERM for graceful shutdown
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    if (cachedBrowser) {
      await cachedBrowser.close().catch(() => {});
      cachedBrowser = null;
    }
    process.exit(0);
  });
});

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

  logger.debug('chrome_detection', 'none', 'No system Chrome found');
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

  // Return cached browser if persistence enabled and browser is still connected
  if (isBrowserPersistenceEnabled() && cachedBrowser) {
    try {
      if (cachedBrowser.connected) {
        logger.debug('browser_launch', 'reused', 'Reusing cached browser instance');
        return cachedBrowser;
      }
    } catch (e) {
      // Browser disconnected, will launch new one
      cachedBrowser = null;
    }
  }

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

  // 1. Try user-provided executable path
  if (userExecutablePath) {
    try {
      logger.info('browser_launch', 'start', `Launching browser with user-provided path: ${userExecutablePath}`);
      browser = await puppeteer.launch({
        ...baseConfig,
        executablePath: userExecutablePath
      });
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
        logger.info('browser_launch', 'start', `Attempting to launch system Chrome at ${chromePath}`);
        browser = await puppeteer.launch({
          ...baseConfig,
          executablePath: chromePath
        });
        logger.info('browser_launch', 'ok', `System Chrome launched successfully`);
      } catch (err) {
        logger.warn('browser_launch', 'fail', `Failed to launch system Chrome: ${err.message}`);
        browser = null;
      }
    }
  }

  // 3. No browser found - throw clear error (puppeteer-core has no bundled Chromium)
  if (!browser) {
    const errorMessage = `Chrome/Chromium not found.

PageMD requires Chrome or Chromium to generate PDFs.

Install Chrome: https://www.google.com/chrome/
Or set PAGEMD_BROWSER_PATH environment variable to your browser executable.

On Linux, you can also install Chromium:
  sudo apt install chromium-browser
  # or
  sudo snap install chromium`;

    logger.error('browser_launch', 'fail', 'No browser available');
    throw new Error(errorMessage);
  }

  // Log final browser info
  const version = await browser.version();
  logger.info('browser_ready', 'ok', `Browser ${version} ready (headless: ${baseConfig.headless})`);

  // Cache browser if persistence enabled
  if (isBrowserPersistenceEnabled()) {
    cachedBrowser = browser;
    logger.debug('browser_cache', 'stored', 'Browser cached for reuse');
  }

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

  // Skip closing if persistence enabled - browser will be reused
  if (isBrowserPersistenceEnabled() && browser === cachedBrowser) {
    logger.debug('browser_close', 'skip', 'Keeping browser alive (PAGEMD_KEEP_CHROME)');
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
