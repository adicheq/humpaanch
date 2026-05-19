"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MemberId, MealPlan, MEMBERS, MealReaction } from "@/lib/types";
import { normalizePlanData, getTodayIST, isMealTimePassed, getTomorrowIST } from "@/lib/helpers";
import { MealFavorite } from "@/lib/v2-types";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import MealCard from "@/components/MealCard";
import MealSection from "@/components/MealSection";
import MealRatingPrompt from "@/components/MealRatingPrompt";
import SkipMeBar from "@/components/SkipMeBar";
import ThemeToggle from "@/components/ThemeToggle";

interface Reaction {
  meal_slot: string;
  member_id: string;
  reaction: "ok" | "suggest_change" | "agree" | "accepted";
  comment?: string | null;
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function SkeletonLoader() {
  return (
    <div className="space-y-4 px-1">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-32 w-full" />
    </div>
  );
}

export default function HomePage() {
  const [memberId, setMemberId] = useState<MemberId | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [yesterdayPlan, setYesterdayPlan] = useState<MealPlan | null>(null);
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});
  const [allReactions, setAllReactions] = useState<MealReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [finishLogs, setFinishLogs] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<MealFavorite[]>([]);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [skipContexts, setSkipContexts] = useState<string[]>([]);

  const generatePlan = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "x-api-key": "humpaanch-claude-secret-2026" },
      });
      const data = await res.json();
      if (res.ok && (data.success || data.already_exists)) {
        // Refresh the page to show the new plan
        fetchPlan();
      } else {
        setGenError(data.error || "Failed to generate plan");
      }
    } catch {
      setGenError("Network error - please try again");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("humpaanch_member") as MemberId | null;
    if (stored) setMemberId(stored);
    else setLoading(false);
  }, []);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meal-plan");
      if (res.ok) {
        const planData = await res.json();
        // Normalize old plan format to new MealSlotData format
        if (planData?.plan_data) {
          planData.plan_data = normalizePlanData(planData.plan_data);
        }
        setPlan(planData);

        // Fetch saved reactions for this date
        if (memberId && planData?.date) {
          const [reactRes, finishRes, ctxRes] = await Promise.all([
            fetch(`/api/reactions?date=${planData.date}`),
            fetch(`/api/finish-log?date=${planData.date}&member_id=${memberId}`),
            fetch(`/api/context?date=${planData.date}`),
          ]);
          if (reactRes.ok) {
            const fetchedReactions: MealReaction[] = await reactRes.json();
            setAllReactions(fetchedReactions);
            const myReactions: Record<string, Reaction> = {};
            fetchedReactions
              .filter((r) => r.member_id === memberId && (r.reaction === "ok" || r.reaction === "suggest_change"))
              .forEach((r) => { myReactions[r.meal_slot] = r; });
            setReactions(myReactions);
          }
          if (finishRes.ok) {
            const logs = await finishRes.json();
            const logMap: Record<string, string> = {};
            for (const l of logs) { if (l.member_id === memberId) logMap[l.meal_slot] = l.finish_rate; }
            setFinishLogs(logMap);
          }
          if (ctxRes.ok) {
            const ctxs = await ctxRes.json();
            const mySkips: string[] = [];
            for (const c of ctxs) {
              if (c.member_id !== memberId || c.type !== "going_out") continue;
              if (c.note?.includes("breakfast")) mySkips.push("breakfast");
              else if (c.note?.includes("lunch")) mySkips.push("lunch");
              else if (c.note?.includes("dinner")) mySkips.push("dinner");
              else mySkips.push("breakfast", "lunch", "dinner");
            }
            setSkipContexts(mySkips);
          }
        }
      } else {
        setPlan(null);
        // Fetch yesterday's/today's plan as fallback
        try {
          const histRes = await fetch("/api/history?limit=1");
          if (histRes.ok) {
            const histData = await histRes.json();
            if (histData.plans && histData.plans.length > 0) {
              const lastPlan = histData.plans[0];
              if (lastPlan.plan_data) {
                lastPlan.plan_data = normalizePlanData(lastPlan.plan_data);
              }
              setYesterdayPlan(lastPlan);
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) {
      fetchPlan();
      fetch(`/api/favorites?member_id=${memberId}`)
        .then((r) => r.json())
        .then((favs: MealFavorite[]) => {
          setFavorites(favs);
          setFavSet(new Set(favs.map((f) => f.dish_name)));
        })
        .catch(() => {});
    }
  }, [memberId, fetchPlan]);

  const handleMemberSelect = (id: MemberId) => {
    localStorage.setItem("humpaanch_member", id);
    setMemberId(id);
    setShowPicker(false);
  };

  // Register service worker for push notifications
  useEffect(() => {
    if ("serviceWorker" in navigator && memberId) {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const existingSub = await reg.pushManager.getSubscription();
        if (!existingSub) {
          try {
            const res = await fetch("/api/push/vapid-key");
            if (!res.ok) return;
            const { key } = await res.json();
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: key,
            });
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ member_id: memberId, subscription: sub.toJSON() }),
            });
          } catch {
            // Push not supported or denied
          }
        }
      });
    }
  }, [memberId]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const isToday = plan?.date === getTodayIST();
  const refreshFavorites = () => {
    if (!memberId) return;
    fetch(`/api/favorites?member_id=${memberId}`)
      .then((r) => r.json())
      .then((favs: MealFavorite[]) => {
        setFavorites(favs);
        setFavSet(new Set(favs.map((f) => f.dish_name)));
      })
      .catch(() => {});
  };

  const currentMember = MEMBERS.find((m) => m.id === memberId);

  if (!memberId) return <MemberPicker onSelect={handleMemberSelect} />;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold">Hum Paanch</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setShowPicker(true)}
            className={`${currentMember?.color} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform`}
          >
            {currentMember?.emoji}
          </button>
        </div>
      </header>

      {/* Profile / Logout Overlay */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setShowPicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-[var(--bg-card)] rounded-2xl p-6 w-full max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`${currentMember?.color} w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
                  {currentMember?.emoji}
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{currentMember?.name}</h2>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    localStorage.removeItem("humpaanch_member");
                    setMemberId(null);
                    setShowPicker(false);
                  }}
                  className="mt-2 w-full bg-red-900/30 text-red-400 py-3 rounded-xl font-semibold transition-colors"
                >
                  Logout
                </motion.button>
                <button
                  onClick={() => setShowPicker(false)}
                  className="w-full text-[var(--text-secondary)] py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {loading ? (
          <SkeletonLoader />
        ) : !plan ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center py-10"
            >
              <p className="text-5xl mb-4">&#128336;</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">Tomorrow&apos;s plan not ready yet</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 mb-5">Tap below to generate it now!</p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={generatePlan}
                disabled={generating}
                className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-60 transition-all"
              >
                {generating ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Tomorrow&apos;s Plan
                  </>
                )}
              </motion.button>

              {genError && (
                <p className="text-red-400 text-xs mt-3">{genError}</p>
              )}

              {/* Favorites section */}
              {favorites.length > 0 && (
                <div className="w-full mt-8 space-y-2">
                  <p className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wide text-left">
                    Your Favorites
                  </p>
                  {favorites.slice(0, 5).map((fav) => (
                    <div
                      key={fav.id}
                      className="bg-[var(--bg-card)] rounded-xl px-4 py-3 border border-[var(--border-color)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase">{fav.meal_slot}</span>
                        <p className="text-sm text-[var(--text-primary)] truncate">{fav.dish_name}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          const tomorrow = getTomorrowIST();
                          await fetch("/api/lock-slot", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              date: tomorrow,
                              meal_slot: fav.meal_slot,
                              member_scope: "default",
                              value: fav.dish_name,
                            }),
                          });
                          toast.success(`Pinned for tomorrow's ${fav.meal_slot}`);
                        }}
                        className="flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full bg-[var(--bg-button)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-button-hover)]"
                      >
                        Pin for tomorrow
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Show last plan as fallback */}
            {yesterdayPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                  <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">
                    Last plan &middot; {yesterdayPlan.day} {yesterdayPlan.date}
                  </p>
                  <div className="flex-1 h-px bg-[var(--border-color)]" />
                </div>

                <MealSection
                  title="Breakfast"
                  emoji="🌅"
                  slot={yesterdayPlan.plan_data.breakfast}
                  mealSlot="breakfast"
                />

                {yesterdayPlan.plan_data.lunchbox_nyra && (
                  <MealCard title="🎒 Nyra's Lunch Box" mealSlot="lunchbox" date={yesterdayPlan.date} memberId={memberId || ""}
                    content={<p className="text-[var(--text-primary)]">{yesterdayPlan.plan_data.lunchbox_nyra}</p>} />
                )}

                <MealSection
                  title="Lunch"
                  emoji="🍽️"
                  slot={yesterdayPlan.plan_data.lunch}
                  mealSlot="lunch"
                />

                <MealSection
                  title="Dinner"
                  emoji="🌙"
                  slot={yesterdayPlan.plan_data.dinner}
                  mealSlot="dinner"
                  timing={{
                    kamini: yesterdayPlan.plan_data.dinner_time_kamini || "~7 PM",
                    nyra: yesterdayPlan.plan_data.dinner_time_nyra || "~7:30 PM",
                    others: yesterdayPlan.plan_data.dinner_time_others || "~8:30 PM",
                  }}
                />
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <motion.p variants={staggerItem} className="text-sm text-[var(--text-secondary)] font-medium">
              {plan.day} &middot; {plan.date}
            </motion.p>

            {/* Skip Me Bar */}
            <motion.div variants={staggerItem}>
              <SkipMeBar date={plan.date} memberId={memberId} onSkipChanged={fetchPlan} />
            </motion.div>

            {/* Breakfast Section */}
            <motion.div variants={staggerItem}>
              <MealSection
                title="Breakfast"
                emoji="🌅"
                slot={plan.plan_data.breakfast}
                mealSlot="breakfast"
                date={plan.date}
                memberId={memberId}
                showReactions
                showRefresh
                showFinishRate
                showFavorites
                favorites={favSet}
                onFavoriteToggle={refreshFavorites}
                skippedByMe={skipContexts.includes("breakfast")}
                onSlotUpdated={fetchPlan}
                initialReaction={(reactions["breakfast"]?.reaction === "ok" || reactions["breakfast"]?.reaction === "suggest_change") ? reactions["breakfast"].reaction : null}
                initialComment={reactions["breakfast"]?.comment || ""}
                allReactions={allReactions}
              />
            </motion.div>
            {isToday && isMealTimePassed("breakfast") && !finishLogs["breakfast"] && plan.plan_data.breakfast?.default && (
              <motion.div variants={staggerItem}>
                <MealRatingPrompt date={plan.date} mealSlot="breakfast" memberId={memberId} dishName={plan.plan_data.breakfast.default} onRated={fetchPlan} />
              </motion.div>
            )}

            {/* Nyra's Lunch Box */}
            {plan.plan_data.lunchbox_nyra && (
              <motion.div variants={staggerItem}>
                <MealCard title="🎒 Nyra's Lunch Box" mealSlot="lunchbox" date={plan.date} memberId={memberId} initialReaction={(reactions["lunchbox"]?.reaction === "ok" || reactions["lunchbox"]?.reaction === "suggest_change") ? reactions["lunchbox"].reaction : null} initialComment={reactions["lunchbox"]?.comment || ""}
                  content={<p className="text-[var(--text-primary)]">{plan.plan_data.lunchbox_nyra}</p>} />
              </motion.div>
            )}

            {/* Lunch Section */}
            <motion.div variants={staggerItem}>
              <MealSection
                title="Lunch"
                emoji="🍽️"
                slot={plan.plan_data.lunch}
                mealSlot="lunch"
                date={plan.date}
                memberId={memberId}
                showReactions
                showRefresh
                showFinishRate
                showFavorites
                favorites={favSet}
                onFavoriteToggle={refreshFavorites}
                skippedByMe={skipContexts.includes("lunch")}
                onSlotUpdated={fetchPlan}
                initialReaction={(reactions["lunch"]?.reaction === "ok" || reactions["lunch"]?.reaction === "suggest_change") ? reactions["lunch"].reaction : null}
                initialComment={reactions["lunch"]?.comment || ""}
                allReactions={allReactions}
              />
            </motion.div>
            {isToday && isMealTimePassed("lunch") && !finishLogs["lunch"] && plan.plan_data.lunch?.default && (
              <motion.div variants={staggerItem}>
                <MealRatingPrompt date={plan.date} mealSlot="lunch" memberId={memberId} dishName={plan.plan_data.lunch.default} onRated={fetchPlan} />
              </motion.div>
            )}

            {/* Dinner Section */}
            <motion.div variants={staggerItem}>
              <MealSection
                title="Dinner"
                emoji="🌙"
                slot={plan.plan_data.dinner}
                mealSlot="dinner"
                date={plan.date}
                memberId={memberId}
                showReactions
                showFavorites
                favorites={favSet}
                onFavoriteToggle={refreshFavorites}
                skippedByMe={skipContexts.includes("dinner")}
                timing={{
                  kamini: plan.plan_data.dinner_time_kamini || "~7 PM",
                  nyra: plan.plan_data.dinner_time_nyra || "~7:30 PM",
                  others: plan.plan_data.dinner_time_others || "~8:30 PM",
                }}
                initialReaction={(() => { const r = reactions["dinner"]?.reaction || reactions["dinner_others"]?.reaction; return (r === "ok" || r === "suggest_change") ? r : null; })()}
                initialComment={reactions["dinner"]?.comment || reactions["dinner_others"]?.comment || ""}
                allReactions={allReactions}
              />
            </motion.div>
            {isToday && isMealTimePassed("dinner") && !finishLogs["dinner"] && plan.plan_data.dinner?.default && (
              <motion.div variants={staggerItem}>
                <MealRatingPrompt date={plan.date} mealSlot="dinner" memberId={memberId} dishName={plan.plan_data.dinner.default} onRated={fetchPlan} />
              </motion.div>
            )}

            {plan.plan_data.need_to_buy && (
              <motion.div
                variants={staggerItem}
                className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-4"
              >
                <h3 className="text-sm font-semibold text-yellow-400 mb-1">Need to Buy</h3>
                <p className="text-sm text-yellow-300/80">{plan.plan_data.need_to_buy}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      <BottomNav currentTab="plan" />
    </div>
  );
}
