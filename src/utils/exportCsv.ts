import type { Company } from "../types/data";

export function companiesToCsv(companies: Company[]): string {
  const headers = [
    "Company", "Drive Type", "Category", "Visit Date", "Students Hired",
    "Branches", "Max Package (INR)", "Avg Package (INR)", "Max Stipend (INR)",
  ];
  const rows = companies.map((c) => [
    c.name,
    c.driveType,
    c.category ?? "Unknown",
    c.dateOfVisit ?? "Unknown",
    String(c.studentCount),
    c.branches.map((b) => `${b.code}:${b.count}`).join(" "),
    c.ctc.max !== null ? String(c.ctc.max) : "",
    c.ctc.avg !== null ? String(c.ctc.avg) : "",
    c.stipend.max !== null ? String(c.stipend.max) : "",
  ]);
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
