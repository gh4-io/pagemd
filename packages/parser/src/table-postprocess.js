/**
 * Table post-processing plugins for markdown-it.
 *
 * 1. tableZebraPlugin - Adds .odd/.even classes to <tr> for CSS striping
 *    (workaround for Paged.js bug #315 where :nth-child crashes)
 *
 * 2. tableAttrsFixPlugin - Fixes markdown-it-attrs hiding colspan/rowspan
 *    cells from multimd-table (attrs' "tables tbody calculate" pattern
 *    miscounts columns when colspan is used)
 *
 * @see https://gitlab.coko.foundation/pagedjs/pagedjs/-/issues/315
 */

/**
 * Fix markdown-it-attrs incorrectly hiding colspan/rowspan table cells.
 *
 * The attrs plugin's "tables tbody calculate" pattern counts columns
 * from the header and hides cells that "exceed" the count. When
 * multimd-table produces colspan cells (which reduce the visible cell
 * count per row), attrs misinterprets these rows as having too many
 * cells and hides the colspan cells.
 *
 * This core rule runs AFTER attrs and un-hides any td/th tokens that
 * carry colspan or rowspan attributes, along with their inline content.
 *
 * Must be registered AFTER markdown-it-attrs.
 *
 * @param {import('markdown-it')} md - markdown-it instance
 */
/**
 * Two-phase fix for markdown-it-attrs hiding colspan/rowspan cells.
 *
 * Phase 1 (pre-attrs): Saves content of colspan/rowspan cells so it
 *   can be restored after attrs wipes it.
 * Phase 2 (post-attrs): Restores hidden cells that have colspan/rowspan,
 *   including their inline content.
 *
 * @param {import('markdown-it')} md - markdown-it instance
 */
export function tableAttrsFixPlugin(md) {
  // Phase 1: Run BEFORE attrs — snapshot colspan/rowspan cell content
  // Also fix missing meta on tbody_open (headerless tables) to prevent
  // attrs "tables tbody calculate" pattern from crashing.
  md.core.ruler.before('curly_attributes', 'table_attrs_save', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Fix headerless tables: attrs expects tbody_open.meta.colsnum
      // which is set by the "tables thead metadata" pattern from thead.
      // Headerless tables have no thead, so we count columns from the
      // first row and set meta.colsnum to prevent the TypeError.
      // Tables WITH a header are skipped — attrs sets colsnum correctly
      // from the thead. Counting from the body would give wrong results
      // when the first body row is a colspan row (counts 1 instead of 2).
      if (token.type === 'tbody_open' && (!token.meta || token.meta.colsnum == null)) {
        const prevToken = i > 0 ? tokens[i - 1] : null;
        if (!prevToken || prevToken.type !== 'thead_close') {
          // Truly headerless — count from first body row, accounting for colspan
          let colCount = 0;
          for (let j = i + 1; j < tokens.length; j++) {
            if (tokens[j].type === 'tr_close') break;
            if (tokens[j].type === 'td_open' || tokens[j].type === 'th_open') {
              colCount += parseInt(tokens[j].attrGet('colspan') || '1', 10);
            }
          }
          token.meta = Object.assign({}, token.meta, { colsnum: colCount });
        }
      }

      if ((token.type === 'td_open' || token.type === 'th_open') &&
          (token.attrGet('colspan') || token.attrGet('rowspan'))) {
        // Save all tokens from td_open to td_close (inclusive).
        // Store token object references (not indices) — indices shift when
        // curly_attributes splices the {.class} annotation paragraphs, which
        // would corrupt any index-based restore for tables that appear after
        // the first table in the document.
        const closeType = token.type === 'td_open' ? 'td_close' : 'th_close';
        const saved = [];
        for (let j = i; j < tokens.length; j++) {
          const t = tokens[j];
          saved.push({
            token: t,
            hidden: t.hidden,
            content: t.content,
            children: t.children ? t.children.map(c => ({
              token: c,
              hidden: c.hidden,
              content: c.content
            })) : null
          });
          if (t.type === closeType && t.level === token.level && j > i) {
            break;
          }
        }
        // Store snapshot on the td_open token
        token._savedCellTokens = saved;
      }
    }
  });

  // Phase 2: Run AFTER attrs — restore any cells that attrs hid
  md.core.ruler.push('table_attrs_restore', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token._savedCellTokens && token.hidden) {
        // Attrs hid this cell — restore from snapshot
        for (const snap of token._savedCellTokens) {
          snap.token.hidden = snap.hidden;
          snap.token.content = snap.content;
          if (snap.children) {
            for (const childSnap of snap.children) {
              childSnap.token.hidden = childSnap.hidden;
              childSnap.token.content = childSnap.content;
            }
          }
        }
        delete token._savedCellTokens;
      } else if (token._savedCellTokens) {
        // Cell wasn't hidden — just clean up
        delete token._savedCellTokens;
      }
    }
  });
}

/**
 * Add .odd/.even CSS classes to <tr> elements inside <tbody>.
 *
 * Enables class-based zebra striping without :nth-child() selectors.
 * Activate striping in CSS with: table.striped tr.even { background: ... }
 *
 * @param {import('markdown-it')} md - markdown-it instance
 */
export function tableZebraPlugin(md) {
  // Track row index per table body - use a stack to handle nested tables
  const rowCounterStack = [];

  const origTbodyOpen = md.renderer.rules.tbody_open;
  md.renderer.rules.tbody_open = function (tokens, idx, options, env, self) {
    rowCounterStack.push(0);
    if (origTbodyOpen) {
      return origTbodyOpen(tokens, idx, options, env, self);
    }
    return self.renderToken(tokens, idx, options);
  };

  const origTbodyClose = md.renderer.rules.tbody_close;
  md.renderer.rules.tbody_close = function (tokens, idx, options, env, self) {
    rowCounterStack.pop();
    if (origTbodyClose) {
      return origTbodyClose(tokens, idx, options, env, self);
    }
    return self.renderToken(tokens, idx, options);
  };

  const origTrOpen = md.renderer.rules.tr_open;
  md.renderer.rules.tr_open = function (tokens, idx, options, env, self) {
    // Only add classes inside tbody (stack has entries)
    if (rowCounterStack.length > 0) {
      const current = rowCounterStack[rowCounterStack.length - 1];
      const className = current % 2 === 0 ? 'odd' : 'even';
      tokens[idx].attrJoin('class', className);
      rowCounterStack[rowCounterStack.length - 1] = current + 1;
    }
    if (origTrOpen) {
      return origTrOpen(tokens, idx, options, env, self);
    }
    return self.renderToken(tokens, idx, options);
  };
}
