/** Format rupees as lakhs, e.g. 1200000 -> "₹12.0L" */
export function formatLPA(rupees: number | null | undefined): string {
  if (rupees === null || rupees === undefined || Number.isNaN(rupees)) return "—";
  const lakhs = rupees / 100000;
  return `₹${lakhs.toFixed(lakhs >= 10 ? 1 : 2)}L`;
}

/** Full Indian-style rupee formatting, e.g. 1200000 -> "₹12,00,000" */
export function formatRupees(rupees: number | null | undefined): string {
  if (rupees === null || rupees === undefined || Number.isNaN(rupees)) return "—";
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}
