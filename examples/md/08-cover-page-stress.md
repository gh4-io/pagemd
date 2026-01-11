---
# =============================================================================
# COVER PAGE LAYOUT STRESS TEST
# =============================================================================
# Demonstrates cover-page template features: classification banners, document
# type badge, title/subtitle, risk indicator, key metrics, organization info.

# Document Identity
title: "Annual Security Assessment Report"
profile: "../profiles/cover-page.json"
subtitle: "Comprehensive Vulnerability Analysis and Risk Evaluation"
document_type: "Security Assessment Report"
document_number: "SAR-2024-Q4-001"
fiscal_year: "FY2024"
quarter: "Q4"

# Security Classification
classification: "CONFIDENTIAL"
handling_instructions: "Handle in accordance with Information Security Policy ISP-003"
dissemination_control: "Distribution limited to Security Operations and Executive Leadership"

# Version and Status
version: "1.0-FINAL"
status: "APPROVED"

# Author
author: "Security Operations Center"
lead_analyst: "Alexandra Reyes, CISSP, CISM"

# Organization
organization: "Meridian Financial Services"

# Risk Metrics (displayed in cover page risk indicator)
executive_metrics:
  overall_risk_score: 72
  risk_rating: "MODERATE"
  critical_findings: 3
  high_findings: 12
  medium_findings: 47
  low_findings: 89
  previous_score: 68
  trend: "IMPROVING"

# Cover Page Design
cover_design:
  style: "executive"
  background: "gradient"
  gradient_start: "#1a1a2e"
  gradient_end: "#16213e"
  accent_color: "#e94560"
  classification_banner: true
  banner_color: "#ff0000"

# Layout Configuration
layout: cover-page
page_size: letter
orientation: portrait
margins:
  top: 0
  bottom: 0
  left: 0
  right: 0

# Header/Footer (cover page typically has none)
header:
  show: false
footer:
  show: false
---

<!-- Cover Page - Full Bleed Design -->

::: {.cover-page .full-bleed}

::: {.classification-header}
**CONFIDENTIAL**
Handle in accordance with Information Security Policy ISP-003
:::

::: {.cover-content}

::: {.document-type-badge}
SECURITY ASSESSMENT REPORT
:::

::: {.cover-title}
# Annual Security Assessment Report
:::

::: {.cover-subtitle}
## Comprehensive Vulnerability Analysis and Risk Evaluation

**Fourth Quarter 2024**
Assessment Period: October 1 - December 31, 2024
:::

::: {.risk-indicator}
::: {.risk-score}
72
:::
::: {.risk-label}
OVERALL RISK SCORE
:::
::: {.risk-rating}
MODERATE RISK
:::
::: {.risk-trend}
↑ Improving from Q3 (68)
:::
:::

::: {.key-metrics-row}
| Critical | High | Medium | Low |
|:--------:|:----:|:------:|:---:|
| **3** | **12** | **47** | **89** |
:::

::: {.cover-footer}

::: {.organization-info}
**Meridian Financial Services**
Security Operations Center
:::

::: {.document-info}
Document No: SAR-2024-Q4-001
Version: 1.0-FINAL
Classification: CONFIDENTIAL
:::

:::

:::

::: {.classification-footer}
Distribution limited to Security Operations and Executive Leadership
:::

:::
