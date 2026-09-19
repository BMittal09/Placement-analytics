import { Link, useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { usePlacementData } from "../hooks/usePlacementData";
import KpiCard from "../components/KpiCard";
import { EmptyState } from "../components/Atoms";
import CompanyTable from "../components/CompanyTable";
import { formatLPA } from "../utils/format";

export default function BranchDetail() {
  const { code } = useParams();
  const data = usePlacementData();
  const branch = data.branches.find((b) => b.code === code);

  if (!branch) {
    return <EmptyState title="Branch not found" />;
  }

  const companies = data.companies
    .filter((c) => c.branches.some((b) => b.code === code))
    .map((c) => ({ ...c, hiredHere: c.branches.find((b) => b.code === code)?.count ?? 0 }))
    .sort((a, b) => b.hiredHere - a.hiredHere);

  const topByHiring = [...companies].sort((a, b) => b.hiredHere - a.hiredHere).slice(0, 10);

  return (
    <div className="fade-in">
      <Link to="/branches" className="text-sm text-(--color-ink-faint) hover:text-(--color-gold)">← Back to Branches</Link>

      <div className="mt-3 mb-6">
        <h1 className="font-display text-3xl">{branch.code}</h1>
        <p className="text-sm text-(--color-ink-faint) mt-1">{branch.label}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard label="Students placed" value={String(branch.studentsPlaced)} accent="emerald" />
        <KpiCard label="Companies hiring" value={String(branch.companiesHiring)} accent="ink" />
        <KpiCard label="Highest package" value={formatLPA(branch.maxPackage)} accent="gold" />
        <KpiCard label="Average package" value={formatLPA(branch.avgPackage)} accent="ink" />
        <KpiCard label="Median package" value={formatLPA(branch.medianPackage)} accent="ink" />
        <KpiCard label="Lowest package" value={formatLPA(branch.minPackage)} accent="ink" />
      </div>

      <section className="mb-8">
        <h2 className="font-display text-xl mb-3">Top companies hiring from {branch.code}</h2>
        <div className="bg-white border border-(--color-rule) rounded-md p-4">
          <ResponsiveContainer width="100%" height={Math.max(220, topByHiring.length * 32)}>
            <BarChart data={topByHiring} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#7c8494" }} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: "#3d4759" }} />
              <Tooltip formatter={(v: any) => [`${v} students`, "Hired"]} />
              <Bar dataKey="hiredHere" fill="#1b2430" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-3">All companies hiring from {branch.code}</h2>
        <CompanyTable companies={companies} />
      </section>
    </div>
  );
}
