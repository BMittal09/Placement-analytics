import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Company } from "../types/data";
import { formatLPA, formatDate } from "../utils/format";
import { Badge, EmptyState } from "./Atoms";

type SortKey = "name" | "package" | "students" | "date" | "branches";

const PAGE_SIZE = 15;

export default function CompanyTable({ companies }: { companies: Company[] }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("package");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const arr = [...companies];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "package":
          return ((a.ctc.max ?? -1) - (b.ctc.max ?? -1)) * dir;
        case "students":
          return (a.studentCount - b.studentCount) * dir;
        case "date":
          return (a.dateOfVisit ?? "").localeCompare(b.dateOfVisit ?? "") * dir;
        case "branches":
          return (a.branchCount - b.branchCount) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [companies, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageItems = sorted.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        title="No companies match these filters"
        hint="Try widening your package range, removing a branch, or clearing a filter."
      />
    );
  }

  const headers: { key: SortKey; label: string; className?: string }[] = [
    { key: "name", label: "Company" },
    { key: "branches", label: "Branches" },
    { key: "students", label: "Hired" },
    { key: "package", label: "Package (max)" },
    { key: "date", label: "Visit date" },
  ];

  return (
    <div>
      <div className="overflow-x-auto border border-(--color-rule) rounded-md bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-(--color-paper-dim) z-10">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => toggleSort(h.key)}
                  className="text-left px-4 py-2.5 font-medium text-(--color-ink-soft) text-xs uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-(--color-ink)"
                >
                  {h.label}
                  {sortKey === h.key && <span className="ml-1 text-(--color-gold)">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
              <th className="text-left px-4 py-2.5 font-medium text-(--color-ink-soft) text-xs uppercase tracking-wide">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/companies/${c.id}`)}
                className="border-t border-(--color-rule) hover:bg-(--color-paper-dim)/60 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5 font-medium text-(--color-ink)">{c.name}</td>
                <td className="px-4 py-2.5 text-(--color-ink-soft)">
                  {c.branches.slice(0, 3).map((b) => b.code).join(", ")}
                  {c.branches.length > 3 && ` +${c.branches.length - 3}`}
                </td>
                <td className="px-4 py-2.5 font-mono-num">{c.studentCount}</td>
                <td className="px-4 py-2.5 font-mono-num">{formatLPA(c.ctc.max)}</td>
                <td className="px-4 py-2.5 text-(--color-ink-faint)">{formatDate(c.dateOfVisit)}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={c.driveType === "Both" ? "gold" : c.driveType === "Placement" ? "emerald" : "neutral"}>
                    {c.driveType}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-(--color-ink-faint)">
        <span>
          Showing {clampedPage * PAGE_SIZE + 1}–{Math.min(sorted.length, (clampedPage + 1) * PAGE_SIZE)} of {sorted.length}
        </span>
        <div className="flex gap-1">
          <button
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1 border border-(--color-rule) rounded disabled:opacity-30 hover:bg-white"
          >
            Prev
          </button>
          <button
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="px-3 py-1 border border-(--color-rule) rounded disabled:opacity-30 hover:bg-white"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
