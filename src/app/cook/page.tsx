"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";

interface PrepItem {
  time_label: string;
  for_who: string;
  dish: string;
  prep_starts: string;
  notes?: string;
}

interface CookView {
  date: string;
  day: string;
  items: PrepItem[];
  ingredient_checklist: string[];
  need_to_buy?: string | null;
}

export default function CookPage() {
  const [data, setData] = useState<CookView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cook-view");
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold">Cook View</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Today&apos;s schedule for the cook
        </p>
      </header>

      <main className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-[var(--text-secondary)]">No plan for today</p>
        ) : (
          <>
            <div className="text-xs text-[var(--text-secondary)]">
              {data.day} · {data.date}
            </div>

            {data.items.map((it, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4 flex items-start gap-3"
              >
                <div className="flex-shrink-0 text-center w-20">
                  <div className="text-[10px] text-[var(--text-muted)]">eat by</div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{it.time_label}</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">prep</div>
                  <div className="text-[11px] text-amber-400">{it.prep_starts}</div>
                </div>
                <div className="flex-1 border-l border-[var(--border-subtle)] pl-3">
                  <div className="text-[11px] uppercase tracking-wide text-[var(--text-secondary)] font-semibold">
                    {it.for_who}
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">{it.dish}</div>
                  {it.notes && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-1">{it.notes}</div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Ingredient checklist */}
            {data.ingredient_checklist.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-4">
                <h2 className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">
                  Ingredients to keep ready
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {data.ingredient_checklist.map((ing) => (
                    <span
                      key={ing}
                      className="text-[11px] px-2 py-1 rounded-full bg-[var(--bg-button)] text-[var(--text-primary)] border border-[var(--border-subtle)] capitalize"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.need_to_buy && (
              <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-4">
                <h2 className="text-xs font-semibold uppercase text-yellow-400 mb-1">Need to buy</h2>
                <p className="text-sm text-yellow-300">{data.need_to_buy}</p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav currentTab="cook" />
    </div>
  );
}
