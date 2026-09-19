"""
Placement Analytics — Excel -> JSON data pipeline
====================================================
Source of truth: a private placement workbook supplied through --input.

Sheets discovered:
  1. "Full Stats"    - one row per company placement drive (118 drives), with a
                        per-branch student-count matrix, dated, categorized, CTC.
  2. "Internship"     - same shape, for internship drives (147 rows incl. dupes).
  3. "Students List"  - one row per individual student offer (1112 rows): the
                        most granular, internally-consistent record. Columns:
                        Sl.No., Reg. No., Name, CGPA, Contact No., Email id,
                        Branch, Company Name, Offer Type (P/I/P+I), CTC, Stipend.

Design decision (documented assumption):
  "Students List" is treated as the primary source of truth for all
  company/branch aggregates (totals, packages, headcounts) because it is the
  most granular record and every row is independently verifiable (one row =
  one confirmed student offer). "Full Stats" and "Internship" are used only
  to enrich each company/drive with metadata that Students List lacks:
  Category (industry) and Date of Visit. Their own summary totals differ
  slightly from Students List (e.g. 772 vs derived counts) — this is a
  pre-existing data-quality inconsistency in the source workbook, not
  something introduced here; it is called out in DATA_NOTES.

Privacy decision:
  Contact No. and Email id are personally identifiable and are NOT exposed to
  the web app. Student Name is also dropped from aggregate outputs — the app
  operates at the company/branch/statistics level, never listing individual
  students by name. Reg. No./CGPA are dropped from the shipped dataset too,
  since no requested feature needs them at individual granularity.
"""

import argparse
import json
import math
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import openpyxl
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_ROOT / "data" / "placement-stats.xlsx"
DEFAULT_OUTPUT = PROJECT_ROOT / "src" / "data" / "placementData.json"


def parse_args():
    """Read optional input and output paths from the command line."""
    parser = argparse.ArgumentParser(
        description="Convert a private placement workbook into anonymized JSON."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"Path to the source Excel workbook (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Path for the generated JSON file (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args()

# ---------------------------------------------------------------------------
# Branch normalization table
# ---------------------------------------------------------------------------
# Students List uses long descriptive branch names (sometimes with two
# spellings of the same branch, e.g. "Automobile (AU)" vs
# "Automobile Engineering (AU)"). We normalize to one canonical record per
# branch, keeping the short code used across the Full Stats / Internship
# column headers for cross-reference, and remembering every raw spelling we
# collapsed (for transparency).
BRANCH_MAP = {
    "Computer Science (CS)": {"code": "CSE", "label": "Computer Science Engineering"},
    "Information Technology (IT)": {"code": "IT", "label": "Information Technology"},
    "Computer & Communication (CC)": {"code": "CCE", "label": "Computer & Communication Engineering"},
    "CSE AIML": {"code": "AIML", "label": "CSE (AI & Machine Learning)"},
    "Data Science (DS)": {"code": "DS", "label": "Data Science"},
    "Electronics & Communication (EC)": {"code": "ECE", "label": "Electronics & Communication Engineering"},
    "Mechatronics (MT)": {"code": "MT", "label": "Mechatronics"},
    "Mechanical (ME)": {"code": "ME", "label": "Mechanical Engineering"},
    "Electrical & Electronics (EE)": {"code": "EEE", "label": "Electrical & Electronics Engineering"},
    "Electronics & Instrumentation (E&I)": {"code": "EIE", "label": "Electronics & Instrumentation Engineering"},
    "Cyber Physical Systems (CPS)": {"code": "CPS", "label": "Cyber Physical Systems"},
    "Aeronautical (AE)": {"code": "AE", "label": "Aeronautical Engineering"},
    "Biomedical (BM)": {"code": "BM", "label": "Biomedical Engineering"},
    "Civil (CV)": {"code": "CV", "label": "Civil Engineering"},
    "Chemical (CH)": {"code": "CH", "label": "Chemical Engineering"},
    "Biotechnology (BT)": {"code": "BT", "label": "Biotechnology"},
    "Automobile (AU)": {"code": "AU", "label": "Automobile Engineering"},
    "Automobile Engineering (AU)": {"code": "AU", "label": "Automobile Engineering"},  # dup spelling -> same code
    "Industrial Engineering (IE)": {"code": "IE", "label": "Industrial Engineering & Management"},
}

CATEGORY_FIX = {
    "Coer IT": "Core IT",  # typo found in Full Stats sheet
}


def norm_company_key(name: str) -> str:
    """Normalize a company/drive name for cross-sheet joining."""
    if not name:
        return ""
    s = str(name).lower()
    s = s.replace("&", "and")
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


def to_iso_date(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    return None


def clean_ctc(v):
    """Return an int rupee CTC or None. Handles blank/text cells safely."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        if math.isnan(v):
            return None
        return int(round(v))
    # occasionally a stray string like 'No Stipend' appears in numeric columns
    try:
        return int(round(float(v)))
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# 1. Read "Full Stats" and "Internship" for per-drive metadata (Category, Date)
# ---------------------------------------------------------------------------
def read_metadata_sheet(ws, name_col, type_col, cat_col, date_col, first_row, last_row):
    meta = {}
    for r in range(first_row, last_row + 1):
        name = ws.cell(r, name_col).value
        if not name or not str(name).strip():
            continue
        key = norm_company_key(name)
        cat = ws.cell(r, cat_col).value
        cat = CATEGORY_FIX.get(cat, cat) if cat else None
        rec = {
            "rawName": str(name).strip(),
            "type": ws.cell(r, type_col).value,
            "category": cat,
            "date": to_iso_date(ws.cell(r, date_col).value),
        }
        # First occurrence wins; if a later row repeats the same normalized
        # key (e.g. a follow-up "Ericsson" internship row), keep a list.
        meta.setdefault(key, []).append(rec)
    return meta


def main(input_path: Path, output_path: Path):
    input_path = input_path.resolve()
    output_path = output_path.resolve()

    if not input_path.is_file():
        raise FileNotFoundError(
            f"Input workbook not found: {input_path}\n"
            "Supply a valid workbook using --input."
        )

    wb = openpyxl.load_workbook(input_path, data_only=True)

    fs = wb["Full Stats"]
    fs_meta = read_metadata_sheet(fs, name_col=2, type_col=3, cat_col=4, date_col=5,
                                   first_row=5, last_row=122)

    ins = wb["Internship"]
    ins_meta = read_metadata_sheet(ins, name_col=2, type_col=4, cat_col=5, date_col=6,
                                    first_row=5, last_row=150)

    # ------------------------------------------------------------------
    # 2. Read "Students List" — the primary, granular source of truth
    # ------------------------------------------------------------------
    df = pd.read_excel(input_path, sheet_name="Students List")

    data_quality = []
    raw_row_count = len(df)

    # Missing-value audit (documented, not silently dropped)
    missing_ctc = int(df["CTC"].isna().sum())
    missing_stipend = int(df["Stipend"].isna().sum())
    missing_cgpa = int(df["CGPA"].isna().sum())
    data_quality.append(f"{missing_ctc} of {raw_row_count} offer rows have no CTC "
                         f"(expected: rows are Internship-only offers, Offer Type = 'I').")
    data_quality.append(f"{missing_stipend} of {raw_row_count} offer rows have no Stipend "
                         f"(expected: rows are Placement-only offers, Offer Type = 'P').")
    if missing_cgpa:
        data_quality.append(f"{missing_cgpa} row(s) missing CGPA — left blank, excluded from any CGPA stat.")

    # Duplicate row check (exact duplicate student+company+offer rows)
    dup_mask = df.duplicated(subset=["Reg. No.", "Company Name", "Offer Type"], keep=False)
    n_dupes = int(dup_mask.sum())
    if n_dupes:
        data_quality.append(f"{n_dupes} row(s) share the same student + company + offer type "
                             f"(kept as-is; could indicate a re-entered row).")

    # Branch normalization
    unmapped_branches = set()
    for b in df["Branch"].dropna().unique():
        if b not in BRANCH_MAP:
            unmapped_branches.add(b)
    if unmapped_branches:
        data_quality.append(f"Unrecognized branch label(s) not in normalization map: {sorted(unmapped_branches)}")

    def branch_code(raw):
        m = BRANCH_MAP.get(raw)
        return m["code"] if m else "OTH"

    def branch_label(raw):
        m = BRANCH_MAP.get(raw)
        return m["label"] if m else str(raw)

    df["BranchCode"] = df["Branch"].map(branch_code)
    df["BranchLabel"] = df["Branch"].map(branch_label)
    df["CTC_clean"] = df["CTC"].map(clean_ctc)
    df["Stipend_clean"] = df["Stipend"].map(clean_ctc)
    df["CompanyKey"] = df["Company Name"].map(norm_company_key)

    # ------------------------------------------------------------------
    # 3. Build canonical branch list
    # ------------------------------------------------------------------
    branches = {}
    for raw, m in BRANCH_MAP.items():
        branches.setdefault(m["code"], {"code": m["code"], "label": m["label"], "rawLabels": set()})
        branches[m["code"]]["rawLabels"].add(raw)
    for code in list(branches.keys()):
        branches[code]["rawLabels"] = sorted(branches[code]["rawLabels"])

    # ------------------------------------------------------------------
    # 4. Build per-company (per-drive) aggregates from Students List
    # ------------------------------------------------------------------
    companies = {}
    for _, row in df.iterrows():
        key = row["CompanyKey"]
        if key not in companies:
            companies[key] = {
                "id": key,
                "name": str(row["Company Name"]).strip(),
                "offerTypes": set(),
                "branchCounts": defaultdict(int),
                "studentCount": 0,
                "ctcValues": [],
                "stipendValues": [],
            }
        c = companies[key]
        c["offerTypes"].add(row["Offer Type"])
        c["branchCounts"][row["BranchCode"]] += 1
        c["studentCount"] += 1
        if pd.notna(row["CTC_clean"]):
            c["ctcValues"].append(int(row["CTC_clean"]))
        if pd.notna(row["Stipend_clean"]):
            c["stipendValues"].append(int(row["Stipend_clean"]))

    # Enrich with Category / Date from Full Stats & Internship (best-effort join)
    def lookup_meta(key):
        for src in (fs_meta, ins_meta):
            if key in src:
                return src[key][0]
        return None

    unmatched_companies = []
    final_companies = []
    for key, c in companies.items():
        meta = lookup_meta(key)
        offer_types = c["offerTypes"]
        has_placement = bool(offer_types & {"P", "P+I"})
        has_internship = bool(offer_types & {"I", "P+I"})
        drive_type = "Both" if (has_placement and has_internship) else ("Placement" if has_placement else "Internship")

        ctc_vals = c["ctcValues"]
        stipend_vals = c["stipendValues"]

        if meta is None:
            unmatched_companies.append(c["name"])

        final_companies.append({
            "id": key,
            "name": c["name"],
            "category": meta["category"] if meta else None,
            "dateOfVisit": meta["date"] if meta else None,
            "driveType": drive_type,
            "offerTypes": sorted(offer_types),
            "studentCount": c["studentCount"],
            "branches": [{"code": code, "count": n} for code, n in sorted(c["branchCounts"].items(), key=lambda x: -x[1])],
            "branchCount": len(c["branchCounts"]),
            "ctc": {
                "max": max(ctc_vals) if ctc_vals else None,
                "min": min(ctc_vals) if ctc_vals else None,
                "avg": round(sum(ctc_vals) / len(ctc_vals)) if ctc_vals else None,
                "offerCount": len(ctc_vals),
            },
            "stipend": {
                "max": max(stipend_vals) if stipend_vals else None,
                "min": min(stipend_vals) if stipend_vals else None,
                "avg": round(sum(stipend_vals) / len(stipend_vals)) if stipend_vals else None,
                "offerCount": len(stipend_vals),
            },
        })

    if unmatched_companies:
        data_quality.append(
            f"{len(unmatched_companies)} compan{'y' if len(unmatched_companies)==1 else 'ies'} in Students List "
            f"could not be matched to a Category/Date row in Full Stats or Internship sheets "
            f"(shown with Category/Date = \"Unknown\"): {sorted(unmatched_companies)[:15]}"
            + (" ..." if len(unmatched_companies) > 15 else "")
        )

    final_companies.sort(key=lambda c: -(c["ctc"]["max"] or 0))

    # ------------------------------------------------------------------
    # 5. Branch-level aggregates
    # ------------------------------------------------------------------
    branch_stats = {}
    for code in branches:
        sub = df[df["BranchCode"] == code]
        ctc_vals = sorted(sub["CTC_clean"].dropna().tolist())
        companies_hiring = sub[sub["CTC_clean"].notna() | sub["Stipend_clean"].notna()]["CompanyKey"].nunique()
        branch_stats[code] = {
            "code": code,
            "label": branches[code]["label"],
            "studentsPlaced": int(sub.shape[0]),
            "companiesHiring": int(sub["CompanyKey"].nunique()),
            "avgPackage": round(sum(ctc_vals) / len(ctc_vals)) if ctc_vals else None,
            "medianPackage": (ctc_vals[len(ctc_vals) // 2] if len(ctc_vals) % 2 == 1
                               else round((ctc_vals[len(ctc_vals) // 2 - 1] + ctc_vals[len(ctc_vals) // 2]) / 2)) if ctc_vals else None,
            "maxPackage": max(ctc_vals) if ctc_vals else None,
            "minPackage": min(ctc_vals) if ctc_vals else None,
            "packageOfferCount": len(ctc_vals),
        }

    # ------------------------------------------------------------------
    # 6. Overall KPIs
    # ------------------------------------------------------------------
    all_ctc = sorted(df["CTC_clean"].dropna().tolist())
    placed_mask = df["Offer Type"].isin(["P", "P+I"])
    intern_mask = df["Offer Type"].isin(["I", "P+I"])

    def median(vals):
        n = len(vals)
        if n == 0:
            return None
        v = sorted(vals)
        return v[n // 2] if n % 2 == 1 else round((v[n // 2 - 1] + v[n // 2]) / 2)

    kpis = {
        "totalCompanies": len(final_companies),
        "totalStudentOffers": int(raw_row_count),
        "totalStudentsPlaced": int(placed_mask.sum()),
        "totalStudentsInterned": int(intern_mask.sum()),
        "highestPackage": max(all_ctc) if all_ctc else None,
        "lowestPackage": min(all_ctc) if all_ctc else None,
        "avgPackage": round(sum(all_ctc) / len(all_ctc)) if all_ctc else None,
        "medianPackage": median(all_ctc),
        "totalOffers": int(raw_row_count),
        "numBranches": len(branches),
        "companiesPlacementOnly": sum(1 for c in final_companies if c["driveType"] == "Placement"),
        "companiesInternshipOnly": sum(1 for c in final_companies if c["driveType"] == "Internship"),
        "companiesBoth": sum(1 for c in final_companies if c["driveType"] == "Both"),
        "dateRange": {
            "earliest": min([c["dateOfVisit"] for c in final_companies if c["dateOfVisit"]], default=None),
            "latest": max([c["dateOfVisit"] for c in final_companies if c["dateOfVisit"]], default=None),
        },
    }

    # ------------------------------------------------------------------
    # 7. Timeline (month-wise) — only for companies with a known date
    # ------------------------------------------------------------------
    month_bucket = defaultdict(lambda: {"companies": 0, "students": 0, "maxPackage": 0})
    for c in final_companies:
        if not c["dateOfVisit"]:
            continue
        ym = c["dateOfVisit"][:7]  # YYYY-MM
        month_bucket[ym]["companies"] += 1
        month_bucket[ym]["students"] += c["studentCount"]
        if c["ctc"]["max"]:
            month_bucket[ym]["maxPackage"] = max(month_bucket[ym]["maxPackage"], c["ctc"]["max"])
    timeline = [{"month": ym, **vals} for ym, vals in sorted(month_bucket.items())]

    # ------------------------------------------------------------------
    # 8. Salary bands (data-driven, not hardcoded to arbitrary guesses)
    # ------------------------------------------------------------------
    bands = [
        ("< ₹5 LPA", 0, 500000),
        ("₹5–8 LPA", 500000, 800000),
        ("₹8–12 LPA", 800000, 1200000),
        ("₹12–20 LPA", 1200000, 2000000),
        ("₹20–30 LPA", 2000000, 3000000),
        ("₹30+ LPA", 3000000, float("inf")),
    ]
    band_counts = []
    for label, lo, hi in bands:
        n = sum(1 for v in all_ctc if lo <= v < hi)
        band_counts.append({"label": label, "count": n})

    # ------------------------------------------------------------------
    # 9. ML — Package predictor (Ridge regression, trained + evaluated here)
    # ------------------------------------------------------------------
    # Trained on individual student-offer rows (the largest, least-aggregated
    # sample available: ~772 rows with a recorded CTC) rather than on the
    # ~140 company-level rows, to give the model enough data to generalize
    # even slightly. Documented honestly: with ~700 rows and one placement
    # season, this is an educational/directional model, not a
    # production-grade forecasting system — the R² is reported in the
    # output so that limitation is visible rather than hidden.
    ml_predictor = build_package_predictor(df, list(branches.keys()), final_companies)

    # ------------------------------------------------------------------
    # 10. ML — Anomaly detection on company packages (peer-group z-score)
    # ------------------------------------------------------------------
    # For each company, compare its max package against the distribution of
    # packages within its primary branch's peer group (branch_stats mean/std
    # computed from the same student-offer rows). |z| > 2.5 is flagged.
    # This does NOT mean the value is wrong — companies like Microsoft PPO
    # legitimately pay far above the branch average — it means "a human
    # should glance at this one", which is the realistic use of anomaly
    # detection on a small, mostly-clean dataset.
    anomalies = detect_anomalies(final_companies, branch_stats)

    # ------------------------------------------------------------------
    # Write outputs
    # ------------------------------------------------------------------
    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "generatedAt": datetime.now().isoformat(),
        "kpis": kpis,
        "companies": final_companies,
        "branches": list(branch_stats.values()),
        "timeline": timeline,
        "salaryBands": band_counts,
        "dataQuality": data_quality,
        "mlPredictor": ml_predictor,
        "anomalies": anomalies,
    }
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=str)

    print(f"Output written to: {output_path}")

    print("companies:", len(final_companies))
    print("branches:", len(branch_stats))
    print("kpis:", json.dumps(kpis, indent=2, default=str))
    print("dataQuality notes:", len(data_quality))
    for n in data_quality:
        print(" -", n)
    print("\nML predictor:", json.dumps({k: v for k, v in ml_predictor.items() if k != "coefficients"}, indent=2, default=str))
    print("Anomalies flagged:", len(anomalies))
    for a in anomalies:
        print(" -", a["company"], a["direction"], f"z={a['zScore']}")


def build_package_predictor(df, branch_codes, final_companies):
    """Fit a Ridge regression predicting CTC from branch, company category,
    hiring-drive size, and branch diversity. Returns coefficients in a form
    the browser can use directly (a dot product — no ML runtime needed
    client-side).

    Improvements over the first version, and why:
      - Target is log1p(CTC), not raw rupees. Salary data is right-skewed
        (a handful of very high offers like Microsoft PPO), and a few
        outliers were dragging a linear fit on raw rupees around. The
        browser applies expm1() to the prediction to convert back.
      - Rows whose company had no matched Category ("Unknown", ~1/4 of
        rows) are EXCLUDED from training — they're noise from a join
        gap, not a real signal, and were diluting the categories that
        actually have a clean signal. The app still only offers known
        categories in the predictor UI, so this doesn't remove any
        usable prediction target.
      - Added `branchCount` (how many branches the hiring company recruits
        from) as a feature — specialist single-branch recruiters and
        generalist multi-branch recruiters tend to sit on different pay
        bands, and this feature captures that without needing a full
        branch×category interaction (which would be too sparse to fit
        reliably on ~700 rows).
      - Evaluated with company-grouped 5-fold cross-validation so offers
        from the same company cannot appear in both training and validation
        data. A grouped holdout provides the reported test metrics.
      - A Random Forest and Gradient Boosting model are also fit and
        cross-validated purely for comparison (reported in the output,
        not used for prediction) — tree models can capture nonlinear
        branch×category interactions Ridge can't, and reporting both is
        a more honest picture than only ever showing the model that ships.
    """
    from sklearn.linear_model import Ridge
    from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_val_score
    from sklearn.metrics import r2_score, mean_absolute_error
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    import numpy as np

    company_category = {c["id"]: c["category"] for c in final_companies}
    company_drive_size = {c["id"]: c["studentCount"] for c in final_companies}
    company_branch_count = {c["id"]: c["branchCount"] for c in final_companies}

    rows = df[df["CTC_clean"].notna()].copy()
    rows["CategoryForModel"] = rows["CompanyKey"].map(company_category)
    rows["DriveSize"] = rows["CompanyKey"].map(company_drive_size).fillna(1)
    rows["BranchDiversity"] = rows["CompanyKey"].map(company_branch_count).fillna(1)

    excluded_unknown = int(rows["CategoryForModel"].isna().sum())
    rows = rows[rows["CategoryForModel"].notna()]  # drop unmatched-category rows from training

    categories_present = sorted(rows["CategoryForModel"].unique())
    branches_present = [b for b in branch_codes if b in set(rows["BranchCode"])]

    feature_names = (
        [f"branch_{b}" for b in branches_present]
        + [f"cat_{c}" for c in categories_present]
        + ["driveSize_z", "branchDiversity_z"]
    )

    X = []
    y_raw = []
    for _, r in rows.iterrows():
        vec = [1.0 if r["BranchCode"] == b else 0.0 for b in branches_present]
        vec += [1.0 if r["CategoryForModel"] == c else 0.0 for c in categories_present]
        vec.append(float(r["DriveSize"]))
        vec.append(float(r["BranchDiversity"]))
        X.append(vec)
        y_raw.append(float(r["CTC_clean"]))

    X = np.array(X)
    y_raw = np.array(y_raw)
    y_log = np.log1p(y_raw)
    groups = rows["CompanyKey"].to_numpy()

    if len(X) < 20:
        return {"trained": False, "reason": "Not enough rows with CTC to train a model."}

    # standardize the two numeric features so their coefficients are comparable
    ds_mean, ds_std = X[:, -2].mean(), (X[:, -2].std() or 1.0)
    bd_mean, bd_std = X[:, -1].mean(), (X[:, -1].std() or 1.0)
    X[:, -2] = (X[:, -2] - ds_mean) / ds_std
    X[:, -1] = (X[:, -1] - bd_mean) / bd_std

    # --- Grouped cross-validation by company ---
    # Offers belonging to the same company remain in the same fold, which
    # prevents company-specific patterns from leaking into validation data.
    group_cv = GroupKFold(n_splits=5)
    ridge_cv_scores = cross_val_score(
        Ridge(alpha=8.0), X, y_log, cv=group_cv, groups=groups, scoring="r2"
    )

    # --- comparison models, evaluated using the same company groups ---
    rf_cv_scores = cross_val_score(
        RandomForestRegressor(n_estimators=200, max_depth=6, random_state=42),
        X,
        y_log,
        cv=group_cv,
        groups=groups,
        scoring="r2",
    )
    gb_cv_scores = cross_val_score(
        GradientBoostingRegressor(n_estimators=150, max_depth=3, learning_rate=0.05, random_state=42),
        X,
        y_log,
        cv=group_cv,
        groups=groups,
        scoring="r2",
    )

    # --- Company-grouped holdout evaluation ---
    group_split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(group_split.split(X, y_log, groups))
    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y_log[train_idx], y_log[test_idx]
    y_train_raw, y_test_raw = y_raw[train_idx], y_raw[test_idx]

    evaluation_model = Ridge(alpha=8.0)
    evaluation_model.fit(X_train, y_train)

    pred_test_log = evaluation_model.predict(X_test)
    pred_test_raw = np.expm1(pred_test_log)
    train_r2 = round(r2_score(y_train, evaluation_model.predict(X_train)), 3)
    test_r2 = round(r2_score(y_test, pred_test_log), 3)
    test_mae_rupees = round(mean_absolute_error(y_test_raw, pred_test_raw))

    # After evaluation, fit the model shipped to the browser on all eligible
    # rows so its coefficients use all available training data.
    final_model = Ridge(alpha=8.0)
    final_model.fit(X, y_log)

    coeffs = {name: round(float(c), 4) for name, c in zip(feature_names, final_model.coef_)}
    intercept = round(float(final_model.intercept_), 4)

    return {
        "trained": True,
        "algorithm": "Ridge regression (alpha=8.0) on log1p(CTC), scikit-learn",
        "targetTransform": "log1p",
        "trainedOnRows": int(len(X)),
        "excludedUnknownCategoryRows": excluded_unknown,
        "features": feature_names,
        "branchesUsed": branches_present,
        "categoriesUsed": categories_present,
        "driveSizeStandardization": {"mean": round(float(ds_mean), 3), "std": round(float(ds_std), 3)},
        "branchDiversityStandardization": {"mean": round(float(bd_mean), 3), "std": round(float(bd_std), 3)},
        "coefficients": coeffs,
        "intercept": intercept,
        "trainR2": train_r2,
        "testR2": test_r2,
        "testMAE": test_mae_rupees,
        "crossValidation": {
            "folds": 5,
            "strategy": "GroupKFold",
            "groupedBy": "company",
            "uniqueGroups": int(len(set(groups))),
            "ridgeR2Mean": round(float(ridge_cv_scores.mean()), 3),
            "ridgeR2Std": round(float(ridge_cv_scores.std()), 3),
        },
        "holdout": {
            "strategy": "GroupShuffleSplit",
            "groupedBy": "company",
            "testFraction": 0.2,
            "trainGroups": int(len(set(groups[train_idx]))),
            "testGroups": int(len(set(groups[test_idx]))),
        },
        "comparisonModels": [
            {
                "name": "Random Forest (200 trees, depth 6)",
                "cvR2Mean": round(float(rf_cv_scores.mean()), 3),
                "cvR2Std": round(float(rf_cv_scores.std()), 3),
                "shipped": False,
            },
            {
                "name": "Gradient Boosting (150 trees, depth 3)",
                "cvR2Mean": round(float(gb_cv_scores.mean()), 3),
                "cvR2Std": round(float(gb_cv_scores.std()), 3),
                "shipped": False,
            },
        ],
        "caveat": (
            f"Trained on {len(X)} historical offers from a single placement season "
            f"({excluded_unknown} rows with an unmatched category were excluded from training). "
            f"Company-grouped 5-fold CV R\u00b2 = {round(float(ridge_cv_scores.mean()), 2)} \u00b1 {round(float(ridge_cv_scores.std()), 2)} "
            f"\u2014 treat predictions as a rough, directional estimate (a few lakhs of error is normal), not a guarantee."
        ),
    }


def detect_anomalies(companies, branch_stats):
    """Flag companies whose max package is a statistical outlier (|z|>2.5)
    relative to their primary branch's package distribution."""
    import statistics

    # need std per branch, which branch_stats doesn't carry yet — recompute quickly
    branch_values = defaultdict(list)
    for c in companies:
        if not c["ctc"]["max"] or not c["branches"]:
            continue
        primary_branch = c["branches"][0]["code"]
        branch_values[primary_branch].append(c["ctc"]["max"])

    branch_mean_std = {}
    for code, vals in branch_values.items():
        if len(vals) >= 3:
            branch_mean_std[code] = (statistics.mean(vals), statistics.pstdev(vals) or 1.0)

    anomalies = []
    for c in companies:
        if not c["ctc"]["max"] or not c["branches"]:
            continue
        primary_branch = c["branches"][0]["code"]
        if primary_branch not in branch_mean_std:
            continue
        mean, std = branch_mean_std[primary_branch]
        z = (c["ctc"]["max"] - mean) / std
        if abs(z) >= 2.5:
            anomalies.append({
                "company": c["name"],
                "companyId": c["id"],
                "branch": primary_branch,
                "value": c["ctc"]["max"],
                "peerAverage": round(mean),
                "zScore": round(z, 2),
                "direction": "high" if z > 0 else "low",
            })
    anomalies.sort(key=lambda a: -abs(a["zScore"]))
    return anomalies


if __name__ == "__main__":
    args = parse_args()
    main(args.input, args.output)
