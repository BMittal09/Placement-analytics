import { useMemo, useState } from "react";
import { usePlacementData } from "../hooks/usePlacementData";
import { Card, EmptyState } from "../components/Atoms";
import { formatLPA, formatDate, formatRupees } from "../utils/format";

const MAX_COMPARE = 5;

export default function Compare() {
  const data = usePlacementData();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return data.companies
      .filter((c) => c.name.toLowerCase().includes(q) && !selected.includes(c.id))
      .slice(0, 6);
  }, [query, data.companies, selected]);

  const chosen = selected.map((id) => data.companies.find((c) => c.id === id)!).filter(Boolean);

  function add(id: string) {
    if (selected.length >= MAX_COMPARE) return;
    setSelected((s) => [...s, id]);
    setQuery("");
  }
  function remove(id: string) {
    setSelected((s) => s.filter((x) => x !== id));
  }

  const rows: { label: string; get: (c: (typeof chosen)[number]) => string }[] = [
    { label: "Category", get: (c) => c.category ?? "Unknown" },
    { label: "Drive type", get: (c) => c.driveType },
    { label: "Visit date", get: (c) => formatDate(c.dateOfVisit) },
    { label: "Students hired", get: (c) => String(c.studentCount) },
    { label: "Branches hired from", get: (c) => c.branches.map((b) => b.code).join(", ") || "—" },
    { label: "Max package", get: (c) => formatRupees(c.ctc.max) },
    { label: "Avg package", get: (c) => formatRupees(c.ctc.avg) },
    { label: "Max stipend", get: (c) => (c.stipend.max ? formatRupees(c.stipend.max) + "/mo" : "—") },
  ];

  return (
    <div className="fade-in">
      <h1 className="font-display text-3xl">Compare Companies</h1>
      <p className="text-sm text-(--color-ink-faint) mt-1 mb-6">
        Pick 2–{MAX_COMPARE} companies to compare side by side.
      </p>

      <div className="relative max-w-md mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selected.length >= MAX_COMPARE ? `Max ${MAX_COMPARE} companies` : "Search a company to add…"}
          disabled={selected.length >= MAX_COMPARE}
          className="w-full border border-(--color-rule) rounded px-3 py-2 text-sm focus:border-(--color-gold) outline-none disabled:bg-(--color-paper-dim)"
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-(--color-rule) rounded-md shadow-lg overflow-hidden">
            {suggestions.map((c) => (
              <button
                key={c.id}
                onClick={() => add(c.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-(--color-paper-dim) flex items-center justify-between"
              >
                <span>{c.name}</span>
                <span className="text-(--color-ink-faint) font-mono-num text-xs">{formatLPA(c.ctc.max)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {chosen.length === 0 && (
        <EmptyState title="No companies selected yet" hint="Search above to add your first company." />
      )}

      {chosen.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-(--color-ink-faint) font-medium text-xs uppercase">Metric</th>
                {chosen.map((c) => (
                  <th key={c.id} className="text-left py-2 px-3 min-w-[160px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-normal">{c.name}</span>
                      <button onClick={() => remove(c.id)} className="text-(--color-rose) text-xs hover:underline shrink-0">
                        remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-(--color-rule)">
                  <td className="py-2.5 pr-4 text-(--color-ink-faint)">{row.label}</td>
                  {chosen.map((c) => (
                    <td key={c.id} className="py-2.5 px-3 font-mono-num">{row.get(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
