# EY Resource Governance Dashboard

## Purpose

This is an independent Vite/React dashboard for EY vendor resource planning. Do not modify the parent Lululemon dashboard when changing this project.

## Data rules

- Q1 is February through April 2026.
- Q2 is May through July 2026.
- Q3 is August through October 2026.
- One MD equals eight hours.
- Planning data comes from the daily planning detail sheet.
- Actual data comes from the raw timesheet detail sheet.
- Filter EY resources using the company field, not name matching.
- The core group is Iris jin, Morgan Xu, Nina Wu and Cindy Zhang.
- Keep all other EY resources in the detailed list.

## Commands

Refresh data from this repository root:

```powershell
python scripts/compute_ey_resource_analysis.py --source-dir "D:/pm/resource/1"
```

Run or build from this directory:

```powershell
npm install
npm run dev
npm run build
```

## Change discipline

- Keep the dashboard focused on actual vs planned, Q3 forecast readiness and actionable gaps.
- Do not invent forecast values when the workbook has no data.
- Preserve the clean visual language and responsive behavior.
- Rebuild and visually verify desktop and mobile layouts after frontend changes.
