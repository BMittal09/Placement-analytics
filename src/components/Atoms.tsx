import type { ReactNode } from "react";
import clsx from "clsx";

export function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-3 gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-(--color-ink)">{title}</h2>
          {subtitle && <p className="text-sm text-(--color-ink-faint) mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "emerald" | "rose";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-(--color-paper-dim) text-(--color-ink-soft) border-(--color-rule)",
    gold: "bg-(--color-gold-soft) text-(--color-gold) border-(--color-gold)/30",
    emerald: "bg-(--color-emerald-soft) text-(--color-emerald) border-(--color-emerald)/30",
    rose: "bg-(--color-rose-soft) text-(--color-rose) border-(--color-rose)/30",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed border-(--color-rule) rounded-md py-14 px-6 text-center">
      <div className="font-display text-lg text-(--color-ink-soft)">{title}</div>
      {hint && <div className="text-sm text-(--color-ink-faint) mt-1.5">{hint}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-white border border-(--color-rule) rounded-md p-5", className)}>
      {children}
    </div>
  );
}
