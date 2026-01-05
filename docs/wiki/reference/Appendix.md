# Appendix

> **Section:** Reference

Additional resources, examples, and edge case documentation.

## Built-in Profiles

| Profile | Page Size | Description |
|---------|-----------|-------------|
| `standard_letter` | US Letter | Default profile, standard margins |
| `standard_a4` | A4 | European standard format |
| `memo` | US Letter | Internal memo layout |
| `report` | US Letter | Report with title page |

## Built-in Templates

| Template | Description |
|----------|-------------|
| `standard` | Basic document structure |
| `report` | Document with separate title page |

## CSS Class Reference

### Callout Classes

| Class | Description |
|-------|-------------|
| `.callout-note` | Information callout |
| `.callout-warning` | Warning callout |
| `.callout-tip` | Tip/suggestion callout |
| `.callout-info` | Additional info callout |
| `.callout-caution` | Caution/safety callout |

### Page Classes

| Class | Description |
|-------|-------------|
| `.page-break` | Force page break |
| `.page-landscape` | Landscape orientation section |
| `.no-print` | Hide in print output |

## Token Reference

Tokens available in templates and CSS:

| Token | Source | Description |
|-------|--------|-------------|
| `${title}` | Frontmatter | Document title |
| `${author}` | Frontmatter | Author name |
| `${date}` | Frontmatter | Document date |
| `${content}` | Markdown | Rendered content |
| `${toc}` | Generated | Table of contents |
| `${profile}` | Profile | Profile ID |
| `${name}` | Filename | Document basename |

## Frontmatter Fields

### Standard Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Document title |
| `author` | string | Author name |
| `date` | string | Document date |
| `profile` | string | Profile ID to use |

### TOC Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `toc` | boolean | `false` | Enable TOC |
| `toc_levels` | string | `"2-6"` | Heading levels |
| `toc_title` | string | `"Table of Contents"` | TOC heading |
| `toc_page_numbers` | boolean | `true` | Show page numbers |
| `toc_page_levels` | string | `"2-3"` | Levels with page numbers |

### Index Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `index` | boolean | `false` | Enable index |
| `index_title` | string | `"Index"` | Index heading |

### Styling Fields

| Field | Type | Description |
|-------|------|-------------|
| `highlight_theme` | string | Syntax highlighting theme |
| `styles` | string[] | Additional CSS files |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments |
| `3` | File not found |
| `4` | Validation failed |
| `5` | Render error |

## File Locations

### User Resources

| Resource | Location |
|----------|----------|
| Config | `~/.pagemd/config.json` |
| Profiles | `~/.pagemd/profiles/` |
| Templates | `~/.pagemd/templates/` |
| Styles | `~/.pagemd/styles/` |

### Project Resources

| Resource | Location |
|----------|----------|
| Config | `.pagemd/config.json` |
| Profiles | `.pagemd/profiles/` |
| Templates | `.pagemd/templates/` |
| Styles | `.pagemd/styles/` |

## Known Limitations

### Paged.js Landscape Pages

Named page orientation (`@page landscape { size: Letter landscape }`) is not fully supported in browser preview. See [pagedjs#6](https://github.com/pagedjs/pagedjs/issues/6).

**Workaround:** Use separate builds for landscape content or PDF post-processing.

### Mermaid in Large Documents

Very large documents with many Mermaid diagrams may hit timeout limits.

**Workaround:** Increase timeout via `PAGEMD_TIMEOUT` or split into smaller documents.

## See Also

- [[reference/CLI|CLI Reference]] - Command documentation
- [[reference/Settings|Settings]] - Configuration options
- [[reference/Profile-Schema|Profile Schema]] - Profile fields
