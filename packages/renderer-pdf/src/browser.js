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
let browserIsHeadless = true;

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
  // Note: debug flag no longer forces non-headless mode
  // Use PAGEMD_HEADLESS=0 or headless:false to show browser for inspection
  const baseConfig = {
    headless,
    args: baseArgs
  };

  // Track headless state for closeBrowser behavior
  browserIsHeadless = baseConfig.headless;

  let browser = null;

  // Environment variable path (from extension settings or shell)
  const envBrowserPath = process.env.PAGEMD_BROWSER_PATH;

  // Detect if running in WSL with Windows browser path
  // WSL paths to Windows start with /mnt/c (or other drive letters)
  const isWSLWindowsBrowser = (path) => {
    return process.platform === 'linux' && path && path.startsWith('/mnt/');
  };

  // 1. Try environment variable path (highest priority - from extension or env)
  if (envBrowserPath && !userExecutablePath) {
    // Block WSL + Windows browser combination with helpful error
    if (isWSLWindowsBrowser(envBrowserPath)) {
      logger.error('browser_launch', 'fail', 'WSL cannot reliably control Windows Chrome - use Linux Chromium instead');
      const wslError = new Error(`WSL + Windows Chrome Incompatibility

PageMD is running in WSL but PAGEMD_BROWSER_PATH points to Windows Chrome.
Due to WSL/Windows network isolation, this configuration is not supported.

Solutions:
1. Install Chromium in WSL (recommended):
   sudo apt update && sudo apt install chromium-browser

2. Run PageMD from Windows PowerShell instead of WSL:
   cd "C:\\Users\\Jason\\Documents\\Git\\pagemd-workspace\\project\\pagemd"
   node apps/cli/src/index.js build <file.md> -o pdf

3. Use VS Code extension from Windows (not WSL Remote):
   Open workspace in Windows VS Code, not via WSL Remote

Current browser path: ${envBrowserPath}`);
      throw wslError;
    }

    try {
      logger.info('browser_launch', 'start', `Launching browser from PAGEMD_BROWSER_PATH: ${envBrowserPath}`);
      browser = await puppeteer.launch({
        ...baseConfig,
        executablePath: envBrowserPath
      });
      logger.info('browser_launch', 'ok', 'Browser launched successfully from environment variable');
    } catch (err) {
      logger.warn('browser_launch', 'fail', `Failed with PAGEMD_BROWSER_PATH: ${err.message}`);
      browser = null;
    }
  }

  // 2. Try user-provided executable path (programmatic override)
  if (!browser && userExecutablePath) {
    // Block WSL + Windows browser combination with helpful error
    if (isWSLWindowsBrowser(userExecutablePath)) {
      logger.error('browser_launch', 'fail', 'WSL cannot reliably control Windows Chrome - use Linux Chromium instead');
      const wslError = new Error(`WSL + Windows Chrome Incompatibility

PageMD is running in WSL but the provided browser path points to Windows Chrome.
Due to WSL/Windows network isolation, this configuration is not supported.

Solutions:
1. Install Chromium in WSL (recommended):
   sudo apt update && sudo apt install chromium-browser

2. Run PageMD from Windows PowerShell instead of WSL:
   cd "C:\\Users\\Jason\\Documents\\Git\\pagemd-workspace\\project\\pagemd"
   node apps/cli/src/index.js build <file.md> -o pdf

Current browser path: ${userExecutablePath}`);
      throw wslError;
    }

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

  // 3. Try system Chrome auto-detection
  if (!browser) {
    const chromePath = detectChrome();
    if (chromePath) {
      // Block WSL + Windows browser combination (shouldn't happen with auto-detect, but safety check)
      if (isWSLWindowsBrowser(chromePath)) {
        logger.error('browser_launch', 'fail', 'Auto-detected Windows Chrome from WSL - not supported');
        browser = null;
      } else {
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
    } else {
      logger.debug('chrome_detection', 'none', 'No system Chrome found');
    }
  }

  // 4. No browser found - throw clear error (puppeteer-core has no bundled Chromium)
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

  // Non-headless mode: disconnect (don't close) so browser stays open for inspection
  // browser.disconnect() releases the connection, allowing Node to exit while browser runs
  if (!browserIsHeadless) {
    logger.info('browser_close', 'skip', 'Browser left open for inspection (non-headless mode)');
    // eslint-disable-next-line no-console
    console.log('\n📋 Browser left open for inspection. Close it manually when done.\n');
    await browser.disconnect();
    // Schedule graceful exit - allows pending I/O to flush before exit
    // This is needed because puppeteer-core's disconnect doesn't fully release Node
    setImmediate(() => process.exit(0));
    return;
  }

  // Get browser process reference before any close attempts
  let browserProcess = null;
  try {
    browserProcess = browser.process();
  } catch (e) {
    // Process not accessible
  }

  logger.debug('browser_close', 'start', 'Closing browser');

  // Step 1: Disconnect first to release WebSocket connection
  // This is the most important step - it allows Node to exit
  try {
    await browser.disconnect();
    logger.debug('browser_close', 'disconnected', 'Browser disconnected');
  } catch (e) {
    // Already disconnected
  }

  // Step 2: Kill browser process to clean up
  if (browserProcess) {
    try {
      browserProcess.kill('SIGKILL');
      logger.debug('browser_close', 'killed', 'Browser process killed');
    } catch (e) {
      // Process already exited or not accessible
    }
  }

  logger.debug('browser_close', 'ok', 'Browser cleanup complete');
}
