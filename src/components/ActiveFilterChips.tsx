import type { Filters } from "../types/data";
import { formatMonthLabel, formatLPA } from "../utils/format";

export default function ActiveFilterChips({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const chips: { label: string; onRemove: () => void }[] = [];

  if (filters.search.trim()) {
    chips.push({ label: `“${filters.search}”`, onRemove: () => onChange({ ...filters, search: "" }) });
  }
  filters.branches.forEach((b) =>
    chips.push({ label: `Branch: ${b}`, onRemove: () => onChange({ ...filters, branches: filters.branches.filter((x) => x !== b) }) })
  );
  filters.categories.forEach((c) =>
    chips.push({ label: `Category: ${c}`, onRemove: () => onChange({ ...filters, categories: filters.categories.filter((x) => x !== c) }) })
  );
  if (filters.driveType !== "Any") {
    chips.push({ label: `Type: ${filters.driveType}`, onRemove: () => onChange({ ...filters, driveType: "Any" }) });
  }
  if (filters.minPackage !== null) {
    chips.push({ label: `Package ≥ ${formatLPA(filters.minPackage)}`, onRemove: () => onChange({ ...filters, minPackage: null }) });
  }
  if (filters.maxPackage !== null) {
    chips.push({ label: `Package ≤ ${formatLPA(filters.maxPackage)}`, onRemove: () => onChange({ ...filters, maxPackage: null }) });
  }
  if (filters.minStudents !== null) {
    chips.push({ label: `Hired ≥ ${filters.minStudents}`, onRemove: () => onChange({ ...filters, minStudents: null }) });
  }
  if (filters.maxStudents !== null) {
    chips.push({ label: `Hired ≤ ${filters.maxStudents}`, onRemove: () => onChange({ ...filters, maxStudents: null }) });
  }
  filters.months.forEach((m) =>
    chips.push({ label: formatMonthLabel(m), onRemove: () => onChange({ ...filters, months: filters.months.filter((x) => x !== m) }) })
  );

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-(--color-gold-soft) text-(--color-gold) border border-(--color-gold)/30 hover:bg-(--color-gold)/20"
        >
          {chip.label}
          <span aria-hidden>×</span>
        </button>
      ))}
    </div>
  );
}
