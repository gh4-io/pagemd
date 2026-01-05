/**
 * Markdown-it extensions for PageMD custom syntax
 */

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

    // Search for closing tag (stop at blank lines or end of doc)
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

      // Stop at blank line if no closing tag was found yet
      if (line.trim() === '') {
        break;
      }

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
 * Figure plugin for <!-- ::FIGURE caption="..." --> syntax
 * Auto-numbers figures sequentially within each parse run
 * @param {MarkdownIt} md - Markdown-it instance
 */
export function figurePlugin(md) {
  let figureCounter = 0;

  // Reset counter on each render
  const originalRender = md.render.bind(md);
  md.render = function(...args) {
    figureCounter = 0;
    return originalRender(...args);
  };

  // HTML block rule for figure comments
  md.block.ruler.before('html_block', 'figure_comment', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(pos, max);

    // Match <!-- ::FIGURE ... -->
    const match = lineText.match(/^<!--\s*::FIGURE\s+caption=["']([^"']+)["']\s*-->$/);
    if (!match) return false;

    if (silent) return true;

    const caption = match[1];
    figureCounter++;

    // Look ahead for the next line (should be image)
    let nextLine = startLine + 1;
    let imageMarkdown = '';

    if (nextLine < endLine) {
      const nextPos = state.bMarks[nextLine] + state.tShift[nextLine];
      const nextMax = state.eMarks[nextLine];
      imageMarkdown = state.src.slice(nextPos, nextMax).trim();
    }

    // Create tokens
    const token_open = state.push('figure_open', 'figure', 1);
    token_open.markup = '<!-- ::FIGURE -->';

    // If we found an image on the next line, parse it
    if (imageMarkdown && (imageMarkdown.startsWith('![[') || imageMarkdown.startsWith('!['))) {
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
  md.renderer.rules.figure_open = () => '<figure>';
  md.renderer.rules.figure_close = () => '</figure>';
  md.renderer.rules.figcaption = (tokens, idx) => {
    return `<figcaption>${md.utils.escapeHtml(tokens[idx].content)}</figcaption>`;
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
  return md;
}
