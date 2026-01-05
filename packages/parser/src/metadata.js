/**
 * Metadata normalization utilities for PageMD
 * Handles key normalization, aliases, type coercion, and default values
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Field aliases (loaded from metadata.defaults.json)
export const FIELD_ALIASES = {
  doc_id: 'document_id',
  docId: 'document_id',
  documentId: 'document_id',
  'document-id': 'document_id',

  rev: 'revision',
  revisionNumber: 'revision',
  revision_number: 'revision',
  'revision-number': 'revision',

  layout_template: 'pipeline_profile',
  layoutTemplate: 'pipeline_profile',
  'layout-template': 'pipeline_profile',
  profile: 'pipeline_profile',

  date: 'effective_date',
  effectiveDate: 'effective_date',
  'effective-date': 'effective_date',

  documentStatus: 'status',
  document_status: 'status',
  'document-status': 'status'
};

// Default values (loaded from metadata.defaults.json)
const DEFAULT_VALUES = {
  document_id: '',
  title: '',
  revision: 0,
  status: 'Draft',
  effective_date: '',
  owner: '',
  approver: '',
  category: '',
  tags: [],
  pipeline_profile: 'standard_letter'
};

// Field type definitions (loaded from metadata.defaults.json)
const FIELD_DEFINITIONS = {
  document_id: { type: 'string', trim: true },
  title: { type: 'string', trim: true },
  revision: { type: 'number', coerce: true },
  status: { type: 'string', trim: true },
  effective_date: { type: 'date', formats: ['MM/DD/YYYY', 'MM/DD/YY', 'YYYY-MM-DD', 'MM-DD-YYYY', 'DD MMM YYYY', 'ISO8601'] },
  owner: { type: 'string', trim: true },
  approver: { type: 'string', trim: true },
  category: { type: 'string', trim: true },
  tags: { type: 'array', items: 'string' },
  pipeline_profile: { type: 'string', trim: true }
};

/**
 * Convert key to snake_case
 * @param {string} key - Key to normalize
 * @returns {string} snake_case key
 */
export function normalizeKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // camelCase -> snake_case
    .replace(/[-\s]+/g, '_')               // dashes/spaces -> underscores
    .toLowerCase();
}

/**
 * Parse date string to Date object
 * Supports multiple input formats
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();

  // Try ISO 8601 first
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // MM/DD/YYYY or MM/DD/YY
  const usFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const usMatch = trimmed.match(usFormat);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) return date;
  }

  // MM-DD-YYYY
  const dashFormat = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const dashMatch = trimmed.match(dashFormat);
  if (dashMatch) {
    const [, month, day, year] = dashMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) return date;
  }

  // DD MMM YYYY (e.g., "15 Jan 2024")
  const textFormat = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/;
  const textMatch = trimmed.match(textFormat);
  if (textMatch) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Format date to MM/DD/YYYY
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Normalize value based on field type definition
 * @param {string} key - Field key (normalized)
 * @param {*} value - Raw value to normalize
 * @param {object} fieldDefs - Field definitions (default: FIELD_DEFINITIONS)
 * @returns {*} Normalized value
 */
export function normalizeValue(key, value, fieldDefs = FIELD_DEFINITIONS) {
  const fieldDef = fieldDefs[key];
  if (!fieldDef) return value;

  // Handle null/undefined
  if (value === null || value === undefined) return value;

  const { type, trim, coerce, items } = fieldDef;

  // String normalization
  if (type === 'string') {
    const strValue = String(value);
    return trim ? strValue.trim() : strValue;
  }

  // Number coercion
  if (type === 'number' && coerce) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const num = trimmed.includes('.') ? parseFloat(trimmed) : parseInt(trimmed, 10);
      return isNaN(num) ? value : num;
    }
  }

  // Date normalization
  if (type === 'date') {
    if (value instanceof Date) {
      return formatDate(value);
    }
    if (typeof value === 'string') {
      const parsed = parseDate(value);
      return parsed ? formatDate(parsed) : value;
    }
  }

  // Array normalization
  if (type === 'array') {
    if (Array.isArray(value)) {
      // Trim string items if specified
      if (items === 'string') {
        return value.map(v => typeof v === 'string' ? v.trim() : v);
      }
      return value;
    }
    // Convert single value to array
    return [value];
  }

  return value;
}

/**
 * Apply default values for missing fields
 * @param {object} metadata - Metadata object to enhance
 * @param {object} defaults - Default values (default: DEFAULT_VALUES)
 * @returns {object} Metadata with defaults applied
 */
export function applyDefaults(metadata, defaults = DEFAULT_VALUES) {
  const result = { ...metadata };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (!(key in result)) {
      result[key] = defaultValue;
    }
  }

  return result;
}

/**
 * Normalize metadata object
 * - Converts keys to snake_case
 * - Resolves aliases
 * - Coerces types (numbers, dates)
 * - Trims strings
 * - Normalizes arrays
 * - Applies defaults
 *
 * @param {object} raw - Raw metadata from frontmatter
 * @param {object} options - Normalization options
 * @param {object} options.aliases - Custom aliases (default: FIELD_ALIASES)
 * @param {object} options.defaults - Custom defaults (default: DEFAULT_VALUES)
 * @param {object} options.fieldDefs - Custom field definitions (default: FIELD_DEFINITIONS)
 * @param {boolean} options.applyDefaults - Whether to apply defaults (default: true)
 * @returns {object} Normalized metadata
 */
export function normalizeMetadata(raw, options = {}) {
  const {
    aliases = FIELD_ALIASES,
    defaults = DEFAULT_VALUES,
    fieldDefs = FIELD_DEFINITIONS,
    applyDefaults: shouldApplyDefaults = true
  } = options;

  const normalized = {};

  // Process each field
  for (let [key, value] of Object.entries(raw)) {
    // Normalize key to snake_case
    let normalizedKey = normalizeKey(key);

    // Apply alias if exists
    if (aliases[normalizedKey]) {
      normalizedKey = aliases[normalizedKey];
    }

    // Normalize value based on field type
    const normalizedValue = normalizeValue(normalizedKey, value, fieldDefs);

    normalized[normalizedKey] = normalizedValue;
  }

  // Apply defaults for missing fields
  if (shouldApplyDefaults) {
    return applyDefaults(normalized, defaults);
  }

  return normalized;
}

/**
 * Load metadata defaults schema from file
 * @param {string} schemaPath - Path to metadata.defaults.json (optional)
 * @returns {Promise<object>} Schema object
 */
export async function loadMetadataSchema(schemaPath = null) {
  if (!schemaPath) {
    // Default path relative to project root
    const projectRoot = join(__dirname, '../../..');
    schemaPath = join(projectRoot, 'schemas/metadata.defaults.json');
  }

  const content = await readFile(schemaPath, 'utf-8');
  return JSON.parse(content);
}
