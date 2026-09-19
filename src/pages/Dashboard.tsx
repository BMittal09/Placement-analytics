import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { usePlacementData } from "../hooks/usePlacementData";
import KpiCard from "../components/KpiCard";
import { Section, Card, Badge } from "../components/Atoms";
import { formatLPA, formatMonthLabel, formatNumber } from "../utils/format";

const PIE_COLORS = ["#1b2430", "#b6862c", "#1f6e52", "#a13b3b", "#7c8494", "#29344a"];

export default function Dashboard() {
  const data = usePlacementData();
  const { kpis, companies, branches, timeline } = data;

  const topByHiring = [...companies].sort((a, b) => b.studentCount - a.studentCount).slice(0, 8);
  const topByPackage = [...companies]
    .filter((c) => c.ctc.max)
    .sort((a, b) => (b.ctc.max ?? 0) - (a.ctc.max ?? 0))
    .slice(0, 8);
  const multiBranch = companies.filter((c) => c.branchCount >= 3).length;

  const branchStudents = [...branches].sort((a, b) => b.studentsPlaced - a.studentsPlaced);

  const driveTypeSplit = [
    { name: "Placement only", value: kpis.companiesPlacementOnly },
    { name: "Internship only", value: kpis.companiesInternshipOnly },
    { name: "Both", value: kpis.companiesBoth },
  ];

  return (
    <div className="fade-in">
      <div className="mb-7">
        <div className="text-xs uppercase tracking-[0.15em] text-(--color-gold) font-medium">
          7th Semester · Placement &amp; Internship Statistics
        </div>
        <h1 className="font-display text-3xl mt-1">Dashboard</h1>
        <p className="text-sm text-(--color-ink-faint) mt-1">
          Drives recorded from {kpis.dateRange.earliest ? formatMonthLabel(kpis.dateRange.earliest.slice(0, 7)) : "—"} to{" "}
          {kpis.dateRange.latest ? formatMonthLabel(kpis.dateRange.latest.slice(0, 7)) : "—"}.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-9">
        <KpiCard label="Companies visited" value={formatNumber(kpis.totalCompanies)} accent="ink" />
        <KpiCard label="Students placed" value={formatNumber(kpis.totalStudentsPlaced)} sub="Offer type P or P+I" accent="emerald" />
        <KpiCard label="Students interned" value={formatNumber(kpis.totalStudentsInterned)} sub="Offer type I or P+I" accent="ink" />
        <KpiCard label="Highest package" value={formatLPA(kpis.highestPackage)} accent="gold" />
        <KpiCard label="Average package" value={formatLPA(kpis.avgPackage)} accent="ink" />
        <KpiCard label="Median package" value={formatLPA(kpis.medianPackage)} accent="ink" />
        <KpiCard label="Lowest package" value={formatLPA(kpis.lowestPackage)} accent="ink" />
        <KpiCard label="Branches covered" value={formatNumber(kpis.numBranches)} accent="ink" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Section title="Top companies by students hired">
          <Card>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topByHiring} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#7c8494" }} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: "#3d4759" }} />
                <Tooltip formatter={(v: any) => [`${v} students`, "Hired"]} />
                <Bar dataKey="studentCount" fill="#1f6e52" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Top companies by package (max)">
          <Card>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topByPackage} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v / 100000}L`} tick={{ fontSize: 11, fill: "#7c8494" }} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: "#3d4759" }} />
                <Tooltip formatter={(v: any) => [formatLPA(v), "Package"]} />
                <Bar dataKey="ctc.max" fill="#b6862c" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Students placed by branch">
          <Card>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={branchStudents} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" vertical={false} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: "#3d4759" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7c8494" }} />
                <Tooltip formatter={(v: any) => [`${v} students`, "Placed"]} labelFormatter={(l: any) => branches.find((b) => b.code === l)?.label ?? l} />
                <Bar dataKey="studentsPlaced" fill="#1b2430" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        <Section title="Drives over time" subtitle="Companies visiting per month">
          <Card>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={timeline} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 10, fill: "#7c8494" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7c8494" }} />
                <Tooltip labelFormatter={(l: any) => formatMonthLabel(String(l))} />
                <Line type="monotone" dataKey="companies" stroke="#b6862c" strokeWidth={2} dot={{ r: 3 }} name="Companies" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Section>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mt-2">
        <div className="lg:col-span-1">
          <Section title="Drive composition">
            <Card>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={driveTypeSplit} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {driveTypeSplit.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2 text-xs">
                {driveTypeSplit.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-(--color-ink-soft)">{d.name}</span>
                    <span className="ml-auto font-mono-num">{d.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section
            title="Companies hiring across multiple branches"
            subtitle={`${multiBranch} companies hired from 3 or more branches`}
            right={
              <Link to="/companies" className="text-sm text-(--color-gold) hover:underline">
                View all companies →
              </Link>
            }
          >
            <Card>
              <div className="grid sm:grid-cols-2 gap-2">
                {companies
                  .filter((c) => c.branchCount >= 3)
                  .sort((a, b) => b.branchCount - a.branchCount)
                  .slice(0, 8)
                  .map((c) => (
                    <Link
                      key={c.id}
                      to={`/companies/${c.id}`}
                      className="flex items-center justify-between px-3 py-2 rounded border border-(--color-rule) hover:border-(--color-gold) transition-colors"
                    >
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge tone="gold">{c.branchCount} branches</Badge>
                    </Link>
                  ))}
              </div>
            </Card>
          </Section>
        </div>
      </div>
    </div>
  );
}
