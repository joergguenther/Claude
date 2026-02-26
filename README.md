# JPMorgan Custody Holdings — DQ Exception Tracker

Interactive data quality monitoring dashboard for JPMorgan Chase daily custody holdings reports.

## Overview

Single-file HTML dashboard (zero dependencies) that performs automated DQ scoring across 5 dimensions on custody position data and surfaces exceptions with full drill-down, JIRA integration, and root cause analysis.

## DQ Dimensions Scored

| Dimension | Score | Rules |
|-----------|-------|-------|
| Completeness | 100% | All 63 fields populated (FI-only fields scoped to Fixed Income rows) |
| Validity | 100% | ISIN (ISO 6166), dates (ISO 8601), currencies (ISO 4217), quantities, prices |
| Consistency | 94.33% | MV cross-checks, FX conversion, PnL, qty balance, currency match |
| Uniqueness | 100% | Report IDs, position keys, tax lot IDs |
| Timeliness | 100% | Price date and report date vs position date |
| **Overall** | **98.87%** | |

## Data Source

- **File**: `JPMORGAN_CUSTODY_DAILY_HOLDINGS_v1.xlsx`
- **Report Date**: 2025-03-14
- **Positions**: 50 across 5 sub-accounts (2 master accounts)
- **Fields**: 63 columns per position
- **Asset Types**: 36 Equity, 14 Fixed Income
- **Currencies**: USD, EUR, CHF, JPY, GBP
- **Total AUM**: ~$79.2M

## Exceptions Detected

- **14 High** — Rule CR-001 (MV = Qty × Price): All fixed income positions fail because bonds use face-value pricing convention (MV = face × price ÷ 100)
- **3 Low** — Rule CR-004 (Qty Balance): Settled ≠ Available with no pledge/loan (JNJ, Nestlé, Roche)

## Features

- **Exceptions Tab**: Sortable/filterable table + Kanban board views, detail slide-over with calculation breakdowns
- **DQ Monitoring Tab**: Dimension score rings, fund-level breakdown, consistency & validity rule detail tables
- **Analytics Tab**: Distribution charts by fund/rule/status/security type, root cause analysis with recommended fixes
- **JIRA Integration**: Create tickets with pre-populated fields and DQ rule traceability
- **Comment System**: Activity log per exception with inline commenting

## Usage

Open `jpmc-dq-dashboard.html` in any modern browser. No build step, no dependencies, no server required.

## Tech Stack

- Vanilla JavaScript with lightweight `h()` DOM helper
- State-driven single-pass rendering
- SVG-based DQ score rings
- Google Fonts (DM Sans, JetBrains Mono)
