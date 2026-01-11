import matter from 'gray-matter';

/**
 * Extract frontmatter from markdown content
 * @param {string} markdown - Raw markdown content with optional YAML frontmatter
 * @returns {{content: string, metadata: object, raw: string}} Parsed frontmatter and content
 */
export function extractFrontmatter(markdown) {
  let result;
  try {
    result = matter(markdown);
  } catch (error) {
    throw new Error(`Frontmatter YAML error: ${error.message}`);
  }

  return {
    content: result.content,
    metadata: result.data,
    raw: result.matter || ''
  };
}
