/**
 * @file Annotated Image Plugin for markdown-it
 * @description Renders images with numbered overlay markers, SVG shapes
 * (arrows, boxes), text overlays, and a merged legend.
 *
 * Syntax:
 * ```markdown
 * ::: annotated-image ./assets/image.png
 * options:
 *   caption: "Figure Caption"
 *   markerColor: "#cc0000"
 *   legendColumns: 3
 *   id: "optional-id"
 * markers:
 *   - { id: 1, x: 10, y: 20, label: "Button" }
 * arrows:
 *   - { id: 2, x1: 60, y1: 60, x2: 40, y2: 40, label: "Save", color: "#0a7d00", strokeWidth: 2 }
 * boxes:
 *   - { id: 3, x: 5, y: 50, width: 30, height: 20, label: "Task list", color: "#0066cc", fill: "none" }
 * text:
 *   - { x: 55, y: 80, text: "Click here", fontSize: 14, color: "#fff", background: "#333" }
 * :::
 * ```
 *
 * Alternative syntax (markers array at root):
 * ```markdown
 * ::: annotated-image ./assets/image.png
 * - { id: 1, x: 10, y: 20, label: "Button" }
 * :::
 * ```
 *
 * Coordinate system: every x/y/width/height is a percentage (0-100) of the
 * rendered image. Arrows and boxes are drawn in an SVG layer with
 * `viewBox="0 0 100 100" preserveAspectRatio="none"` so the percentages map
 * directly onto the image regardless of its aspect ratio; strokes use
 * `vector-effect="non-scaling-stroke"` so lines are not distorted by the
 * non-uniform scaling. Text overlays are HTML elements (like markers), not
 * SVG `<text>`, because glyphs inside a non-uniformly scaled SVG would be
 * stretched.
 */

import yaml from 'js-yaml';

// Match opening fence: ::: annotated-image path
const OPEN_REGEX = /^:::[ ]*annotated-image[ ]+(.+)$/;
// Match closing fence: :::
const CLOSE_REGEX = /^:::[ ]*$/;

/** Default visual values for shapes and options */
const DEFAULTS = Object.freeze({
  markerColor: '#cc0000',
  arrowColor: '#cc0000',
  boxColor: '#0066cc',
  boxFill: 'none',
  textColor: '#000000',
  strokeWidth: 2,
  fontSize: 14,
  legendColumns: 3,
  // Offset (in % of image) of a box's legend badge from its top-left corner
  boxBadgeInset: 3
});

/** Upper bounds for numeric inputs (prevents absurd values) */
const LIMITS = Object.freeze({
  strokeWidth: 20,
  fontSize: 96,
  legendColumns: 12
});

/**
 * Clamp a numeric value to a range
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Clamp a percentage coordinate to 0-100
 * @param {number} value - Coordinate
 * @returns {number} Clamped coordinate
 */
function pct(value) {
  return clamp(value, 0, 100);
}

/**
 * Coerce a user-supplied value to a positive finite number.
 * Non-numbers (including strings) fall back to the default, which prevents
 * attribute injection via numeric fields such as `strokeWidth`.
 * @param {*} value - Raw value from YAML
 * @param {number} fallback - Default when value is invalid
 * @param {number} max - Upper bound
 * @returns {number} Safe number
 */
function toPositiveNumber(value, fallback, max) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(value, max)
    : fallback;
}

/**
 * Return value if it is an array, otherwise an empty array
 * (guards against `arrows: "foo"` or `boxes: { ... }` in YAML)
 * @param {*} value - Raw value
 * @returns {Array} Array
 */
function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Parse YAML content from container
 * @param {string} content - YAML content between ::: markers
 * @returns {object} Parsed data with options, markers, arrows, boxes, and text
 */
function parseYamlContent(content) {
  const empty = { options: {}, markers: [], arrows: [], boxes: [], text: [] };
  try {
    const data = yaml.load(content.trim());

    if (!data || typeof data !== 'object') {
      return empty;
    }

    // Handle array at root level (legacy format - treated as markers)
    if (Array.isArray(data)) {
      return { ...empty, markers: data };
    }

    // Handle object with options and shape arrays
    return {
      options: data.options && typeof data.options === 'object' ? data.options : {},
      markers: toArray(data.markers),
      arrows: toArray(data.arrows),
      boxes: toArray(data.boxes),
      text: toArray(data.text)
    };
  } catch (err) {
    // Return empty structure on parse error
    return empty;
  }
}

/**
 * Check that every listed key on obj is a finite number
 * @param {object} obj - Object to check
 * @param {string[]} keys - Keys that must be numbers
 * @returns {boolean} True if all keys are numbers
 */
function hasNumbers(obj, keys) {
  return !!obj && typeof obj === 'object' &&
    keys.every(k => typeof obj[k] === 'number' && Number.isFinite(obj[k]));
}

/**
 * Validate marker object
 * @param {object} marker - Marker object
 * @returns {boolean} True if valid
 */
function isValidMarker(marker) {
  return hasNumbers(marker, ['x', 'y']) &&
    typeof marker.id !== 'undefined' &&
    typeof marker.label === 'string';
}

/**
 * Validate arrow object
 * @param {object} arrow - Arrow object
 * @returns {boolean} True if valid
 */
function isValidArrow(arrow) {
  return hasNumbers(arrow, ['x1', 'y1', 'x2', 'y2']);
}

/**
 * Validate box object
 * @param {object} box - Box object
 * @returns {boolean} True if valid
 */
function isValidBox(box) {
  return hasNumbers(box, ['x', 'y', 'width', 'height']);
}

/**
 * Validate text object
 * @param {object} text - Text object
 * @returns {boolean} True if valid
 */
function isValidText(text) {
  return hasNumbers(text, ['x', 'y']) && typeof text.text === 'string';
}

/**
 * Escape a value for use in HTML text content or a double-quoted attribute
 * @param {*} str - Value to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (str === null || typeof str === 'undefined') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resolve a user-supplied colour (or other single CSS value).
 * Empty/non-string values and values that could terminate a CSS declaration
 * (`;`, `{`, `}`) fall back to the default. The result is NOT HTML-escaped -
 * callers must still pass it through escapeHtml() (or use cssValue()).
 * @param {*} value - Raw value
 * @param {string} fallback - Default value
 * @returns {string} Unescaped, declaration-safe value
 */
function safeColor(value, fallback) {
  const raw = (typeof value === 'string' || typeof value === 'number') ? String(value).trim() : '';
  return raw && !/[;{}]/.test(raw) ? raw : fallback;
}

/**
 * Prepare a user-supplied value for a CSS declaration inside `style="..."`
 * @param {*} value - Raw value
 * @param {string} fallback - Default value
 * @returns {string} Escaped, declaration-safe value
 */
function cssValue(value, fallback) {
  return escapeHtml(safeColor(value, fallback));
}

/**
 * Compare legend IDs: numeric IDs numerically, otherwise lexically
 * @param {{id: *}} a - First item
 * @param {{id: *}} b - Second item
 * @returns {number} Sort order
 */
function compareIds(a, b) {
  const aNum = parseInt(a.id, 10);
  const bNum = parseInt(b.id, 10);
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return aNum - bNum;
  }
  return String(a.id).localeCompare(String(b.id));
}

/**
 * Normalize a valid arrow: clamp coordinates, resolve defaults, and compute
 * the legend badge position (midpoint of the line).
 * @param {object} a - Raw arrow
 * @returns {object} Normalized arrow
 */
function normalizeArrow(a) {
  const x1 = pct(a.x1), y1 = pct(a.y1), x2 = pct(a.x2), y2 = pct(a.y2);
  return {
    type: 'arrow',
    id: a.id,
    label: a.label,
    x1, y1, x2, y2,
    color: safeColor(a.color, DEFAULTS.arrowColor),
    strokeWidth: toPositiveNumber(a.strokeWidth, DEFAULTS.strokeWidth, LIMITS.strokeWidth),
    badgeX: (x1 + x2) / 2,
    badgeY: (y1 + y2) / 2
  };
}

/**
 * Normalize a valid box: clamp position and size so the box stays inside the
 * image, resolve defaults, and compute the legend badge position (inset from
 * the top-left corner, but never past the box centre for small boxes).
 * @param {object} b - Raw box
 * @returns {object} Normalized box
 */
function normalizeBox(b) {
  const x = pct(b.x);
  const y = pct(b.y);
  const width = clamp(b.width, 0, 100 - x);
  const height = clamp(b.height, 0, 100 - y);
  return {
    type: 'box',
    id: b.id,
    label: b.label,
    x, y, width, height,
    color: safeColor(b.color, DEFAULTS.boxColor),
    fill: safeColor(b.fill, DEFAULTS.boxFill),
    strokeWidth: toPositiveNumber(b.strokeWidth, DEFAULTS.strokeWidth, LIMITS.strokeWidth),
    badgeX: x + Math.min(DEFAULTS.boxBadgeInset, width / 2),
    badgeY: y + Math.min(DEFAULTS.boxBadgeInset, height / 2)
  };
}

/**
 * Normalize a valid text overlay
 * @param {object} t - Raw text
 * @returns {object} Normalized text
 */
function normalizeText(t) {
  return {
    x: pct(t.x),
    y: pct(t.y),
    text: t.text,
    fontSize: toPositiveNumber(t.fontSize, DEFAULTS.fontSize, LIMITS.fontSize),
    color: t.color,
    background: t.background
  };
}

/** True when a shape should appear in the legend (has id and label) */
function hasLegendEntry(item) {
  return typeof item.id !== 'undefined' && item.id !== null && !!item.label;
}

/**
 * Build one arrowhead <marker> per distinct arrow colour so each head matches
 * its line. The first colour uses `arrowhead-{blockId}`; later colours append
 * an index (`arrowhead-{blockId}-2`, ...).
 * @param {Array} arrows - Normalized arrows
 * @param {string} blockId - Unique block identifier
 * @returns {{defs: string, markerIdFor: Map<string, string>}} Defs markup and colour→id map
 */
function generateArrowheadDefs(arrows, blockId) {
  const markerIdFor = new Map();
  const parts = [];
  for (const { color } of arrows) {
    if (markerIdFor.has(color)) continue;
    const id = markerIdFor.size === 0
      ? `arrowhead-${blockId}`
      : `arrowhead-${blockId}-${markerIdFor.size + 1}`;
    markerIdFor.set(color, id);
    parts.push(
      `        <marker id="${id}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">\n` +
      `          <polygon points="0 0, 10 3, 0 6" fill="${escapeHtml(color)}" />\n` +
      `        </marker>\n`
    );
  }
  const defs = parts.length ? `      <defs>\n${parts.join('')}      </defs>\n` : '';
  return { defs, markerIdFor };
}

/**
 * Generate SVG arrow elements
 * @param {Array} arrows - Normalized arrows
 * @param {Map<string, string>} markerIdFor - Colour → arrowhead marker id
 * @returns {string} SVG line elements
 */
function generateArrowsSvg(arrows, markerIdFor) {
  return arrows.map(a =>
    `    <line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}" stroke="${escapeHtml(a.color)}" ` +
    `stroke-width="${a.strokeWidth}" marker-end="url(#${markerIdFor.get(a.color)})" ` +
    `vector-effect="non-scaling-stroke" />\n`
  ).join('');
}

/**
 * Generate SVG box elements
 * @param {Array} boxes - Normalized boxes
 * @returns {string} SVG rect elements
 */
function generateBoxesSvg(boxes) {
  return boxes.map(b =>
    `    <rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" ` +
    `stroke="${escapeHtml(b.color)}" fill="${escapeHtml(b.fill)}" stroke-width="${b.strokeWidth}" ` +
    `vector-effect="non-scaling-stroke" />\n`
  ).join('');
}

/**
 * Generate text overlays as absolutely positioned HTML spans.
 * (x, y) is the top-left corner of the text box.
 * @param {Array} texts - Normalized text overlays
 * @returns {string} HTML span elements
 */
function generateTextHtml(texts) {
  return texts.map(t => {
    let style = `left: ${t.x}%; top: ${t.y}%; font-size: ${t.fontSize}px; ` +
      `color: ${cssValue(t.color, DEFAULTS.textColor)};`;
    if (t.background) {
      style += ` background: ${cssValue(t.background, 'transparent')};`;
    }
    return `    <span class="annotation-text" style="${style}">${escapeHtml(t.text)}</span>\n`;
  }).join('');
}

/**
 * Generate HTML for annotated image
 * @param {string} imagePath - Path to image
 * @param {object} options - Options from YAML
 * @param {Array} markers - Markers array
 * @param {Array} arrows - Arrows array
 * @param {Array} boxes - Boxes array
 * @param {Array} texts - Text array
 * @param {number|null} figureNumber - Figure number if caption provided
 * @param {string} blockId - Block identifier for SVG marker IDs
 * @returns {string} HTML output
 */
function generateHtml(imagePath, options, markers, arrows, boxes, texts, figureNumber, blockId) {
  const caption = options.caption || '';
  const legendColumns = Math.round(
    toPositiveNumber(options.legendColumns, DEFAULTS.legendColumns, LIMITS.legendColumns)
  );
  const figId = options.id || '';

  // Validate + normalize every shape type once
  const validMarkers = markers
    .filter(isValidMarker)
    .map(m => ({ type: 'marker', id: m.id, label: m.label, badgeX: pct(m.x), badgeY: pct(m.y) }));
  const validArrows = arrows.filter(isValidArrow).map(normalizeArrow);
  const validBoxes = boxes.filter(isValidBox).map(normalizeBox);
  const validTexts = texts.filter(isValidText).map(normalizeText);

  // Legend: all markers + arrows/boxes that carry an id and label, sorted by id.
  // Every legend item also gets a numbered badge on the image.
  const legendItems = [
    ...validMarkers,
    ...validArrows.filter(hasLegendEntry),
    ...validBoxes.filter(hasLegendEntry)
  ].sort(compareIds);

  // Build HTML
  const idAttr = figId ? ` id="${escapeHtml(figId)}"` : '';
  const escapedCaption = escapeHtml(caption);

  // KNOWN ISSUE: --marker-color is scoped to .image-wrapper, so legend badges
  // (.annotation-legend is a sibling) always use the CSS default colour.
  let html = `<figure class="annotated-image-container"${idAttr}>\n`;
  html += `  <div class="image-wrapper" style="--marker-color: ${cssValue(options.markerColor, DEFAULTS.markerColor)};">\n`;
  html += `    <img src="${escapeHtml(imagePath)}" alt="${escapedCaption}">\n`;

  // Numbered badges: markers at their point, arrows at the line midpoint,
  // boxes inset from their top-left corner
  for (const item of legendItems) {
    html += `    <span class="marker" style="left: ${item.badgeX}%; top: ${item.badgeY}%;">${escapeHtml(String(item.id))}</span>\n`;
  }

  // SVG shapes layer (boxes first so arrows draw on top)
  if (validArrows.length > 0 || validBoxes.length > 0) {
    const { defs, markerIdFor } = generateArrowheadDefs(validArrows, blockId);
    html += `    <svg class="annotation-shapes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">\n`;
    html += defs;
    html += generateBoxesSvg(validBoxes);
    html += generateArrowsSvg(validArrows, markerIdFor);
    html += `    </svg>\n`;
  }

  // Text overlays (HTML, above the SVG layer)
  html += generateTextHtml(validTexts);

  html += `  </div>\n`;

  // Render caption if present
  if (caption && figureNumber) {
    html += `  <figcaption>Figure <span class="fig-num">${figureNumber}</span>: ${escapedCaption}</figcaption>\n`;
  }

  // Render combined legend
  if (legendItems.length > 0) {
    html += `  <div class="annotation-legend">\n`;
    html += `    <div class="legend-grid" style="--legend-columns: ${legendColumns};">\n`;

    for (const item of legendItems) {
      html += `      <div class="legend-item">\n`;
      html += `        <span class="legend-num">${escapeHtml(String(item.id))}</span>\n`;
      html += `        <span class="legend-text">${escapeHtml(item.label)}</span>\n`;
      html += `      </div>\n`;
    }

    html += `    </div>\n`;
    html += `  </div>\n`;
  }

  html += `</figure>\n`;

  return html;
}

/**
 * Annotated Image Plugin
 * Uses custom block rule to capture raw YAML content
 *
 * @param {object} md - markdown-it instance
 * @returns {void}
 */
export function annotatedImagePlugin(md) {
  // Block rule to capture ::: annotated-image ... ::: blocks
  md.block.ruler.before('fence', 'annotated_image', (state, startLine, endLine, silent) => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const startMax = state.eMarks[startLine];
    const startLineText = state.src.slice(startPos, startMax);

    // Check for opening fence
    const openMatch = startLineText.match(OPEN_REGEX);
    if (!openMatch) return false;

    if (silent) return true;

    const imagePath = openMatch[1].trim();

    // Find closing fence and collect content
    let nextLine = startLine + 1;
    let contentLines = [];
    let foundClose = false;

    while (nextLine < endLine) {
      // Use bMarks only (not + tShift) to preserve indentation for YAML
      const linePos = state.bMarks[nextLine];
      const lineMax = state.eMarks[nextLine];
      const lineText = state.src.slice(linePos, lineMax);

      // Check for closing fence (trimmed to handle any indentation)
      if (CLOSE_REGEX.test(lineText.trim())) {
        foundClose = true;
        break;
      }

      contentLines.push(lineText);
      nextLine++;
    }

    if (!foundClose) {
      // No closing fence found, don't match
      return false;
    }

    // Create token
    const token = state.push('annotated_image', 'figure', 0);
    token.content = contentLines.join('\n');
    token.meta = { imagePath };
    token.map = [startLine, nextLine + 1];

    state.line = nextLine + 1;
    return true;
  });

  // Renderer for annotated_image token
  md.renderer.rules.annotated_image = (tokens, idx, options, env) => {
    const token = tokens[idx];
    const imagePath = token.meta.imagePath;
    const content = token.content;

    // Parse YAML content
    const { options: opts, markers, arrows, boxes, text } = parseYamlContent(content);

    // Handle figure counter
    let figureNumber = null;
    if (opts.caption) {
      env.figureCounter = (env.figureCounter || 0) + 1;
      figureNumber = env.figureCounter;
    }

    // Generate unique block ID for SVG marker defs (separate counter for safety)
    env.annotatedImageBlockCounter = (env.annotatedImageBlockCounter || 0) + 1;
    const blockId = `annotated-${env.annotatedImageBlockCounter}`;

    return generateHtml(imagePath, opts, markers, arrows, boxes, text, figureNumber, blockId);
  };
}
