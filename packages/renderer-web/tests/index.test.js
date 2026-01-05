/**
 * Tests for document assembly orchestration
 * @pagemd/renderer-web/index.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRenderContext,
  renderDocument,
  renderMarkdown
} from '../src/index.js';

// Mock @pagemd/parser
vi.mock('@pagemd/parser', () => ({
  parse: vi.fn(),
  parseFile: vi.fn()
}));

// Mock @pagemd/core
vi.mock('@pagemd/core', () => ({
  loadProfileSync: vi.fn(),
  createPathContext: vi.fn(),
  findProjectRoot: vi.fn(),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn()
  }))
}));

// Mock template.js
vi.mock('../src/template.js', () => ({
  loadTemplate: vi.fn(),
  renderTemplate: vi.fn(),
  processTokens: vi.fn()
}));

// Mock styles.js
vi.mock('../src/styles.js', () => ({
  buildStyleBlock: vi.fn(),
  formatStyleTag: vi.fn(),
  minifyCSS: vi.fn(),
  inlineStyles: vi.fn()
}));

import { parse, parseFile } from '@pagemd/parser';
import { loadProfileSync, createPathContext, findProjectRoot } from '@pagemd/core';
import { loadTemplate, renderTemplate } from '../src/template.js';
import { buildStyleBlock } from '../src/styles.js';

describe('index.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createRenderContext', () => {
    it('should create render context with default profile', () => {
      const mockProfile = {
        id: 'standard_letter',
        layout: { source: 'templates/standard.html' }
      };
      const mockPathContext = {
        projectRoot: '/project',
        markdownPath: '/project/docs/test.md'
      };

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue(mockPathContext);
      findProjectRoot.mockReturnValue('/project');

      const result = createRenderContext({
        markdownPath: '/project/docs/test.md'
      });

      expect(result.profile).toEqual(mockProfile);
      expect(result.pathContext).toEqual(mockPathContext);
      expect(loadProfileSync).toHaveBeenCalledWith('standard_letter', '/project', '/project');
    });

    it('should use specified profile ID', () => {
      const mockProfile = {
        id: 'custom_profile',
        layout: { source: 'templates/custom.html' }
      };

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue({});
      findProjectRoot.mockReturnValue('/project');

      const result = createRenderContext({
        markdownPath: '/project/docs/test.md',
        profile: 'custom_profile'
      });

      expect(result.profile.id).toBe('custom_profile');
      expect(loadProfileSync).toHaveBeenCalledWith('custom_profile', '/project', '/project');
    });

    it('should use specified project root', () => {
      const mockProfile = { id: 'test' };

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue({});

      createRenderContext({
        markdownPath: '/custom/path/test.md',
        projectRoot: '/custom/root'
      });

      expect(loadProfileSync).toHaveBeenCalledWith('standard_letter', '/custom/root', '/custom/root');
      expect(createPathContext).toHaveBeenCalledWith({
        markdownDir: '/custom/path',
        projectRoot: '/custom/root',
        manifestDir: undefined
      });
    });

    it('should throw error when profile not found', () => {
      loadProfileSync.mockReturnValue(null);
      findProjectRoot.mockReturnValue('/project');

      expect(() => createRenderContext({
        markdownPath: '/project/test.md',
        profile: 'missing_profile'
      })).toThrow('Profile not found: missing_profile');
    });

    it('should handle missing markdownPath', () => {
      const mockProfile = { id: 'test' };

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue({});
      findProjectRoot.mockReturnValue('/project');

      const result = createRenderContext({
        projectRoot: '/project'
      });

      expect(result.profile).toEqual(mockProfile);
      expect(createPathContext).toHaveBeenCalledWith({
        markdownDir: null,
        projectRoot: '/project',
        manifestDir: undefined
      });
    });

    it('should auto-detect project root when not provided', () => {
      const mockProfile = { id: 'test' };

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue({});
      findProjectRoot.mockReturnValue('/detected/root');

      createRenderContext({
        markdownPath: '/detected/root/docs/file.md'
      });

      expect(findProjectRoot).toHaveBeenCalledWith('/detected/root/docs/file.md');
      expect(loadProfileSync).toHaveBeenCalledWith('standard_letter', '/detected/root', '/detected/root');
    });
  });

  describe('renderDocument', () => {
    const setupMocks = () => {
      const mockProfile = {
        id: 'test',
        layout: { source: 'templates/test.html' }
      };
      const mockPathContext = { projectRoot: '/project' };
      const mockTemplate = '<html>{{content}}</html>';
      const mockStyles = '<style>body{margin:0}</style>';
      const mockHtml = '<p>Rendered content</p>';
      const mockMetadata = { title: 'Test Doc' };

      parseFile.mockResolvedValue({
        content: '# Test',
        html: mockHtml,
        metadata: mockMetadata
      });

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue(mockPathContext);
      findProjectRoot.mockReturnValue('/project');
      loadTemplate.mockResolvedValue(mockTemplate);
      buildStyleBlock.mockResolvedValue(mockStyles);
      renderTemplate.mockReturnValue('<html><p>Rendered content</p></html>');

      return { mockProfile, mockPathContext, mockTemplate, mockStyles, mockHtml, mockMetadata };
    };

    it('should render document through complete pipeline', async () => {
      const mocks = setupMocks();

      const result = await renderDocument('/project/docs/test.md');

      expect(parseFile).toHaveBeenCalledWith('/project/docs/test.md', {});
      expect(loadTemplate).toHaveBeenCalledWith(mocks.mockProfile, mocks.mockPathContext, { returnMetadata: false });
      expect(buildStyleBlock).toHaveBeenCalledWith(mocks.mockProfile, mocks.mockPathContext, { returnMetadata: false });
      expect(renderTemplate).toHaveBeenCalledWith(mocks.mockTemplate, {
        content: mocks.mockHtml,
        styles: mocks.mockStyles,
        metadata: mocks.mockMetadata,
        profile: mocks.mockProfile,
        pathContext: mocks.mockPathContext
      });

      expect(result.html).toBe('<html><p>Rendered content</p></html>');
      expect(result.metadata).toEqual(mocks.mockMetadata);
      expect(result.profile).toEqual(mocks.mockProfile);
    });

    it('should pass options to parser', async () => {
      setupMocks();

      await renderDocument('/project/docs/test.md', {
        profile: 'custom',
        parseOptions: { strict: true }
      });

      expect(parseFile).toHaveBeenCalledWith('/project/docs/test.md', {
        profile: 'custom',
        parseOptions: { strict: true }
      });
    });

    it('should handle parse errors', async () => {
      parseFile.mockRejectedValue(new Error('Parse failed'));

      await expect(renderDocument('/project/docs/test.md'))
        .rejects
        .toThrow('Parse failed');
    });

    it('should handle template loading errors', async () => {
      setupMocks();
      loadTemplate.mockRejectedValue(new Error('Template not found'));

      await expect(renderDocument('/project/docs/test.md'))
        .rejects
        .toThrow('Template not found');
    });

    it('should handle style building errors', async () => {
      setupMocks();
      buildStyleBlock.mockRejectedValue(new Error('Style load failed'));

      await expect(renderDocument('/project/docs/test.md'))
        .rejects
        .toThrow('Style load failed');
    });

    it('should use custom profile', async () => {
      const customProfile = {
        id: 'custom_letter',
        layout: { source: 'templates/custom.html' }
      };

      parseFile.mockResolvedValue({
        content: '# Test',
        html: '<p>Content</p>',
        metadata: {}
      });

      loadProfileSync.mockReturnValue(customProfile);
      createPathContext.mockReturnValue({});
      findProjectRoot.mockReturnValue('/project');
      loadTemplate.mockResolvedValue('<html>{{content}}</html>');
      buildStyleBlock.mockResolvedValue('');
      renderTemplate.mockReturnValue('<html><p>Content</p></html>');

      const result = await renderDocument('/project/test.md', {
        profile: 'custom_letter'
      });

      expect(result.profile.id).toBe('custom_letter');
    });

    it('should preserve metadata from parsed file', async () => {
      const metadata = {
        title: 'Test Document',
        author: 'John Doe',
        date: '2025-01-01'
      };

      parseFile.mockResolvedValue({
        content: '# Test',
        html: '<p>Content</p>',
        metadata
      });

      loadProfileSync.mockReturnValue({ id: 'test' });
      createPathContext.mockReturnValue({});
      findProjectRoot.mockReturnValue('/project');
      loadTemplate.mockResolvedValue('<html>{{content}}</html>');
      buildStyleBlock.mockResolvedValue('');
      renderTemplate.mockReturnValue('<html></html>');

      const result = await renderDocument('/project/test.md');

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('renderMarkdown', () => {
    const setupMocks = () => {
      const mockProfile = {
        id: 'test',
        layout: { source: 'templates/test.html' }
      };
      const mockPathContext = { projectRoot: '/project' };
      const mockTemplate = '<html>{{content}}</html>';
      const mockStyles = '<style>body{margin:0}</style>';

      parse.mockReturnValue({
        content: '# Test',
        html: '<p>Test content</p>',
        metadata: { title: 'From Parser' }
      });

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue(mockPathContext);
      findProjectRoot.mockReturnValue('/project');
      loadTemplate.mockResolvedValue(mockTemplate);
      buildStyleBlock.mockResolvedValue(mockStyles);
      renderTemplate.mockReturnValue('<html><p>Test content</p></html>');

      return { mockProfile, mockPathContext, mockTemplate, mockStyles };
    };

    it('should render markdown string through pipeline', async () => {
      const mocks = setupMocks();
      const markdown = '# Test Document\n\nThis is a test.';

      const result = await renderMarkdown(markdown);

      expect(parse).toHaveBeenCalledWith(markdown, {});
      expect(loadTemplate).toHaveBeenCalledWith(mocks.mockProfile, mocks.mockPathContext);
      expect(buildStyleBlock).toHaveBeenCalledWith(mocks.mockProfile, mocks.mockPathContext, {
        frontmatterCSS: undefined
      });
      expect(renderTemplate).toHaveBeenCalled();

      expect(result.html).toBe('<html><p>Test content</p></html>');
      expect(result.metadata).toEqual({ title: 'From Parser' });
    });

    it('should merge provided metadata with parsed metadata', async () => {
      setupMocks();

      parse.mockReturnValue({
        content: '# Test',
        html: '<p>Content</p>',
        metadata: { title: 'Parsed Title' }
      });

      const result = await renderMarkdown('# Test', {
        metadata: {
          author: 'Jane Doe',
          title: 'Override Title'
        }
      });

      expect(renderTemplate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          metadata: {
            title: 'Override Title',
            author: 'Jane Doe'
          }
        })
      );
    });

    it('should use specified profile', async () => {
      const customProfile = {
        id: 'custom',
        layout: { source: 'templates/custom.html' }
      };

      parse.mockReturnValue({
        content: '# Test',
        html: '<p>Content</p>',
        metadata: {}
      });

      loadProfileSync.mockReturnValue(customProfile);
      createPathContext.mockReturnValue({});
      findProjectRoot.mockReturnValue('/project');
      loadTemplate.mockResolvedValue('<html>{{content}}</html>');
      buildStyleBlock.mockResolvedValue('');
      renderTemplate.mockReturnValue('<html></html>');

      await renderMarkdown('# Test', { profile: 'custom' });

      expect(loadProfileSync).toHaveBeenCalledWith('custom', '/project', '/project');
    });

    it('should use custom project root', async () => {
      setupMocks();

      await renderMarkdown('# Test', { projectRoot: '/custom/root' });

      expect(createPathContext).toHaveBeenCalledWith({
        markdownDir: null,
        projectRoot: '/custom/root',
        manifestDir: undefined
      });
    });

    it('should handle empty markdown', async () => {
      setupMocks();

      parse.mockReturnValue({
        content: '',
        html: '',
        metadata: {}
      });

      const result = await renderMarkdown('');

      expect(result.html).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle parse errors', async () => {
      parse.mockImplementation(() => {
        throw new Error('Invalid markdown');
      });

      await expect(renderMarkdown('# Invalid'))
        .rejects
        .toThrow('Invalid markdown');
    });

    it('should pass options to parser', async () => {
      setupMocks();

      await renderMarkdown('# Test', {
        parseOptions: { gfm: true, breaks: true }
      });

      expect(parse).toHaveBeenCalledWith('# Test', {
        parseOptions: { gfm: true, breaks: true }
      });
    });

    it('should not require markdownPath in context', async () => {
      const mocks = setupMocks();

      await renderMarkdown('# Test');

      expect(createPathContext).toHaveBeenCalledWith({
        markdownDir: null,
        projectRoot: expect.any(String),
        manifestDir: undefined
      });
    });
  });

  describe('integration: renderDocument + renderMarkdown', () => {
    it('should produce similar output for file vs string rendering', async () => {
      const commonMarkdown = '# Test\n\nContent here.';
      const commonHtml = '<h1>Test</h1><p>Content here.</p>';
      const commonMetadata = { title: 'Test' };

      const mockProfile = {
        id: 'test',
        layout: { source: 'templates/test.html' }
      };

      const mockTemplate = '<html>{{content}}</html>';
      const mockStyles = '<style></style>';

      // Setup for renderDocument
      parseFile.mockResolvedValue({
        content: commonMarkdown,
        html: commonHtml,
        metadata: commonMetadata
      });

      // Setup for renderMarkdown
      parse.mockReturnValue({
        content: commonMarkdown,
        html: commonHtml,
        metadata: commonMetadata
      });

      loadProfileSync.mockReturnValue(mockProfile);
      createPathContext.mockReturnValue({ projectRoot: '/project' });
      findProjectRoot.mockReturnValue('/project');
      loadTemplate.mockResolvedValue(mockTemplate);
      buildStyleBlock.mockResolvedValue(mockStyles);
      renderTemplate.mockReturnValue('<html><h1>Test</h1><p>Content here.</p></html>');

      const fileResult = await renderDocument('/project/test.md');
      const stringResult = await renderMarkdown(commonMarkdown);

      expect(fileResult.html).toBe(stringResult.html);
      expect(fileResult.metadata).toEqual(stringResult.metadata);
    });
  });
});
