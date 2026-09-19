import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlacementData } from "../hooks/usePlacementData";
import { Card, Section, Badge, EmptyState } from "../components/Atoms";
import { formatLPA, formatRupees } from "../utils/format";
import { predictPackage } from "../utils/predictPackage";

export default function Insights() {
  const data = usePlacementData();
  const { mlPredictor, anomalies, branches, companies } = data;

  const categories = mlPredictor.categoriesUsed ?? [];
  const [branch, setBranch] = useState(mlPredictor.branchesUsed?.[0] ?? "");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [driveSize, setDriveSize] = useState(5);
  const [branchDiversity, setBranchDiversity] = useState(5);

  const prediction = useMemo(
    () => predictPackage(mlPredictor, { branch, category, driveSize, branchDiversity }),
    [mlPredictor, branch, category, driveSize, branchDiversity]
  );

  return (
    <div className="fade-in">
      <div className="mb-1">
        <div className="text-xs uppercase tracking-[0.15em] text-(--color-gold) font-medium">Machine Learning</div>
        <h1 className="font-display text-3xl mt-1">Insights</h1>
        <p className="text-sm text-(--color-ink-faint) mt-1 max-w-2xl">
          Two small, honestly-scoped ML features trained directly on this year's placement data: a package
          predictor (regression) and an outlier detector (statistics) that flags packages worth a second look.
        </p>
      </div>

      {/* ---------------- Package Predictor ---------------- */}
      <Section
        title="Package Predictor"
        subtitle="Estimate an expected package from branch, industry category, and hiring-drive size"
      >
        {!mlPredictor.trained ? (
          <EmptyState title="Model not available" hint={mlPredictor.reason} />
        ) : (
          <div className="grid lg:grid-cols-[340px_1fr] gap-6">
            <Card className="space-y-4 h-fit">
              <div>
                <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="mt-1.5 w-full border border-(--color-rule) rounded px-3 py-1.5 text-sm bg-white focus:border-(--color-gold) outline-none"
                >
                  {mlPredictor.branchesUsed?.map((b) => (
                    <option key={b} value={b}>
                      {branches.find((br) => br.code === b)?.label ?? b} ({b})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">Industry category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full border border-(--color-rule) rounded px-3 py-1.5 text-sm bg-white focus:border-(--color-gold) outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">
                  Hiring drive size — students ({driveSize})
                </label>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={driveSize}
                  onChange={(e) => setDriveSize(Number(e.target.value))}
                  className="w-full mt-2 accent-(--color-gold)"
                />
                <div className="flex justify-between text-[10px] text-(--color-ink-faint) mt-0.5">
                  <span>1</span>
                  <span>40</span>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-(--color-ink-faint) font-medium">
                  Company's branch reach — how many branches it hires from ({branchDiversity})
                </label>
                <input
                  type="range"
                  min={1}
                  max={18}
                  value={branchDiversity}
                  onChange={(e) => setBranchDiversity(Number(e.target.value))}
                  className="w-full mt-2 accent-(--color-gold)"
                />
                <div className="flex justify-between text-[10px] text-(--color-ink-faint) mt-0.5">
                  <span>1 (specialist)</span>
                  <span>18 (generalist)</span>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col items-center justify-center text-center py-10">
              {prediction ? (
                <>
                  <div className="text-[11px] uppercase tracking-wide text-(--color-ink-faint)">Estimated package</div>
                  <div className="font-mono-num text-5xl font-semibold text-(--color-gold) mt-2">
                    {formatLPA(prediction.predicted)}
                  </div>
                  <div className="text-sm text-(--color-ink-faint) mt-2">
                    Likely range: <span className="font-mono-num">{formatLPA(prediction.low)}</span> –{" "}
                    <span className="font-mono-num">{formatLPA(prediction.high)}</span>
                  </div>
                  <p className="text-xs text-(--color-ink-faint) max-w-md mt-5 leading-relaxed">
                    {mlPredictor.caveat}
                  </p>
                </>
              ) : (
                <EmptyState title="Pick a branch and category to see a prediction" />
              )}
            </Card>
          </div>
        )}

        {mlPredictor.trained && (
          <details className="mt-3 text-xs text-(--color-ink-faint)">
            <summary className="cursor-pointer hover:text-(--color-ink)">Model details</summary>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 max-w-2xl">
              <ModelStat label="Algorithm" value={mlPredictor.algorithm ?? "—"} />
              <ModelStat label="Training rows" value={String(mlPredictor.trainedOnRows)} />
              <ModelStat
                label="5-fold CV R² (shipped model)"
                value={
                  mlPredictor.crossValidation
                    ? `${mlPredictor.crossValidation.ridgeR2Mean} ± ${mlPredictor.crossValidation.ridgeR2Std}`
                    : "—"
                }
              />
              <ModelStat label="Held-out test R²" value={String(mlPredictor.testR2)} />
              <ModelStat label="Held-out test MAE" value={formatRupees(mlPredictor.testMAE)} />
              <ModelStat
                label="Excluded rows (unmatched category)"
                value={String(mlPredictor.excludedUnknownCategoryRows ?? 0)}
              />
            </div>

            {mlPredictor.comparisonModels && mlPredictor.comparisonModels.length > 0 && (
              <div className="mt-4 max-w-2xl">
                <div className="text-[10px] uppercase tracking-wide text-(--color-ink-faint) mb-1.5">
                  Model comparison (5-fold CV R², same features)
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between border border-(--color-gold)/40 bg-(--color-gold-soft) rounded px-2.5 py-1.5">
                    <span className="text-(--color-ink)">Ridge regression <span className="text-(--color-gold)">— shipped to browser</span></span>
                    <span className="font-mono-num">
                      {mlPredictor.crossValidation?.ridgeR2Mean} ± {mlPredictor.crossValidation?.ridgeR2Std}
                    </span>
                  </div>
                  {mlPredictor.comparisonModels.map((m) => (
                    <div key={m.name} className="flex items-center justify-between border border-(--color-rule) rounded px-2.5 py-1.5">
                      <span>{m.name}</span>
                      <span className="font-mono-num">{m.cvR2Mean} ± {m.cvR2Std}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 leading-relaxed">
                  Tree-based models score higher because they capture nonlinear branch×category
                  interactions Ridge can't — but they aren't a simple dot product, so they'd need a
                  small inference server to serve predictions. Ridge was kept as the shipped model
                  so the whole app can stay a static, backend-free build; this is a deliberate
                  accuracy-vs-simplicity trade-off, not an oversight.
                </p>
              </div>
            )}
          </details>
        )}
      </Section>

      {/* ---------------- Anomaly Detection ---------------- */}
      <Section
        title="Package Outliers"
        subtitle="Companies whose package is a statistical outlier vs. their branch's peer group (|z| ≥ 2.5)"
      >
        {anomalies.length === 0 ? (
          <EmptyState title="No statistical outliers found" hint="Every company's package falls within a normal range for its branch." />
        ) : (
          <div className="space-y-3">
            {anomalies.map((a) => {
              const company = companies.find((c) => c.id === a.companyId);
              return (
                <Card key={a.companyId} className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/companies/${a.companyId}`} className="font-medium hover:text-(--color-gold)">
                        {a.company}
                      </Link>
                      <Badge tone={a.direction === "high" ? "gold" : "rose"}>
                        {a.direction === "high" ? "Unusually high" : "Unusually low"}
                      </Badge>
                    </div>
                    <div className="text-sm text-(--color-ink-faint) mt-1">
                      {formatLPA(a.value)} vs. a {a.branch} peer average of {formatLPA(a.peerAverage)}
                      {" · "}z-score {a.zScore}
                      {company && ` · ${company.category ?? "Unknown category"}`}
                    </div>
                  </div>
                  <div className="text-xs text-(--color-ink-faint) max-w-xs text-right">
                    {a.direction === "high"
                      ? "Likely a genuinely premium offer — worth spot-checking, not necessarily an error."
                      : "Worth spot-checking for a possible data-entry issue."}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function ModelStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-(--color-ink-faint)">{label}</div>
      <div className="font-mono-num text-(--color-ink)">{value}</div>
    </div>
  );
}
