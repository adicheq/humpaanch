"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { KidBadge } from "@/lib/v2-types";

interface KidStats {
  member_id: string;
  badges: KidBadge[];
  badge_count: number;
  streak: number;
  winners: { dish: string; total: number; finish_score: number }[];
  losers: { dish: string; total: number; finish_score: number }[];
  total_logs: number;
}

export default function KidPage() {
  const [stats, setStats] = useState<KidStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/kid?member_id=nyra");
      if (res.ok) setStats(await res.json());
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold">Nyra&apos;s Wall</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Badges, streaks & favorites
        </p>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : !stats ? (
          <p className="text-sm text-[var(--text-secondary)]">No data yet</p>
        ) : (
          <>
            {/* Streak + badge count */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center"
              >
                <Flame className="mx-auto text-orange-400 mb-1" size={24} />
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.streak}</div>
                <div className="text-[11px] text-[var(--text-secondary)] uppercase">Day streak</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center"
              >
                <Trophy className="mx-auto text-yellow-400 mb-1" size={24} />
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.badge_count}</div>
                <div className="text-[11px] text-[var(--text-secondary)] uppercase">Badges</div>
              </motion.div>
            </div>

            {/* Badge gallery */}
            {stats.badges.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <h2 className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-3">
                  Your badges
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {stats.badges.slice(0, 9).map((b) => (
                    <motion.div
                      key={b.id}
                      whileHover={{ scale: 1.05 }}
                      className="text-center"
                    >
                      <div className="text-3xl">{b.badge_emoji}</div>
                      <div className="text-[10px] text-[var(--text-primary)] mt-1 font-semibold">
                        {b.badge_label}
                      </div>
                      {b.earned_for && (
                        <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                          {b.earned_for}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Top dishes */}
            {stats.winners.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <h2 className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">
                  Foods you love 🌟
                </h2>
                <div className="space-y-1.5">
                  {stats.winners.map((d) => (
                    <div
                      key={d.dish}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--text-primary)]">{d.dish}</span>
                      <span className="text-[10px] text-green-400">
                        {Math.round(d.finish_score * 100)}% finished
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Losers - shown to parent */}
            {stats.losers.length > 0 && (
              <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
                <h2 className="text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">
                  Hard-pass list (for the planner)
                </h2>
                <div className="space-y-1.5">
                  {stats.losers.map((d) => (
                    <div
                      key={d.dish}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--text-secondary)]">{d.dish}</span>
                      <span className="text-[10px] text-red-400">
                        {Math.round(d.finish_score * 100)}% finished
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav currentTab="kid" />
    </div>
  );
}
