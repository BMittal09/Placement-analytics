import clsx from "clsx";
import type { Filters } from "../types/data";
import { usePlacementData } from "../hooks/usePlacementData";
import { formatMonthLabel } from "../utils/format";
import { countActiveFilters } from "../utils/filters";

export default function FilterPanel({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const data = usePlacementData();
  const categories = Array.from(new Set(data.companies.map((c) => c.category).filter(Boolean))) as string[];
  const months = Array.from(new Set(data.companies.map((c) => c.dateOfVisit?.slice(0, 7)).filter(Boolean))).sort() as string[];

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleArr(key: "branches" | "categories" | "months", value: string) {
    const arr = filters[key];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    set(key, next as any);
  }

  const active = countActiveFilters(filters);

  return (
    <div className="bg-white border border-(--color-rule) rounded-md p-5 space-y-6 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Advanced Filters</h3>
        {active > 0 && (
          <button
            onClick={() =>
              onChange({
                search: "", branches: [], categories: [], minPackage: null,
                maxPackage: null, months: [], minStudents: null, maxStudents: null, driveType: "Any",
              })
            }
            className="text-xs text-(--color-rose) hover:underline"
          >
            Clear all ({active})
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Search company</label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="e.g. Deloitte"
          className="mt-1.5 w-full border border-(--color-rule) rounded px-3 py-1.5 text-sm focus:border-(--color-gold) outline-none"
        />
      </div>

      {/* Branch */}
      <div>
        <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Branch</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {data.branches.map((b) => (
            <button
              key={b.code}
              onClick={() => toggleArr("branches", b.code)}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                filters.branches.includes(b.code)
                  ? "bg-(--color-navy) text-white border-(--color-navy)"
                  : "border-(--color-rule) text-(--color-ink-soft) hover:border-(--color-ink-soft)"
              )}
              title={b.label}
            >
              {b.code}
            </button>
          ))}
        </div>
      </div>

      {/* Drive type */}
      <div>
        <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Offer type</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(["Any", "Placement", "Internship", "Both"] as const).map((t) => (
            <button
              key={t}
              onClick={() => set("driveType", t)}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                filters.driveType === t
                  ? "bg-(--color-gold) text-white border-(--color-gold)"
                  : "border-(--color-rule) text-(--color-ink-soft) hover:border-(--color-ink-soft)"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Package range */}
      <div>
        <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">
          Package (LPA)
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minPackage !== null ? filters.minPackage / 100000 : ""}
            onChange={(e) => set("minPackage", e.target.value ? Number(e.target.value) * 100000 : null)}
            className="w-full border border-(--color-rule) rounded px-3 py-1.5 text-sm focus:border-(--color-gold) outline-none"
          />
          <span className="text-(--color-ink-faint)">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxPackage !== null ? filters.maxPackage / 100000 : ""}
            onChange={(e) => set("maxPackage", e.target.value ? Number(e.target.value) * 100000 : null)}
            className="w-full border border-(--color-rule) rounded px-3 py-1.5 text-sm focus:border-(--color-gold) outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[5, 10, 15, 20].map((n) => (
            <button
              key={n}
              onClick={() => set("minPackage", n * 100000)}
              className="text-[11px] px-2 py-0.5 rounded border border-(--color-rule) text-(--color-ink-faint) hover:border-(--color-gold) hover:text-(--color-gold)"
            >
              &gt;{n}L
            </button>
          ))}
        </div>
      </div>

      {/* Students hired */}
      <div>
        <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Students hired</label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minStudents ?? ""}
            onChange={(e) => set("minStudents", e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-(--color-rule) rounded px-3 py-1.5 text-sm focus:border-(--color-gold) outline-none"
          />
          <span className="text-(--color-ink-faint)">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxStudents ?? ""}
            onChange={(e) => set("maxStudents", e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-(--color-rule) rounded px-3 py-1.5 text-sm focus:border-(--color-gold) outline-none"
          />
        </div>
      </div>

      {/* Month */}
      <div>
        <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Hiring month</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => toggleArr("months", m)}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                filters.months.includes(m)
                  ? "bg-(--color-emerald) text-white border-(--color-emerald)"
                  : "border-(--color-rule) text-(--color-ink-soft) hover:border-(--color-ink-soft)"
              )}
            >
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Category</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleArr("categories", cat)}
                className={clsx(
                  "px-2.5 py-1 rounded-full text-xs border transition-colors",
                  filters.categories.includes(cat)
                    ? "bg-(--color-navy) text-white border-(--color-navy)"
                    : "border-(--color-rule) text-(--color-ink-soft) hover:border-(--color-ink-soft)"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
