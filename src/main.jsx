import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Gauge,
  Target,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import data from "./data/ey_analysis.json";
import "./styles.css";

const formatMd = (value, digits = 1) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const signedMd = (value) => `${Number(value) >= 0 ? "+" : ""}${formatMd(value)} MD`;

function Kpi({ icon: Icon, label, value, note, tone = "" }) {
  return (
    <section className={`kpi ${tone}`}>
      <div className="kpi-heading">
        <p>{label}</p>
        <Icon size={19} />
      </div>
      <strong>{value}</strong>
      <span>{note}</span>
    </section>
  );
}

function StatusBadge({ value }) {
  return <span className={`status ${value.toLowerCase()}`}>{value}</span>;
}

function downloadDetail() {
  const columns = [
    "Resource", "Core EY", "Status",
    "Q1 Actual", "Q1 Planned", "Q2 Actual", "Q2 Planned", "Q3 Forecast",
    "Q1 CSCOP Actual", "Q1 CSCOP Planned", "Q2 CSCOP Actual", "Q2 CSCOP Planned", "Q3 CSCOP Forecast",
    "Q1 Non-CSCOP Actual", "Q1 Non-CSCOP Planned", "Q2 Non-CSCOP Actual", "Q2 Non-CSCOP Planned", "Q3 Non-CSCOP Forecast",
    "Current Read",
  ];
  const rows = data.resources.map((row) => [
    row.name,
    row.featured ? "Yes" : "No",
    row.status,
    row.q1_actual,
    row.q1_planned,
    row.q2_actual,
    row.q2_planned,
    row.q3_planned,
    row.q1_cscop_actual,
    row.q1_cscop_planned,
    row.q2_cscop_actual,
    row.q2_cscop_planned,
    row.q3_cscop_planned,
    row.q1_non_cscop_actual,
    row.q1_non_cscop_planned,
    row.q2_non_cscop_actual,
    row.q2_non_cscop_planned,
    row.q3_non_cscop_planned,
    row.current_read,
  ]);
  const csv = [columns, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "EY_Resource_Governance_Detail.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [projectQuarter, setProjectQuarter] = useState("Q1");
  const [projectScope, setProjectScope] = useState("cscop");
  const [resourceScope, setResourceScope] = useState("cscop");
  const [coreScope, setCoreScope] = useState("cscop");
  const [summaryScope, setSummaryScope] = useState("cscop");
  const {
    totals,
    cscop_totals: cscopTotals,
    non_cscop_totals: nonCscopTotals,
    featured_totals: featuredTotals,
  } = data;
  const q1Gap = totals.q1_actual - totals.q1_planned;
  const q2Gap = totals.q2_actual - totals.q2_planned;
  const q3VsQ2Actual = totals.q2_actual ? totals.q3_planned / totals.q2_actual : 0;
  const q3VsQ2Plan = totals.q2_planned ? totals.q3_planned / totals.q2_planned : 0;
  const featuredShare = totals.q1_actual ? featuredTotals.q1_actual / totals.q1_actual : 0;
  const q1CscopCoverage = totals.q1_actual ? cscopTotals.q1_actual / totals.q1_actual : 0;
  const q2CscopCoverage = totals.q2_actual ? cscopTotals.q2_actual / totals.q2_actual : 0;
  const q3CscopCoverage = totals.q3_planned ? cscopTotals.q3_planned / totals.q3_planned : 0;
  const summaryTotals = summaryScope === "cscop" ? cscopTotals : nonCscopTotals;
  const summaryLabel = summaryScope === "cscop" ? "CSCOP" : "Non-CSCOP";
  const summaryQ1Gap = summaryTotals.q1_actual - summaryTotals.q1_planned;
  const summaryQ2Gap = summaryTotals.q2_actual - summaryTotals.q2_planned;

  const chartData = [
    { quarter: "Q1", actual: totals.q1_actual, planned: totals.q1_planned },
    { quarter: "Q2", actual: totals.q2_actual, planned: totals.q2_planned },
    { quarter: "Q3", actual: 0, planned: totals.q3_planned },
  ];

  const featuredRows = useMemo(
    () => data.featured_names.map((name) => data.resources.find((row) => row.name === name)).filter(Boolean),
    [],
  );
  const featuredSplitTotals = useMemo(() => {
    const summarize = (scope) => ({
      q1Actual: featuredRows.reduce((sum, row) => sum + Number(row[`q1_${scope}_actual`] || 0), 0),
      q1Plan: featuredRows.reduce((sum, row) => sum + Number(row[`q1_${scope}_planned`] || 0), 0),
      q2Actual: featuredRows.reduce((sum, row) => sum + Number(row[`q2_${scope}_actual`] || 0), 0),
      q2Plan: featuredRows.reduce((sum, row) => sum + Number(row[`q2_${scope}_planned`] || 0), 0),
      q3Plan: featuredRows.reduce((sum, row) => sum + Number(row[`q3_${scope}_planned`] || 0), 0),
    });
    return { cscop: summarize("cscop"), non_cscop: summarize("non_cscop") };
  }, [featuredRows]);
  const detailRows = useMemo(
    () => [...data.resources].sort((a, b) => (b.q1_actual + b.q2_actual) - (a.q1_actual + a.q2_actual)),
    [],
  );
  const projectRows = useMemo(
    () => data.projects
      .filter((row) => row.quarter === projectQuarter && row.cscop === (projectScope === "cscop"))
      .slice(0, 10),
    [projectQuarter, projectScope],
  );

  const scopedResourceValue = (row, quarter, type) =>
    row[`${quarter}_${resourceScope === "cscop" ? "cscop" : "non_cscop"}_${type}`] || 0;
  const coreResourceValue = (row, quarter, type) =>
    row[`${quarter}_${coreScope === "cscop" ? "cscop" : "non_cscop"}_${type}`] || 0;
  const coreTotals = featuredSplitTotals[coreScope];

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Lululemon Portfolio Resource Planning</p>
          <h1>EY Vendor Resource Reality</h1>
          <p className="subtitle">
            Q1 and Q2 validate actual effort against planned MD. Q3 shows forecast readiness for EY vendor demand before execution.
          </p>
        </div>
        <div className="hero-actions">
          <div className="tabs summary-tabs" role="tablist" aria-label="Portfolio summary scope">
            <button className={summaryScope === "cscop" ? "active" : ""} type="button" onClick={() => setSummaryScope("cscop")}>CSCOP</button>
            <button className={summaryScope === "non_cscop" ? "active" : ""} type="button" onClick={() => setSummaryScope("non_cscop")}>Non-CSCOP</button>
          </div>
          <button className="download" type="button" onClick={downloadDetail}>
            <Download size={17} />
            Data detail
          </button>
        </div>
      </header>

      <section className="kpis">
        <Kpi icon={Users} label="EY Resource Scope" value={`${data.resource_count} people`} note="Fixed EY resource pool: 4 core + 9 additional resources" />
        <Kpi icon={BarChart3} label={`Q1 ${summaryLabel} Actual vs Planned`} value={`${formatMd(summaryTotals.q1_actual)} / ${formatMd(summaryTotals.q1_planned)} MD`} note={`${signedMd(summaryQ1Gap)} variance`} tone="blue" />
        <Kpi icon={Target} label={`Q2 ${summaryLabel} Actual vs Planned`} value={`${formatMd(summaryTotals.q2_actual)} / ${formatMd(summaryTotals.q2_planned)} MD`} note={`${signedMd(summaryQ2Gap)} variance`} tone="amber" />
        <Kpi icon={Gauge} label={`Q3 ${summaryLabel} Forecast`} value={`${formatMd(summaryTotals.q3_planned)} MD`} note="No Q3 actual in the source as of 31 Jul" tone="green" />
      </section>

      <section className="summary-grid">
        <article className="panel narrative">
          <div className="panel-title">
            <h2>Takeaway</h2>
            <StatusBadge value="High" />
          </div>
          <ul>
            <li>
              <strong>Q1 delivery exceeded plan, while Q2 actual was materially below plan.</strong>
              <span>Q1 was {signedMd(q1Gap)}; Q2 was {signedMd(q2Gap)}. The pattern points to timing, allocation or timesheet completeness questions rather than one consistent capacity trend.</span>
            </li>
            <li>
              <strong>Core EY effort was concentrated in Q1.</strong>
              <span>Iris, Morgan, Nina and Cindy contributed {formatMd(featuredTotals.q1_actual)} MD, or {(featuredShare * 100).toFixed(0)}% of total EY Q1 actual effort.</span>
            </li>
            <li>
              <strong>Q3 forecast coverage is the immediate governance gap.</strong>
              <span>Only {formatMd(totals.q3_planned)} MD is planned, equal to {(q3VsQ2Actual * 100).toFixed(0)}% of Q2 actual and {(q3VsQ2Plan * 100).toFixed(0)}% of Q2 planned demand.</span>
            </li>
          </ul>
        </article>

        <article className="panel narrative">
          <div className="panel-title">
            <h2>Insight</h2>
            <span className="unit">Decision view</span>
          </div>
          <ul>
            <li>
              <strong>Validate the Q2 drop before treating it as released capacity.</strong>
              <span>Core resources recorded just {formatMd(featuredTotals.q2_actual)} MD actual against {formatMd(featuredTotals.q2_planned)} MD planned. Confirm project completion, role changes and missing timesheets.</span>
            </li>
            <li>
              <strong>Reconfirm named demand for Q3.</strong>
              <span>Nina has no Q3 plan; Iris and Cindy have almost no Q3 allocation. Morgan has {formatMd(featuredRows.find((row) => row.name === "Morgan Xu")?.q3_planned)} MD forecast.</span>
            </li>
            <li>
              <strong>Use weekly actual-vs-forecast checks from August.</strong>
              <span>Flag unplanned actual effort immediately and review any person or project with variance above 20%.</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="panel governance-panel">
        <div className="panel-title">
          <h2>CSCOP Governance Split</h2>
          <span className="unit">Formal project ID vs Non-CSCOP</span>
        </div>
        <div className="dedicated-summary governance-summary">
          <div>
            <span>Q1 CSCOP Actual / Planned</span>
            <strong>{formatMd(cscopTotals.q1_actual)} / {formatMd(cscopTotals.q1_planned)} MD</strong>
            <small>{(q1CscopCoverage * 100).toFixed(0)}% of Q1 actual has CSCOP ID</small>
          </div>
          <div>
            <span>Q2 CSCOP Actual / Planned</span>
            <strong>{formatMd(cscopTotals.q2_actual)} / {formatMd(cscopTotals.q2_planned)} MD</strong>
            <small>{(q2CscopCoverage * 100).toFixed(0)}% of Q2 actual has CSCOP ID</small>
          </div>
          <div>
            <span>Q3 CSCOP Forecast</span>
            <strong>{formatMd(cscopTotals.q3_planned)} MD</strong>
            <small>{(q3CscopCoverage * 100).toFixed(0)}% of Q3 plan has CSCOP ID</small>
          </div>
          <p>
            Q2 actual is mainly recorded under Operation rather than CSCOP projects. Before resource decisions, confirm whether this is genuine BAU effort or project work missing a CSCOP ID.
          </p>
        </div>
        <div className="governance-band">
          <strong>Non-CSCOP:</strong>
          <span>Q1 {formatMd(nonCscopTotals.q1_actual)} / {formatMd(nonCscopTotals.q1_planned)} MD</span>
          <span>Q2 {formatMd(nonCscopTotals.q2_actual)} / {formatMd(nonCscopTotals.q2_planned)} MD</span>
          <span>Q3 forecast {formatMd(nonCscopTotals.q3_planned)} MD</span>
        </div>
      </section>

      <section className="summary-grid">
        <article className="panel chart-panel">
          <div className="panel-title">
            <h2>Quarter View</h2>
            <span className="unit">MD</span>
          </div>
          <ResponsiveContainer width="100%" height={286}>
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${formatMd(value)} MD`} />
              <Legend />
              <Bar dataKey="planned" name="Planned / Forecast" fill="#0f766e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="panel action-panel">
          <div className="panel-title">
            <h2>Management Actions</h2>
            <span className="unit">Next review</span>
          </div>
          <div className="action-list">
            <div><AlertTriangle size={18} /><span><strong>Forecast owner</strong>Confirm Q3 allocation for Nina, Iris and Cindy.</span></div>
            <div><AlertTriangle size={18} /><span><strong>Timesheet owner</strong>Validate whether Q2 zero actuals are real or incomplete submissions.</span></div>
            <div><CheckCircle2 size={18} /><span><strong>PM / Project owner</strong>Map each active project to named EY resources and remaining MD.</span></div>
          </div>
        </article>
      </section>

      <section className="panel dedicated-panel">
        <div className="panel-title">
          <h2>Core EY Vendor Reality</h2>
          <div className="panel-controls">
            <span className="unit">Iris · Morgan · Nina · Cindy</span>
            <div className="tabs scope-tabs" role="tablist" aria-label="Core EY ID scope">
              <button className={coreScope === "cscop" ? "active" : ""} type="button" onClick={() => setCoreScope("cscop")}>CSCOP Projects</button>
              <button className={coreScope === "non_cscop" ? "active" : ""} type="button" onClick={() => setCoreScope("non_cscop")}>Non-CSCOP</button>
            </div>
          </div>
        </div>
        <div className="dedicated-summary">
          <div><span>Q1 {coreScope === "cscop" ? "CSCOP" : "Non-CSCOP"} Actual / Planned</span><strong>{formatMd(coreTotals.q1Actual)} / {formatMd(coreTotals.q1Plan)} MD</strong></div>
          <div><span>Q2 {coreScope === "cscop" ? "CSCOP" : "Non-CSCOP"} Actual / Planned</span><strong>{formatMd(coreTotals.q2Actual)} / {formatMd(coreTotals.q2Plan)} MD</strong></div>
          <div><span>Q3 {coreScope === "cscop" ? "CSCOP" : "Non-CSCOP"} Forecast</span><strong>{formatMd(coreTotals.q3Plan)} MD</strong></div>
          <p>
            {coreScope === "cscop"
              ? "The four core resources account for almost all Q1 CSCOP actual effort. Q2 CSCOP actual is concentrated in Morgan, while Q3 named forecast remains very light."
              : "Q1 non-CSCOP actual is concentrated in Cindy. Confirm whether this is valid Operation effort or project work that should carry a CSCOP ID."}
          </p>
        </div>
        <div className="core-split-overview">
          <div>
            <strong>CSCOP Project Effort</strong>
            <span>Q1 {formatMd(featuredSplitTotals.cscop.q1Actual)} / {formatMd(featuredSplitTotals.cscop.q1Plan)} MD</span>
            <span>Q2 {formatMd(featuredSplitTotals.cscop.q2Actual)} / {formatMd(featuredSplitTotals.cscop.q2Plan)} MD</span>
            <span>Q3 {formatMd(featuredSplitTotals.cscop.q3Plan)} MD</span>
          </div>
          <div>
            <strong>Non-CSCOP Effort</strong>
            <span>Q1 {formatMd(featuredSplitTotals.non_cscop.q1Actual)} / {formatMd(featuredSplitTotals.non_cscop.q1Plan)} MD</span>
            <span>Q2 {formatMd(featuredSplitTotals.non_cscop.q2Actual)} / {formatMd(featuredSplitTotals.non_cscop.q2Plan)} MD</span>
            <span>Q3 {formatMd(featuredSplitTotals.non_cscop.q3Plan)} MD</span>
          </div>
        </div>
        <div className="table-wrap compact-table">
          <table>
            <thead><tr><th>Status</th><th>Core EY Vendor</th><th>Q1 Actual / Planned</th><th>Q2 Actual / Planned</th><th>Q3 Forecast</th><th>Current Read</th></tr></thead>
            <tbody>
              {featuredRows.map((row) => (
                <tr key={row.name}>
                  <td><StatusBadge value={row.status} /></td>
                  <td><strong>{row.name}</strong><small>EY · Corporate</small></td>
                  <td>{formatMd(coreResourceValue(row, "q1", "actual"))} / {formatMd(coreResourceValue(row, "q1", "planned"))} MD</td>
                  <td>{formatMd(coreResourceValue(row, "q2", "actual"))} / {formatMd(coreResourceValue(row, "q2", "planned"))} MD</td>
                  <td>{formatMd(coreResourceValue(row, "q3", "planned"))} MD</td>
                  <td>
                    {coreScope === "cscop"
                      ? coreResourceValue(row, "q3", "planned") === 0 && coreResourceValue(row, "q1", "actual") + coreResourceValue(row, "q2", "actual") > 0
                        ? "Historical CSCOP effort; no Q3 forecast"
                        : "CSCOP project allocation"
                      : coreResourceValue(row, "q1", "actual") + coreResourceValue(row, "q2", "actual") >= 5
                        ? "Material non-CSCOP actual; validate classification"
                        : "Limited non-CSCOP effort"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel project-panel">
        <div className="panel-title">
          <h2>Project Effort Detail</h2>
          <div className="panel-controls">
            <div className="tabs scope-tabs" role="tablist" aria-label="Project ID scope">
              <button className={projectScope === "cscop" ? "active" : ""} type="button" onClick={() => setProjectScope("cscop")}>CSCOP Projects</button>
              <button className={projectScope === "non_cscop" ? "active" : ""} type="button" onClick={() => setProjectScope("non_cscop")}>Non-CSCOP</button>
            </div>
            <div className="tabs" role="tablist" aria-label="Project quarter">
              {["Q1", "Q2", "Q3"].map((quarter) => (
                <button key={quarter} className={projectQuarter === quarter ? "active" : ""} type="button" onClick={() => setProjectQuarter(quarter)}>{quarter}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="table-wrap project-table">
          <table>
            <thead><tr><th>Project ID</th><th>Project</th><th>Actual MD</th><th>Planned / Forecast MD</th><th>Variance</th><th>Read</th></tr></thead>
            <tbody>
              {projectRows.map((row) => {
                const variance = row.actual - row.planned;
                return (
                  <tr key={`${row.quarter}-${row.project_id}-${row.project}`}>
                    <td><span className={row.cscop ? "project-id" : "operation-id"}>{row.project_id}</span></td>
                    <td><strong>{row.project}</strong></td>
                    <td>{projectQuarter === "Q3" ? "Not started" : `${formatMd(row.actual)} MD`}</td>
                    <td>{formatMd(row.planned)} MD</td>
                    <td className={variance > 0 ? "negative" : "positive"}>{projectQuarter === "Q3" ? "—" : signedMd(variance)}</td>
                    <td>{projectQuarter === "Q3" ? "Forecast baseline" : Math.abs(variance) >= 5 ? "Review material variance" : "Within 5 MD"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel resource-panel">
        <div className="panel-title">
          <h2>All EY Resource Detail</h2>
          <div className="tabs scope-tabs" role="tablist" aria-label="Resource ID scope">
            <button className={resourceScope === "cscop" ? "active" : ""} type="button" onClick={() => setResourceScope("cscop")}>CSCOP Projects</button>
            <button className={resourceScope === "non_cscop" ? "active" : ""} type="button" onClick={() => setResourceScope("non_cscop")}>Non-CSCOP</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Status</th><th>Resource</th><th>Q1 Actual / Planned</th><th>Q2 Actual / Planned</th><th>Q3 Forecast</th><th>Current Read</th></tr></thead>
            <tbody>
              {detailRows.map((row) => (
                <tr key={row.name}>
                  <td><StatusBadge value={row.status} /></td>
                  <td><strong>{row.name}</strong><small>{row.featured ? "Core EY vendor" : "EY resource"}</small></td>
                  <td>{formatMd(scopedResourceValue(row, "q1", "actual"))} / {formatMd(scopedResourceValue(row, "q1", "planned"))} MD</td>
                  <td>{formatMd(scopedResourceValue(row, "q2", "actual"))} / {formatMd(scopedResourceValue(row, "q2", "planned"))} MD</td>
                  <td>{formatMd(scopedResourceValue(row, "q3", "planned"))} MD</td>
                  <td>
                    {resourceScope === "cscop"
                      ? scopedResourceValue(row, "q3", "planned") === 0 && scopedResourceValue(row, "q1", "actual") + scopedResourceValue(row, "q2", "actual") > 0
                        ? "Historical CSCOP effort; no Q3 forecast"
                        : "CSCOP project allocation"
                      : "Non-CSCOP effort; validate classification"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer><CheckCircle2 size={16} />Source cut-off: {data.as_of}. Q1 = Feb-Apr, Q2 = May-Jul, Q3 = Aug-Oct. 1 MD = 8 hours.</footer>
    </main>
  );
}

const rootElement = document.getElementById("root");
const root = import.meta.hot?.data.root ?? createRoot(rootElement);
root.render(<App />);

if (import.meta.hot) {
  import.meta.hot.data.root = root;
}
