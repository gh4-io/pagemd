---
# =============================================================================
# USER GUIDE TEMPLATE DEMO
# =============================================================================
# Demonstrates user-guide layout: title page, copyright, TOC, chapters,
# callouts, procedures, FAQ, and index.

# Document Identity
title: "Data Management Console"
profile: "../profiles/user-guide.json"
subtitle: "User's Guide"
short_title: "DMC User Guide"

# Document Classification
document_type: "User's Guide"
product_name: "Enterprise Data Platform"
product_version: "8.2"
module_name: "Data Management Console"

# Version Information
version: "8.2"
release_date: "2024-11-01"

# Company Information
company_name: "DataStream Technologies Ltd."
company_short: "DataStream"
copyright_year: 2024
copyright_holder: "DataStream Technologies Ltd."

# Layout Configuration
layout: user-guide
page_size: letter
orientation: portrait

# TOC Configuration
toc: true
toc_levels: 3
toc_title: "Contents"

# Callout Styling
callouts:
  note:
    prefix: "Note:"
    background: "#fef3c7"
    border_color: "#f59e0b"
  warning:
    prefix: "WARNING:"
    background: "#fee2e2"
    border_color: "#dc2626"
  caution:
    prefix: "CAUTION:"
    background: "#fef9c3"
    border_color: "#ca8a04"

styles:

# Index Configuration
index:
  enabled: true
  title: "Index"
  columns: 2
---

<!-- Title Page -->

::: {.title-page}

::: {.document-series}
**Enterprise Data Platform User's Guide**
:::

::: {.main-title}
# Data Management Console
:::

::: {.version-info}
**Version 8.2**
:::

::: {.company-name}
**DataStream Technologies Ltd.**
:::



<!-- ::BREAK -->

<!-- Copyright Page -->

::: {.copyright-page}

# Copyright Notice

Copyright 2024 by DataStream Technologies Ltd. All rights reserved.

This software and documentation are proprietary. Reverse engineering is prohibited. Information may change without notice due to continued product development.

No part of this publication may be reproduced without prior written permission.

::: {.company-contact}
**DataStream Technologies Ltd.**
Cambridge CB4 0WS, United Kingdom
www.datastream-tech.com
:::

:::

<!-- ::BREAK -->

# Contents

<!-- ::TOC levels="2-3" -->

<!-- ::BREAK -->

# Data Management Console

*Path: Administration / Data Management Console*

## Overview

The <!-- ::INDEX term="Data Management Console" -->**Data Management Console** enables administrators to manage, monitor, and maintain enterprise data assets. The console provides a centralized interface for <!-- ::INDEX term="data governance" -->data governance, quality management, and lifecycle operations.

The platform uses a policy-based management system. Each time data is processed, administrators can define policies evaluated against the processing context. An action is associated with each policy, determining how the data should be handled.

::: {.warning}
**WARNING:** Automated cleanup operations only affect data within the managed scope. External data sources and integrations are not covered by automated processes.
:::

### Key Features

- **Automated data processing** - The framework acts as an intelligent data router, letting administrators focus on business requirements rather than technical implementation.
- **Advanced governance** - Configure data policies, track data lineage, and maintain compliance across the organization.

## Data Source Types

### Database Connections

<!-- ::INDEX term="Database Connections" -->Database connections enable direct integration with relational databases for data extraction and loading.

::: {.note}
**Note:** All database connections require valid credentials stored in the secure credential vault. Connection strings are encrypted at rest.
:::

::: {.caution}
**CAUTION:** Modifying connection parameters on production sources may cause service interruptions. Always test changes in a non-production environment first.
:::

### File System Sources

File system sources monitor directories for data files matching configured patterns.

Supported formats: CSV, JSON, XML, Parquet, Avro

### API Integrations

<!-- ::INDEX term="API Integrations" -->REST API integrations support OAuth 2.0, API key, certificate-based, and custom header authentication.

<!-- ::BREAK -->

## Explorer Tab

The <!-- ::INDEX term="Explorer Tab" -->**Explorer** tab displays managed data assets in three panels: Search Filter, Search Results, and Metadata/Preview.

| Button | Description |
|:-------|:------------|
| Search | Search for data assets matching filter criteria |
| Clear Filter | Reset all filter settings |
| Open | View selected asset details |
| Delete | Remove selected assets (confirmation required) |
| Export | Export asset definitions |

### Search Filter Panel

| Field | Description |
|:------|:------------|
| Asset ID | Primary identification code |
| Source Type | Data source type (Database, File, API) |
| Owner | Owning department or team |
| Classification | Data classification level |
| Status | Asset status (Active, Inactive, Archived) |

## Policy Management Tab

The <!-- ::INDEX term="Policy Management" -->**Policy Management** tab defines rules for processing, classifying, and governing data assets.

Policies are evaluated by priority order. The first matching policy determines the action taken.

| Button | Description |
|:-------|:------------|
| Add | Create a new policy |
| Edit | Modify selected policy |
| Delete | Remove selected policy |
| New Condition | Add condition to policy |

<!-- ::BREAK -->

## Adding a New Data Source

<!-- ::INDEX term="Add New Source" -->Follow this procedure to register a new data source.

**Steps:**

1. Open Data Management Console from Administration menu.
2. Click the **Configuration** tab.
3. Click **Add Source** to open the Add New Source dialog.
4. Enter required fields:
   - Source Name
   - Source Type
   - Connection details
5. Click **Test Connection** to verify settings.
6. Click **OK** to save, or **Cancel** to discard.

The new source appears in the sources list and is ready for use.

## Frequently Asked Questions

**How do I connect to a new database?**

Navigate to Configuration > Connection Settings and click Add Connection. Enter connection details and test before saving.

**Can I import policy configurations from another environment?**

Yes. Export policies as JSON, then import them in the target environment.

**What happens when no policies match a data asset?**

The default action specified in Configuration > Default Actions is applied.

**How long is data retained?**

Default retention is 90 days, configurable via system parameters and overridable per data source.

<!-- ::BREAK -->

# Index

<!-- ::INDEX -->
