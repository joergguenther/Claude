import { useState, useEffect, useCallback } from "react";

// ─── Constants ───
const SEVERITY = { CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low" };
const STATUS = { OPEN: "Open", IN_PROGRESS: "In Progress", ESCALATED: "Escalated", RESOLVED: "Resolved", CLOSED: "Closed" };
const CATEGORIES = ["Completeness", "Consistency", "Timeliness", "Accuracy", "Referential Integrity", "Business Rule", "Threshold Breach", "Schema Violation"];
const SOURCES = ["JPMorgan Chase", "BNP Paribas", "Citigroup", "Standard Chartered", "Northern Trust", "Bloomberg Feed", "Securities Master", "Corporate Actions"];

const DQ_DIMENSIONS = ["Completeness", "Accuracy", "Consistency", "Timeliness", "Uniqueness", "Validity"];

// Simulated Ataccama monitoring projects
const ATACCAMA_PROJECTS = [
  { id: "mp-001", name: "Custodian Daily Reconciliation", catalogItems: 12, lastRun: "2026-02-23T07:00:00Z", overallDQ: 94.2, status: "completed", schedule: "Daily 07:00 UTC", rulesApplied: 48, issuesDetected: 3, dimensions: { Completeness: 96.1, Accuracy: 92.8, Consistency: 93.5, Timeliness: 97.0, Uniqueness: 99.2, Validity: 95.4 } },
  { id: "mp-002", name: "Securities Master Validation", catalogItems: 8, lastRun: "2026-02-23T06:30:00Z", overallDQ: 98.7, status: "completed", schedule: "Daily 06:30 UTC", rulesApplied: 35, issuesDetected: 1, dimensions: { Completeness: 99.1, Accuracy: 98.2, Consistency: 99.0, Timeliness: 98.8, Uniqueness: 99.9, Validity: 97.5 } },
  { id: "mp-003", name: "Corporate Actions Feed", catalogItems: 6, lastRun: "2026-02-23T08:00:00Z", overallDQ: 89.4, status: "completed", schedule: "Daily 08:00 UTC", rulesApplied: 22, issuesDetected: 5, dimensions: { Completeness: 85.3, Accuracy: 91.7, Consistency: 88.9, Timeliness: 90.2, Uniqueness: 98.1, Validity: 92.4 } },
  { id: "mp-004", name: "NAV & Valuation Quality", catalogItems: 15, lastRun: "2026-02-22T18:00:00Z", overallDQ: 91.8, status: "completed", schedule: "Daily 18:00 UTC", rulesApplied: 56, issuesDetected: 4, dimensions: { Completeness: 93.0, Accuracy: 88.5, Consistency: 92.1, Timeliness: 94.6, Uniqueness: 99.5, Validity: 90.8 } },
  { id: "mp-005", name: "Bloomberg Market Data", catalogItems: 4, lastRun: "2026-02-23T07:15:00Z", overallDQ: 86.3, status: "warning", schedule: "Every 15 min", rulesApplied: 18, issuesDetected: 7, dimensions: { Completeness: 82.1, Accuracy: 90.4, Consistency: 85.7, Timeliness: 78.9, Uniqueness: 99.8, Validity: 91.2 } },
];

// Simulated Ataccama DQ issues that can be imported
const ATACCAMA_ISSUES = [
  { id: "ONE-DQ-4401", ruleId: "CR-041", ruleName: "NAV Record Completeness", dimension: "Completeness", project: "mp-001", catalogItem: "custodian_nav_daily", source: "JPMorgan Chase", dqScore: 78.2, failedRecords: 36, totalRecords: 164, severity: "critical", description: "NAV records missing for 12 positions across 3 sub-funds for dates 2026-02-17 to 2026-02-19.", detectedAt: "2026-02-20T09:14:00Z", status: "open", anomalyType: null },
  { id: "ONE-DQ-4402", ruleId: "AC-018", ruleName: "Position Quantity Cross-Check", dimension: "Consistency", project: "mp-001", catalogItem: "position_holdings", source: "BNP Paribas", dqScore: 91.3, failedRecords: 8, totalRecords: 92, severity: "high", description: "Position quantities differ >0.1% between custodian extract and internal books for 8 fixed income securities.", detectedAt: "2026-02-19T14:22:00Z", status: "open", anomalyType: null },
  { id: "ONE-DQ-4403", ruleId: "TL-005", ruleName: "FX Rate Freshness Check", dimension: "Timeliness", project: "mp-005", catalogItem: "bloomberg_fx_rates", source: "Bloomberg Feed", dqScore: 45.6, failedRecords: 142, totalRecords: 142, severity: "critical", description: "EUR/USD, GBP/USD, CHF/USD rates stale since 2026-02-20 18:00 UTC. All downstream valuations affected.", detectedAt: "2026-02-21T07:00:00Z", status: "escalated", anomalyType: "time-dependent" },
  { id: "ONE-DQ-4404", ruleId: "VL-022", ruleName: "SWIFT MT564 Field Validation", dimension: "Validity", project: "mp-003", catalogItem: "corporate_actions_swift", source: "Corporate Actions", dqScore: 96.8, failedRecords: 1, totalRecords: 31, severity: "medium", description: "SWIFT MT564 for ISIN DE000BAY0017 missing mandatory ex-date field.", detectedAt: "2026-02-22T11:33:00Z", status: "open", anomalyType: null },
  { id: "ONE-DQ-4405", ruleId: "UQ-003", ruleName: "Transaction Deduplication", dimension: "Uniqueness", project: "mp-001", catalogItem: "custodian_transactions", source: "Northern Trust", dqScore: 88.4, failedRecords: 47, totalRecords: 405, severity: "high", description: "47 duplicate trade records detected in daily feed. Composite key: trade_ref + settlement_date.", detectedAt: "2026-02-18T15:44:00Z", status: "in_progress", anomalyType: null },
  { id: "ONE-DQ-4406", ruleId: "AC-031", ruleName: "NAV Tolerance Check", dimension: "Accuracy", project: "mp-004", catalogItem: "nav_comparison", source: "Citigroup", dqScore: 84.2, failedRecords: 1, totalRecords: 24, severity: "high", description: "NAV diff 0.47% (threshold 0.25%) between Citi administrator NAV and internal calculation.", detectedAt: "2026-02-22T16:10:00Z", status: "open", anomalyType: "time-dependent" },
  { id: "ONE-DQ-4407", ruleId: "VL-008", ruleName: "ISIN Format ISO 6166", dimension: "Validity", project: "mp-002", catalogItem: "securities_master", source: "Securities Master", dqScore: 99.6, failedRecords: 3, totalRecords: 842, severity: "low", description: "3 ISINs failing ISO 6166 check-digit validation in batch update.", detectedAt: "2026-02-17T12:00:00Z", status: "resolved", anomalyType: null },
  { id: "ONE-DQ-4408", ruleId: "CS-012", ruleName: "Cash Balance Reconciliation", dimension: "Consistency", project: "mp-001", catalogItem: "cash_balances", source: "Standard Chartered", dqScore: 92.5, failedRecords: 4, totalRecords: 53, severity: "medium", description: "CHF cash balance diff of CHF 234,891.50 across 4 accounts. Suspected pending FX spot.", detectedAt: "2026-02-21T10:15:00Z", status: "in_progress", anomalyType: null },
  { id: "ONE-DQ-4409", ruleId: "CR-BM-002", ruleName: "Benchmark Returns Completeness", dimension: "Completeness", project: "mp-005", catalogItem: "benchmark_returns", source: "Bloomberg Feed", dqScore: 0.0, failedRecords: 3, totalRecords: 3, severity: "medium", description: "MSCI World, MSCI EM, Bloomberg Barclays Global Agg returns missing for 2026-02-21.", detectedAt: "2026-02-23T06:00:00Z", status: "open", anomalyType: null },
  { id: "ONE-DQ-4410", ruleId: "BR-STL-001", ruleName: "Settlement Status Business Rule", dimension: "Consistency", project: "mp-001", catalogItem: "custodian_transactions", source: "JPMorgan Chase", dqScore: 96.3, failedRecords: 15, totalRecords: 405, severity: "low", description: "15 trades showing 'pending' in JPM extract but 'settled' internally. T+2 timing mismatch.", detectedAt: "2026-02-15T08:30:00Z", status: "closed", anomalyType: null },
];

const initialExceptions = [
  { id: "DQE-1001", title: "Missing NAV records for Q4 reporting period", category: "Completeness", source: "JPMorgan Chase", severity: SEVERITY.CRITICAL, status: STATUS.OPEN, assignee: "M. Schmidt", created: "2026-02-20T09:14:00Z", updated: "2026-02-23T08:30:00Z", fund: "Trinity Global Equity Fund", jiraKey: null, ataccamaRef: "ONE-DQ-4401", ataccamaDQScore: 78.2, ataccamaRuleId: "CR-041", description: "NAV records missing for 12 positions across 3 sub-funds for dates 2026-02-17 to 2026-02-19.", impactedRecords: 36, comments: [{ user: "Ataccama ONE", text: "DQ rule CR-041 (NAV Record Completeness) triggered — score dropped to 78.2%", ts: "2026-02-20T09:14:00Z" }, { user: "System", text: "Auto-imported from Ataccama monitoring project: Custodian Daily Reconciliation", ts: "2026-02-20T09:15:00Z" }] },
  { id: "DQE-1002", title: "Position mismatch between custodian and fund accounting", category: "Consistency", source: "BNP Paribas", severity: SEVERITY.HIGH, status: STATUS.IN_PROGRESS, assignee: "J. Weber", created: "2026-02-19T14:22:00Z", updated: "2026-02-22T16:45:00Z", fund: "EXF Multi-Strategy Fund", jiraKey: "DATA-4521", ataccamaRef: "ONE-DQ-4402", ataccamaDQScore: 91.3, ataccamaRuleId: "AC-018", description: "Positions for 8 fixed income securities show quantity differences >0.1% between BNP extract and internal books.", impactedRecords: 8, comments: [{ user: "Ataccama ONE", text: "DQ rule AC-018 (Position Quantity Cross-Check) failed for 8 records", ts: "2026-02-19T14:22:00Z" }, { user: "J. Weber", text: "Investigating - appears to be settlement date vs trade date mismatch", ts: "2026-02-20T10:00:00Z" }, { user: "System", text: "JIRA ticket DATA-4521 created", ts: "2026-02-20T10:05:00Z" }] },
  { id: "DQE-1003", title: "Stale FX rates detected in valuation feed", category: "Timeliness", source: "Bloomberg Feed", severity: SEVERITY.CRITICAL, status: STATUS.ESCALATED, assignee: "A. Chen", created: "2026-02-21T07:00:00Z", updated: "2026-02-23T07:15:00Z", fund: "All Funds", jiraKey: "DATA-4528", ataccamaRef: "ONE-DQ-4403", ataccamaDQScore: 45.6, ataccamaRuleId: "TL-005", description: "EUR/USD, GBP/USD, CHF/USD rates have not updated since 2026-02-20 18:00 UTC. Downstream valuations affected.", impactedRecords: 142, comments: [{ user: "Ataccama ONE", text: "AI Anomaly Detection: time-dependent anomaly flagged — FX rate staleness exceeds 12h threshold", ts: "2026-02-21T07:00:00Z" }, { user: "A. Chen", text: "Bloomberg connectivity issue confirmed - ticket raised with vendor", ts: "2026-02-21T08:30:00Z" }, { user: "M. Schmidt", text: "Escalated to VP Operations - manual rate override approved for EOD", ts: "2026-02-21T14:00:00Z" }] },
  { id: "DQE-1004", title: "Corporate action: dividend record missing ex-date", category: "Accuracy", source: "Corporate Actions", severity: SEVERITY.MEDIUM, status: STATUS.OPEN, assignee: null, created: "2026-02-22T11:33:00Z", updated: "2026-02-22T11:33:00Z", fund: "Trinity Income Fund", jiraKey: null, ataccamaRef: "ONE-DQ-4404", ataccamaDQScore: 96.8, ataccamaRuleId: "VL-022", description: "SWIFT MT564 message for ISIN DE000BAY0017 received without ex-date field populated.", impactedRecords: 1, comments: [{ user: "Ataccama ONE", text: "DQ rule VL-022 (SWIFT MT564 Field Validation) — missing mandatory field: ex_date", ts: "2026-02-22T11:33:00Z" }] },
  { id: "DQE-1005", title: "Duplicate transaction records in daily extract", category: "Referential Integrity", source: "Northern Trust", severity: SEVERITY.HIGH, status: STATUS.IN_PROGRESS, assignee: "L. Muller", created: "2026-02-18T15:44:00Z", updated: "2026-02-21T09:20:00Z", fund: "EXF Absolute Return Fund", jiraKey: "DATA-4515", ataccamaRef: "ONE-DQ-4405", ataccamaDQScore: 88.4, ataccamaRuleId: "UQ-003", description: "47 duplicate trade records detected in Northern Trust daily transaction feed. Composite key: trade_ref + settlement_date.", impactedRecords: 47, comments: [{ user: "Ataccama ONE", text: "DQ rule UQ-003 (Transaction Deduplication) failed — 47 duplicates detected", ts: "2026-02-18T15:44:00Z" }, { user: "L. Muller", text: "Northern Trust confirmed file was sent twice due to SFTP error", ts: "2026-02-19T10:00:00Z" }, { user: "L. Muller", text: "Dedup script applied - awaiting reconciliation confirmation", ts: "2026-02-21T09:20:00Z" }] },
  { id: "DQE-1006", title: "NAV tolerance breach on emerging markets portfolio", category: "Threshold Breach", source: "Citigroup", severity: SEVERITY.HIGH, status: STATUS.OPEN, assignee: "J. Weber", created: "2026-02-22T16:10:00Z", updated: "2026-02-23T08:00:00Z", fund: "Trinity EM Growth Fund", jiraKey: null, ataccamaRef: "ONE-DQ-4406", ataccamaDQScore: 84.2, ataccamaRuleId: "AC-031", description: "NAV difference of 0.47% between Citigroup administrator NAV and internal calculated NAV. Threshold is 0.25%.", impactedRecords: 1, comments: [{ user: "Ataccama ONE", text: "AI Anomaly Detection: NAV deviation anomaly — diff=0.47% significantly exceeds historical range", ts: "2026-02-22T16:10:00Z" }, { user: "System", text: "Threshold rule AC-031 triggered: diff=0.47%, limit=0.25%", ts: "2026-02-22T16:10:00Z" }] },
  { id: "DQE-1007", title: "Invalid ISIN format in securities master update", category: "Schema Violation", source: "Securities Master", severity: SEVERITY.LOW, status: STATUS.RESOLVED, assignee: "A. Chen", created: "2026-02-17T12:00:00Z", updated: "2026-02-19T14:30:00Z", fund: "N/A", jiraKey: "DATA-4510", ataccamaRef: "ONE-DQ-4407", ataccamaDQScore: 99.6, ataccamaRuleId: "VL-008", description: "3 records in securities master batch update contained ISIN codes not conforming to ISO 6166 check-digit validation.", impactedRecords: 3, comments: [{ user: "Ataccama ONE", text: "DQ rule VL-008 (ISIN Format ISO 6166) — 3 records failed validation", ts: "2026-02-17T12:00:00Z" }, { user: "A. Chen", text: "Corrected ISINs identified and patched. Root cause: manual entry error in upstream system.", ts: "2026-02-19T14:30:00Z" }, { user: "System", text: "Status synced back to Ataccama ONE — issue resolved", ts: "2026-02-19T14:31:00Z" }] },
  { id: "DQE-1008", title: "Cash balance reconciliation break - CHF accounts", category: "Consistency", source: "Standard Chartered", severity: SEVERITY.MEDIUM, status: STATUS.IN_PROGRESS, assignee: "M. Schmidt", created: "2026-02-21T10:15:00Z", updated: "2026-02-22T17:00:00Z", fund: "Trinity Swiss Balanced Fund", jiraKey: "DATA-4525", ataccamaRef: "ONE-DQ-4408", ataccamaDQScore: 92.5, ataccamaRuleId: "CS-012", description: "CHF cash balances showing unexplained difference of CHF 234,891.50 across 4 accounts.", impactedRecords: 4, comments: [{ user: "Ataccama ONE", text: "DQ rule CS-012 (Cash Balance Reconciliation) — 4 accounts with breaks", ts: "2026-02-21T10:15:00Z" }, { user: "M. Schmidt", text: "Identified pending FX spot trade maturing 2026-02-24 - likely cause", ts: "2026-02-22T17:00:00Z" }] },
  { id: "DQE-1009", title: "Missing benchmark returns for performance attribution", category: "Completeness", source: "Bloomberg Feed", severity: SEVERITY.MEDIUM, status: STATUS.OPEN, assignee: null, created: "2026-02-23T06:00:00Z", updated: "2026-02-23T06:00:00Z", fund: "All Funds", jiraKey: null, ataccamaRef: "ONE-DQ-4409", ataccamaDQScore: 0.0, ataccamaRuleId: "CR-BM-002", description: "MSCI World, MSCI EM, and Bloomberg Barclays Global Agg benchmark return data missing for 2026-02-21.", impactedRecords: 3, comments: [{ user: "Ataccama ONE", text: "DQ rule CR-BM-002 (Benchmark Returns Completeness) — 0% pass rate, all records missing", ts: "2026-02-23T06:00:00Z" }] },
  { id: "DQE-1010", title: "Trade settlement status discrepancy", category: "Business Rule", source: "JPMorgan Chase", severity: SEVERITY.LOW, status: STATUS.CLOSED, assignee: "L. Muller", created: "2026-02-15T08:30:00Z", updated: "2026-02-18T11:00:00Z", fund: "EXF Multi-Strategy Fund", jiraKey: "DATA-4498", ataccamaRef: "ONE-DQ-4410", ataccamaDQScore: 96.3, ataccamaRuleId: "BR-STL-001", description: "15 trades showing 'pending' in JPM extract but 'settled' in internal system. T+2 settlement cycle mismatch.", impactedRecords: 15, comments: [{ user: "Ataccama ONE", text: "DQ rule BR-STL-001 (Settlement Status Business Rule) — 15 mismatches", ts: "2026-02-15T08:30:00Z" }, { user: "L. Muller", text: "Timing issue - JPM extract generated before settlement confirmation. No action needed.", ts: "2026-02-18T11:00:00Z" }, { user: "System", text: "Status synced to Ataccama ONE — issue closed", ts: "2026-02-18T11:01:00Z" }] },
];

const JIRA_CONFIG_DEFAULT = { baseUrl: "https://exf-data.atlassian.net", projectKey: "DATA", apiToken: "", email: "" };
const ATACCAMA_CONFIG_DEFAULT = { environmentUrl: "https://exf-data.ataccama.one", realm: "exf-data", clientId: "", clientSecret: "", autoSync: true, syncInterval: 15 };

// ─── Utility Helpers ───
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function dqColor(score) {
  if (score >= 95) return "text-emerald-400";
  if (score >= 85) return "text-amber-400";
  if (score >= 70) return "text-orange-400";
  return "text-red-400";
}
function dqBg(score) {
  if (score >= 95) return "bg-emerald-500";
  if (score >= 85) return "bg-amber-500";
  if (score >= 70) return "bg-orange-500";
  return "bg-red-500";
}

// ─── Shared Components ───
function SeverityBadge({ severity }) {
  const c = { critical: "bg-red-900/30 text-red-300 border border-red-700/50", high: "bg-amber-900/30 text-amber-300 border border-amber-700/50", medium: "bg-sky-900/30 text-sky-300 border border-sky-700/50", low: "bg-slate-700/40 text-slate-300 border border-slate-600/50" };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${c[severity]}`}>{severity}</span>;
}

function StatusBadge({ status }) {
  const c = { Open: "bg-red-500/20 text-red-300", "In Progress": "bg-amber-500/20 text-amber-300", Escalated: "bg-fuchsia-500/20 text-fuchsia-300", Resolved: "bg-emerald-500/20 text-emerald-300", Closed: "bg-slate-500/20 text-slate-400" };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c[status]}`}>{status}</span>;
}

function StatCard({ label, value, sub, color = "text-white", icon }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 backdrop-blur-sm hover:border-slate-600/60 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${color} tabular-nums`}>{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function DQScoreRing({ score, size = 36, strokeWidth = 3.5 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#334155" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={score >= 95 ? "#34d399" : score >= 85 ? "#fbbf24" : score >= 70 ? "#fb923c" : "#f87171"} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className={`absolute text-xs font-bold tabular-nums ${dqColor(score)}`} style={{ fontSize: size < 40 ? 9 : 11 }}>{score > 0 ? Math.round(score) : "—"}</span>
    </div>
  );
}

// ─── Ataccama Monitoring Panel ───
function AtaccamaMonitoringPanel({ projects, onImportIssues }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">A</div>
          <div>
            <h3 className="text-white font-semibold text-sm">Ataccama ONE — Monitoring Projects</h3>
            <p className="text-slate-500 text-xs">DQ evaluation results synced via REST API</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-xs">Connected</span>
        </div>
      </div>
      <div className="divide-y divide-slate-700/30">
        {projects.map(p => (
          <div key={p.id}>
            <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-700/15 cursor-pointer transition-colors" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <DQScoreRing score={p.overallDQ} size={42} strokeWidth={4} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{p.name}</span>
                  {p.status === "warning" && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-900/30 text-amber-300 border border-amber-700/40">Warning</span>}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-slate-500 text-xs">{p.catalogItems} catalog items</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500 text-xs">{p.rulesApplied} rules</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500 text-xs">Last: {timeAgo(p.lastRun)}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {p.issuesDetected > 0 ? (
                  <span className="text-red-400 text-sm font-bold">{p.issuesDetected} issues</span>
                ) : (
                  <span className="text-emerald-400 text-sm font-medium">Clean</span>
                )}
                <div className="text-slate-500 text-xs">{p.schedule}</div>
              </div>
              <svg className={`w-4 h-4 text-slate-500 transform transition-transform ${expanded === p.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {expanded === p.id && (
              <div className="px-5 pb-4 pt-1" style={{ animation: "fadeIn 0.2s ease-out" }}>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {DQ_DIMENSIONS.map(dim => (
                    <div key={dim} className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-2.5 text-center">
                      <div className={`text-lg font-bold tabular-nums ${dqColor(p.dimensions[dim])}`}>{p.dimensions[dim]}%</div>
                      <div className="text-slate-500 text-xs mt-0.5">{dim}</div>
                      <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${dqBg(p.dimensions[dim])}`} style={{ width: p.dimensions[dim] + "%", transition: "width 0.7s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Open in Ataccama ONE ↗</a>
                  <button onClick={() => onImportIssues(p.id)} className="text-xs bg-indigo-600/20 border border-indigo-600/40 text-indigo-300 hover:bg-indigo-600/30 px-3 py-1.5 rounded-lg font-medium transition-colors">
                    Import {p.issuesDetected} Issues as Exceptions
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── JIRA Modal ───
function JiraModal({ exception, config, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [jiraType, setJiraType] = useState("Bug");
  const [priority, setPriority] = useState(exception.severity === "critical" ? "Highest" : exception.severity === "high" ? "High" : exception.severity === "medium" ? "Medium" : "Low");
  const [additionalDesc, setAdditionalDesc] = useState("");

  const jiraDescription = "h2. Data Quality Exception: " + exception.id + "\n----\n*Category:* " + exception.category + "\n*Source:* " + exception.source + "\n*Fund:* " + exception.fund + "\n*Severity:* " + exception.severity.toUpperCase() + "\n*Impacted Records:* " + exception.impactedRecords + "\n*Created:* " + formatDate(exception.created) + (exception.ataccamaRef ? "\n*Ataccama Ref:* " + exception.ataccamaRef + "\n*DQ Rule:* " + exception.ataccamaRuleId + "\n*DQ Score:* " + exception.ataccamaDQScore + "%" : "") + "\n\nh3. Description\n" + exception.description + (additionalDesc ? "\n\nh3. Additional Context\n" + additionalDesc : "") + "\n\nh3. Comments History\n" + exception.comments.map(function(c) { return "* [" + formatDate(c.ts) + "] *" + c.user + "*: " + c.text; }).join("\n") + "\n\n----\n_Auto-generated by EXF Data Quality Exception Tracker_";

  const handleCreate = () => { setLoading(true); setTimeout(() => { onCreated(config.projectKey + "-" + (4530 + Math.floor(Math.random() * 100))); setLoading(false); }, 1500); };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600/50 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84h-9.63z"/><path d="M6.77 6.82a4.36 4.36 0 0 0 4.34 4.34h1.78v1.72a4.36 4.36 0 0 0 4.34 4.34V7.66a.84.84 0 0 0-.84-.84H6.77z"/><path d="M2 11.65c.02 2.4 1.96 4.34 4.34 4.34h1.78v1.72a4.35 4.35 0 0 0 4.35 4.29v-9.51a.84.84 0 0 0-.84-.84H2z"/></svg>
            </div>
            <div><h3 className="text-white font-semibold text-lg">Create JIRA Issue</h3><p className="text-slate-400 text-sm">{exception.id} → {config.projectKey}</p></div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl p-1">✕</button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Project</label><div className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm">{config.projectKey} — EXF Data Quality</div></div>
            <div><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Issue Type</label><select value={jiraType} onChange={e => setJiraType(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50"><option>Bug</option><option>Task</option><option>Story</option><option>Incident</option></select></div>
          </div>
          <div><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Summary</label><div className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm">[{exception.category}] {exception.title}</div></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Priority</label><select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50"><option>Highest</option><option>High</option><option>Medium</option><option>Low</option></select></div>
            <div><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Assignee</label><div className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm">{exception.assignee || "Unassigned"}</div></div>
          </div>
          <div><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Additional Context</label><textarea value={additionalDesc} onChange={e => setAdditionalDesc(e.target.value)} rows={3} placeholder="Add extra context..." className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50 placeholder-slate-500 resize-none" /></div>
          {exception.ataccamaRef && (
            <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 text-xs space-y-1">
              <div className="text-indigo-300 font-medium mb-1">Ataccama ONE Traceability</div>
              <div className="text-slate-400">Issue Ref: <span className="text-indigo-300 font-mono">{exception.ataccamaRef}</span></div>
              <div className="text-slate-400">DQ Rule: <span className="text-indigo-300 font-mono">{exception.ataccamaRuleId}</span></div>
              <div className="text-slate-400">DQ Score: <span className={"font-bold " + dqColor(exception.ataccamaDQScore)}>{exception.ataccamaDQScore}%</span></div>
            </div>
          )}
          <div><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Description Preview</label><pre className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3 text-slate-300 text-xs max-h-36 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">{jiraDescription}</pre></div>
        </div>
        <div className="p-6 border-t border-slate-700/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">{loading ? <><span className="animate-spin">⟳</span> Creating...</> : "Create Issue"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Ataccama Sync Modal ───
function AtaccamaSyncModal({ exception, config, onClose, onSynced }) {
  const [loading, setLoading] = useState(false);
  const [syncAction, setSyncAction] = useState("update_status");
  const handleSync = () => { setLoading(true); setTimeout(() => { onSynced(syncAction); setLoading(false); }, 1200); };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600/50 rounded-xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">A</div>
            <div><h3 className="text-white font-semibold text-lg">Sync to Ataccama ONE</h3><p className="text-slate-400 text-sm">{exception.id} → {exception.ataccamaRef || "New Issue"}</p></div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl p-1">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-500">Exception</span><p className="text-white mt-0.5">{exception.id}</p></div>
              <div><span className="text-slate-500">Ataccama Ref</span><p className="text-indigo-300 font-mono mt-0.5">{exception.ataccamaRef || "—"}</p></div>
              <div><span className="text-slate-500">DQ Rule</span><p className="text-white font-mono mt-0.5">{exception.ataccamaRuleId || "—"}</p></div>
              <div><span className="text-slate-500">Current Status</span><p className="mt-0.5"><StatusBadge status={exception.status} /></p></div>
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-2">Sync Action</label>
            <div className="space-y-2">
              {[["update_status", "Update Issue Status", "Sync current exception status back to Ataccama ONE issue"], ["push_comments", "Push Comments", "Send all comments/activity log to Ataccama ONE issue"], ["request_reeval", "Request Re-evaluation", "Trigger DQ re-evaluation for the associated monitoring project"], ["close_issue", "Close Ataccama Issue", "Mark the Ataccama ONE issue as resolved/closed"]].map(function(item) { return (
                <label key={item[0]} className={"flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors " + (syncAction === item[0] ? "bg-indigo-900/20 border-indigo-600/40" : "bg-slate-900/20 border-slate-700/30 hover:border-slate-600/40")}>
                  <input type="radio" name="syncAction" value={item[0]} checked={syncAction === item[0]} onChange={() => setSyncAction(item[0])} className="mt-0.5 accent-indigo-500" />
                  <div><div className="text-white text-sm font-medium">{item[1]}</div><div className="text-slate-500 text-xs mt-0.5">{item[2]}</div></div>
                </label>
              ); })}
            </div>
          </div>
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 text-xs text-slate-400">
            <span className="text-slate-300 font-medium">API Endpoint: </span>
            <span className="font-mono text-indigo-300">{"POST " + ATACCAMA_CONFIG_DEFAULT.environmentUrl + "/api/data-quality/v1/issues/" + exception.ataccamaRef + "/sync"}</span>
          </div>
        </div>
        <div className="p-6 border-t border-slate-700/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
          <button onClick={handleSync} disabled={loading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">{loading ? <><span className="animate-spin">⟳</span> Syncing...</> : "Sync Now"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Integration Config Modal ───
function IntegrationConfigModal({ jiraConfig, ataccamaConfig, onSaveJira, onSaveAtaccama, onClose }) {
  const [tab, setTab] = useState("ataccama");
  const [jForm, setJForm] = useState(jiraConfig);
  const [aForm, setAForm] = useState(ataccamaConfig);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600/50 rounded-xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-700/50">
          <h3 className="text-white font-semibold text-lg">Integration Settings</h3>
          <div className="flex gap-1 mt-3 bg-slate-900/50 rounded-lg p-1">
            {[["ataccama", "Ataccama ONE"], ["jira", "JIRA"]].map(function(item) { return (
              <button key={item[0]} onClick={() => setTab(item[0])} className={"flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors " + (tab === item[0] ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}>{item[1]}</button>
            ); })}
          </div>
        </div>
        <div className="p-6 space-y-4">
          {tab === "ataccama" ? (
            <>
              {[["Environment URL", "environmentUrl", "https://your-org.ataccama.one"], ["Realm", "realm", "your-org"], ["Client ID (OAuth)", "clientId", "Enter your OAuth client ID"], ["Client Secret", "clientSecret", "Enter your OAuth client secret"]].map(function(item) { return (
                <div key={item[1]}><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">{item[0]}</label><input type={item[1] === "clientSecret" ? "password" : "text"} value={aForm[item[1]]} onChange={e => setAForm({ ...aForm, [item[1]]: e.target.value })} placeholder={item[2]} className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500/50 placeholder-slate-500" /></div>
              ); })}
              <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-700/30 rounded-lg">
                <div><div className="text-white text-sm font-medium">Auto-Sync Issues</div><div className="text-slate-500 text-xs mt-0.5">Automatically import new DQ issues as exceptions</div></div>
                <button onClick={() => setAForm({ ...aForm, autoSync: !aForm.autoSync })} className={"w-10 h-5 rounded-full transition-colors relative " + (aForm.autoSync ? "bg-indigo-600" : "bg-slate-600")}><div className={"w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform " + (aForm.autoSync ? "translate-x-5" : "translate-x-0.5")} /></button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-slate-700/30 rounded-lg">
                <div><div className="text-white text-sm font-medium">Sync Interval</div><div className="text-slate-500 text-xs mt-0.5">How often to poll Ataccama for new issues</div></div>
                <select value={aForm.syncInterval} onChange={e => setAForm({ ...aForm, syncInterval: +e.target.value })} className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-2 py-1 text-white text-xs outline-none"><option value={5}>5 min</option><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>60 min</option></select>
              </div>
              <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 text-xs text-indigo-300">
                {"Auth uses OAuth 2.0 client credentials via "}<code className="font-mono text-indigo-200">{aForm.environmentUrl + "/auth/realms/" + aForm.realm + "/protocol/openid-connect/token"}</code>
              </div>
            </>
          ) : (
            <>
              {[["Base URL", "baseUrl", "https://your-org.atlassian.net"], ["Project Key", "projectKey", "DATA"], ["Email", "email", "you@example.com"], ["API Token", "apiToken", "Enter your JIRA API token"]].map(function(item) { return (
                <div key={item[1]}><label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">{item[0]}</label><input type={item[1] === "apiToken" ? "password" : "text"} value={jForm[item[1]]} onChange={e => setJForm({ ...jForm, [item[1]]: e.target.value })} placeholder={item[2]} className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50 placeholder-slate-500" /></div>
              ); })}
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-amber-300 text-xs">API tokens stored locally. In production, use OAuth 2.0 or a secure vault.</div>
            </>
          )}
        </div>
        <div className="p-6 border-t border-slate-700/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
          <button onClick={() => { if (tab === "ataccama") onSaveAtaccama(aForm); else onSaveJira(jForm); onClose(); }} className={"px-5 py-2 " + (tab === "ataccama" ? "bg-indigo-600 hover:bg-indigo-500" : "bg-blue-600 hover:bg-blue-500") + " text-white text-sm font-medium rounded-lg transition-colors"}>Save Configuration</button>
        </div>
      </div>
    </div>
  );
}

// ─── Exception Detail Slide-Over ───
function ExceptionDetail({ exception, onClose, onCreateJira, onSyncAtaccama, onStatusChange, onAddComment }) {
  const [newComment, setNewComment] = useState("");
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-slate-800 border-l border-slate-700/50 w-full max-w-xl overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} style={{ animation: "slideIn 0.2s ease-out" }}>
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 p-5 z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-mono">{exception.id}</span>
              <h3 className="text-white font-semibold text-lg mt-0.5 leading-tight">{exception.title}</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl p-1">✕</button>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <SeverityBadge severity={exception.severity} />
            <StatusBadge status={exception.status} />
            {exception.jiraKey && <a href="#" className="text-xs bg-blue-900/30 text-blue-300 border border-blue-700/40 px-2 py-0.5 rounded font-mono hover:bg-blue-900/50">{exception.jiraKey}</a>}
            {exception.ataccamaRef && <a href="#" className="text-xs bg-indigo-900/30 text-indigo-300 border border-indigo-700/40 px-2 py-0.5 rounded font-mono hover:bg-indigo-900/50">{exception.ataccamaRef}</a>}
          </div>
        </div>

        <div className="p-5 space-y-6">
          {exception.ataccamaRef && (
            <div className="bg-indigo-900/15 border border-indigo-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold" style={{ fontSize: 8 }}>A</div>
                <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider">Ataccama ONE</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <DQScoreRing score={exception.ataccamaDQScore} size={48} strokeWidth={4} />
                  <div className="text-slate-500 text-xs mt-1">DQ Score</div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Rule ID</span>
                  <p className="text-indigo-300 font-mono text-sm mt-0.5">{exception.ataccamaRuleId}</p>
                  <span className="text-slate-500 text-xs mt-2 block">Issue Ref</span>
                  <p className="text-indigo-300 font-mono text-sm mt-0.5">{exception.ataccamaRef}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Dimension</span>
                  <p className="text-white text-sm mt-0.5">{exception.category}</p>
                  <span className="text-slate-500 text-xs mt-2 block">Catalog Item</span>
                  <p className="text-white text-sm mt-0.5 truncate">{(ATACCAMA_ISSUES.find(function(i) { return i.id === exception.ataccamaRef; }) || {}).catalogItem || "—"}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={onSyncAtaccama} className="flex-1 text-xs bg-indigo-600/20 border border-indigo-600/40 text-indigo-300 hover:bg-indigo-600/30 px-3 py-1.5 rounded-lg font-medium transition-colors text-center">Sync to Ataccama</button>
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 transition-colors flex items-center">Open in ONE ↗</a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {[["Source", exception.source], ["Category", exception.category], ["Fund", exception.fund], ["Assignee", exception.assignee || "Unassigned"], ["Impacted Records", exception.impactedRecords], ["Created", formatDate(exception.created)], ["Last Updated", formatDate(exception.updated)]].map(function(item) { return (
              <div key={item[0]}><span className="text-slate-500 text-xs uppercase tracking-wider">{item[0]}</span><p className="text-white text-sm mt-0.5">{item[1]}</p></div>
            ); })}
          </div>

          <div><h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Description</h4><p className="text-slate-200 text-sm leading-relaxed bg-slate-900/40 border border-slate-700/30 rounded-lg p-3">{exception.description}</p></div>

          <div>
            <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Actions</h4>
            <div className="flex flex-wrap gap-2">
              {exception.status !== STATUS.CLOSED && exception.status !== STATUS.RESOLVED && (
                <>
                  <select onChange={e => { if (e.target.value) { onStatusChange(e.target.value); e.target.value = ""; } }} defaultValue="" className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-blue-500/50">
                    <option value="" disabled>Change Status...</option>
                    {Object.values(STATUS).filter(function(s) { return s !== exception.status; }).map(function(s) { return <option key={s} value={s}>{s}</option>; })}
                  </select>
                  {!exception.jiraKey && <button onClick={onCreateJira} className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-600/40 text-blue-300 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Create JIRA Issue</button>}
                </>
              )}
              {exception.jiraKey && <a href="#" className="flex items-center gap-1.5 bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">{"Open " + exception.jiraKey + " ↗"}</a>}
            </div>
          </div>

          <div>
            <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-3">{"Activity Log (" + exception.comments.length + ")"}</h4>
            <div className="space-y-3">
              {exception.comments.map(function(c, i) { return (
                <div key={i} className="flex gap-3">
                  <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 " + (c.user === "System" ? "bg-slate-700 text-slate-400" : c.user === "Ataccama ONE" ? "bg-indigo-800/60 text-indigo-300" : "bg-teal-800/60 text-teal-300")}>
                    {c.user === "System" ? "⚙" : c.user === "Ataccama ONE" ? "A" : c.user[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-white text-xs font-medium">{c.user}</span><span className="text-slate-500 text-xs">{timeAgo(c.ts)}</span></div>
                    <p className="text-slate-300 text-sm mt-0.5">{c.text}</p>
                  </div>
                </div>
              ); })}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newComment.trim()) { onAddComment(newComment.trim()); setNewComment(""); } }} placeholder="Add a comment..." className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500/50 placeholder-slate-500" />
              <button onClick={() => { if (newComment.trim()) { onAddComment(newComment.trim()); setNewComment(""); } }} className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm rounded-lg transition-colors">Post</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───
export default function DataQualityDashboard() {
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [selectedId, setSelectedId] = useState(null);
  const [jiraModalId, setJiraModalId] = useState(null);
  const [ataccamaSyncId, setAtaccamaSyncId] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [jiraConfig, setJiraConfig] = useState(JIRA_CONFIG_DEFAULT);
  const [ataccamaConfig, setAtaccamaConfig] = useState(ATACCAMA_CONFIG_DEFAULT);
  const [filters, setFilters] = useState({ severity: "all", status: "all", source: "all", category: "all", search: "" });
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [view, setView] = useState("table");
  const [activeTab, setActiveTab] = useState("exceptions");
  const [importToast, setImportToast] = useState(null);

  const selected = exceptions.find(function(e) { return e.id === selectedId; });
  const jiraModalException = exceptions.find(function(e) { return e.id === jiraModalId; });
  const ataccamaSyncException = exceptions.find(function(e) { return e.id === ataccamaSyncId; });

  const filtered = exceptions
    .filter(function(e) {
      if (filters.severity !== "all" && e.severity !== filters.severity) return false;
      if (filters.status !== "all" && e.status !== filters.status) return false;
      if (filters.source !== "all" && e.source !== filters.source) return false;
      if (filters.category !== "all" && e.category !== filters.category) return false;
      if (filters.search && !(e.id + " " + e.title + " " + e.description + " " + e.fund + " " + (e.ataccamaRef || "") + " " + (e.ataccamaRuleId || "")).toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    })
    .sort(function(a, b) {
      var dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "severity") { var o = { critical: 0, high: 1, medium: 2, low: 3 }; return (o[a.severity] - o[b.severity]) * dir; }
      if (sortBy === "dqScore") return ((a.ataccamaDQScore || 100) - (b.ataccamaDQScore || 100)) * dir;
      if (sortBy === "created" || sortBy === "updated") return (new Date(a[sortBy]) - new Date(b[sortBy])) * dir;
      return 0;
    });

  var openExc = exceptions.filter(function(e) { return e.status === STATUS.OPEN; });
  var critExc = exceptions.filter(function(e) { return e.severity === SEVERITY.CRITICAL && e.status !== STATUS.CLOSED && e.status !== STATUS.RESOLVED; });
  var escExc = exceptions.filter(function(e) { return e.status === STATUS.ESCALATED; });
  var scoredExc = exceptions.filter(function(e) { return e.ataccamaDQScore != null && e.status !== STATUS.CLOSED; });
  var stats = {
    total: exceptions.length,
    open: openExc.length,
    critical: critExc.length,
    escalated: escExc.length,
    jiraLinked: exceptions.filter(function(e) { return e.jiraKey; }).length,
    ataccamaLinked: exceptions.filter(function(e) { return e.ataccamaRef; }).length,
    unassigned: exceptions.filter(function(e) { return !e.assignee && e.status !== STATUS.CLOSED && e.status !== STATUS.RESOLVED; }).length,
    impacted: exceptions.filter(function(e) { return e.status !== STATUS.CLOSED && e.status !== STATUS.RESOLVED; }).reduce(function(s, e) { return s + e.impactedRecords; }, 0),
    avgDQ: scoredExc.length ? (scoredExc.reduce(function(s, e) { return s + e.ataccamaDQScore; }, 0) / scoredExc.length).toFixed(1) : "—",
  };

  var handleStatusChange = function(id, newStatus) {
    setExceptions(function(prev) { return prev.map(function(e) { return e.id === id ? Object.assign({}, e, { status: newStatus, updated: new Date().toISOString(), comments: e.comments.concat([{ user: "J. Koerber", text: "Status changed to " + newStatus, ts: new Date().toISOString() }]) }) : e; }); });
  };
  var handleAddComment = function(id, text) {
    setExceptions(function(prev) { return prev.map(function(e) { return e.id === id ? Object.assign({}, e, { updated: new Date().toISOString(), comments: e.comments.concat([{ user: "J. Koerber", text: text, ts: new Date().toISOString() }]) }) : e; }); });
  };
  var handleJiraCreated = function(id, jiraKey) {
    setExceptions(function(prev) { return prev.map(function(e) { return e.id === id ? Object.assign({}, e, { jiraKey: jiraKey, updated: new Date().toISOString(), comments: e.comments.concat([{ user: "System", text: "JIRA ticket " + jiraKey + " created", ts: new Date().toISOString() }]) }) : e; }); });
    setJiraModalId(null);
  };
  var handleAtaccamaSynced = function(id, action) {
    var labels = { update_status: "Status synced to Ataccama ONE", push_comments: "Comments pushed to Ataccama ONE", request_reeval: "DQ re-evaluation requested in Ataccama ONE", close_issue: "Ataccama ONE issue closed" };
    setExceptions(function(prev) { return prev.map(function(e) { return e.id === id ? Object.assign({}, e, { updated: new Date().toISOString(), comments: e.comments.concat([{ user: "System", text: labels[action] || "Synced to Ataccama ONE", ts: new Date().toISOString() }]) }) : e; }); });
    setAtaccamaSyncId(null);
  };
  var handleImportIssues = function(projectId) {
    var issues = ATACCAMA_ISSUES.filter(function(i) { return i.project === projectId && !exceptions.some(function(e) { return e.ataccamaRef === i.id; }); });
    if (issues.length === 0) { setImportToast("All issues already imported"); setTimeout(function() { setImportToast(null); }, 3000); return; }
    var newExceptions = issues.map(function(issue, idx) {
      return {
        id: "DQE-" + (1011 + exceptions.length + idx),
        title: issue.ruleName + ": " + issue.description.slice(0, 60) + "...",
        category: issue.dimension, source: issue.source, severity: issue.severity,
        status: issue.status === "open" ? STATUS.OPEN : issue.status === "in_progress" ? STATUS.IN_PROGRESS : issue.status === "escalated" ? STATUS.ESCALATED : issue.status === "resolved" ? STATUS.RESOLVED : STATUS.CLOSED,
        assignee: null, created: issue.detectedAt, updated: new Date().toISOString(), fund: "—",
        jiraKey: null, ataccamaRef: issue.id, ataccamaDQScore: issue.dqScore, ataccamaRuleId: issue.ruleId,
        description: issue.description, impactedRecords: issue.failedRecords,
        comments: [
          { user: "Ataccama ONE", text: "DQ rule " + issue.ruleId + " (" + issue.ruleName + ") — " + issue.failedRecords + "/" + issue.totalRecords + " records failed. Score: " + issue.dqScore + "%", ts: issue.detectedAt },
          { user: "System", text: "Imported from Ataccama monitoring project: " + (ATACCAMA_PROJECTS.find(function(p) { return p.id === projectId; }) || {}).name, ts: new Date().toISOString() },
        ],
      };
    });
    setExceptions(function(prev) { return prev.concat(newExceptions); });
    setImportToast("Imported " + newExceptions.length + " issues from Ataccama ONE");
    setTimeout(function() { setImportToast(null); }, 4000);
  };

  var SortHeader = function(props) {
    return (
      <th className="px-3 py-3 text-left cursor-pointer hover:text-slate-200 transition-colors select-none" onClick={function() { if (sortBy === props.field) setSortDir(function(d) { return d === "asc" ? "desc" : "asc"; }); else { setSortBy(props.field); setSortDir("desc"); } }}>
        <span className="flex items-center gap-1">{props.children}{sortBy === props.field && <span className="text-teal-400">{sortDir === "asc" ? "↑" : "↓"}</span>}</span>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white" style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{"\n        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }\n        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }\n        @keyframes toastIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }\n        .anim-row { animation: fadeIn 0.2s ease-out; }\n        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }\n      "}</style>

      {importToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2" style={{ animation: "toastIn 0.3s ease-out" }}>
          <span className="text-lg">✓</span> {importToast}
        </div>
      )}

      <header className="border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">E</div>
                <div><h1 className="text-white font-bold text-lg leading-none tracking-tight">Exception Tracker</h1><p className="text-slate-500 text-xs mt-0.5">EXF Data Quality Management</p></div>
              </div>
              <div className="h-6 w-px bg-slate-700/50 mx-2" />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-slate-400 text-xs">Live</span></div>
                <div className="flex items-center gap-1.5 bg-indigo-900/20 border border-indigo-700/30 rounded-full px-2.5 py-0.5">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white" style={{ fontSize: 7, fontWeight: 800 }}>A</div>
                  <span className="text-indigo-300 text-xs font-medium">Ataccama ONE</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5 bg-blue-900/20 border border-blue-700/30 rounded-full px-2.5 py-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#93c5fd"><path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84h-9.63z"/><path d="M6.77 6.82a4.36 4.36 0 0 0 4.34 4.34h1.78v1.72a4.36 4.36 0 0 0 4.34 4.34V7.66a.84.84 0 0 0-.84-.84H6.77z"/><path d="M2 11.65c.02 2.4 1.96 4.34 4.34 4.34h1.78v1.72a4.35 4.35 0 0 0 4.35 4.29v-9.51a.84.84 0 0 0-.84-.84H2z"/></svg>
                  <span className="text-blue-300 text-xs font-medium">JIRA</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={function() { setShowConfig(true); }} className="flex items-center gap-2 bg-slate-800 border border-slate-700/50 hover:border-slate-600 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">⚙ Integrations</button>
              <div className="flex bg-slate-800 border border-slate-700/50 rounded-lg overflow-hidden">
                <button onClick={function() { setView("table"); }} className={"px-3 py-1.5 text-xs " + (view === "table" ? "bg-teal-600/30 text-teal-300" : "text-slate-400 hover:text-white") + " transition-colors"}>Table</button>
                <button onClick={function() { setView("board"); }} className={"px-3 py-1.5 text-xs " + (view === "board" ? "bg-teal-600/30 text-teal-300" : "text-slate-400 hover:text-white") + " transition-colors"}>Board</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} icon="📋" />
          <StatCard label="Open" value={stats.open} color="text-red-400" icon="🔴" />
          <StatCard label="Critical" value={stats.critical} color="text-red-300" icon="🚨" />
          <StatCard label="Escalated" value={stats.escalated} color="text-fuchsia-400" icon="⬆" />
          <StatCard label="JIRA Linked" value={stats.jiraLinked} color="text-blue-400" icon="🔗" />
          <StatCard label="Ataccama" value={stats.ataccamaLinked} color="text-indigo-400" sub={"of " + stats.total} icon="🅐" />
          <StatCard label="Unassigned" value={stats.unassigned} color="text-amber-400" icon="👤" />
          <StatCard label="Records" value={stats.impacted.toLocaleString()} color="text-cyan-400" sub="impacted" icon="📊" />
          <StatCard label="Avg DQ Score" value={stats.avgDQ + "%"} color={dqColor(parseFloat(stats.avgDQ) || 100)} sub="open issues" icon="📈" />
        </div>

        <div className="flex gap-1 bg-slate-800/40 border border-slate-700/40 rounded-xl p-1 mb-5">
          {[["exceptions", "Exceptions"], ["monitoring", "Ataccama Monitoring"], ["analytics", "Analytics"]].map(function(item) { return (
            <button key={item[0]} onClick={function() { setActiveTab(item[0]); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition-colors " + (activeTab === item[0] ? "bg-slate-700/70 text-white" : "text-slate-400 hover:text-white")}>{item[1]}</button>
          ); })}
        </div>

        {activeTab === "exceptions" && (
          <>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 mb-5">
              <div className="flex flex-wrap items-center gap-3">
                <input value={filters.search} onChange={function(e) { setFilters(function(f) { return Object.assign({}, f, { search: e.target.value }); }); }} placeholder="Search exceptions, rules, refs..." className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-teal-500/50 placeholder-slate-500 w-64" />
                {[["severity", "Severity", [["all", "All Severity"]].concat(Object.values(SEVERITY).map(function(s) { return [s, s.charAt(0).toUpperCase() + s.slice(1)]; }))], ["status", "Status", [["all", "All Status"]].concat(Object.values(STATUS).map(function(s) { return [s, s]; }))], ["source", "Source", [["all", "All Sources"]].concat(SOURCES.map(function(s) { return [s, s]; }))], ["category", "Category", [["all", "All Categories"]].concat(CATEGORIES.map(function(c) { return [c, c]; }))]].map(function(item) { return (
                  <select key={item[0]} value={filters[item[0]]} onChange={function(e) { var obj = {}; obj[item[0]] = e.target.value; setFilters(function(f) { return Object.assign({}, f, obj); }); }} className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-teal-500/50">
                    {item[2].map(function(opt) { return <option key={opt[0]} value={opt[0]}>{opt[1]}</option>; })}
                  </select>
                ); })}
                <button onClick={function() { setFilters({ severity: "all", status: "all", source: "all", category: "all", search: "" }); }} className="text-xs text-slate-400 hover:text-white transition-colors ml-auto">Clear</button>
                <span className="text-xs text-slate-500">{filtered.length + " of " + exceptions.length}</span>
              </div>
            </div>

            {view === "table" && (
              <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                        <th className="px-3 py-3 text-left font-medium">ID</th>
                        <th className="px-3 py-3 text-left font-medium w-[25%]">Exception</th>
                        <SortHeader field="severity">Severity</SortHeader>
                        <th className="px-3 py-3 text-left font-medium">Status</th>
                        <SortHeader field="dqScore">DQ</SortHeader>
                        <th className="px-3 py-3 text-left font-medium">Source</th>
                        <th className="px-3 py-3 text-left font-medium">Assignee</th>
                        <th className="px-3 py-3 text-left font-medium">Integrations</th>
                        <SortHeader field="updated">Updated</SortHeader>
                        <th className="px-3 py-3 text-left font-medium">Rec.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(function(e, i) { return (
                        <tr key={e.id} onClick={function() { setSelectedId(e.id); }} className="anim-row border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-colors" style={{ animationDelay: i * 25 + "ms" }}>
                          <td className="px-3 py-3 font-mono text-xs text-teal-400">{e.id}</td>
                          <td className="px-3 py-3">
                            <div className="text-white text-sm font-medium leading-tight">{e.title}</div>
                            <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">{e.category}{e.ataccamaRuleId && <span className="text-indigo-400/60 font-mono">{"(" + e.ataccamaRuleId + ")"}</span>}</div>
                          </td>
                          <td className="px-3 py-3"><SeverityBadge severity={e.severity} /></td>
                          <td className="px-3 py-3"><StatusBadge status={e.status} /></td>
                          <td className="px-3 py-3">{e.ataccamaDQScore != null ? <DQScoreRing score={e.ataccamaDQScore} size={32} strokeWidth={3} /> : <span className="text-slate-600 text-xs">—</span>}</td>
                          <td className="px-3 py-3 text-slate-300 text-xs">{e.source}</td>
                          <td className="px-3 py-3">{e.assignee ? <span className="text-slate-200 text-xs">{e.assignee}</span> : <span className="text-slate-600 text-xs italic">—</span>}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              {e.jiraKey ? <span className="text-xs font-mono text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded">{e.jiraKey}</span> : <button onClick={function(ev) { ev.stopPropagation(); setJiraModalId(e.id); }} className="text-xs text-slate-500 hover:text-blue-400 transition-colors">+J</button>}
                              {e.ataccamaRef ? <span className="text-xs font-mono text-indigo-400 bg-indigo-900/20 px-1.5 py-0.5 rounded" title={e.ataccamaRef}>ONE</span> : <span className="text-slate-600 text-xs">—</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{timeAgo(e.updated)}</td>
                          <td className="px-3 py-3 text-slate-300 text-xs tabular-nums">{e.impactedRecords}</td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && <div className="text-center py-12 text-slate-500">No exceptions match the current filters.</div>}
              </div>
            )}

            {view === "board" && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.values(STATUS).map(function(status) {
                  var items = filtered.filter(function(e) { return e.status === status; });
                  return (
                    <div key={status} className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
                        <div className="flex items-center gap-2"><StatusBadge status={status} /><span className="text-slate-500 text-xs">{"(" + items.length + ")"}</span></div>
                      </div>
                      <div className="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                        {items.map(function(e) { return (
                          <div key={e.id} onClick={function() { setSelectedId(e.id); }} className="bg-slate-800/70 border border-slate-700/40 rounded-lg p-3 cursor-pointer hover:border-slate-600/60 transition-colors">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-teal-400 font-mono text-xs">{e.id}</span>
                              <SeverityBadge severity={e.severity} />
                            </div>
                            <p className="text-white text-xs font-medium leading-snug mb-2">{e.title}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {e.ataccamaDQScore != null && <DQScoreRing score={e.ataccamaDQScore} size={22} strokeWidth={2.5} />}
                                <span className="text-slate-500 text-xs">{e.source}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {e.jiraKey && <span className="text-blue-400 text-xs">J</span>}
                                {e.ataccamaRef && <span className="text-indigo-400 text-xs">A</span>}
                                {e.assignee && <div className="w-5 h-5 rounded-full bg-teal-800/60 flex items-center justify-center text-teal-300 text-xs font-bold">{e.assignee[0]}</div>}
                              </div>
                            </div>
                          </div>
                        ); })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "monitoring" && (
          <div className="space-y-5">
            <AtaccamaMonitoringPanel projects={ATACCAMA_PROJECTS} onImportIssues={handleImportIssues} />
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Cross-Project DQ Dimension Averages</h3>
              <div className="grid grid-cols-6 gap-4">
                {DQ_DIMENSIONS.map(function(dim) {
                  var avg = ATACCAMA_PROJECTS.reduce(function(s, p) { return s + p.dimensions[dim]; }, 0) / ATACCAMA_PROJECTS.length;
                  return (
                    <div key={dim} className="text-center">
                      <DQScoreRing score={avg} size={56} strokeWidth={5} />
                      <div className="text-slate-300 text-xs font-medium mt-2">{dim}</div>
                      <div className="text-slate-500 text-xs">{avg.toFixed(1) + "%"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700/40 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Ataccama ONE — DQ Issues</h3>
                <span className="text-slate-500 text-xs">{ATACCAMA_ISSUES.length + " issues detected"}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                    <th className="px-3 py-3 text-left font-medium">Issue</th>
                    <th className="px-3 py-3 text-left font-medium">Rule</th>
                    <th className="px-3 py-3 text-left font-medium">Dimension</th>
                    <th className="px-3 py-3 text-left font-medium">DQ Score</th>
                    <th className="px-3 py-3 text-left font-medium">Failed / Total</th>
                    <th className="px-3 py-3 text-left font-medium">Source</th>
                    <th className="px-3 py-3 text-left font-medium">Status</th>
                    <th className="px-3 py-3 text-left font-medium">Linked</th>
                  </tr></thead>
                  <tbody>
                    {ATACCAMA_ISSUES.map(function(issue) {
                      var linked = exceptions.find(function(e) { return e.ataccamaRef === issue.id; });
                      return (
                        <tr key={issue.id} className="border-b border-slate-700/30 hover:bg-slate-700/15 transition-colors">
                          <td className="px-3 py-3"><span className="text-indigo-400 font-mono text-xs">{issue.id}</span></td>
                          <td className="px-3 py-3"><div className="text-white text-xs font-medium">{issue.ruleName}</div><div className="text-slate-500 text-xs font-mono">{issue.ruleId}</div></td>
                          <td className="px-3 py-3 text-slate-300 text-xs">{issue.dimension}</td>
                          <td className="px-3 py-3"><DQScoreRing score={issue.dqScore} size={30} strokeWidth={3} /></td>
                          <td className="px-3 py-3"><span className="text-red-400 text-xs font-bold">{issue.failedRecords}</span><span className="text-slate-500 text-xs">{" / " + issue.totalRecords}</span></td>
                          <td className="px-3 py-3 text-slate-300 text-xs">{issue.source}</td>
                          <td className="px-3 py-3"><span className={"px-2 py-0.5 rounded-full text-xs " + (issue.status === "open" ? "bg-red-500/20 text-red-300" : issue.status === "in_progress" ? "bg-amber-500/20 text-amber-300" : issue.status === "escalated" ? "bg-fuchsia-500/20 text-fuchsia-300" : issue.status === "resolved" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-slate-400")}>{issue.status.replace("_", " ")}</span></td>
                          <td className="px-3 py-3">{linked ? <span className="text-teal-400 font-mono text-xs">{linked.id}</span> : <span className="text-slate-600 text-xs">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Exceptions by Source</h3>
              <div className="space-y-3">
                {SOURCES.map(function(src) {
                  var count = exceptions.filter(function(e) { return e.source === src && e.status !== STATUS.CLOSED; }).length;
                  var crit = exceptions.filter(function(e) { return e.source === src && e.severity === SEVERITY.CRITICAL && e.status !== STATUS.CLOSED; }).length;
                  var max = Math.max.apply(null, SOURCES.map(function(s) { return exceptions.filter(function(e) { return e.source === s && e.status !== STATUS.CLOSED; }).length; }).concat([1]));
                  return (
                    <div key={src} className="flex items-center gap-3">
                      <span className="text-slate-300 text-xs w-36 flex-shrink-0 truncate">{src}</span>
                      <div className="flex-1 bg-slate-700/30 rounded-full h-4 overflow-hidden relative">
                        <div className="h-full bg-gradient-to-r from-teal-600 to-cyan-500 rounded-full transition-all duration-500" style={{ width: (count / max) * 100 + "%" }} />
                        {crit > 0 && <div className="absolute right-2 top-0 h-full flex items-center"><span className="text-red-300 text-xs font-bold">{crit + " crit"}</span></div>}
                      </div>
                      <span className="text-white text-xs font-bold w-6 text-right tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Exceptions by DQ Dimension</h3>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(function(cat, idx) {
                  var count = exceptions.filter(function(e) { return e.category === cat && e.status !== STATUS.CLOSED; }).length;
                  var colors = ["bg-teal-500/20 text-teal-300 border-teal-700/30", "bg-amber-500/20 text-amber-300 border-amber-700/30", "bg-sky-500/20 text-sky-300 border-sky-700/30", "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-700/30", "bg-rose-500/20 text-rose-300 border-rose-700/30", "bg-emerald-500/20 text-emerald-300 border-emerald-700/30", "bg-violet-500/20 text-violet-300 border-violet-700/30", "bg-orange-500/20 text-orange-300 border-orange-700/30"];
                  return (
                    <div key={cat} className={"border rounded-lg p-3 flex items-center justify-between " + colors[idx]}>
                      <span className="text-xs font-medium">{cat}</span>
                      <span className="text-lg font-bold tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Integration Coverage</h3>
              <div className="space-y-4">
                {[["Ataccama ONE Linked", stats.ataccamaLinked, stats.total, "from-indigo-500 to-violet-500"], ["JIRA Tickets Created", stats.jiraLinked, stats.total, "from-blue-500 to-blue-600"], ["Fully Tracked (Both)", exceptions.filter(function(e) { return e.jiraKey && e.ataccamaRef; }).length, stats.total, "from-emerald-500 to-teal-500"], ["Unlinked Exceptions", exceptions.filter(function(e) { return !e.jiraKey && !e.ataccamaRef; }).length, stats.total, "from-red-500 to-rose-500"]].map(function(item) { return (
                  <div key={item[0]}>
                    <div className="flex items-center justify-between mb-1"><span className="text-slate-300 text-xs">{item[0]}</span><span className="text-white text-xs font-bold">{item[1] + " / " + item[2]}</span></div>
                    <div className="h-2 bg-slate-700/40 rounded-full overflow-hidden"><div className={"h-full rounded-full bg-gradient-to-r " + item[3]} style={{ width: (item[1] / item[2]) * 100 + "%", transition: "width 0.5s" }} /></div>
                  </div>
                ); })}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">DQ Scores by Source (Open Issues)</h3>
              <div className="space-y-3">
                {SOURCES.map(function(src) {
                  var issues = exceptions.filter(function(e) { return e.source === src && e.ataccamaDQScore != null && e.status !== STATUS.CLOSED && e.status !== STATUS.RESOLVED; });
                  var avg = issues.length ? issues.reduce(function(s, e) { return s + e.ataccamaDQScore; }, 0) / issues.length : null;
                  return (
                    <div key={src} className="flex items-center gap-3">
                      <span className="text-slate-300 text-xs w-36 flex-shrink-0 truncate">{src}</span>
                      {avg != null ? (
                        <>
                          <div className="flex-1 bg-slate-700/30 rounded-full h-3 overflow-hidden">
                            <div className={"h-full rounded-full " + dqBg(avg)} style={{ width: avg + "%", transition: "width 0.5s" }} />
                          </div>
                          <span className={"text-xs font-bold w-12 text-right tabular-nums " + dqColor(avg)}>{avg.toFixed(1) + "%"}</span>
                        </>
                      ) : (
                        <span className="text-slate-600 text-xs">No data</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {selected && <ExceptionDetail exception={selected} onClose={function() { setSelectedId(null); }} onCreateJira={function() { setJiraModalId(selected.id); }} onSyncAtaccama={function() { setAtaccamaSyncId(selected.id); }} onStatusChange={function(s) { handleStatusChange(selected.id, s); }} onAddComment={function(t) { handleAddComment(selected.id, t); }} />}
      {jiraModalException && <JiraModal exception={jiraModalException} config={jiraConfig} onClose={function() { setJiraModalId(null); }} onCreated={function(key) { handleJiraCreated(jiraModalException.id, key); }} />}
      {ataccamaSyncException && <AtaccamaSyncModal exception={ataccamaSyncException} config={ataccamaConfig} onClose={function() { setAtaccamaSyncId(null); }} onSynced={function(action) { handleAtaccamaSynced(ataccamaSyncException.id, action); }} />}
      {showConfig && <IntegrationConfigModal jiraConfig={jiraConfig} ataccamaConfig={ataccamaConfig} onSaveJira={setJiraConfig} onSaveAtaccama={setAtaccamaConfig} onClose={function() { setShowConfig(false); }} />}
    </div>
  );
}
