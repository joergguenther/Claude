# DQ Dashboards — Data Quality Exception Tracking

Interactive data quality monitoring and exception tracking dashboards for investment management operations.

## Repository Structure

```
├── dq-exception-tracker/
│   ├── ataccama-integration/
│   │   ├── dashboard.jsx          # React component — Ataccama ONE + JIRA integration
│   │   └── dashboard.html         # Standalone HTML — Ataccama ONE + JIRA (zero dependencies)
│   └── generic-dq-engine/
│       └── dashboard-dq.html      # De-branded HTML — generic "DQ Engine" + JIRA only
├── jpmc-custody-dq/
│   └── jpmc-dq-dashboard.html     # JPMorgan Custody Holdings DQ dashboard (real data)
├── data/
│   └── JPMORGAN_CUSTODY_DAILY_HOLDINGS_v1.xlsx   # Source data (50 positions, 63 fields)
└── README.md
```

## Dashboards

### 1. DQ Exception Tracker — Ataccama ONE Integration
**`dq-exception-tracker/ataccama-integration/`**

Full-featured exception tracker with bi-directional Ataccama ONE and JIRA integration.

| File | Format | Description |
|------|--------|-------------|
| `dashboard.jsx` | React | Component with hooks, state management, Tailwind styling |
| `dashboard.html` | HTML | Standalone single-file (~1000 lines), zero dependencies |

**Features:**
- 5 Ataccama monitoring projects (Custodian Recon, Securities Master, Corporate Actions, NAV, Bloomberg)
- 6 DQ dimensions per project with score rings (Completeness, Accuracy, Consistency, Timeliness, Uniqueness, Validity)
- One-click import: Ataccama DQ issues → dashboard exceptions
- Sync to Ataccama: update status, push comments, request re-evaluation
- JIRA ticket creation with DQ rule traceability
- Table + Board views, filters, sorting, detail slide-over, comment system
- Analytics: source/category breakdown, integration coverage, DQ scores by source

### 2. DQ Exception Tracker — Generic (De-branded)
**`dq-exception-tracker/generic-dq-engine/`**

Vendor-neutral version with all "Ataccama ONE" references replaced by "DQ Engine". JIRA-only integration settings.

### 3. JPMorgan Custody Holdings DQ Dashboard
**`jpmc-custody-dq/`**

Dashboard built from real custody data (`JPMORGAN_CUSTODY_DAILY_HOLDINGS_v1.xlsx`).

**DQ Scores (computed from 50 positions × 63 fields):**

| Dimension | Score | Findings |
|-----------|-------|----------|
| Completeness | 100.0% | All fields populated (FI-only fields scoped correctly) |
| Validity | 100.0% | ISIN, dates, currencies, quantities pass format checks |
| Consistency | 94.33% | 14 bond MV mismatches + 3 qty balance breaks |
| Uniqueness | 100.0% | No duplicate report IDs, position keys, or tax lot IDs |
| Timeliness | 100.0% | All price/report dates match position date |
| **Overall** | **98.87%** | **17 exceptions detected** |

**Exceptions:**
- **14 High** — Rule CR-001: Bond MV uses face-value pricing (MV = face × price ÷ 100), rule expects equity-style (qty × price)
- **3 Low** — Rule CR-004: Settled ≠ Available qty with no pledge/loan (JNJ, Nestlé, Roche)

**Data Coverage:**
- 2 master accounts (Alpine Capital Partners, Helvetia Asset Management)
- 5 sub-accounts / funds
- 36 equities, 14 fixed income
- 5 currencies (USD, EUR, CHF, JPY, GBP)
- Total AUM: ~$79.2M

## Usage

All HTML dashboards are single-file with zero dependencies — open directly in any modern browser.

The React component (`dashboard.jsx`) requires a React build environment with Tailwind CSS.

## Tech Stack

- Vanilla JavaScript with `h()` DOM helper (HTML versions)
- React with Hooks (JSX version)
- SVG-based DQ score rings
- State-driven single-pass rendering
- Google Fonts (DM Sans, JetBrains Mono)
