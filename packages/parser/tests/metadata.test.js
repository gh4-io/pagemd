/**
 * Tests for metadata normalization
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeKey,
  normalizeValue,
  applyDefaults,
  normalizeMetadata,
  FIELD_ALIASES
} from '../src/metadata.js';

describe('normalizeKey', () => {
  it('should convert camelCase to snake_case', () => {
    expect(normalizeKey('documentId')).toBe('document_id');
    expect(normalizeKey('effectiveDate')).toBe('effective_date');
    expect(normalizeKey('pipelineProfile')).toBe('pipeline_profile');
  });

  it('should convert kebab-case to snake_case', () => {
    expect(normalizeKey('document-id')).toBe('document_id');
    expect(normalizeKey('effective-date')).toBe('effective_date');
    expect(normalizeKey('pipeline-profile')).toBe('pipeline_profile');
  });

  it('should convert spaces to underscores', () => {
    expect(normalizeKey('document id')).toBe('document_id');
    expect(normalizeKey('effective date')).toBe('effective_date');
  });

  it('should lowercase keys', () => {
    expect(normalizeKey('DOCUMENT_ID')).toBe('document_id');
    expect(normalizeKey('Title')).toBe('title');
  });

  it('should handle already normalized keys', () => {
    expect(normalizeKey('document_id')).toBe('document_id');
    expect(normalizeKey('title')).toBe('title');
  });

  it('should handle complex mixed formats', () => {
    expect(normalizeKey('My-Document ID')).toBe('my_document_id');
    expect(normalizeKey('someComplexKey-Name')).toBe('some_complex_key_name');
  });
});

describe('normalizeValue', () => {
  const FIELD_DEFS = {
    document_id: { type: 'string', trim: true },
    title: { type: 'string', trim: true },
    revision: { type: 'number', coerce: true },
    effective_date: { type: 'date' },
    tags: { type: 'array', items: 'string' }
  };

  describe('string normalization', () => {
    it('should trim string values', () => {
      expect(normalizeValue('title', '  Test Title  ', FIELD_DEFS)).toBe('Test Title');
      expect(normalizeValue('document_id', ' DOC-001 ', FIELD_DEFS)).toBe('DOC-001');
    });

    it('should convert non-string to string when trim is true', () => {
      expect(normalizeValue('title', 123, FIELD_DEFS)).toBe('123');
    });

    it('should handle empty strings', () => {
      expect(normalizeValue('title', '', FIELD_DEFS)).toBe('');
    });
  });

  describe('number coercion', () => {
    it('should coerce string to number', () => {
      expect(normalizeValue('revision', '5', FIELD_DEFS)).toBe(5);
      expect(normalizeValue('revision', '3.14', FIELD_DEFS)).toBe(3.14);
    });

    it('should handle already numeric values', () => {
      expect(normalizeValue('revision', 10, FIELD_DEFS)).toBe(10);
    });

    it('should trim before coercing', () => {
      expect(normalizeValue('revision', '  42  ', FIELD_DEFS)).toBe(42);
    });

    it('should return original value if not parseable', () => {
      expect(normalizeValue('revision', 'not-a-number', FIELD_DEFS)).toBe('not-a-number');
    });

    it('should handle floats vs integers', () => {
      expect(normalizeValue('revision', '3.5', FIELD_DEFS)).toBe(3.5);
      expect(normalizeValue('revision', '3', FIELD_DEFS)).toBe(3);
    });
  });

  describe('date normalization', () => {
    it('should format Date objects to MM/DD/YYYY', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = normalizeValue('effective_date', date, FIELD_DEFS);
      expect(result).toBe('01/15/2024');
    });

    it('should parse ISO 8601 date strings', () => {
      const result = normalizeValue('effective_date', '2024-01-15T12:00:00Z', FIELD_DEFS);
      expect(result).toBe('01/15/2024');
    });

    it('should parse MM/DD/YYYY format', () => {
      expect(normalizeValue('effective_date', '01/15/2024', FIELD_DEFS)).toBe('01/15/2024');
      expect(normalizeValue('effective_date', '1/5/2024', FIELD_DEFS)).toBe('01/05/2024');
    });

    it('should parse MM/DD/YY format', () => {
      expect(normalizeValue('effective_date', '01/15/24', FIELD_DEFS)).toBe('01/15/2024');
      expect(normalizeValue('effective_date', '1/5/24', FIELD_DEFS)).toBe('01/05/2024');
    });

    it('should parse MM-DD-YYYY format', () => {
      expect(normalizeValue('effective_date', '01-15-2024', FIELD_DEFS)).toBe('01/15/2024');
    });

    it('should parse DD MMM YYYY format', () => {
      const result = normalizeValue('effective_date', '15 Jan 2024', FIELD_DEFS);
      expect(result).toBe('01/15/2024');
    });

    it('should return original value for invalid dates', () => {
      expect(normalizeValue('effective_date', 'invalid-date', FIELD_DEFS)).toBe('invalid-date');
    });

    it('should handle empty date strings', () => {
      expect(normalizeValue('effective_date', '', FIELD_DEFS)).toBe('');
    });
  });

  describe('array normalization', () => {
    it('should preserve arrays', () => {
      const tags = ['tag1', 'tag2', 'tag3'];
      expect(normalizeValue('tags', tags, FIELD_DEFS)).toEqual(tags);
    });

    it('should trim string items in arrays', () => {
      const tags = ['  tag1  ', ' tag2', 'tag3 '];
      expect(normalizeValue('tags', tags, FIELD_DEFS)).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should convert single value to array', () => {
      expect(normalizeValue('tags', 'single-tag', FIELD_DEFS)).toEqual(['single-tag']);
    });

    it('should preserve non-string array items', () => {
      const mixed = ['string', 123, true];
      const result = normalizeValue('tags', mixed, FIELD_DEFS);
      expect(result).toEqual(['string', 123, true]);
    });
  });

  describe('undefined fields', () => {
    it('should return value as-is for undefined fields', () => {
      expect(normalizeValue('unknown_field', 'value', FIELD_DEFS)).toBe('value');
      expect(normalizeValue('unknown_field', 123, FIELD_DEFS)).toBe(123);
    });
  });

  describe('null and undefined values', () => {
    it('should preserve null values', () => {
      expect(normalizeValue('title', null, FIELD_DEFS)).toBeNull();
    });

    it('should preserve undefined values', () => {
      expect(normalizeValue('title', undefined, FIELD_DEFS)).toBeUndefined();
    });
  });
});

describe('applyDefaults', () => {
  const DEFAULTS = {
    document_id: '',
    title: '',
    revision: 0,
    status: 'Draft',
    tags: []
  };

  it('should apply default values for missing fields', () => {
    const metadata = { title: 'Test' };
    const result = applyDefaults(metadata, DEFAULTS);

    expect(result.title).toBe('Test');
    expect(result.document_id).toBe('');
    expect(result.revision).toBe(0);
    expect(result.status).toBe('Draft');
    expect(result.tags).toEqual([]);
  });

  it('should not override existing values', () => {
    const metadata = {
      title: 'My Title',
      status: 'Published',
      revision: 5
    };
    const result = applyDefaults(metadata, DEFAULTS);

    expect(result.title).toBe('My Title');
    expect(result.status).toBe('Published');
    expect(result.revision).toBe(5);
  });

  it('should preserve extra fields not in defaults', () => {
    const metadata = {
      title: 'Test',
      custom_field: 'custom_value'
    };
    const result = applyDefaults(metadata, DEFAULTS);

    expect(result.custom_field).toBe('custom_value');
  });

  it('should handle empty metadata object', () => {
    const result = applyDefaults({}, DEFAULTS);

    expect(result).toEqual(DEFAULTS);
  });

  it('should not mutate original metadata', () => {
    const metadata = { title: 'Test' };
    const result = applyDefaults(metadata, DEFAULTS);

    expect(metadata).toEqual({ title: 'Test' });
    expect(result).not.toBe(metadata);
  });
});

describe('normalizeMetadata', () => {
  it('should normalize keys and apply aliases', () => {
    const raw = {
      docId: 'DOC-001',
      rev: '5',
      layoutTemplate: 'custom'
    };

    const result = normalizeMetadata(raw);

    expect(result.document_id).toBe('DOC-001');
    expect(result.revision).toBe(5);
    expect(result.pipeline_profile).toBe('custom');
  });

  it('should normalize values based on type', () => {
    const raw = {
      title: '  Test Document  ',
      revision: '10',
      effective_date: '01/15/2024',
      tags: 'single-tag'
    };

    const result = normalizeMetadata(raw);

    expect(result.title).toBe('Test Document');
    expect(result.revision).toBe(10);
    expect(result.effective_date).toBe('01/15/2024');
    expect(result.tags).toEqual(['single-tag']);
  });

  it('should apply defaults for missing fields', () => {
    const raw = {
      title: 'Test'
    };

    const result = normalizeMetadata(raw);

    expect(result.title).toBe('Test');
    expect(result.document_id).toBe('');
    expect(result.revision).toBe(0);
    expect(result.status).toBe('Draft');
    expect(result.pipeline_profile).toBe('standard_letter');
  });

  it('should skip defaults when applyDefaults is false', () => {
    const raw = {
      title: 'Test'
    };

    const result = normalizeMetadata(raw, { applyDefaults: false });

    expect(result.title).toBe('Test');
    expect(result.document_id).toBeUndefined();
    expect(result.revision).toBeUndefined();
  });

  it('should handle all alias variations', () => {
    const raw1 = { doc_id: 'DOC-001' };
    const raw2 = { documentId: 'DOC-001' };
    const raw3 = { 'document-id': 'DOC-001' };

    expect(normalizeMetadata(raw1).document_id).toBe('DOC-001');
    expect(normalizeMetadata(raw2).document_id).toBe('DOC-001');
    expect(normalizeMetadata(raw3).document_id).toBe('DOC-001');
  });

  it('should handle complex real-world metadata', () => {
    const raw = {
      docId: 'SOP-2024-001',
      Title: '  Safety Procedures  ',
      Rev: '3',
      effectiveDate: '01/15/2024',
      Owner: 'John Doe  ',
      documentStatus: 'published',
      tags: ['safety', 'procedures', 'cvg'],
      category: 'Operations'
    };

    const result = normalizeMetadata(raw);

    expect(result.document_id).toBe('SOP-2024-001');
    expect(result.title).toBe('Safety Procedures');
    expect(result.revision).toBe(3);
    expect(result.effective_date).toBe('01/15/2024');
    expect(result.owner).toBe('John Doe');
    expect(result.status).toBe('published');
    expect(result.tags).toEqual(['safety', 'procedures', 'cvg']);
    expect(result.category).toBe('Operations');
  });

  it('should allow custom aliases', () => {
    const raw = { custom_field: 'value' };
    const customAliases = { custom_field: 'normalized_field' };

    const result = normalizeMetadata(raw, { aliases: customAliases });

    expect(result.normalized_field).toBe('value');
  });

  it('should allow custom defaults', () => {
    const raw = { title: 'Test' };
    const customDefaults = { title: '', custom_default: 'default_value' };

    const result = normalizeMetadata(raw, { defaults: customDefaults });

    expect(result.custom_default).toBe('default_value');
  });

  it('should allow custom field definitions', () => {
    const raw = { custom_number: '42' };
    const customFieldDefs = {
      custom_number: { type: 'number', coerce: true }
    };

    const result = normalizeMetadata(raw, { fieldDefs: customFieldDefs });

    expect(result.custom_number).toBe(42);
  });

  it('should handle empty metadata', () => {
    const result = normalizeMetadata({});

    expect(result.document_id).toBe('');
    expect(result.title).toBe('');
    expect(result.revision).toBe(0);
  });

  it('should preserve fields not in schema', () => {
    const raw = {
      title: 'Test',
      custom_field: 'custom_value',
      another_field: 123
    };

    const result = normalizeMetadata(raw);

    expect(result.custom_field).toBe('custom_value');
    expect(result.another_field).toBe(123);
  });
});

describe('FIELD_ALIASES', () => {
  it('should include document_id aliases', () => {
    expect(FIELD_ALIASES.doc_id).toBe('document_id');
    expect(FIELD_ALIASES.docId).toBe('document_id');
    expect(FIELD_ALIASES.documentId).toBe('document_id');
    expect(FIELD_ALIASES['document-id']).toBe('document_id');
  });

  it('should include revision aliases', () => {
    expect(FIELD_ALIASES.rev).toBe('revision');
    expect(FIELD_ALIASES.revisionNumber).toBe('revision');
    expect(FIELD_ALIASES.revision_number).toBe('revision');
  });

  it('should include pipeline_profile aliases', () => {
    expect(FIELD_ALIASES.layout_template).toBe('pipeline_profile');
    expect(FIELD_ALIASES.layoutTemplate).toBe('pipeline_profile');
    expect(FIELD_ALIASES.profile).toBe('pipeline_profile');
  });

  it('should include effective_date aliases', () => {
    expect(FIELD_ALIASES.date).toBe('effective_date');
    expect(FIELD_ALIASES.effectiveDate).toBe('effective_date');
  });

  it('should include status aliases', () => {
    expect(FIELD_ALIASES.documentStatus).toBe('status');
    expect(FIELD_ALIASES.document_status).toBe('status');
  });
});
