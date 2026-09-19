import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { usePlacementData } from "../hooks/usePlacementData";
import KpiCard from "../components/KpiCard";
import { Card, Section } from "../components/Atoms";
import { formatLPA, formatRupees } from "../utils/format";

export default function Salary() {
  const data = usePlacementData();
  const { kpis, companies, branches, salaryBands } = data;

  const top10 = [...companies]
    .filter((c) => c.ctc.max)
    .sort((a, b) => (b.ctc.max ?? 0) - (a.ctc.max ?? 0))
    .slice(0, 10);

  const byBranchAvg = [...branches]
    .filter((b) => b.avgPackage)
    .sort((a, b) => (b.avgPackage ?? 0) - (a.avgPackage ?? 0));

  return (
    <div className="fade-in">
      <h1 className="font-display text-3xl">Salary Analytics</h1>
      <p className="text-sm text-(--color-ink-faint) mt-1 mb-6">
        Based on {kpis.totalStudentsPlaced} placement offers with a recorded CTC (internship-only offers excluded).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard label="Highest package" value={formatLPA(kpis.highestPackage)} accent="gold" />
        <KpiCard label="Average package" value={formatLPA(kpis.avgPackage)} accent="ink" />
        <KpiCard label="Median package" value={formatLPA(kpis.medianPackage)} accent="ink" />
        <KpiCard label="Lowest package" value={formatLPA(kpis.lowestPackage)} accent="ink" />
      </div>

      <Section title="Package distribution" subtitle="Number of offers in each range">
        <Card>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salaryBands}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#3d4759" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#7c8494" }} />
              <Tooltip formatter={(v: any) => [`${v} offers`, "Count"]} />
              <Bar dataKey="count" fill="#b6862c" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section title="Top 10 packages">
        <Card>
          <div className="divide-y divide-(--color-rule)">
            {top10.map((c, i) => (
              <Link
                key={c.id}
                to={`/companies/${c.id}`}
                className="flex items-center justify-between py-2.5 hover:bg-(--color-paper-dim)/60 -mx-2 px-2 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-num text-(--color-ink-faint) text-sm w-5">{i + 1}</span>
                  <span className="font-medium text-sm">{c.name}</span>
                </div>
                <span className="font-mono-num font-semibold text-(--color-gold)">{formatRupees(c.ctc.max)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Average package by branch">
        <Card>
          <ResponsiveContainer width="100%" height={Math.max(240, byBranchAvg.length * 30)}>
            <BarChart data={byBranchAvg} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `${v / 100000}L`} tick={{ fontSize: 11, fill: "#7c8494" }} />
              <YAxis dataKey="code" type="category" width={50} tick={{ fontSize: 12, fill: "#3d4759" }} />
              <Tooltip formatter={(v: any) => [formatLPA(v), "Avg package"]} labelFormatter={(l: any) => branches.find((b) => b.code === l)?.label} />
              <Bar dataKey="avgPackage" fill="#1f6e52" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>
    </div>
  );
}
