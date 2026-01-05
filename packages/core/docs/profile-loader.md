# Profile Loader

Profile loading and inheritance engine for PageMD profiles.

## Overview

The profile-loader module handles:
- Loading profile manifests from disk
- Resolving inheritance chains via `extends` property
- Deep-merging parent and child profiles
- Validating profile structure
- Detecting circular inheritance

## API

### `loadAndMergeProfile(profileName, context)`

Load a profile and resolve its full inheritance chain.

**Parameters:**
- `profileName` (string) - Name of profile to load
- `context` (object) - Loading context
  - `searchFrom` (string, optional) - Directory to start search from
  - `configDir` (string, optional) - Explicit config directory

**Returns:** `Promise<object>` - Fully merged profile object

**Throws:**
- Error if profile not found
- Error if circular inheritance detected
- Error if validation fails

**Example:**
```javascript
import { loadAndMergeProfile } from '@pagemd/core';

const profile = await loadAndMergeProfile('standard_letter', {
  searchFrom: '/path/to/markdown/dir',
  configDir: '/path/to/config'
});
```

### `mergeProfiles(parent, child)`

Deep-merge two profile objects.

**Merge Rules:**
- **Objects:** Deep-merge recursively (nested properties merged)
- **Arrays:** Child replaces parent entirely (no merging)
- **Primitives:** Child value wins

**Parameters:**
- `parent` (object) - Parent profile
- `child` (object) - Child profile

**Returns:** `object` - Merged profile

**Example:**
```javascript
import { mergeProfiles } from '@pagemd/core';

const parent = {
  id: 'parent',
  outputs: { pdf: { enabled: true }, html: { enabled: false } },
  resources: { css: ['base.css'] }
};

const child = {
  id: 'child',
  outputs: { pdf: { mode: 'ALWAYS' } },
  resources: { css: ['custom.css'] }
};

const merged = mergeProfiles(parent, child);
// Result: {
//   id: 'child',
//   outputs: { pdf: { enabled: true, mode: 'ALWAYS' }, html: { enabled: false } },
//   resources: { css: ['custom.css'] }  // Array replaced
// }
```

### `validateProfile(profile, filename)`

Validate profile structure and ID.

**Validation Rules:**
1. Profile must have `id` field
2. Profile `id` must match filename exactly

**Parameters:**
- `profile` (object) - Profile to validate
- `filename` (string) - Expected filename (without extension)

**Throws:** Error if validation fails

**Example:**
```javascript
import { validateProfile } from '@pagemd/core';

validateProfile({ id: 'standard_letter' }, 'standard_letter'); // OK
validateProfile({ id: 'wrong' }, 'standard_letter'); // Throws
validateProfile({ name: 'test' }, 'test'); // Throws (missing id)
```

### `detectCircularInheritance(profileName, chain, loadFn)`

Detect circular references in inheritance chain.

**Parameters:**
- `profileName` (string) - Profile to check
- `chain` (string[]) - Current inheritance chain
- `loadFn` (Function) - Function to load a profile by name

**Throws:** Error if circular reference detected

**Example:**
```javascript
import { detectCircularInheritance } from '@pagemd/core';

const profiles = {
  a: { id: 'a', extends: 'b' },
  b: { id: 'b', extends: 'a' }  // Circular!
};

detectCircularInheritance('a', [], (name) => profiles[name]);
// Throws: Circular inheritance detected: a -> b -> a
```

### `getDefaultProfile()`

Get the default profile name.

**Returns:** `string` - Default profile name (`'standard_letter'`)

**Example:**
```javascript
import { getDefaultProfile } from '@pagemd/core';

const defaultProfile = getDefaultProfile(); // 'standard_letter'
```

## Inheritance Behavior

### Single Parent Inheritance

Profiles support single-parent inheritance via the `extends` property:

```json
{
  "id": "company_letter",
  "extends": "standard_letter",
  "resources": {
    "css": ["company.css"]
  }
}
```

### Multi-Level Chains

Inheritance chains can be arbitrarily deep:

```
base -> standard_letter -> company_letter -> department_letter
```

Each level is merged in order, with child values taking precedence.

### Deep Merge Example

```javascript
// Parent
{
  layout: {
    page: { width: '8.5in', height: '11in' },
    margins: { top: '1in', bottom: '1in' }
  }
}

// Child
{
  layout: {
    margins: { top: '2in' }
  }
}

// Result
{
  layout: {
    page: { width: '8.5in', height: '11in' },      // Preserved
    margins: { top: '2in', bottom: '1in' }         // top overridden, bottom preserved
  }
}
```

### Array Replacement Example

```javascript
// Parent
{
  resources: {
    css: ['base.css', 'parent.css']
  }
}

// Child
{
  resources: {
    css: ['custom.css']
  }
}

// Result
{
  resources: {
    css: ['custom.css']  // Parent array completely replaced
  }
}
```

## Error Handling

The module throws errors for:

1. **Missing profile:** Profile file not found in any search path
2. **Circular inheritance:** Profile chain forms a cycle
3. **ID mismatch:** Profile `id` doesn't match filename
4. **Missing ID:** Profile lacks required `id` field
5. **Missing parent:** Parent profile referenced but not found

All errors include detailed context for debugging.

## Logging

The module logs to the `profiles` module namespace:

- **TRACE:** Merge operations, validation checks
- **DEBUG:** Successful operations, inheritance resolution
- **INFO:** Profile loading, completion
- **ERROR:** Validation failures, circular references, missing profiles

Set log level via `setLogLevel()` from `@pagemd/core/logger`.

## Testing

Run unit tests:
```bash
node --test project/packages/core/test/profile-loader.test.js
```

Run example:
```bash
node project/packages/core/examples/profile-inheritance-example.js
```

## See Also

- [config.js](./config.md) - Profile file loading
- [path-resolver.js](./path-resolver.md) - Path resolution
- [logger.js](./logger.md) - Logging system
