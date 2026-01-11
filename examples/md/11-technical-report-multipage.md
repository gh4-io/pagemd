---
# =============================================================================
# TECHNICAL FORM TEMPLATE DEMO
# =============================================================================
# Demonstrates: form header, revision box, task info, safety callouts,
# procedure steps, torque table, and sign-off blocks.

# Document Identity
title: "Main Landing Gear Inspection Procedure"
profile: "../profiles/technical-form.json"
short_title: "MLG Inspection"
document_type: "Technical Procedure"
form_type: "Engineering Order"

# Document Control
document_number: "EO-2024-MLG-047"
revision_number: "Rev.03"
issue_date: "2024-12-01"
effective_date: "2024-12-15"

# Form Header
form_id: "FORM: EO-147"
form_revision: "3"
form_date: "2024-12-01"

# Task Card Information
task_card_number: "TC-MLG-2024-003"
ata_chapter: "32"
ata_section: "32-10-00"
task_type: "Scheduled Maintenance"

# Aircraft Applicability
aircraft:
  model: "Boeing 777-300ER"
  effectivity: "All aircraft in fleet"

# Compliance
compliance:
  mpd_reference: "32-10-00-601"
  interval: "C-Check or 6000FH"

# Revision History
revisions:
  - rev: "03"
    date: "2024-12-01"
    author: "J. Martinez"
    description: "Updated torque values per Boeing SB 777-32-0089"
  - rev: "02"
    date: "2024-06-15"
    author: "S. Anderson"
    description: "Added alternate grease specification"
  - rev: "01"
    date: "2024-01-10"
    author: "J. Martinez"
    description: "Initial issue"

# Organization
organization: "Pacific Aviation Maintenance"

# Approval Chain
prepared_by:
  name: "Jorge Martinez"
  title: "Senior Structures Engineer"
  license: "EASA B1.1 - 12345"
  date: "2024-11-25"

reviewed_by:
  name: "Dr. Sarah Anderson"
  title: "Chief Engineer"
  license: "EASA B1.1/B2 - 67890"
  date: "2024-11-28"

approved_by:
  name: "Michael Chen"
  title: "Director of Maintenance"
  approval_number: "DOA-PAM-2024"
  date: "2024-12-01"

# Layout
layout: technical-form
page_size: letter
orientation: portrait
---

<!-- Form Header Block -->

::: {.document-header}

| Technical Procedure | | FORM: EO-147 |
|:--------------------|:-:|----------------------:|
| | | REV: 3 |
| **Pacific Aviation Maintenance** | | DATE: 2024-12-01 |

:::

::: {.title-block}

## No. TC-MLG-2024-003 | Rev.03

# Main Landing Gear Inspection Procedure

:::

<!-- Task Info and Applicability -->

::: {.applicability-box}

| **Aircraft Type:** Boeing 777-300ER | **ATA Chapter:** 32-10-00 |
|:------------------------------------|:--------------------------|
| **Effectivity:** All aircraft in fleet | **Task Type:** Scheduled Maintenance |
| **MPD Reference:** 32-10-00-601 | **Interval:** C-Check or 6000FH |
| **Zones:** 131, 132, 133 | **Access:** MLG bay doors |

:::

## 1. Purpose

This procedure establishes the inspection and lubrication requirements for the Main Landing Gear (MLG) assembly on Boeing 777-300ER aircraft.

## 2. Safety Precautions

::: {.warning}
**WARNING**

Before starting work, ensure:
- Aircraft is properly grounded
- Hydraulic system is depressurized
- Aircraft is on approved jacks/stands
- Personnel are clear of gear movement zone

Failure to follow safety procedures may result in serious injury or death.
:::

::: {.caution}
**CAUTION**

Do not exceed specified torque values. Use only approved lubricants as specified in this procedure.
:::

::: {.note}
**NOTE**

This procedure requires two certified technicians minimum. Estimated duration: 4.5 hours.
:::

## 3. Inspection Procedure

**Step 1.** Position aircraft in maintenance hangar on level surface. Install wheel chocks and apply parking brake.

**Step 2.** Depressurize hydraulic systems. Verify accumulators are discharged and install lockout tags.

**Step 3.** Remove MLG doors per AMM 32-60-00. Install protective covers on brake assemblies.

**Step 4.** Inspect trunnion assembly for corrosion, cracks, and wear marks per SRM 32-10-00.

**HOLD POINT** - Quality Inspector verification required.

**Step 5.** Inspect shock strut chrome plating for peeling, pitting, or scoring. Check seal condition for leakage. Verify extension is 12-14 inches.

**Step 6.** Clean grease fittings with approved solvent. Apply MIL-PRF-81322G grease until new grease emerges from relief. Wipe excess.

<!-- ::BREAK -->

## 4. Torque Values

| Location | Fastener | Torque (Nm) | Torque (ft-lb) |
|:---------|:---------|:------------|:---------------|
| Trunnion Pin - Upper | AN8-32A | 340 ± 17 | 251 ± 13 |
| Trunnion Pin - Lower | AN8-32A | 340 ± 17 | 251 ± 13 |
| Drag Brace Upper | AN7-21A | 190 ± 10 | 140 ± 7 |
| Shock Strut Upper | AN10-40A | 475 ± 24 | 350 ± 18 |

All critical fasteners: torque to 50% first, then to 100% in same sequence.

## 5. Functional Test

| Step | Action | Expected Result |
|:-----|:-------|:----------------|
| 1 | Apply hydraulic pressure | System at 3000 psi |
| 2 | Command gear UP | Retracts within 12 sec |
| 3 | Verify UP indication | Three green lights |
| 4 | Command gear DOWN | Extends within 15 sec |
| 5 | Verify downlock | Mechanical indication OK |

After test, inspect all work areas for hydraulic leakage and grease migration.

## 6. Revision History

| Rev | Date | Description | Author |
|:----|:-----|:------------|:-------|
| 03 | 2024-12-01 | Updated torque values per SB 777-32-0089 | J. Martinez |
| 02 | 2024-06-15 | Added alternate grease specification | S. Anderson |
| 01 | 2024-01-10 | Initial issue | J. Martinez |

## 7. Approval Block

::: {.approval-block}

| Role | Name | License/Auth | Signature | Date |
|:-----|:-----|:-------------|:----------|:-----|
| Prepared By | Jorge Martinez | EASA B1.1 - 12345 | _______________ | 2024-11-25 |
| Reviewed By | Dr. Sarah Anderson | EASA B1.1/B2 - 67890 | _______________ | 2024-11-28 |
| Approved By | Michael Chen | DOA-PAM-2024 | _______________ | 2024-12-01 |

:::

---

::: {.footer-notice}
**Pacific Aviation Maintenance** | Engineering Department | Los Angeles, CA

This document is the property of Pacific Aviation Maintenance.
:::
