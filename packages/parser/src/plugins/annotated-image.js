/**
 * @file Annotated Image Plugin for markdown-it
 * @description Renders images with numbered overlay markers and legend
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
 * - { id: 1, x: 10, y: 20, label: "Button" }
 * - { id: 2, x: 85, y: 10, label: "Menu" }
 * :::
 * ```
 *
 * Alternative syntax (markers array at root):
 * ```markdown
 * ::: annotated-image ./assets/image.png
 * - { id: 1, x: 10, y: 20, label: "Button" }
 * :::
 * ```
 */

import yaml from 'js-yaml';

// Match opening fence: ::: annotated-image path
const OPEN_REGEX = /^:::[ ]*annotated-image[ ]+(.+)$/;
// Match closing fence: :::
const CLOSE_REGEX = /^:::[ ]*$/;

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
 * Parse YAML content from container
 * @param {string} content - YAML content between ::: markers
 * @returns {object} Parsed data with options and markers
 */
function parseYamlContent(content) {
  try {
    const data = yaml.load(content.trim());

    if (!data) {
      return { options: {}, markers: [] };
    }

    // Handle array at root level (legacy format)
    if (Array.isArray(data)) {
      return {
        options: {},
        markers: data
      };
    }

    // Handle object with options and markers
    return {
      options: data.options || {},
      markers: data.markers || []
    };
  } catch (err) {
    // Return empty structure on parse error
    return {
      options: {},
      markers: []
    };
  }
}

/**
 * Validate marker object
 * @param {object} marker - Marker object
 * @returns {boolean} True if valid
 */
function isValidMarker(marker) {
  return marker &&
    typeof marker.id !== 'undefined' &&
    typeof marker.x === 'number' &&
    typeof marker.y === 'number' &&
    typeof marker.label === 'string';
}

/**
 * Escape HTML entities
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate HTML for annotated image
 * @param {string} imagePath - Path to image
 * @param {object} options - Options from YAML
 * @param {Array} markers - Markers array
 * @param {number|null} figureNumber - Figure number if caption provided
 * @returns {string} HTML output
 */
function generateHtml(imagePath, options, markers, figureNumber) {
  const caption = options.caption || '';
  const markerColor = options.markerColor || '#cc0000';
  const legendColumns = options.legendColumns || 3;
  const figId = options.id || '';

  // Validate and sort markers by ID
  const validMarkers = markers
    .filter(isValidMarker)
    .map(m => ({
      id: m.id,
      x: clamp(m.x, 0, 100),
      y: clamp(m.y, 0, 100),
      label: m.label
    }))
    .sort((a, b) => {
      const aNum = parseInt(a.id, 10);
      const bNum = parseInt(b.id, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.id).localeCompare(String(b.id));
    });

  // Build HTML
  const idAttr = figId ? ` id="${escapeHtml(figId)}"` : '';
  const escapedImagePath = escapeHtml(imagePath);
  const escapedCaption = escapeHtml(caption);
  const escapedMarkerColor = escapeHtml(markerColor);

  let html = `<figure class="annotated-image-container"${idAttr}>\n`;
  html += `  <div class="image-wrapper" style="--marker-color: ${escapedMarkerColor};">\n`;
  html += `    <img src="${escapedImagePath}" alt="${escapedCaption}">\n`;

  // Render markers
  for (const marker of validMarkers) {
    const escapedId = escapeHtml(String(marker.id));
    html += `    <span class="marker" style="left: ${marker.x}%; top: ${marker.y}%;">${escapedId}</span>\n`;
  }

  html += `  </div>\n`;

  // Render caption if present
  if (caption && figureNumber) {
    html += `  <figcaption>Figure <span class="fig-num">${figureNumber}</span>: ${escapedCaption}</figcaption>\n`;
  }

  // Render legend
  if (validMarkers.length > 0) {
    html += `  <div class="annotation-legend">\n`;
    html += `    <div class="legend-grid" style="--legend-columns: ${legendColumns};">\n`;

    for (const marker of validMarkers) {
      const escapedId = escapeHtml(String(marker.id));
      const escapedLabel = escapeHtml(marker.label);
      html += `      <div class="legend-item">\n`;
      html += `        <span class="legend-num">${escapedId}</span>\n`;
      html += `        <span class="legend-text">${escapedLabel}</span>\n`;
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
    const { options: opts, markers } = parseYamlContent(content);

    // Handle figure counter
    let figureNumber = null;
    if (opts.caption) {
      env.figureCounter = (env.figureCounter || 0) + 1;
      figureNumber = env.figureCounter;
    }

    return generateHtml(imagePath, opts, markers, figureNumber);
  };
}
