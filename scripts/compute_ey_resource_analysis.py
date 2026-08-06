"""Build the EY vendor dashboard dataset from planning and timesheet workbooks."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


QUARTERS = {
    "Q1": ("2026-02-01", "2026-04-30"),
    "Q2": ("2026-05-01", "2026-07-31"),
    "Q3": ("2026-08-01", "2026-10-31"),
}
FEATURED = ["Iris jin", "Morgan Xu", "Nina Wu", "Cindy Zhang"]


def md(value: float) -> float:
    return round(float(value) / 8, 2)


def quarter_value(dates: pd.Series, hours: pd.Series, quarter: str) -> float:
    start, end = QUARTERS[quarter]
    return md(hours[dates.between(start, end)].sum())


def resource_status(row: dict) -> str:
    historical_gap = max(abs(row["q1_actual"] - row["q1_planned"]), abs(row["q2_actual"] - row["q2_planned"]))
    if row["q3_planned"] == 0 and row["q1_actual"] + row["q2_actual"] >= 5:
        return "High"
    if row["q3_planned"] < row["q2_actual"] * 0.5 and row["q2_actual"] >= 2:
        return "High"
    if historical_gap >= 10:
        return "High"
    if historical_gap >= 3 or row["q3_planned"] == 0:
        return "Medium"
    return "Low"


def current_read(row: dict) -> str:
    historical = row["q1_actual"] + row["q2_actual"]
    if row["q3_planned"] == 0 and historical >= 5:
        return "Q3 forecast missing despite historical demand"
    if row["q3_planned"] < max(row["q1_actual"], row["q2_actual"]) * 0.1 and historical >= 5:
        return "Q3 forecast is very light vs historical demand"
    if row["q3_planned"] < row["q2_actual"] * 0.5 and row["q2_actual"] >= 2:
        return "Q3 forecast needs confirmation"
    if row["q3_planned"] == 0:
        return "No Q3 demand currently planned"
    return "Forecast baseline exists"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", default=r"D:/pm/resource/1")
    parser.add_argument("--output", default="src/data/ey_analysis.json")
    args = parser.parse_args()

    files = sorted(Path(args.source_dir).glob("*.xlsx"), key=lambda path: path.stat().st_size)
    if len(files) < 2:
        raise FileNotFoundError("Expected the planning and actual XLSX files in the source directory")

    actual_path, plan_path = files[0], files[-1]
    plan = pd.read_excel(plan_path, sheet_name=0)
    actual = pd.read_excel(actual_path, sheet_name=1)

    # Positional columns keep this refresh script reliable across Windows/Mac locale settings.
    plan = plan[plan.iloc[:, 2].astype(str).str.strip().str.upper().eq("EY")].copy()
    actual = actual[actual.iloc[:, 1].astype(str).str.strip().str.upper().eq("EY")].copy()

    plan_names = plan.iloc[:, 1].astype(str).str.strip()
    plan_dates = pd.to_datetime(plan.iloc[:, 0], errors="coerce")
    plan_hours = pd.to_numeric(plan.iloc[:, 25], errors="coerce").fillna(0)
    plan_ids = plan.iloc[:, 5].fillna("").astype(str).str.strip()
    plan_projects = plan.iloc[:, 6].fillna("Unassigned").astype(str).str.strip()
    plan_cscop = plan_ids.str.upper().str.startswith("CSCOP-")

    actual_names = actual.iloc[:, 0].astype(str).str.strip()
    actual_dates = pd.to_datetime(actual.iloc[:, 13], errors="coerce")
    actual_hours = pd.to_numeric(actual.iloc[:, 16], errors="coerce").fillna(0)
    actual_ids = actual.iloc[:, 4].fillna("").astype(str).str.strip()
    actual_projects = actual.iloc[:, 5].fillna("Unassigned").astype(str).str.strip()
    actual_cscop = actual_ids.str.upper().str.startswith("CSCOP-")

    planned_names = set(plan_names.unique())
    actual_roster = set(actual_names.unique())
    names = sorted(planned_names | actual_roster)
    plan_only_resources = sorted(planned_names - actual_roster)
    actual_only_resources = sorted(actual_roster - planned_names)
    resources = []
    for name in names:
        row = {
            "name": name,
            "featured": name in FEATURED,
            "planned_roster": name in planned_names,
            "actual_roster": name in actual_roster,
        }
        for quarter in QUARTERS:
            row[f"{quarter.lower()}_planned"] = quarter_value(
                plan_dates[plan_names.eq(name)], plan_hours[plan_names.eq(name)], quarter
            )
            row[f"{quarter.lower()}_actual"] = quarter_value(
                actual_dates[actual_names.eq(name)], actual_hours[actual_names.eq(name)], quarter
            )
            row[f"{quarter.lower()}_cscop_planned"] = quarter_value(
                plan_dates[plan_names.eq(name) & plan_cscop],
                plan_hours[plan_names.eq(name) & plan_cscop],
                quarter,
            )
            row[f"{quarter.lower()}_cscop_actual"] = quarter_value(
                actual_dates[actual_names.eq(name) & actual_cscop],
                actual_hours[actual_names.eq(name) & actual_cscop],
                quarter,
            )
            row[f"{quarter.lower()}_non_cscop_planned"] = quarter_value(
                plan_dates[plan_names.eq(name) & ~plan_cscop],
                plan_hours[plan_names.eq(name) & ~plan_cscop],
                quarter,
            )
            row[f"{quarter.lower()}_non_cscop_actual"] = quarter_value(
                actual_dates[actual_names.eq(name) & ~actual_cscop],
                actual_hours[actual_names.eq(name) & ~actual_cscop],
                quarter,
            )
        row["status"] = "Medium" if name in plan_only_resources else resource_status(row)
        row["current_read"] = (
            "Planned resource; no Actual timesheet record"
            if name in plan_only_resources
            else current_read(row)
        )
        resources.append(row)

    totals = {}
    cscop_totals = {}
    non_cscop_totals = {}
    for quarter in QUARTERS:
        totals[f"{quarter.lower()}_planned"] = quarter_value(plan_dates, plan_hours, quarter)
        totals[f"{quarter.lower()}_actual"] = quarter_value(actual_dates, actual_hours, quarter)
        cscop_totals[f"{quarter.lower()}_planned"] = quarter_value(
            plan_dates[plan_cscop], plan_hours[plan_cscop], quarter
        )
        cscop_totals[f"{quarter.lower()}_actual"] = quarter_value(
            actual_dates[actual_cscop], actual_hours[actual_cscop], quarter
        )
        non_cscop_totals[f"{quarter.lower()}_planned"] = quarter_value(
            plan_dates[~plan_cscop], plan_hours[~plan_cscop], quarter
        )
        non_cscop_totals[f"{quarter.lower()}_actual"] = quarter_value(
            actual_dates[~actual_cscop], actual_hours[~actual_cscop], quarter
        )

    featured_totals = {
        key: round(sum(row[key] for row in resources if row["featured"]), 2)
        for key in ("q1_actual", "q1_planned", "q2_actual", "q2_planned", "q3_planned")
    }

    project_rows = []
    for quarter, (start, end) in QUARTERS.items():
        planned = pd.DataFrame(
            {
                "project_id": plan_ids[plan_dates.between(start, end)].replace("", "No CSCOP"),
                "project": plan_projects[plan_dates.between(start, end)],
                "planned_hours": plan_hours[plan_dates.between(start, end)],
            }
        ).groupby(["project_id", "project"], as_index=False)["planned_hours"].sum()
        actual_q = pd.DataFrame(
            {
                "project_id": actual_ids[actual_dates.between(start, end)].replace("", "No CSCOP"),
                "project": actual_projects[actual_dates.between(start, end)],
                "actual_hours": actual_hours[actual_dates.between(start, end)],
            }
        ).groupby(["project_id", "project"], as_index=False)["actual_hours"].sum()
        merged = planned.merge(actual_q, on=["project_id", "project"], how="outer").fillna(0)
        for item in merged.itertuples(index=False):
            project_rows.append(
                {
                    "quarter": quarter,
                    "project_id": item.project_id,
                    "project": item.project,
                    "cscop": str(item.project_id).upper().startswith("CSCOP-"),
                    "actual": md(item.actual_hours),
                    "planned": md(item.planned_hours),
                }
            )

    monthly = []
    for month in pd.period_range("2026-02", "2026-10", freq="M"):
        monthly.append(
            {
                "month": month.strftime("%b"),
                "actual": md(actual_hours[actual_dates.dt.to_period("M").eq(month)].sum()),
                "planned": md(plan_hours[plan_dates.dt.to_period("M").eq(month)].sum()),
            }
        )

    output = {
        "as_of": actual_dates.max().strftime("%Y-%m-%d"),
        "source": {"plan": "Planning workbook", "actual": "Actual timesheet workbook"},
        "featured_names": FEATURED,
        "resource_count": len(resources),
        "planned_resource_count": len(planned_names),
        "actual_resource_count": len(actual_roster),
        "plan_only_resources": plan_only_resources,
        "actual_only_resources": actual_only_resources,
        "totals": totals,
        "cscop_totals": cscop_totals,
        "non_cscop_totals": non_cscop_totals,
        "featured_totals": featured_totals,
        "resources": resources,
        "projects": sorted(project_rows, key=lambda row: (row["quarter"], -(row["actual"] + row["planned"]))),
        "monthly": monthly,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {output_path} with {len(resources)} EY resources")


if __name__ == "__main__":
    main()
