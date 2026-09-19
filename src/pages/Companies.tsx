import { useMemo, useState } from "react";
import { usePlacementData } from "../hooks/usePlacementData";
import FilterPanel from "../components/FilterPanel";
import ActiveFilterChips from "../components/ActiveFilterChips";
import CompanyTable from "../components/CompanyTable";
import { EMPTY_FILTERS, type Filters } from "../types/data";
import { applyFilters } from "../utils/filters";
import { companiesToCsv, downloadCsv } from "../utils/exportCsv";

export default function Companies() {
  const data = usePlacementData();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);

  const results = useMemo(() => applyFilters(data.companies, filters), [data.companies, filters]);

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <div>
          <h1 className="font-display text-3xl">Companies</h1>
          <p className="text-sm text-(--color-ink-faint) mt-1">
            {data.companies.length} recruitment drives on record. Filter, search, sort, and export.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="lg:hidden px-3 py-1.5 border border-(--color-rule) rounded text-sm bg-white"
          >
            Filters
          </button>
          <button
            onClick={() => downloadCsv("placement-companies-filtered.csv", companiesToCsv(results))}
            className="px-3 py-1.5 border border-(--color-gold) text-(--color-gold) rounded text-sm bg-white hover:bg-(--color-gold-soft)"
          >
            Export CSV ({results.length})
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 mt-5">
        <div className={panelOpen ? "block" : "hidden lg:block"}>
          <FilterPanel filters={filters} onChange={setFilters} />
        </div>

        <div className="min-w-0">
          <ActiveFilterChips filters={filters} onChange={setFilters} />
          <div className="text-sm text-(--color-ink-faint) mb-2">
            {results.length} of {data.companies.length} companies match
          </div>
          <CompanyTable companies={results} />
        </div>
      </div>
    </div>
  );
}
