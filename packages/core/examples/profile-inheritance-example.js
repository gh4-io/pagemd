/**
 * Profile Inheritance Example
 *
 * Demonstrates how profile inheritance works with the profile-loader module
 */

import { loadAndMergeProfile, mergeProfiles } from '../src/profile-loader.js';

// Example 1: Manual merge (without file loading)
console.log('=== Example 1: Manual Profile Merge ===\n');

const baseProfile = {
  id: 'base',
  layout: {
    page: { width: '8.5in', height: '11in' },
    margins: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
  },
  outputs: {
    pdf: { enabled: true, mode: 'ACTIVE_ONLY' },
    html: { enabled: true, mode: 'ACTIVE_ONLY' },
    png: { enabled: false },
    jpeg: { enabled: false }
  },
  resources: {
    css: ['base.css'],
    fonts: []
  }
};

const standardLetterProfile = {
  id: 'standard_letter',
  extends: 'base',
  description: 'US Letter size with standard margins',
  resources: {
    css: ['base.css', 'standard.css']
  }
};

const merged = mergeProfiles(baseProfile, standardLetterProfile);
console.log('Base + Standard Letter merged:');
console.log(JSON.stringify(merged, null, 2));

console.log('\n=== Example 2: Three-Level Inheritance ===\n');

const companyProfile = {
  id: 'company_letter',
  extends: 'standard_letter',
  description: 'Company letterhead with custom styles',
  resources: {
    css: ['base.css', 'standard.css', 'company.css'],
    fonts: ['fonts/company.woff2']
  },
  layout: {
    margins: { top: '2in' }  // More top margin for letterhead
  }
};

// Merge chain: base <- standard_letter <- company_letter
const step1 = mergeProfiles(baseProfile, standardLetterProfile);
const step2 = mergeProfiles(step1, companyProfile);

console.log('Final company profile (3-level inheritance):');
console.log(JSON.stringify(step2, null, 2));

console.log('\n=== Key Behaviors ===');
console.log('1. Objects deep-merge: margins.top overridden but margins.left preserved');
console.log('2. Arrays replace: css array completely replaced at each level');
console.log('3. Leaf properties override: description overridden');
console.log('\n✓ Examples complete');
