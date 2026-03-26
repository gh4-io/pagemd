/**
 * Markdown-it extensions for PageMD custom syntax
 */

import { annotatedImagePlugin } from './plugins/annotated-image.js';

/**
 * Block callout plugin for [[WARNING]]...[[/WARNING]] and [[DANGER]]...[[/DANGER]]
 * @param {MarkdownIt} md - Markdown-it instance
 */
export function calloutPlugin(md) {
  md.block.ruler.before('fence', 'block_callout', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(pos, max);

    // Check for opening tag - must be at start of line
    const openMatch = lineText.match(/^\[\[(WARNING|DANGER)\]\](.*)$/i);
    if (!openMatch) return false;

    const type = openMatch[1].toUpperCase();
    const firstLineContent = openMatch[2].trim();

    if (silent) return true;

    // Look for closing tag on same line first (single-line format)
    const singleLineMatch = lineText.match(/^\[\[(WARNING|DANGER)\]\](.*?)(\[\[\/\1\]\])?$/i);
    if (singleLineMatch && singleLineMatch[3]) {
      // Single-line format: [[WARNING]] content
      const content = singleLineMatch[2].trim();

      const token_open = state.push('callout_open', 'div', 1);
      token_open.attrSet('class', `callout callout-${type.toLowerCase()}`);

      const label_token = state.push('callout_label', 'span', 0);
      label_token.attrSet('class', 'callout-label');
      label_token.content = type;

      const content_open = state.push('callout_content_open', 'div', 1);
      content_open.attrSet('class', 'callout-content');

      if (content) {
        const inline_token = state.push('inline', '', 0);
        inline_token.content = content;
        inline_token.children = [];
      }

      state.push('callout_content_close', 'div', -1);
      state.push('callout_close', 'div', -1);

      state.line = startLine + 1;
      return true;
    }

    // Multi-line format - look for closing tag
    let nextLine = startLine + 1;
    let content = firstLineContent;
    let foundClose = false;
    let blankLineCount = 0;
    const MAX_BLANK_LINES = 2; // Stop after 2 consecutive blank lines without closing tag

    // Search for closing tag
    while (nextLine < endLine) {
      const linePos = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineMax = state.eMarks[nextLine];
      const line = state.src.slice(linePos, lineMax);

      // Found closing tag
      const closeMatch = line.match(new RegExp(`^\\[\\[\\/${type}\\]\\]`, 'i'));
      if (closeMatch) {
        foundClose = true;
        break;
      }

      // Stop if we hit another block-level element (another callout, heading, directive, etc.)
      if (line.match(/^#+\s/) ||                          // Heading
          line.match(/^\[\[(WARNING|DANGER)\]\]/i) ||     // Another callout
          line.match(/^<!--\s*::/)) {                     // Directive comment
        break;
      }

      // Track consecutive blank lines - stop after too many without finding closing tag
      if (line.trim() === '') {
        blankLineCount++;
        if (blankLineCount > MAX_BLANK_LINES) {
          break;
        }
        // Include blank line in content
        if (content) content += '\n';
        content += line;
        nextLine++;
        continue;
      }

      // Reset blank line counter when we see content
      blankLineCount = 0;

      if (content) content += '\n';
      content += line;
      nextLine++;
    }

    // Create tokens
    const token_open = state.push('callout_open', 'div', 1);
    token_open.attrSet('class', `callout callout-${type.toLowerCase()}`);

    const label_token = state.push('callout_label', 'span', 0);
    label_token.attrSet('class', 'callout-label');
    label_token.content = type;

    const content_open = state.push('callout_content_open', 'div', 1);
    content_open.attrSet('class', 'callout-content');

    if (content.trim()) {
      const inline_token = state.push('inline', '', 0);
      inline_token.content = content.trim();
      inline_token.children = [];
    }

    state.push('callout_content_close', 'div', -1);
    state.push('callout_close', 'div', -1);

    state.line = foundClose ? nextLine + 1 : nextLine;
    return true;
  });

  // Inline callout for [!WARNING] and [!DANGER]
  md.inline.ruler.before('emphasis', 'inline_callout', (state, silent) => {
    const max = state.posMax;
    const start = state.pos;

    if (state.src.charCodeAt(start) !== 0x5B /* [ */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x21 /* ! */) return false;

    const match = state.src.slice(start).match(/^\[!(\w+)\]/);
    if (!match) return false;

    const type = match[1].toUpperCase();
    if (type !== 'WARNING' && type !== 'DANGER') return false;

    if (!silent) {
      const token = state.push('inline_callout', '', 0);
      token.content = type;
      token.markup = `[!${type}]`;
    }

    state.pos += match[0].length;
    return true;
  });

  // Renderers
  md.renderer.rules.callout_open = (tokens, idx) => {
    const className = tokens[idx].attrGet('class');
    return `<div class="${className}">`;
  };

  md.renderer.rules.callout_close = () => '</div>';

  md.renderer.rules.callout_label = (tokens, idx) => {
    return `<span class="callout-label">${md.utils.escapeHtml(tokens[idx].content)}</span>`;
  };

  md.renderer.rules.callout_content_open = () => '<div class="callout-content">';
  md.renderer.rules.callout_content_close = () => '</div>';

  md.renderer.rules.inline_callout = (tokens, idx) => {
    const type = tokens[idx].content.toLowerCase();
    return `<span class="callout callout-${type} callout-inline"><span class="callout-label">${md.utils.escapeHtml(tokens[idx].content)}</span></span>`;
  };
}

/**
 * Parse figure directive attributes
 * Handles: key="value with spaces" key='value' key=value
 * @param {string} attrString - The attribute string to parse
 * @returns {Object} Parsed attributes
 */
function parseFigureAttributes(attrString) {
  const attrs = {};
  if (!attrString) return attrs;

  // Match key="value" (double quotes) or key='value' (single quotes) or key=value (no quotes)
  // Order matters: try quoted patterns first, then unquoted
  // Use [\w-]+ to support hyphenated attribute names like crop-fit, crop-x, crop-y
  const attrRegex = /([\w-]+)=(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    // match[2] = double-quoted, match[3] = single-quoted, match[4] = unquoted
    attrs[match[1]] = match[2] || match[3] || match[4];
  }

  return attrs;
}

/**
 * Validate CSS length values (e.g., "300px", "-100px", "0", "50vh", "80%", "auto")
 * @param {string} value - The CSS length value to validate
 * @returns {string} Valid value or empty string if invalid
 */
function validateCSSLength(value) {
  if (!value) return '';
  // Accept: unitless zero, number + unit, or "auto"
  // Unitless zero: -?0(.0*)?
  // Number with unit: -?\d+\.?\d* followed by px|em|rem|vh|vw|%
  const valid = /^-?0(\.0*)?$|^(-?\d+\.?\d*)(px|em|rem|vh|vw|%)$|^auto$/i.test(value.trim());
  return valid ? value.trim() : '';
}

/**
 * Figure plugin for <!-- ::FIGURE ... --> syntax
 * Supports: caption, src, id, width, height, crop parameters, alt, loading, link
 * Auto-numbers figures sequentially within each parse run
 *
 * Usage:
 *   <!-- ::FIGURE src="image.png" caption="Description" id="fig-1" width="full" height="400px" crop-fit="cover" -->
 *   OR (legacy, backward compatible):
 *   <!-- ::FIGURE caption="Description" -->
 *   ![Alt](image.png)
 *
 * @param {MarkdownIt} md - Markdown-it instance
 */
export function figurePlugin(md) {
  let figureCounter = 0;

  // Reset counter on each render
  const originalRender = md.render.bind(md);
  md.render = function (...args) {
    figureCounter = 0;
    return originalRender(...args);
  };

  // HTML block rule for figure comments
  md.block.ruler.before('html_block', 'figure_comment', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(pos, max);

    // Match <!-- ::FIGURE ... --> (flexible attribute order)
    const directiveMatch = lineText.match(/^<!--\s*::FIGURE\s+(.+?)\s*-->$/);
    if (!directiveMatch) return false;

    if (silent) return true;

    const attrs = parseFigureAttributes(directiveMatch[1]);
    const caption = attrs.caption || '';
    const src = attrs.src || '';
    const figId = attrs.id || '';
    const width = attrs.width || '';
    const height = validateCSSLength(attrs.height || '');

    // Extract crop parameters
    const rawCropFit = attrs['crop-fit'] || '';
    const rawCropX = attrs['crop-x'] || '';
    const rawCropY = attrs['crop-y'] || '';

    // Validate crop-x and crop-y: must be 0-100 (percentage)
    const validateCropPosition = (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100 ? String(num) : '';
    };
    const cropX = validateCropPosition(rawCropX);
    const cropY = validateCropPosition(rawCropY);

    // Validate crop-fit: must be one of cover, contain, fill, scale-down
    const validCropFits = ['cover', 'contain', 'fill', 'scale-down'];
    const explicitCropFit = validCropFits.includes(rawCropFit) ? rawCropFit : '';
    let cropFit = explicitCropFit;

    // Auto-default crop-fit to "cover" for CSS hook (--crop-fit on figure)
    // but NOT applied as object-fit on img (would scale cropped content back up)
    if (!cropFit && (cropX || cropY)) {
      cropFit = 'cover';
    }

    // Extract position parameters (for shifting image within viewport)
    const rawPosX = attrs['pos-x'] || '';
    const rawPosY = attrs['pos-y'] || '';

    // Validate pos-x and pos-y: CSS length values (px, %, em, rem, etc.) or negative values
    const posX = validateCSSLength(rawPosX);
    const posY = validateCSSLength(rawPosY);

    // Determine if any crop params are set (for conditional rendering)
    const hasCrop = cropFit || cropX || cropY;

    // Extract accessibility and enhancement parameters
    // alt: separate alt text (falls back to caption if not provided)
    const alt = attrs.alt || caption;

    // loading: lazy loading support (lazy or eager, validated)
    const rawLoading = attrs.loading || '';
    const validLoadingValues = ['lazy', 'eager'];
    const loading = validLoadingValues.includes(rawLoading) ? rawLoading : '';

    // link: wrap image in anchor tag
    const link = attrs.link || '';

    figureCounter++;

    // Look ahead for the next line (legacy: image on next line if no src)
    let nextLine = startLine + 1;
    let imageMarkdown = '';

    if (!src && nextLine < endLine) {
      const nextPos = state.bMarks[nextLine] + state.tShift[nextLine];
      const nextMax = state.eMarks[nextLine];
      imageMarkdown = state.src.slice(nextPos, nextMax).trim();
    }

    // Create tokens
    const token_open = state.push('figure_open', 'figure', 1);
    token_open.markup = '<!-- ::FIGURE -->';
    token_open.meta = {
      id: figId,
      width: width,
      height: height,
      cropFit: cropFit,
      explicitCropFit: explicitCropFit,
      cropX: cropX,
      cropY: cropY,
      posX: posX,
      posY: posY,
      hasCrop: hasCrop
    };

    // If src is provided in directive, create image token
    if (src) {
      const img_token = state.push('figure_image', 'img', 0);
      img_token.meta = {
        src: src,
        alt: alt,           // Uses alt param or falls back to caption
        cropFit: cropFit,
        explicitCropFit: explicitCropFit,
        cropX: cropX,
        cropY: cropY,
        posX: posX,
        posY: posY,
        hasCrop: hasCrop,
        loading: loading,   // lazy/eager loading
        link: link          // URL to wrap image in anchor
      };
    } else if (imageMarkdown && (imageMarkdown.startsWith('![[') || imageMarkdown.startsWith('!['))) {
      // Legacy: image on next line
      const inline_token = state.push('inline', '', 0);
      inline_token.content = imageMarkdown;
      inline_token.children = [];
      nextLine++;
    }

    const caption_token = state.push('figcaption', 'figcaption', 0);
    caption_token.content = `Figure ${figureCounter}: ${caption}`;

    state.push('figure_close', 'figure', -1);

    state.line = nextLine;
    return true;
  });

  // Renderers
  md.renderer.rules.figure_open = (tokens, idx) => {
    const meta = tokens[idx].meta || {};
    const attrs = [];
    const styles = [];

    if (meta.id) attrs.push(`id="${md.utils.escapeHtml(meta.id)}"`);

    // Width: Use class for semantic names, inline style for CSS values
    if (meta.width) {
      const semanticWidths = ['full', 'half', 'third', 'quarter'];
      if (semanticWidths.includes(meta.width)) {
        attrs.push(`class="width-${md.utils.escapeHtml(meta.width)}"`);
      } else {
        styles.push(`max-width: ${md.utils.escapeHtml(meta.width)}`);
      }
    }

    // Viewport model: crop-x/crop-y control what portion of image to show
    // Let CSS handle the actual cropping and sizing
    if (meta.hasCrop) {
      // Add crop markers for CSS targeting
      if (meta.cropFit) styles.push(`--crop-fit: ${md.utils.escapeHtml(meta.cropFit)}`);

      // Set custom properties for CSS to use - NO fixed dimensions on figure
      if (meta.cropY) {
        styles.push(`--crop-y: ${md.utils.escapeHtml(meta.cropY)}%`);
      }
      if (meta.cropX) {
        styles.push(`--crop-x: ${md.utils.escapeHtml(meta.cropX)}%`);
      }
    } else if (meta.height) {
      // No crop - just explicit height
      styles.push(`height: ${md.utils.escapeHtml(meta.height)}`);
    }

    if (styles.length > 0) {
      attrs.push(`style="${styles.join('; ')}"`);
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    return `<figure${attrStr}>`;
  };

  md.renderer.rules.figure_close = () => '</figure>';

  md.renderer.rules.figure_image = (tokens, idx) => {
    const meta = tokens[idx].meta || {};
    const src = md.utils.escapeHtml(meta.src || '');
    const alt = md.utils.escapeHtml(meta.alt || '');

    // Build image attributes
    const imgAttrs = [`src="${src}"`, `alt="${alt}"`];

    // Add loading attribute (lazy/eager) if specified
    if (meta.loading) {
      imgAttrs.push(`loading="${md.utils.escapeHtml(meta.loading)}"`);
    }

    // Crop via CSS object-view-box: inset(top right bottom left)
    // crop-y=N means "show top N%" → bottom inset = (100-N)%
    // crop-x=N means "show left N%" → right inset = (100-N)%
    // pos-x/pos-y shift the visible region (integrated into inset calc)
    const imgStyles = [];
    if (meta.hasCrop) {
      let top = '0%', right = '0%', bottom = '0%', left = '0%';

      if (meta.cropY) {
        bottom = `${100 - parseInt(meta.cropY)}%`;
      }
      if (meta.cropX) {
        right = `${100 - parseInt(meta.cropX)}%`;
      }

      // pos-x/pos-y shift the view window (adjust inset edges)
      if (meta.posX !== '') {
        // Negative posX shifts image left → view moves right → add to left, reduce right
        left = `calc(0px - ${md.utils.escapeHtml(meta.posX)})`;
        right = meta.cropX
          ? `calc(${100 - parseInt(meta.cropX)}% + ${md.utils.escapeHtml(meta.posX)})`
          : `calc(0px + ${md.utils.escapeHtml(meta.posX)})`;
      }
      if (meta.posY !== '') {
        top = `calc(0px - ${md.utils.escapeHtml(meta.posY)})`;
        bottom = meta.cropY
          ? `calc(${100 - parseInt(meta.cropY)}% + ${md.utils.escapeHtml(meta.posY)})`
          : `calc(0px + ${md.utils.escapeHtml(meta.posY)})`;
      }

      imgStyles.push(`object-view-box: inset(${top} ${right} ${bottom} ${left})`);

      // Only apply object-fit when user explicitly set crop-fit
      // Auto-defaulted "cover" would scale cropped content back to full width
      if (meta.explicitCropFit) {
        imgStyles.push(`object-fit: ${md.utils.escapeHtml(meta.explicitCropFit)}`);
      }
    }

    if (imgStyles.length > 0) {
      imgAttrs.push(`style="${imgStyles.join('; ')}"`);
    }

    // Build the img tag
    const imgTag = `<img ${imgAttrs.join(' ')}>`;

    // Wrap in anchor if link is specified
    if (meta.link) {
      // Block dangerous URL schemes (javascript:, data:, vbscript:)
      const isDangerous = /^(javascript|data|vbscript):/i.test(meta.link.trim());
      if (isDangerous) {
        // Skip link wrapper for dangerous URLs, just return the image
        return imgTag;
      }

      const href = md.utils.escapeHtml(meta.link);
      // Check if external link (starts with http:// or https://)
      const isExternal = /^https?:\/\//i.test(meta.link);
      const linkAttrs = [`href="${href}"`];
      if (isExternal) {
        linkAttrs.push('target="_blank"', 'rel="noopener noreferrer"');
      }
      return `<a ${linkAttrs.join(' ')}>${imgTag}</a>`;
    }

    return imgTag;
  };

  md.renderer.rules.figcaption = (tokens, idx) => {
    const content = tokens[idx].content;
    // Extract figure number from content (e.g., "Figure 1: Caption")
    const numMatch = content.match(/^Figure (\d+):/);
    const num = numMatch ? numMatch[1] : '';
    const captionText = content.replace(/^Figure \d+:\s*/, '');
    return `<figcaption>Figure <span class="fig-num">${num}</span>: ${md.utils.escapeHtml(captionText)}</figcaption>`;
  };
}

/**
 * Register all PageMD extensions with a markdown-it instance
 * @param {MarkdownIt} md - Markdown-it instance
 * @returns {MarkdownIt} Same instance (for chaining)
 */
export function registerExtensions(md) {
  md.use(calloutPlugin);
  md.use(figurePlugin);
  md.use(annotatedImagePlugin);
  return md;
}
