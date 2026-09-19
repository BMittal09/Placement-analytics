export default function KpiCard({
  label,
  value,
  sub,
  accent = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ink" | "gold" | "emerald" | "rose";
}) {
  const accentColor = {
    ink: "var(--color-ink)",
    gold: "var(--color-gold)",
    emerald: "var(--color-emerald)",
    rose: "var(--color-rose)",
  }[accent];

  return (
    <div className="ledger-card rounded-sm px-5 py-4 fade-in">
      <div className="text-[11px] uppercase tracking-wider text-(--color-ink-faint) font-medium">
        {label}
      </div>
      <div
        className="font-mono-num text-[28px] leading-tight mt-1.5 font-semibold"
        style={{ color: accentColor }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-(--color-ink-faint) mt-1">{sub}</div>}
    </div>
  );
}
