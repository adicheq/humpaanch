"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { MemberId, MealPlan, MEMBERS } from "@/lib/types";
import { normalizePlanData } from "@/lib/helpers";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import MealSection from "@/components/MealSection";
import ThemeToggle from "@/components/ThemeToggle";

export default function HistoryPage() {
  const [memberId, setMemberId] = useState<MemberId | null>(null);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("humpaanch_member") as MemberId | null;
    if (stored) setMemberId(stored);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (memberId) fetchHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const fetchHistory = async (p: number) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/history?page=${p}&limit=7`);
      if (res.ok) {
        const data = await res.json();
        // Normalize old plan formats
        const normalized = (data.plans || []).map((plan: MealPlan) => ({
          ...plan,
          plan_data: normalizePlanData(plan.plan_data),
        }));
        if (p === 1) {
          setPlans(normalized);
        } else {
          setPlans((prev) => [...prev, ...normalized]);
        }
        setHasMore(data.hasMore);
        setPage(p);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleMemberSelect = (id: MemberId) => {
    localStorage.setItem("humpaanch_member", id);
    setMemberId(id);
  };

  const currentMember = MEMBERS.find((m) => m.id === memberId);

  if (!memberId) return <MemberPicker onSelect={handleMemberSelect} />;

  const toggleExpand = (date: string) => {
    setExpandedDate((prev) => (prev === date ? null : date));
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-bold">History</h1>
          <p className="text-xs text-[var(--text-secondary)]">What we ate</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div
            className={`${currentMember?.color} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold`}
          >
            {currentMember?.emoji}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">No meal history yet</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Plans will appear here after they&apos;re generated</p>
          </motion.div>
        ) : (
          <>
            {plans.map((plan, index) => (
              <motion.div
                key={plan.date}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <DayCard
                  plan={plan}
                  isExpanded={expandedDate === plan.date}
                  onToggle={() => toggleExpand(plan.date)}
                />
              </motion.div>
            ))}

            {hasMore && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => fetchHistory(page + 1)}
                disabled={loadingMore}
                className="w-full py-3 bg-[var(--bg-card)] text-[var(--text-secondary)] rounded-xl text-sm font-medium"
              >
                {loadingMore ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-[var(--text-secondary)] border-t-[var(--text-muted)] rounded-full" />
                    Loading...
                  </span>
                ) : (
                  "Load older plans"
                )}
              </motion.button>
            )}
          </>
        )}
      </main>

      <BottomNav currentTab="history" />
    </div>
  );
}

function DayCard({
  plan,
  isExpanded,
  onToggle,
}: {
  plan: MealPlan;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const pd = plan.plan_data;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
      {/* Collapsed header - always visible */}
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex-1">
          <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wide">
            {plan.day}
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{plan.date}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pd.breakfast?.default && (
              <span className="text-[11px] bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full">
                🌅 {truncate(pd.breakfast.default, 25)}
              </span>
            )}
            {pd.lunch?.default && (
              <span className="text-[11px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">
                🍽️ {truncate(pd.lunch.default, 25)}
              </span>
            )}
            {pd.dinner?.default && (
              <span className="text-[11px] bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full">
                🌙 {truncate(pd.dinner.default, 25)}
              </span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[var(--text-secondary)] ml-2"
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.button>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-3 border-t border-[var(--border-color)] pt-3">
              <MealSection title="Breakfast" emoji="🌅" slot={pd.breakfast} mealSlot="breakfast" />

              {pd.lunchbox_nyra && (
                <div className="bg-violet-900/20 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-violet-400 uppercase tracking-wide font-semibold">🎒 Nyra&apos;s Lunch Box</p>
                  <p className="text-sm text-violet-300">{pd.lunchbox_nyra}</p>
                </div>
              )}

              <MealSection title="Lunch" emoji="🍽️" slot={pd.lunch} mealSlot="lunch" />

              <MealSection
                title="Dinner"
                emoji="🌙"
                slot={pd.dinner}
                mealSlot="dinner"
                timing={{
                  kamini: pd.dinner_time_kamini || "~7 PM",
                  nyra: pd.dinner_time_nyra || "~7:30 PM",
                  others: pd.dinner_time_others || "~8:30 PM",
                }}
              />

              {pd.need_to_buy && (
                <div className="bg-yellow-900/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-yellow-400">
                    <span className="font-semibold">Need to buy:</span> {pd.need_to_buy}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MealRow({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value?: string;
  color?: "gray" | "pink" | "purple";
}) {
  if (!value) return null;
  const colorMap = {
    gray: "text-[var(--text-primary)]",
    pink: "text-pink-400",
    purple: "text-purple-400",
  };
  return (
    <div>
      <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide font-semibold">
        {label}
      </p>
      <p className={`text-sm ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
