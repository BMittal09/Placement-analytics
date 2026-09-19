import raw from "../src/data/placementData.json" with { type: "json" };
import type { PlacementData, Filters } from "../src/types/data";
import { EMPTY_FILTERS } from "../src/types/data";
import { applyFilters, countActiveFilters } from "../src/utils/filters";
import { parseNlQuery } from "../src/utils/nlQuery";

const data = raw as unknown as PlacementData;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

// 1. Basic data sanity
assert(
  data.companies.length > 100,
  `companies loaded (${data.companies.length})`,
);
assert(data.branches.length === 18, `18 branches (${data.branches.length})`);
assert(
  data.kpis.highestPackage === 5522250,
  `highest package matches expected (${data.kpis.highestPackage})`,
);
assert(
  data.kpis.totalStudentOffers === 1112,
  `total offer rows = 1112 (${data.kpis.totalStudentOffers})`,
);

// 2. Branch filter: CSE only
const branchCodes = new Set(data.branches.map((b) => b.code));
assert(branchCodes.has("CSE"), "CSE branch code exists");
const cseFilter: Filters = { ...EMPTY_FILTERS, branches: ["CSE"] };
const cseResults = applyFilters(data.companies, cseFilter);
assert(
  cseResults.length > 0,
  `CSE filter returns results (${cseResults.length})`,
);
assert(
  cseResults.every((c) => c.branches.some((b) => b.code === "CSE")),
  "every CSE result actually has a CSE branch entry",
);

// 3. Package filter: > 10 LPA
const pkgFilter: Filters = { ...EMPTY_FILTERS, minPackage: 1000000 };
const pkgResults = applyFilters(data.companies, pkgFilter);
assert(
  pkgResults.length > 0,
  `>10LPA filter returns results (${pkgResults.length})`,
);
assert(
  pkgResults.every((c) => (c.ctc.max ?? 0) >= 1000000),
  "every result has max package >= 10L",
);

// 4. Combined filter: CSE AND package > 10L
const combo: Filters = {
  ...EMPTY_FILTERS,
  branches: ["CSE"],
  minPackage: 1000000,
};
const comboResults = applyFilters(data.companies, combo);
assert(
  comboResults.length > 0 &&
    comboResults.length <= Math.min(cseResults.length, pkgResults.length),
  `combined CSE + >10L filter (${comboResults.length}) is subset-sized`,
);
assert(
  countActiveFilters(combo) === 2,
  "active filter count = 2 for combined filter",
);

// 5. Month filter: September (any year present)
const septMonths = Array.from(
  new Set(
    data.companies.map((c) => c.dateOfVisit?.slice(0, 7)).filter(Boolean),
  ),
).filter((m) => m!.endsWith("-09")) as string[];
if (septMonths.length) {
  const monthFilter: Filters = { ...EMPTY_FILTERS, months: septMonths };
  const monthResults = applyFilters(data.companies, monthFilter);
  assert(
    monthResults.length > 0,
    `September filter returns results (${monthResults.length})`,
  );
  assert(
    monthResults.every((c) => septMonths.includes(c.dateOfVisit!.slice(0, 7))),
    "every Sept result actually visited in Sept",
  );
} else {
  console.log("SKIP: no September drives in dataset");
}

// 6. Students hired threshold
const bigFilter: Filters = { ...EMPTY_FILTERS, minStudents: 10 };
const bigResults = applyFilters(data.companies, bigFilter);
assert(
  bigResults.every((c) => c.studentCount >= 10),
  "every result hired >= 10 students",
);

// 7. Drive type filter
const placementOnly = applyFilters(data.companies, {
  ...EMPTY_FILTERS,
  driveType: "Placement",
});
assert(
  placementOnly.every((c) => c.driveType === "Placement"),
  "drive type filter isolates Placement-only companies",
);
assert(
  placementOnly.length === data.kpis.companiesPlacementOnly,
  `placement-only count matches KPI (${placementOnly.length} vs ${data.kpis.companiesPlacementOnly})`,
);

// 8. No-match case doesn't crash
const impossible: Filters = { ...EMPTY_FILTERS, minPackage: 100000000 };
const noResults = applyFilters(data.companies, impossible);
assert(
  noResults.length === 0,
  "impossible filter returns empty array, not an error",
);

// 9. NL query parser
const nl1 = parseNlQuery(
  "Show CSE companies offering more than 10 LPA",
  branchCodes,
);
assert(nl1.filters.branches.includes("CSE"), "NL parser detects CSE branch");
assert(
  nl1.filters.minPackage === 1000001,
  `NL parser treats >10 LPA as strict (${nl1.filters.minPackage})`,
);

const nl2 = parseNlQuery(
  "Companies that hired more than 10 students in September",
  branchCodes,
);
assert(
  nl2.filters.minStudents === 11,
  `NL parser treats >10 students as strict (${nl2.filters.minStudents})`,
);
assert(nl2.filters.months.length > 0, "NL parser detects September month");

const nl3 = parseNlQuery(
  "Internship companies with package between 6 and 15 LPA",
  branchCodes,
);
assert(
  nl3.filters.driveType === "Internship",
  "NL parser detects internship-only intent",
);
const nl4 = parseNlQuery("Companies offering at least 10 LPA", branchCodes);
assert(
  nl4.filters.minPackage === 1000000,
  `NL parser treats at least 10 LPA as inclusive (${nl4.filters.minPackage})`,
);

const nl5 = parseNlQuery(
  "Companies that hired 10 students or more",
  branchCodes,
);
assert(
  nl5.filters.minStudents === 10,
  `NL parser treats 10 students or more as inclusive (${nl5.filters.minStudents})`,
);

const nl6 = parseNlQuery("Companies offering less than 10 LPA", branchCodes);
assert(
  nl6.filters.maxPackage === 999999,
  `NL parser treats <10 LPA as strict (${nl6.filters.maxPackage})`,
);

// 10. ML predictor sanity checks
import("../src/utils/predictPackage").then(({ predictPackage }) => {
  assert(
    data.mlPredictor.trained === true,
    "ML predictor trained successfully",
  );
  assert(
    Number.isFinite(
      data.mlPredictor.crossValidation?.ridgeR2Mean ?? Number.NaN,
    ),
    `grouped CV R² is a finite reported value (${data.mlPredictor.crossValidation?.ridgeR2Mean})`,
  );
  assert(
    data.mlPredictor.crossValidation?.strategy === "GroupKFold" &&
      data.mlPredictor.crossValidation?.groupedBy === "company",
    "cross-validation keeps each company within one fold",
  );
  assert(
    data.mlPredictor.holdout?.strategy === "GroupShuffleSplit" &&
      data.mlPredictor.holdout?.groupedBy === "company",
    "holdout evaluation keeps companies separated",
  );
  const pred = predictPackage(data.mlPredictor, {
    branch: data.mlPredictor.branchesUsed![0],
    category: data.mlPredictor.categoriesUsed![0],
    driveSize: 5,
    branchDiversity: 5,
  });
  assert(
    pred !== null && pred.predicted > 0,
    `predictPackage() returns a positive number (${pred?.predicted})`,
  );
  assert(
    pred !== null && pred.low <= pred.predicted && pred.predicted <= pred.high,
    "prediction falls within its own low/high band",
  );
  assert(
    (data.mlPredictor.comparisonModels?.length ?? 0) === 2,
    "two comparison models (RF, GB) reported",
  );
  assert(
    data.mlPredictor.comparisonModels!.every((m) => !m.shipped),
    "comparison models correctly marked as not shipped for inference",
  );

  // 11. Anomaly detection sanity checks
  assert(Array.isArray(data.anomalies), "anomalies array present");
  assert(
    data.anomalies.every((a) => Math.abs(a.zScore) >= 2.5),
    "every flagged anomaly has |z| >= 2.5",
  );
  assert(
    data.anomalies.every((a) =>
      data.companies.some((c) => c.id === a.companyId),
    ),
    "every anomaly references a real company id",
  );

  console.log("\nDone (including ML checks).");
});
