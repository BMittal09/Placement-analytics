import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { usePlacementData } from "../hooks/usePlacementData";

const NAV = [
  { to: "/", label: "Dashboard", icon: "◆" },
  { to: "/companies", label: "Companies", icon: "▤" },
  { to: "/branches", label: "Branches", icon: "▥" },
  { to: "/salary", label: "Salary Analytics", icon: "₹" },
  { to: "/timeline", label: "Timeline", icon: "◷" },
  { to: "/compare", label: "Compare", icon: "⇄" },
  { to: "/search", label: "Advanced Search", icon: "⌕" },
  { to: "/insights", label: "ML Insights", icon: "✦" },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const data = usePlacementData();
  return (
    <div className="flex h-full flex-col bg-(--color-navy) text-(--color-paper)">
      <div className="px-6 pt-7 pb-5 border-b border-white/10">
        <div className="text-[11px] tracking-[0.2em] text-(--color-gold) font-mono-num uppercase">
          Batch 2025–26 · Sem VII
        </div>
        <div className="font-display text-2xl leading-tight mt-1">
          Placements<br />Ledger
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )
            }
          >
            <span className="text-(--color-gold) w-4 text-center text-xs">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
        Source: <span className="text-white/60">Full Stats</span>, <span className="text-white/60">Internship</span> &amp;{" "}
        <span className="text-white/60">Students List</span> sheets
        <br />
        {data.kpis.totalCompanies} drives · {data.kpis.totalStudentOffers} offer records
      </div>
    </div>
  );
}
