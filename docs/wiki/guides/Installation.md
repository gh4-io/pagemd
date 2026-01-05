# Installation

> **Section:** Usage Guide

Detailed installation options for PageMD.

## Overview

PageMD can be installed globally, locally in a project, or run without installation via npx.

## Prerequisites

- **Node.js 20 or later** - Required for all installation methods
  - Check: `node --version` should show `v20.x.x` or higher
  - Download: [nodejs.org](https://nodejs.org/)

## Installation Methods

### Global Installation (Recommended)

**Why:** Makes `pagemd` command available everywhere on your system.

```bash
npm install -g pagemd
```

**What you'll see:**
```
added 150 packages in 10s
```

**Verify:**
```bash
pagemd --version
```

**Expected output:**
```
pagemd v2.0.0
```

### Local Project Installation

**Why:** Pin PageMD version per project, include in project dependencies.

```bash
npm install --save-dev pagemd
```

**Usage:** Run via npm scripts or npx:
```bash
npx pagemd build document.md -o pdf
```

**Add to package.json scripts:**
```json
{
  "scripts": {
    "build:docs": "pagemd build docs/*.md -o pdf -d dist/"
  }
}
```

Then run:
```bash
npm run build:docs
```

### Run Without Installing (npx)

**Why:** Try PageMD without installing, or use in CI/CD without global install.

```bash
npx pagemd build document.md -o pdf
```

**First run:** Downloads PageMD temporarily (may take a moment).
**Subsequent runs:** Uses cached version.

## Browser for PDF Rendering

PageMD needs a Chromium-based browser for PDF generation.

### Automatic Detection

PageMD automatically finds Chrome/Chromium in standard locations:
- Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Linux: `/usr/bin/google-chrome` or `/usr/bin/chromium-browser`

### Manual Browser Path

If Chrome isn't auto-detected, set the `CHROME_PATH` environment variable:

**Windows (PowerShell):**
```powershell
$env:CHROME_PATH = "C:\Path\To\chrome.exe"
pagemd build document.md -o pdf
```

**macOS/Linux:**
```bash
export CHROME_PATH="/path/to/chrome"
pagemd build document.md -o pdf
```

### Bundled Chromium Fallback

If no system browser is found, PageMD falls back to Puppeteer's bundled Chromium. This works but:
- First PDF build downloads ~200MB Chromium
- Bundled version may be older than system Chrome

## Verify Installation

Run these commands to confirm everything works:

### 1. Check PageMD Version
```bash
pagemd --version
```
**Expected:** `pagemd v2.0.0` (or current version)

### 2. Check Available Profiles
```bash
pagemd list profiles
```
**Expected:** List of built-in profiles

### 3. Test PDF Generation
```bash
echo "# Test" > test.md
pagemd build test.md -o pdf
```
**Expected:** Creates `test.pdf`

**If PDF generation fails:** See [[Troubleshooting#chrome-not-found|Chrome Not Found]].

## Updating PageMD

### Global Installation
```bash
npm update -g pagemd
```

### Local Installation
```bash
npm update pagemd
```

## Uninstalling

### Global
```bash
npm uninstall -g pagemd
```

### Local
```bash
npm uninstall pagemd
```

## Troubleshooting

### `command not found: pagemd`

**Why:** Global install didn't add to PATH.

**Fix options:**
1. Close and reopen terminal
2. Use `npx pagemd` instead
3. Check npm global bin path: `npm config get prefix`

### Permission errors on install

**Why:** npm trying to write to protected directory.

**Fix:** Don't use `sudo`. Instead, fix npm permissions:
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

See [[Troubleshooting]] for more solutions.

## See Also

- [[Quick-Start]] - Build your first PDF
- [[guides/Basic-Usage|Basic Usage]] - Common workflows
- [[reference/Settings|Settings]] - Environment variables
