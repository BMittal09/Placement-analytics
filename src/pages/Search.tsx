import { useMemo, useState } from "react";
import { usePlacementData } from "../hooks/usePlacementData";
import { EMPTY_FILTERS, type Filters } from "../types/data";
import { applyFilters } from "../utils/filters";
import { parseNlQuery, suggestExamples } from "../utils/nlQuery";
import CompanyTable from "../components/CompanyTable";
import { Card } from "../components/Atoms";

export default function Search() {
  const data = usePlacementData();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const knownBranchCodes = useMemo(() => new Set(data.branches.map((b) => b.code)), [data.branches]);

  const examples = useMemo(() => suggestExamples(data.branches), [data.branches]);

  const parsed = useMemo(() => {
    if (!submitted.trim()) return null;
    return parseNlQuery(submitted, knownBranchCodes);
  }, [submitted, knownBranchCodes]);

  const results = useMemo(() => {
    if (!parsed) return data.companies;
    const f: Filters = { ...EMPTY_FILTERS, ...parsed.filters };
    let list = applyFilters(data.companies, f);
    if (submitted.toLowerCase().match(/\bhighest\b|\btop\b/)) {
      list = [...list].sort((a, b) => (b.ctc.max ?? 0) - (a.ctc.max ?? 0));
    }
    return list;
  }, [parsed, data.companies, submitted]);

  function run(q: string) {
    setQuery(q);
    setSubmitted(q);
  }

  return (
    <div className="fade-in">
      <h1 className="font-display text-3xl">Advanced Search</h1>
      <p className="text-sm text-(--color-ink-faint) mt-1 mb-6">
        Type a question in plain English. This uses a rule-based parser — it looks for branches, package
        thresholds, months, and student counts, no external AI call involved.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
        className="flex gap-2 mb-3"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Show CSE companies offering more than 10 LPA"
          className="flex-1 border border-(--color-rule) rounded px-4 py-2.5 text-sm focus:border-(--color-gold) outline-none bg-white"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-(--color-navy) text-white rounded text-sm hover:bg-(--color-navy-soft)"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => run(ex)}
            className="text-xs px-2.5 py-1 rounded-full border border-(--color-rule) text-(--color-ink-faint) hover:border-(--color-gold) hover:text-(--color-gold)"
          >
            {ex}
          </button>
        ))}
      </div>

      {parsed && (
        <Card className="mb-5 bg-(--color-paper-dim)">
          <div className="text-xs uppercase tracking-wide text-(--color-ink-faint) mb-1.5">Interpreted as</div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.explanation.map((e, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-white border border-(--color-rule) rounded-full">
                {e}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="text-sm text-(--color-ink-faint) mb-2">{results.length} companies match</div>
      <CompanyTable companies={results} />
    </div>
  );
}
