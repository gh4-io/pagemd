# Installation

PageMD is a Node.js-based pipeline for converting Markdown to HTML, PDF, PNG, and JPEG. This guide covers installing and verifying the system.

## Contents

- [System Requirements](#system-requirements)
- [Package Installation](#package-installation)
- [Browser Setup](#browser-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [See Also](#see-also)

## System Requirements

### Node.js

**Required:** Node.js 20 or higher

Check your Node version:

```bash
node --version
```

If you need to install or upgrade Node:
- **Windows/macOS:** Download from [nodejs.org](https://nodejs.org/)
- **Linux:** Use your package manager or [nvm](https://github.com/nvm-sh/nvm)

### Browser (for PDF rendering)

PageMD uses Puppeteer to render PDFs. Browser options:

1. **System Chrome (recommended):** Faster, better compatibility
2. **Bundled Chromium (fallback):** Downloaded automatically by Puppeteer if Chrome not found

**Check if Chrome is available:**

```bash
# Windows
where chrome

# macOS
which google-chrome-stable

# Linux
which google-chrome || which chromium-browser
```

## Package Installation

### Clone Repository

```bash
git clone https://github.com/gh4-io/PageMD.git
cd PageMD
```

### Install Dependencies

```bash
cd project
npm install
```

This installs:
- Core PageMD packages (`@pagemd/parser`, `@pagemd/renderer-web`, etc.)
- Puppeteer 23.11.1 (includes Chromium fallback)
- Paged.js CLI tools
- Development dependencies (Vitest, etc.)

### Workspace Structure

After installation, verify the workspace:

```bash
ls -la packages/
```

You should see:
- `parser/` - Markdown parsing
- `renderer-web/` - HTML rendering
- `renderer-pdf/` - PDF rendering (Paged.js + Puppeteer)
- `exporters/` - Output packaging
- `theme-kit/` - Shared styles

## Browser Setup

### System Chrome (Preferred)

PageMD prefers system Chrome for better performance and compatibility.

**Windows:**
- Install [Google Chrome](https://www.google.com/chrome/)
- Default path: `C:\Program Files\Google\Chrome\Application\chrome.exe`

**macOS:**
- Install [Google Chrome](https://www.google.com/chrome/)
- Default path: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

**Linux:**
- Install via package manager:
  ```bash
  # Debian/Ubuntu
  sudo apt install google-chrome-stable

  # Fedora
  sudo dnf install google-chrome-stable
  ```

### Chromium Fallback

If Chrome is not available, Puppeteer downloads bundled Chromium during `npm install`. This is automatic and requires no configuration.

**Note:** Bundled Chromium is ~170MB and downloads to `node_modules/puppeteer/.local-chromium/`

## Verification

### Test Dependencies

```bash
npm test
```

Expected output:
- All core tests pass
- Parser tests verify Markdown and frontmatter parsing
- Renderer tests verify HTML assembly
- Template tests verify profile loading

### Check Profiles

```bash
# Future CLI command (planned)
npx pagemd list-profiles
```

Expected profiles:
- `standard_letter` (default)
- Additional profiles in `templates/profiles/`

### Smoke Test

```bash
# From repository root
pwsh scripts/smoke_test.ps1
```

This verifies:
- Package installation
- Profile loading
- Basic rendering pipeline

## Troubleshooting

### Chrome/Chromium Not Found

**Error:** `Error: Could not find Chrome or Chromium`

**Solution:**
1. Install Chrome (see [Browser Setup](#browser-setup))
2. Or allow Puppeteer to download Chromium:
   ```bash
   cd project
   npm install --force
   ```

### Node Version Mismatch

**Error:** `The engine "node" is incompatible with this module`

**Solution:**
1. Upgrade Node to version 20+
2. Verify: `node --version`

### Permission Errors

**Error:** `EACCES: permission denied`

**Solution (Linux/macOS):**
```bash
sudo chown -R $(whoami) ~/.npm
```

### Missing Dependencies

**Error:** `Cannot find module '@pagemd/parser'`

**Solution:**
```bash
cd project
rm -rf node_modules package-lock.json
npm install
```

## See Also

- [[Quick-Start]] - Basic usage and examples
- [[Developer-Guide]] - Contributing and development setup
- [[Troubleshooting]] - Detailed error resolution
- [[Architecture]] - System components and data flow
