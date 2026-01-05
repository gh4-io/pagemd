# @pagemd/core API

Core utilities for logging, configuration, path resolution, and profile management.

## Installation

```bash
npm install @pagemd/core
```

## Logger

### createLogger(module)

Create a logger instance for a module.

```javascript
import { createLogger } from '@pagemd/core';

const log = createLogger('parser');
log.info('section', 'success', 'Operation completed', { count: 5 });
```

**Parameters:**
- `module` (string): Module name (cli, profiles, layout, parser, validation, renderer.web, renderer.pdf, exporter, io, assets, logging)

**Returns:** Logger instance with methods: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

### setLogLevel(level)

Set the global log level.

```javascript
import { setLogLevel } from '@pagemd/core';

setLogLevel('WARN');  // Only WARN, ERROR, FATAL will log
```

**Levels:** TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF

### Log Format

```
<timestamp>;level=<LEVEL>;module=<module>;section=<section>;result=<result>;msg="<message>";data=<json>
```

Example:
```
2025-12-28T22:30:00.000Z;level=INFO;module=parser;section=frontmatter;result=success;msg="Extracted 5 fields";data={"fields":["title"]}
```

---

## Configuration

### loadProfileSync(profileName, searchFrom, configDir)

Load a profile manifest synchronously.

```javascript
import { loadProfileSync } from '@pagemd/core';

const profile = loadProfileSync('standard_letter', '/path/to/md', '/path/to/project');
```

**Parameters:**
- `profileName` (string): Profile ID to load
- `searchFrom` (string): Directory to start search
- `configDir` (string): Config directory for fallback

**Returns:** Profile object or `null` if not found

**Search Order:**
1. `{searchFrom}/.pagemd/profiles/{name}.json`
2. `{configDir}/profiles/{name}.json`
3. `{projectRoot}/.pagemd/profiles/{name}.json`
4. `{projectRoot}/templates/profiles/{name}.json`

### loadProjectConfig(cwd)

Load project-level config (async).

```javascript
import { loadProjectConfig } from '@pagemd/core';

const config = await loadProjectConfig('/path/to/project');
```

**Searches for:** `.pagemrc`, `.pagemrc.json`, `pagemd.config.js`, etc.

### clearConfigCache()

Clear all cached configurations.

```javascript
import { clearConfigCache } from '@pagemd/core';

clearConfigCache();
```

---

## Path Resolution

### createPathContext(options)

Create a context object for path resolution.

```javascript
import { createPathContext } from '@pagemd/core';

const context = createPathContext({
  markdownDir: '/path/to/md',
  projectRoot: '/path/to/project',
  configDir: '/path/to/config',
  manifestDir: '/path/to/manifest',
  workspaceFolder: '/path/to/workspace'
});
```

### resolvePath(pathString, context)

Resolve a path with token expansion.

```javascript
import { resolvePath } from '@pagemd/core';

const resolved = resolvePath('${projectRoot}/styles/primary.css', context);
// Returns: /path/to/project/styles/primary.css
```

**Supported Tokens:**
- `${projectRoot}` - Project root directory
- `${markdownDir}` - Markdown file directory
- `${manifestDir}` - Profile manifest directory
- `${workspaceFolder}` - VS Code workspace folder

### resolveResourcePath(relativePath, context)

Resolve a resource path using priority order.

```javascript
import { resolveResourcePath } from '@pagemd/core';

const path = resolveResourcePath('styles/custom.css', context);
```

**Priority Order:**
1. Markdown directory
2. Config directory
3. Project root

### findProjectRoot(startDir)

Find the project root by searching upward.

```javascript
import { findProjectRoot } from '@pagemd/core';

const root = findProjectRoot('/path/to/some/subdir');
```

**Looks for:** `package.json`, `.git`, `.pagemrc`

---

## Profile Loading

### loadAndMergeProfile(profileName, context)

Load a profile with inheritance resolution.

```javascript
import { loadAndMergeProfile } from '@pagemd/core';

const profile = await loadAndMergeProfile('my-profile', context);
```

**Inheritance Rules:**
- Single parent via `extends` property
- Objects: deep-merge
- Arrays: child replaces parent
- Circular references: throws error

### mergeProfiles(parent, child)

Merge two profile objects.

```javascript
import { mergeProfiles } from '@pagemd/core';

const merged = mergeProfiles(parentProfile, childProfile);
```

### validateProfile(profile, filename)

Validate profile structure.

```javascript
import { validateProfile } from '@pagemd/core';

validateProfile(profile, 'standard_letter');
// Throws if profile.id !== filename
```

### getDefaultProfile()

Get the default profile name.

```javascript
import { getDefaultProfile } from '@pagemd/core';

const defaultName = getDefaultProfile();  // 'standard_letter'
```
