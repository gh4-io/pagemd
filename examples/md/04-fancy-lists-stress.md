---
title: Fancy Lists Stress Test
profile: "../profiles/legal.json"
fancy_lists: true
---

# Fancy Lists Stress Test

This document tests all fancy list features to ensure proper rendering.

## Uppercase Letters

A.  First item with uppercase letter
B.  Second item with uppercase letter
C.  Third item with uppercase letter
D.  Fourth item with uppercase letter

## Lowercase Letters

a. First item with lowercase letter
b. Second item with lowercase letter
c. Third item with lowercase letter
d. Fourth item with lowercase letter

## Uppercase Roman Numerals

I.  First item with uppercase Roman
II.  Second item with uppercase Roman
III.  Third item with uppercase Roman
IV.  Fourth item with uppercase Roman
V.  Fifth item with uppercase Roman

## Lowercase Roman Numerals

i. First item with lowercase Roman
ii. Second item with lowercase Roman
iii. Third item with lowercase Roman
iv. Fourth item with lowercase Roman
v. Fifth item with lowercase Roman

## Mixed Nested Lists

I.  Top-level Roman numeral
   A.  Nested uppercase letter
      1. Nested number
      2. Another nested number
   B.  Second nested letter
      i. Nested lowercase Roman
      ii. Another nested lowercase Roman
II.  Second top-level Roman
   A.  Another nested uppercase
      a. Triple nested lowercase letter
      b. Another triple nested

## Continuation with Hash

1. First numbered item
2. Second numbered item

Some intervening text to test list continuation.

#. Third item (auto-continues as 3)
#. Fourth item (auto-continues as 4)
#. Fifth item (auto-continues as 5)

## Custom Start Values

5. Starting at five
6. Six follows
7. Seven follows

## Legal Document Example

i. Party A agrees to provide services as described in Exhibit A
ii. Party B shall pay compensation within thirty (30) days of invoice
iii. Either party may terminate this agreement with ninety (90) days written notice
iv. This agreement shall be governed by the laws of the State of California

## Technical Specification Example

A.  Hardware Requirements
   1. Minimum 8GB RAM
   2. 256GB SSD storage
   3. Dual-core processor minimum
   4. Display resolution 1920x1080 or higher

B.  Software Requirements
   1. Node.js version 20 or later
   2. Chrome or Chromium browser
   3. Git version control system

C.  Network Requirements
   1. Broadband internet connection
   2. Firewall rules allowing port 443
   3. DNS resolution configured

## Academic Outline Example

I.  Introduction
   A.  Background and Context
   B.  Problem Statement
   C.  Research Questions
      i. Primary research question
      ii. Secondary research questions
      iii. Hypotheses to be tested

II.  Literature Review
   A.  Historical Context
      1. Early studies (1990-2000)
      2. Modern research (2000-present)
   B.  Current State of Knowledge
   C.  Identified Gaps

III.  Methodology
   A.  Research Design
   B.  Data Collection Methods
      i. Quantitative methods
      ii. Qualitative methods
   C.  Analysis Procedures

IV.  Expected Results
   A.  Primary Outcomes
   B.  Secondary Outcomes

## Standard Operating Procedure Example

A.  Pre-Deployment Checklist
   1. Run full test suite
   2. Review code changes
   3. Update version numbers
   4. Update CHANGELOG.md

B.  Deployment Steps
   i. Create production backup
   ii. Deploy to staging environment
   iii. Execute smoke tests on staging
   iv. Deploy to production environment
   v. Monitor error logs for 15 minutes

C.  Post-Deployment Verification
   1. Verify all services running
   2. Check database migrations completed
   3. Confirm monitoring alerts active
   4. Update status page

## Long List Stress Test

a. Item one - testing long list rendering
b. Item two - testing long list rendering
c. Item three - testing long list rendering
d. Item four - testing long list rendering
e. Item five - testing long list rendering
f. Item six - testing long list rendering
g. Item seven - testing long list rendering
h. Item eight - testing long list rendering
i. Item nine - testing long list rendering
j. Item ten - testing long list rendering
k. Item eleven - testing long list rendering
l. Item twelve - testing long list rendering
m. Item thirteen - testing long list rendering
n. Item fourteen - testing long list rendering
o. Item fifteen - testing long list rendering
p. Item sixteen - testing long list rendering
q. Item seventeen - testing long list rendering
r. Item eighteen - testing long list rendering
s. Item nineteen - testing long list rendering
t. Item twenty - testing long list rendering
u. Item twenty-one - testing long list rendering
v. Item twenty-two - testing long list rendering
w. Item twenty-three - testing long list rendering
x. Item twenty-four - testing long list rendering
y. Item twenty-five - testing long list rendering
z. Item twenty-six - testing long list rendering

## Mixed Content in Lists

I.  First section with **bold text**
II.  Second section with *italic text*
III.  Third section with `inline code`
IV.  Fourth section with [links](https://example.com)

## Lists with Inline Attributes

A.  Important item {.highlight}
B.  Regular item
C.  Another important item {#special-item}
D.  Item with multiple attributes {.warning .bold #warn-1}

## Deeply Nested Example

I.  Level 1 - Roman
   A.  Level 2 - Uppercase letter
      i. Level 3 - Lowercase Roman
         a. Level 4 - Lowercase letter
            1. Level 5 - Number
            2. Level 5 - Number
         b. Level 4 - Lowercase letter
      ii. Level 3 - Lowercase Roman
   B.  Level 2 - Uppercase letter
II.  Level 1 - Roman

## Edge Cases

### Empty First Item

A.
B.  Second item has content
C.  Third item has content

### Single Item Lists

Just one uppercase letter:
X.  Only item

Just one lowercase Roman:
ix. Only item

Just one lowercase letter:
z. Only item

### Multiple Paragraphs in List Items

A.  First paragraph in first item.

   Second paragraph in first item with proper indentation.

B.  First paragraph in second item.

   Second paragraph in second item with proper indentation.

## Standard Lists Still Work

When fancy_lists is enabled, standard lists should still render:

1. Standard numbered list
2. Second item
3. Third item

- Unordered list
- Second bullet
- Third bullet

## Conclusion

This stress test document validates all fancy list features:

- ✓ Uppercase letters (A-Z)
- ✓ Lowercase letters (a-z)
- ✓ Uppercase Roman (I-X)
- ✓ Lowercase Roman (i-x)
- ✓ Nested lists
- ✓ Continuation with #
- ✓ Custom start values
- ✓ Mixed content
- ✓ Inline attributes
- ✓ Deep nesting
- ✓ Edge cases
- ✓ Standard lists compatibility
