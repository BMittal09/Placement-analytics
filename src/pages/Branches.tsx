import { Link } from "react-router-dom";
import { usePlacementData } from "../hooks/usePlacementData";
import { Card } from "../components/Atoms";
import { formatLPA, formatNumber } from "../utils/format";

export default function Branches() {
  const data = usePlacementData();
  const branches = [...data.branches].sort((a, b) => b.studentsPlaced - a.studentsPlaced);

  return (
    <div className="fade-in">
      <h1 className="font-display text-3xl">Branches</h1>
      <p className="text-sm text-(--color-ink-faint) mt-1 mb-6">
        {branches.length} branches recorded in the placement sheet. Select one to see its companies and package spread.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <Link key={b.code} to={`/branches/${b.code}`}>
            <Card className="hover:border-(--color-gold) transition-colors h-full">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg">{b.code}</div>
                  <div className="text-xs text-(--color-ink-faint)">{b.label}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <Stat label="Placed" value={formatNumber(b.studentsPlaced)} />
                <Stat label="Companies" value={formatNumber(b.companiesHiring)} />
                <Stat label="Avg package" value={formatLPA(b.avgPackage)} />
                <Stat label="Max package" value={formatLPA(b.maxPackage)} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-(--color-ink-faint)">{label}</div>
      <div className="font-mono-num font-medium">{value}</div>
    </div>
  );
}
