import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Branches from "./pages/Branches";
import BranchDetail from "./pages/BranchDetail";
import Salary from "./pages/Salary";
import Timeline from "./pages/Timeline";
import Compare from "./pages/Compare";
import Search from "./pages/Search";
import Insights from "./pages/Insights";

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-(--color-paper)">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-(--color-rule) bg-white sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="text-(--color-ink) text-xl leading-none px-1"
          >
            ☰
          </button>
          <span className="font-display text-lg">Placements Ledger</span>
          <span className="w-6" />
        </div>

        <main className="max-w-[1400px] mx-auto px-5 sm:px-8 py-7">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/branches/:code" element={<BranchDetail />} />
            <Route path="/salary" element={<Salary />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/search" element={<Search />} />
            <Route path="/insights" element={<Insights />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
