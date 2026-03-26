---
title: Advanced Tables Showcase
description: Demonstrates colspan, rowspan, multiline cells, headerless tables, captions, and utility classes.
---

# Advanced Tables

This document demonstrates PageMD's advanced table features powered by the MultiMarkdown table specification.

## Column Spanning (Colspan)

Use trailing empty pipes `||` to merge cells horizontally.

|             | Grouping              ||
| First Header | Second Header | Third Header |
|:------------ |:-------------:| ------------:|
| Content      | *Long Cell*          ||
| Content      | **Cell**      | Cell         |

## Row Spanning (Rowspan)

Use `^^` to merge a cell upward into the row above it.

| Stage        | Direct Products | ATP Yields |
| -----------: | --------------: | ---------: |
| Glycolysis   | 2 ATP                       ||
| ^^           | 2 NADH          | 3--5 ATP   |
| Pyruvate ox  | 2 NADH          | 5 ATP      |
| Krebs cycle  | 2 ATP                       ||
| ^^           | 6 NADH          | 15 ATP     |
| ^^           | 2 FADH2         | 3 ATP      |

## Combined Colspan and Rowspan

| A | B | C |
|---|---|---|
| Spans rows | Data 1 | Data 2 |
| ^^         | Wide cell       ||
| Normal     | X      | Y      |

## Multiline Cell Content

Use `\` at line end to continue content on the next line.

| Feature | Description |
|---------|-------------|
| Multiline \
  support | Cells can contain content that \
  spans multiple source lines for readability |
| Normal | Single line content |

## Headerless Tables

Start with the separator line (no header rows above it).

|---|---|---|
| A1 | B1 | C1 |
| A2 | B2 | C2 |
| A3 | B3 | C3 |

## Table Captions

Add a caption below the table with `Table:` or `:` prefix.

| Metric | Q1 | Q2 | Q3 | Q4 |
|--------|---:|---:|---:|---:|
| Revenue | 120 | 145 | 167 | 198 |
| Users   | 500 | 620 | 780 | 950 |

Table: Quarterly performance metrics for 2025

## Utility Classes

### Compact Table

| Key | Value | Description |
|-----|-------|-------------|
| timeout | 30s | Request timeout |
| retries | 3 | Max retry count |
| debug | false | Debug mode |
{.compact}

### Striped Table

| Name | Role | Department |
|------|------|------------|
| Alice | Engineer | Platform |
| Bob | Designer | Product |
| Carol | Manager | Operations |
| Dave | Analyst | Data |
{.striped}

### No-Border Table

| Feature | Status |
|---------|--------|
| Colspan | Supported |
| Rowspan | Supported |
| Captions | Supported |
{.no-border}

### Auto-Width Table

| Code | Meaning |
|------|---------|
| 200 | OK |
| 404 | Not Found |
| 500 | Server Error |
{.auto-width}

### Combined Classes

| Item | Price | Qty |
|------|------:|----:|
| Widget A | $12.50 | 100 |
| Widget B | $8.75 | 250 |
| Widget C | $15.00 | 75 |
{.compact .striped}
