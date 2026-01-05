/**
 * Tests for @pagemd/renderer-pdf/browser
 * Chrome detection and browser lifecycle with Puppeteer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectChrome, launchBrowser, closeBrowser } from '../src/browser.js';

// Mock dependencies
vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn()
}));

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn()
  }
}));

vi.mock('@pagemd/core', () => ({
  createLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('detectChrome', () => {
  let originalPlatform;
  let originalEnv;

  beforeEach(() => {
    originalPlatform = process.platform;
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true
    });
    process.env = originalEnv;
  });

  it('should detect Chrome on Windows', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true
    });

    existsSync.mockImplementation((path) => {
      return path === 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    });

    const result = detectChrome();
    expect(result).toBe('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  });

  it('should detect Chrome on macOS', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });

    process.env.HOME = '/Users/test';

    existsSync.mockImplementation((path) => {
      return path === '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    });

    const result = detectChrome();
    expect(result).toBe('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  });

  it('should detect Chrome on Linux using static paths', async () => {
    const { existsSync } = await import('node:fs');
    const { execSync } = await import('node:child_process');

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });

    execSync.mockImplementation(() => {
      throw new Error('which command failed');
    });

    existsSync.mockImplementation((path) => {
      return path === '/usr/bin/google-chrome';
    });

    const result = detectChrome();
    expect(result).toBe('/usr/bin/google-chrome');
  });

  it('should detect Chrome on Linux using which command', async () => {
    const { existsSync } = await import('node:fs');
    const { execSync } = await import('node:child_process');

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });

    execSync.mockReturnValue('/usr/local/bin/google-chrome\n');
    existsSync.mockReturnValue(true);

    const result = detectChrome();
    expect(result).toBe('/usr/local/bin/google-chrome');
  });

  it('should return null when Chrome is not found', async () => {
    const { existsSync } = await import('node:fs');
    const { execSync } = await import('node:child_process');

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });

    execSync.mockImplementation(() => {
      throw new Error('which command failed');
    });
    existsSync.mockReturnValue(false);

    const result = detectChrome();
    expect(result).toBe(null);
  });

  it('should check all Windows paths in order', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true
    });

    process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local';

    const checkedPaths = [];
    existsSync.mockImplementation((path) => {
      checkedPaths.push(path);
      return path === `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`;
    });

    const result = detectChrome();
    expect(result).toBe(`${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`);
    expect(checkedPaths.length).toBeGreaterThan(0);
    expect(checkedPaths).toContain('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  });

  it('should check multiple Linux browser variants', async () => {
    const { existsSync } = await import('node:fs');
    const { execSync } = await import('node:child_process');

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });

    execSync.mockImplementation(() => {
      throw new Error('which command failed');
    });

    const checkedPaths = [];
    existsSync.mockImplementation((path) => {
      checkedPaths.push(path);
      return path === '/usr/bin/chromium';
    });

    const result = detectChrome();
    expect(result).toBe('/usr/bin/chromium');
    expect(checkedPaths).toContain('/usr/bin/google-chrome');
    expect(checkedPaths).toContain('/usr/bin/chromium');
  });
});

describe('launchBrowser', () => {
  let mockBrowser;
  let puppeteer;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockBrowser = {
      version: vi.fn().mockResolvedValue('Chrome/120.0.0'),
      close: vi.fn().mockResolvedValue(undefined)
    };

    puppeteer = await import('puppeteer');
  });

  it('should launch with user-provided executable path', async () => {
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    const browser = await launchBrowser({
      executablePath: '/custom/path/to/chrome'
    });

    expect(browser).toBe(mockBrowser);
    expect(puppeteer.default.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        executablePath: '/custom/path/to/chrome',
        headless: true
      })
    );
  });

  it('should launch with system Chrome when detected', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });

    existsSync.mockReturnValue(true);
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    const browser = await launchBrowser();

    expect(browser).toBe(mockBrowser);
    expect(puppeteer.default.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        executablePath: expect.stringContaining('Google Chrome')
      })
    );
  });

  it('should fallback to bundled Chromium when Chrome fails', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });

    existsSync.mockReturnValue(true);

    // First call (system Chrome) fails, second call (Chromium) succeeds
    puppeteer.default.launch
      .mockRejectedValueOnce(new Error('Chrome launch failed'))
      .mockResolvedValueOnce(mockBrowser);

    const browser = await launchBrowser();

    expect(browser).toBe(mockBrowser);
    expect(puppeteer.default.launch).toHaveBeenCalledTimes(2);

    // Second call should not have executablePath
    const secondCall = puppeteer.default.launch.mock.calls[1][0];
    expect(secondCall.executablePath).toBeUndefined();
  });

  it('should fallback to bundled Chromium when no system Chrome found', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });

    existsSync.mockReturnValue(false);
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    const browser = await launchBrowser();

    expect(browser).toBe(mockBrowser);
    expect(puppeteer.default.launch).toHaveBeenCalledTimes(1);

    const call = puppeteer.default.launch.mock.calls[0][0];
    expect(call.executablePath).toBeUndefined();
  });

  it('should throw error when all launch attempts fail', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true
    });

    existsSync.mockReturnValue(false);
    puppeteer.default.launch.mockRejectedValue(new Error('Launch failed'));

    await expect(launchBrowser()).rejects.toThrow('Failed to launch browser');
  });

  it('should pass custom args to browser', async () => {
    const { existsSync } = await import('node:fs');

    existsSync.mockReturnValue(false);
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    await launchBrowser({
      args: ['--disable-gpu', '--window-size=1920,1080']
    });

    expect(puppeteer.default.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--window-size=1920,1080'
        ])
      })
    );
  });

  it('should disable headless when debug is true', async () => {
    const { existsSync } = await import('node:fs');

    existsSync.mockReturnValue(false);
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    await launchBrowser({ debug: true });

    expect(puppeteer.default.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false
      })
    );
  });

  it('should respect headless option when debug is false', async () => {
    const { existsSync } = await import('node:fs');

    existsSync.mockReturnValue(false);
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    await launchBrowser({ headless: false, debug: false });

    expect(puppeteer.default.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false
      })
    );
  });

  it('should include security and sandbox args', async () => {
    const { existsSync } = await import('node:fs');

    existsSync.mockReturnValue(false);
    puppeteer.default.launch.mockResolvedValue(mockBrowser);

    await launchBrowser();

    expect(puppeteer.default.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ])
      })
    );
  });

  it('should retry with user path on failure before trying system Chrome', async () => {
    const { existsSync } = await import('node:fs');

    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    });

    // Mock existsSync to return true only for macOS Chrome path
    existsSync.mockImplementation((path) => {
      return path === '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    });

    // User path fails, system Chrome succeeds
    puppeteer.default.launch
      .mockRejectedValueOnce(new Error('User path failed'))
      .mockResolvedValueOnce(mockBrowser);

    const browser = await launchBrowser({
      executablePath: '/bad/path'
    });

    expect(browser).toBe(mockBrowser);
    expect(puppeteer.default.launch).toHaveBeenCalledTimes(2);

    // First call with user path
    expect(puppeteer.default.launch.mock.calls[0][0].executablePath).toBe('/bad/path');

    // Second call with system Chrome
    expect(puppeteer.default.launch.mock.calls[1][0].executablePath).toContain('Google Chrome');
  });
});

describe('closeBrowser', () => {
  let mockBrowser;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowser = {
      close: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('should close browser successfully', async () => {
    await closeBrowser(mockBrowser);
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  it('should handle null browser gracefully', async () => {
    await expect(closeBrowser(null)).resolves.toBeUndefined();
  });

  it('should handle undefined browser gracefully', async () => {
    await expect(closeBrowser(undefined)).resolves.toBeUndefined();
  });

  it('should not throw when browser.close() fails', async () => {
    mockBrowser.close.mockRejectedValue(new Error('Close failed'));
    await expect(closeBrowser(mockBrowser)).resolves.toBeUndefined();
  });

  it('should call close even if browser is in bad state', async () => {
    mockBrowser.close.mockRejectedValue(new Error('Browser already closed'));
    await closeBrowser(mockBrowser);
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });
});
