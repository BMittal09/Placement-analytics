import { EMPTY_FILTERS, type Filters } from "../types/data";
import type { BranchStat } from "../types/data";

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

// Common branch aliases -> canonical code, matched against the branch codes
// actually present in the dataset (passed in at call time).
const BRANCH_ALIASES: Record<string, string> = {
  cse: "CSE",
  "computer science": "CSE",
  cs: "CSE",
  it: "IT",
  "information technology": "IT",
  cce: "CCE",
  "computer and communication": "CCE",
  "computer & communication": "CCE",
  cc: "CCE",
  aiml: "AIML",
  "ai/ml": "AIML",
  "ai ml": "AIML",
  "artificial intelligence": "AIML",
  ds: "DS",
  "data science": "DS",
  ece: "ECE",
  "electronics and communication": "ECE",
  "electronics & communication": "ECE",
  ec: "ECE",
  eee: "EEE",
  electrical: "EEE",
  "electrical and electronics": "EEE",
  ee: "EEE",
  eie: "EIE",
  "electronics and instrumentation": "EIE",
  "e&i": "EIE",
  me: "ME",
  mech: "ME",
  mechanical: "ME",
  mt: "MT",
  mechatronics: "MT",
  cps: "CPS",
  "cyber physical": "CPS",
  ae: "AE",
  aeronautical: "AE",
  bm: "BM",
  biomedical: "BM",
  cv: "CV",
  civil: "CV",
  ch: "CH",
  chemical: "CH",
  bt: "BT",
  biotechnology: "BT",
  au: "AU",
  automobile: "AU",
  ie: "IE",
  "industrial engineering": "IE",
};

export interface NlParseResult {
  filters: Filters;
  explanation: string[];
}

/** Convert a free-text query into structured Filters using pattern rules. */
export function parseNlQuery(
  query: string,
  knownBranchCodes: Set<string>,
): NlParseResult {
  const f: Filters = {
    ...EMPTY_FILTERS,
    branches: [],
    categories: [],
    months: [],
  };
  const notes: string[] = [];
  const q = query.toLowerCase();

  // --- Branches ---
  const foundBranches = new Set<string>();
  for (const [alias, code] of Object.entries(BRANCH_ALIASES)) {
    if (
      knownBranchCodes.has(code) &&
      new RegExp(`\\b${alias}\\b`, "i").test(q)
    ) {
      foundBranches.add(code);
    }
  }
  if (foundBranches.size) {
    f.branches = Array.from(foundBranches);
    notes.push(`Branch = ${f.branches.join(" or ")}`);
  }

  // --- Package thresholds ---
  // Filters store inclusive bounds in rupees. Strict comparisons are
  // translated by one rupee because CTC values are stored as whole rupees.
  const between = q.match(
    /between\s+(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)?\s+and\s+(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)?/,
  );

  if (between) {
    f.minPackage = parseFloat(between[1]) * 100000;
    f.maxPackage = parseFloat(between[2]) * 100000;
    notes.push(`Package between ₹${between[1]}L and ₹${between[2]}L`);
  } else {
    const gte = q.match(
      /(?:at least|minimum(?:\s+of)?|>=\s*)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)\b|(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)\s+or more\b/,
    );
    const gt = q.match(
      /(?:more than|greater than|above|over|>\s*)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)\b/,
    );
    const lte = q.match(
      /(?:at most|maximum(?:\s+of)?|<=\s*)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)\b|(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)\s+or less\b/,
    );
    const lt = q.match(
      /(?:less than|below|under|<\s*)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|l)\b/,
    );

    if (gte) {
      const value = gte[1] ?? gte[2];
      f.minPackage = parseFloat(value) * 100000;
      notes.push(`Package ≥ ₹${value}L`);
    } else if (gt) {
      f.minPackage = parseFloat(gt[1]) * 100000 + 1;
      notes.push(`Package > ₹${gt[1]}L`);
    }

    if (lte) {
      const value = lte[1] ?? lte[2];
      f.maxPackage = parseFloat(value) * 100000;
      notes.push(`Package ≤ ₹${value}L`);
    } else if (lt) {
      f.maxPackage = parseFloat(lt[1]) * 100000 - 1;
      notes.push(`Package < ₹${lt[1]}L`);
    }
  }

  // --- Student count thresholds ---
  // Student counts are integers, so "> N" becomes an inclusive minimum of N+1.
  const studentsBetween = q.match(/between\s+(\d+)\s+and\s+(\d+)\s*students?/);

  if (studentsBetween) {
    f.minStudents = parseInt(studentsBetween[1], 10);
    f.maxStudents = parseInt(studentsBetween[2], 10);
    notes.push(
      `Students hired between ${studentsBetween[1]} and ${studentsBetween[2]}`,
    );
  } else {
    const studentsGte = q.match(
      /(?:at least|minimum(?:\s+of)?|>=\s*)\s*(\d+)\s*students?|(\d+)\s+students?\s+or more/,
    );
    const studentsGt = q.match(
      /(?:more than|greater than|above|over|>\s*)\s*(\d+)\s*students?/,
    );
    const studentsLte = q.match(
      /(?:at most|maximum(?:\s+of)?|<=\s*)\s*(\d+)\s*students?|(\d+)\s+students?\s+or less/,
    );
    const studentsLt = q.match(
      /(?:less than|below|under|<\s*)\s*(\d+)\s*students?/,
    );

    if (studentsGte) {
      const value = studentsGte[1] ?? studentsGte[2];
      f.minStudents = parseInt(value, 10);
      notes.push(`Students hired ≥ ${value}`);
    } else if (studentsGt) {
      f.minStudents = parseInt(studentsGt[1], 10) + 1;
      notes.push(`Students hired > ${studentsGt[1]}`);
    }

    if (studentsLte) {
      const value = studentsLte[1] ?? studentsLte[2];
      f.maxStudents = parseInt(value, 10);
      notes.push(`Students hired ≤ ${value}`);
    } else if (studentsLt) {
      f.maxStudents = parseInt(studentsLt[1], 10) - 1;
      notes.push(`Students hired < ${studentsLt[1]}`);
    }
  }

  // --- Month ---
  const foundMonths: string[] = [];
  for (const [name, num] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(q)) {
      const yearMatch = q.match(/20\d{2}/);
      const year = yearMatch ? yearMatch[0] : "2025";
      const mm = String(num).padStart(2, "0");
      foundMonths.push(`${year}-${mm}`);
    }
  }
  if (foundMonths.length) {
    f.months = Array.from(new Set(foundMonths));
    notes.push(`Visited in ${f.months.join(", ")}`);
  }

  // --- Drive type ---
  if (/\binternship\b/.test(q) && !/\bplacement\b/.test(q)) {
    f.driveType = "Internship";
    notes.push("Internship drives only");
  } else if (/\bplacement\b/.test(q) && !/\binternship\b/.test(q)) {
    f.driveType = "Placement";
    notes.push("Placement drives only");
  }

  // --- Highest / top package sort intent is handled by caller via a flag ---
  const wantsHighest = /\bhighest\b|\btop\b/.test(q);

  if (notes.length === 0) {
    notes.push(
      "Couldn't detect specific filters — showing all companies. Try mentioning a branch, package, month, or student count.",
    );
  }

  return {
    filters: f,
    explanation: notes.concat(
      wantsHighest ? ["Sorted by highest package"] : [],
    ),
  };
}

export function suggestExamples(branches: BranchStat[]): string[] {
  const b1 = branches[0]?.code ?? "CSE";
  const b2 = branches[1]?.code ?? "ECE";
  return [
    `${b1} companies offering more than 10 LPA`,
    `Companies that hired more than 10 students`,
    `Which companies offered the highest packages to ${b2}?`,
    `Internship companies in September`,
    `Companies with package between 6 and 15 LPA`,
  ];
}
