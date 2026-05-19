"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Utensils, Moon } from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface DayEntry {
  date: string;
  day: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contexts: any[];
}

interface WeekResponse {
  week_start: string;
  week_end: string;
  days: DayEntry[];
  diversity: {
    total_meals_analyzed: number;
    cuisine_counts: Record<string, number>;
    protein_counts: Record<string, number>;
    overused: string[];
    underused: string[];
  };
}

export default function WeekPage() {
  const [data, setData] = useState<WeekResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/week");
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold">This Week</h1>
        {data && (
          <p className="text-xs text-[var(--text-secondary)]">
            {data.week_start} → {data.week_end}
          </p>
        )}
      </header>

      <main className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-[var(--text-secondary)]">No data</p>
        ) : (
          <>
            {/* Diversity summary */}
            {data.diversity.total_meals_analyzed > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]"
              >
                <h2 className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">
                  Diversity ({data.diversity.total_meals_analyzed} meals)
                </h2>
                {data.diversity.overused.length > 0 && (
                  <p className="text-xs text-amber-400">
                    <strong>Overused:</strong> {data.diversity.overused.join(", ")}
                  </p>
                )}
                {data.diversity.underused.length > 0 && (
                  <p className="text-xs text-green-400 mt-1">
                    <strong>Try more:</strong> {data.diversity.underused.slice(0, 4).join(", ")}
                  </p>
                )}
              </motion.div>
            )}

            {/* Day grid */}
            {data.days.map((d) => (
              <motion.div
                key={d.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden"
              >
                <div className="bg-[var(--bg-secondary)] px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{d.day}</span>
                    <span className="text-xs text-[var(--text-secondary)] ml-2">{d.date}</span>
                  </div>
                  {d.contexts.length > 0 && (
                    <div className="flex gap-1">
                      {d.contexts.map((c) => (
                        <span
                          key={c.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400"
                          title={c.note || ""}
                        >
                          {c.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {d.plan ? (
                  <div className="px-4 py-3 space-y-1.5">
                    <Row label={<><Sun size={10} /> B</>} value={d.plan.plan_data?.breakfast?.default} />
                    <Row label={<><Utensils size={10} /> L</>} value={d.plan.plan_data?.lunch?.default} />
                    <Row label={<><Moon size={10} /> D</>} value={d.plan.plan_data?.dinner?.default} />
                    {d.plan.plan_data?.dinner?.kamini && (
                      <Row label={<><Moon size={10} /> K</>} value={d.plan.plan_data.dinner.kamini} subtle />
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-xs text-[var(--text-muted)] text-center">
                    no plan yet
                  </div>
                )}
              </motion.div>
            ))}
          </>
        )}
      </main>

      <BottomNav currentTab="week" />
    </div>
  );
}

function Row({ label, value, subtle }: { label: React.ReactNode; value?: string; subtle?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span
        className={`flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold ${
          subtle ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]"
        } w-8 mt-0.5`}
      >
        {label}
      </span>
      <span className={`text-sm ${subtle ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}
