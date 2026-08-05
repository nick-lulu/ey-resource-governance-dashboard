# EY Vendor Resource Governance Dashboard

React dashboard for validating EY vendor planned effort, actual timesheets and Q3 forecast readiness.

## Dashboard scope

- Q1: February through April 2026
- Q2: May through July 2026
- Q3: August through October 2026
- Core EY view: Iris jin, Morgan Xu, Nina Wu and Cindy Zhang
- Full detail: all EY resources found in the source workbooks
- Conversion: 1 MD = 8 hours

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:8081`.

## Refresh workbook data

Windows:

```powershell
python scripts/compute_ey_resource_analysis.py --source-dir "D:/pm/resource/1"
```

macOS:

```bash
python3 scripts/compute_ey_resource_analysis.py --source-dir "/path/to/resource/files"
```

The source directory must contain the planning and actual `.xlsx` workbooks.

## Build

```bash
npm run build
```

GitHub Actions deploys the `dist` output to GitHub Pages after every push to `main`.
