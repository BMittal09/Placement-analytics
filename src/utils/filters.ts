import type { Company, Filters } from "../types/data";

export function applyFilters(companies: Company[], f: Filters): Company[] {
  return companies.filter((c) => {
    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      if (!c.name.toLowerCase().includes(q)) return false;
    }

    if (f.branches.length > 0) {
      const codes = new Set(c.branches.map((b) => b.code));
      const hasAny = f.branches.some((b) => codes.has(b));
      if (!hasAny) return false;
    }

    if (f.categories.length > 0) {
      if (!c.category || !f.categories.includes(c.category)) return false;
    }

    if (f.minPackage !== null) {
      if (!c.ctc.max || c.ctc.max < f.minPackage) return false;
    }
    if (f.maxPackage !== null) {
      if (!c.ctc.max || c.ctc.max > f.maxPackage) return false;
    }

    if (f.months.length > 0) {
      if (!c.dateOfVisit) return false;
      const ym = c.dateOfVisit.slice(0, 7);
      if (!f.months.includes(ym)) return false;
    }

    if (f.minStudents !== null && c.studentCount < f.minStudents) return false;
    if (f.maxStudents !== null && c.studentCount > f.maxStudents) return false;

    if (f.driveType !== "Any" && c.driveType !== f.driveType) return false;

    return true;
  });
}

export function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.branches.length) n++;
  if (f.categories.length) n++;
  if (f.minPackage !== null) n++;
  if (f.maxPackage !== null) n++;
  if (f.months.length) n++;
  if (f.minStudents !== null) n++;
  if (f.maxStudents !== null) n++;
  if (f.driveType !== "Any") n++;
  return n;
}
