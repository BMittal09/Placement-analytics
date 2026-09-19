import { Link, useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { usePlacementData } from "../hooks/usePlacementData";
import { Card, Badge, EmptyState } from "../components/Atoms";
import KpiCard from "../components/KpiCard";
import { formatLPA, formatRupees, formatDate } from "../utils/format";

export default function CompanyDetail() {
  const { id } = useParams();
  const data = usePlacementData();
  const company = data.companies.find((c) => c.id === id);

  if (!company) {
    return (
      <div className="fade-in">
        <EmptyState title="Company not found" hint="It may have been renamed in the source sheet." />
        <Link to="/companies" className="text-sm text-(--color-gold) hover:underline mt-4 inline-block">← Back to Companies</Link>
      </div>
    );
  }

  const branchChartData = company.branches
    .map((b) => ({ ...b, label: data.branches.find((br) => br.code === b.code)?.label ?? b.code }))
    .sort((a, b) => b.count - a.count);

  // Similar companies: same driveType-ish, overlapping branches, comparable package
  const similar = data.companies
    .filter((c) => c.id !== company.id)
    .map((c) => {
      const overlap = c.branches.filter((b) => company.branches.some((cb) => cb.code === b.code)).length;
      const pkgDiff = company.ctc.max && c.ctc.max ? Math.abs(company.ctc.max - c.ctc.max) : Infinity;
      const score = overlap * 100 - pkgDiff / 100000;
      return { c, overlap, score };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="fade-in">
      <Link to="/companies" className="text-sm text-(--color-ink-faint) hover:text-(--color-gold)">← Back to Companies</Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mt-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl">{company.name}</h1>
            <Badge tone={company.driveType === "Both" ? "gold" : company.driveType === "Placement" ? "emerald" : "neutral"}>
              {company.driveType}
            </Badge>
          </div>
          <p className="text-sm text-(--color-ink-faint) mt-1">
            {company.category ?? "Category unknown"} · Visited {formatDate(company.dateOfVisit)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard label="Students hired" value={String(company.studentCount)} accent="ink" />
        <KpiCard label="Branches hired from" value={String(company.branchCount)} accent="ink" />
        <KpiCard label="Max package" value={formatLPA(company.ctc.max)} accent="gold" />
        <KpiCard label="Max stipend" value={company.stipend.max ? `₹${company.stipend.max.toLocaleString("en-IN")}/mo` : "—"} accent="emerald" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="font-display text-xl mb-3">Hiring footprint</h2>
          <Card>
            {branchChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(180, branchChartData.length * 40)}>
                <BarChart data={branchChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd6c4" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#7c8494" }} />
                  <YAxis dataKey="code" type="category" width={50} tick={{ fontSize: 12, fill: "#3d4759" }} />
                  <Tooltip formatter={(v: any) => [`${v} students`, "Hired"]} labelFormatter={(l: any) => branchChartData.find((b) => b.code === l)?.label} />
                  <Bar dataKey="count" fill="#1f6e52" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-(--color-ink-faint)">No branch breakdown available.</p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="font-display text-xl mb-3">Offer details</h2>
          <Card className="space-y-3 text-sm">
            <Row label="Category" value={company.category ?? "Unknown"} />
            <Row label="Date of visit" value={formatDate(company.dateOfVisit)} />
            <Row label="Offer type(s)" value={company.offerTypes.join(", ")} />
            <Row label="Package — max" value={formatRupees(company.ctc.max)} />
            <Row label="Package — average" value={formatRupees(company.ctc.avg)} />
            <Row label="Package — offers with CTC recorded" value={String(company.ctc.offerCount)} />
            {company.stipend.offerCount > 0 && (
              <>
                <Row label="Stipend — max" value={formatRupees(company.stipend.max) + "/mo"} />
                <Row label="Stipend — average" value={formatRupees(company.stipend.avg) + "/mo"} />
              </>
            )}
          </Card>
        </section>
      </div>

      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl mb-3">Similar companies</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {similar.map(({ c, overlap }) => (
              <Link
                key={c.id}
                to={`/companies/${c.id}`}
                className="bg-white border border-(--color-rule) rounded-md p-3.5 hover:border-(--color-gold) transition-colors"
              >
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs text-(--color-ink-faint) mt-1">
                  {overlap} shared branch{overlap > 1 ? "es" : ""} · {formatLPA(c.ctc.max)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-(--color-rule) pb-2 last:border-0 last:pb-0">
      <span className="text-(--color-ink-faint)">{label}</span>
      <span className="font-medium font-mono-num text-right">{value}</span>
    </div>
  );
}
