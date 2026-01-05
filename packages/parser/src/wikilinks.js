/**
 * markdown-it plugin for Obsidian-style wiki links
 * Handles [[Page Name]] and [[Page Name|Display]] links
 * Handles ![[image.png]] embedded images
 */

/**
 * Create wiki-link plugin
 * @param {MarkdownIt} md - markdown-it instance
 * @param {object} options - Plugin configuration
 * @param {string} options.baseUrl - Base URL for links (default: '')
 * @param {string} options.imageBaseUrl - Base URL for images (default: '')
 * @param {string} options.linkClass - CSS class for links (default: 'wikilink')
 * @param {string} options.imageClass - CSS class for images (default: 'embedded-image')
 */
export function wikilinkPlugin(md, options = {}) {
  const defaultOptions = {
    baseUrl: '',
    imageBaseUrl: '',
    linkClass: 'wikilink',
    imageClass: 'embedded-image'
  };

  const opts = { ...defaultOptions, ...options };

  // Regex patterns
  const EMBED_PATTERN = /!\[\[([^\]]+)\]\]/;
  const LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;

  /**
   * Parse embed (![[...)
   */
  function parseEmbed(state, silent) {
    const start = state.pos;

    // Must start with ![[
    if (state.src.charCodeAt(start) !== 0x21 /* ! */ ||
        state.src.charCodeAt(start + 1) !== 0x5B /* [ */ ||
        state.src.charCodeAt(start + 2) !== 0x5B /* [ */) {
      return false;
    }

    const match = state.src.slice(start).match(EMBED_PATTERN);
    if (!match) return false;

    if (!silent) {
      const content = match[1].trim();
      const url = opts.imageBaseUrl ? `${opts.imageBaseUrl}/${content}` : content;

      const token = state.push('image', 'img', 0);
      token.attrs = [
        ['src', url],
        ['alt', ''],  // Will be filled by renderer from children
        ['class', opts.imageClass]
      ];
      token.content = content;

      // Create child token for alt text (markdown-it renders this as alt attribute value)
      const textToken = new state.Token('text', '', 0);
      textToken.content = content;
      token.children = [textToken];
    }

    state.pos = start + match[0].length;
    return true;
  }

  /**
   * Parse wiki-link [[...]]
   */
  function parseWikilink(state, silent) {
    const start = state.pos;

    // Must start with [[
    if (state.src.charCodeAt(start) !== 0x5B /* [ */ ||
        state.src.charCodeAt(start + 1) !== 0x5B /* [ */) {
      return false;
    }

    const match = state.src.slice(start).match(LINK_PATTERN);
    if (!match) return false;

    if (!silent) {
      const target = match[1].trim();
      const display = match[2] ? match[2].trim() : target;
      const href = opts.baseUrl ? `${opts.baseUrl}/${target}` : target;

      // Create link token
      const token_o = state.push('link_open', 'a', 1);
      token_o.attrs = [
        ['href', href],
        ['class', opts.linkClass]
      ];

      // Create text token
      const token_t = state.push('text', '', 0);
      token_t.content = display;

      // Close link
      state.push('link_close', 'a', -1);
    }

    state.pos = start + match[0].length;
    return true;
  }

  // Register inline rules - embeds before wikilinks
  md.inline.ruler.before('link', 'wikilink_embed', parseEmbed);
  md.inline.ruler.before('link', 'wikilink', parseWikilink);
}
