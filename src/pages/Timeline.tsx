import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { usePlacementData } from "../hooks/usePlacementData";
import { Card, Section } from "../components/Atoms";
import CompanyTable from "../components/CompanyTable";
import { formatMonthLabel, formatLPA } from "../utils/format";

export default function Timeline() {
  const data = usePlacementData();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const chartData = data.timeline.map((t) => ({ ...t, label: formatMonthLabel(t.month) }));

  const busiestMonth = [...data.timeline].sort((a, b) => b.companies - a.companies)[0];
  const highestPayMonth = [...data.timeline].sort((a, b) => b.maxPackage - a.maxPackage)[0];

  const companiesInMonth = useMemo(() => {
    if (!selectedMonth) return [];
    return data.companies.filter((c) => c.dateOfVisit?.slice(0, 7) === selectedMonth);
  }, [data.companies, selectedMonth]);

  return (
    <div className="fade-in">
      <h1 className="font-display text-3xl">Timeline</h1>
      <p className="text-sm text-(--color-ink-faint) mt-1 mb-6">
        Click a month to see which companies visited during that period.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-(--color-ink-faint)">Busiest month</div>
          <div className="font-display text-xl mt-1">{busiestMonth ? formatMonthLabel(busiestMonth.month) : "—"}</div>
          <div className="text-sm text-(--color-ink-soft) mt-0.5">{busiestMonth?.companies ?? 0} companies visited</div>
        </Card>
        <Card>
          <div className="text-[11px] uppercase tracking-wide text-(--color-ink-faint)">Highest-paying month</div>
          <div className="font-display text-xl mt-1">{highestPayMonth ? formatMonthLabel(highestPayMonth.month) : "—"}</div>
          <div className="text-sm text-(--color-ink-soft) mt-0.5">Top offer {formatLPA(highestPayMonth?.maxPackage)}</div>
        </Card>
      </div>

      <Section title="Companies visiting per month">
        <Card>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#3d4759" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7c8494" }} />
              <Tooltip formatter={(v: any) => [`${v} companies`, "Visited"]} />
              <Bar
                dataKey="companies"
                radius={[3, 3, 0, 0]}
                cursor="pointer"
                onClick={(entry: any) => setSelectedMonth(entry.month === selectedMonth ? null : entry.month)}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.month} fill={entry.month === selectedMonth ? "#b6862c" : "#1b2430"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-(--color-ink-faint) mt-2 text-center">Click a bar to filter the list below.</p>
        </Card>
      </Section>

      {selectedMonth && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl">Companies in {formatMonthLabel(selectedMonth)}</h2>
            <button onClick={() => setSelectedMonth(null)} className="text-xs text-(--color-rose) hover:underline">
              Clear selection
            </button>
          </div>
          <CompanyTable companies={companiesInMonth} />
        </section>
      )}
    </div>
  );
}
