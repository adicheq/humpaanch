"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { MealSlotData, MEMBERS, MealReaction } from "@/lib/types";
import { FOOD_LIBRARY } from "@/data/food-library";
import RefreshSlotMenu from "@/components/RefreshSlotMenu";
import FinishRateBar from "@/components/FinishRateBar";
import FavoriteButton from "@/components/FavoriteButton";

interface PersonRow {
  label: string;
  value: string;
  colorClass: string;
  timing?: string;
}

interface MealSectionProps {
  title: string;
  emoji: string | React.ReactNode;
  slot: MealSlotData;
  mealSlot: string;
  date?: string;
  memberId?: string;
  showReactions?: boolean;
  timing?: { kamini?: string; nyra?: string; others?: string };
  initialReaction?: "ok" | "suggest_change" | null;
  initialComment?: string;
  allReactions?: MealReaction[];
  showRefresh?: boolean;
  showFinishRate?: boolean;
  showFavorites?: boolean;
  favorites?: Set<string>;
  onFavoriteToggle?: (dishName: string, mealSlot: string) => void;
  skippedByMe?: boolean;
  onSlotUpdated?: () => void;
}

function getPersonRows(slot: MealSlotData, timing?: MealSectionProps["timing"]): PersonRow[] {
  const rows: PersonRow[] = [];

  if (slot.default) {
    rows.push({
      label: "Everyone",
      value: slot.default,
      colorClass: "text-[var(--text-primary)]",
      timing: timing?.others,
    });
  }

  const overrides: { key: keyof MealSlotData; label: string; colorClass: string; timingKey?: keyof NonNullable<MealSectionProps["timing"]> }[] = [
    { key: "kamini", label: "Kamini", colorClass: "text-pink-400", timingKey: "kamini" },
    { key: "riya", label: "Riya", colorClass: "text-purple-400" },
    { key: "arth", label: "Arth", colorClass: "text-blue-400" },
    { key: "aditya", label: "Aditya", colorClass: "text-emerald-400" },
    { key: "nyra", label: "Nyra", colorClass: "text-violet-400", timingKey: "nyra" },
  ];

  for (const o of overrides) {
    const val = slot[o.key] as string | undefined;
    if (val && val !== slot.default) {
      rows.push({
        label: o.label,
        value: val,
        colorClass: o.colorClass,
        timing: o.timingKey && timing ? timing[o.timingKey] : undefined,
      });
    }
  }

  return rows;
}

function getMemberEmoji(label: string): string {
  const member = MEMBERS.find((m) => m.name === label);
  return member?.emoji || "";
}

function getMemberBgColor(label: string): string {
  const map: Record<string, string> = {
    Kamini: "bg-pink-900/10",
    Riya: "bg-purple-900/10",
    Arth: "bg-blue-900/10",
    Aditya: "bg-emerald-900/10",
    Nyra: "bg-violet-900/10",
    Everyone: "bg-[var(--bg-card)]",
  };
  return map[label] || "bg-[var(--bg-card)]";
}

function getMemberName(id: string): string {
  const member = MEMBERS.find((m) => m.id === id);
  return member?.name || id;
}

// Estimate calories from meal text by matching against food library
function estimateCalories(mealText: string): number | null {
  if (!mealText) return null;
  const lower = mealText.toLowerCase();
  let total = 0;
  let matched = 0;

  // Try to match each food item against the meal text
  for (const item of FOOD_LIBRARY) {
    if (item.type === "ingredient") continue; // skip raw ingredients
    const nameLower = item.name.toLowerCase();
    if (lower.includes(nameLower)) {
      total += item.calories;
      matched++;
    }
  }

  // If no matches found from library, return null (don't show)
  if (matched === 0) return null;
  return total;
}

// Get calorie color based on amount
function getCalorieColor(cal: number): string {
  if (cal <= 300) return "text-green-400";
  if (cal <= 500) return "text-yellow-400";
  return "text-orange-400";
}

export default function MealSection({
  title,
  emoji,
  slot,
  mealSlot,
  date,
  memberId,
  showReactions = false,
  timing,
  initialReaction = null,
  initialComment = "",
  allReactions = [],
  showRefresh = false,
  showFinishRate = false,
  showFavorites = false,
  favorites,
  onFavoriteToggle,
  skippedByMe = false,
  onSlotUpdated,
}: MealSectionProps) {
  const [reaction, setReaction] = useState<"ok" | "suggest_change" | null>(initialReaction);
  const [comment, setComment] = useState(initialComment);
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localReactions, setLocalReactions] = useState<MealReaction[]>(allReactions);
  const [planUpdated, setPlanUpdated] = useState(false);
  const [refreshRationale, setRefreshRationale] = useState<string | null>(null);

  useEffect(() => {
    if (!refreshRationale) return;
    const timer = setTimeout(() => setRefreshRationale(null), 15000);
    return () => clearTimeout(timer);
  }, [refreshRationale]);

  const rows = getPersonRows(slot, timing);

  // Estimate calories for the "default" meal (what most people eat)
  const estimatedCal = estimateCalories(slot.default || "");

  // Get suggestions from ALL members for this meal slot
  const suggestions = localReactions.filter(
    (r) => r.reaction === "suggest_change" && r.meal_slot === mealSlot
  );

  // For each suggestion, count agreements
  const getSuggestionAgreers = (suggestionId: string) => {
    return localReactions.filter(
      (r) => r.reaction === "agree" && r.agrees_with === suggestionId
    );
  };

  // Check if current member already agreed to a suggestion
  const hasAgreed = (suggestionId: string) => {
    return localReactions.some(
      (r) => r.reaction === "agree" && r.agrees_with === suggestionId && r.member_id === memberId
    );
  };

  const submitReaction = async (type: "ok" | "suggest_change", suggestionComment?: string) => {
    if (!date || !memberId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_plan_date: date,
          meal_slot: mealSlot,
          member_id: memberId,
          reaction: type,
          comment: suggestionComment || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReaction(type);
        if (type === "suggest_change" && suggestionComment) {
          setComment(suggestionComment);
          // Add to local reactions so it shows immediately
          setLocalReactions((prev) => [
            ...prev.filter(
              (r) => !(r.member_id === memberId && r.meal_slot === mealSlot && r.reaction === "suggest_change")
            ),
            data,
          ]);
        }
        setShowInput(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitAgree = async (suggestionId: string, suggestionComment: string) => {
    if (!date || !memberId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_plan_date: date,
          meal_slot: mealSlot,
          member_id: memberId,
          reaction: "agree",
          agrees_with: suggestionId,
          comment: suggestionComment,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalReactions((prev) => [...prev, { ...data, reaction: "agree", agrees_with: suggestionId, member_id: memberId }]);
        if (data.plan_updated) {
          setPlanUpdated(true);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden transition-opacity ${skippedByMe ? "opacity-50" : ""}`}
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {/* Section Header */}
      <div className="bg-[var(--bg-secondary)] px-4 py-2.5 border-b border-[var(--border-color)]">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">{typeof emoji === "string" ? <span className="text-base">{emoji}</span> : emoji}</span>
          {title}
          {skippedByMe && (
            <span className="text-[10px] font-medium bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full">
              Out
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            {planUpdated && (
              <span className="text-[10px] font-medium bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                Updated!
              </span>
            )}
            {estimatedCal && (
              <span className={`flex items-center gap-0.5 text-[11px] font-medium ${getCalorieColor(estimatedCal)} bg-[var(--bg-button)] px-2 py-0.5 rounded-full`}>
                <Flame size={10} />
                ~{estimatedCal} cal
              </span>
            )}
            {showRefresh && date && (mealSlot === "breakfast" || mealSlot === "lunch" || mealSlot === "dinner") && (
              <RefreshSlotMenu
                date={date}
                mealSlot={mealSlot as "breakfast" | "lunch" | "dinner"}
                memberScope="default"
                triggeredBy={memberId}
                onSuccess={(_newValue, rationale) => {
                  setRefreshRationale(rationale || null);
                  if (onSlotUpdated) onSlotUpdated();
                }}
              />
            )}
          </span>
        </h3>
      </div>

      {/* Person Rows */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {rows.map((row, i) => {
          const memberKey =
            row.label === "Everyone" ? "default" : row.label.toLowerCase();
          const finishMemberId = memberId || (memberKey !== "default" ? memberKey : "");
          const showRowFinish =
            showFinishRate &&
            !!date &&
            !!finishMemberId &&
            // Only show finish-rate where this row matters to current user OR for Nyra/Kamini overrides
            (row.label === "Everyone" ||
              row.label.toLowerCase() === memberId ||
              ["nyra", "kamini"].includes(row.label.toLowerCase()));
          const showRowRefresh =
            showRefresh &&
            !!date &&
            row.label !== "Everyone" &&
            (mealSlot === "breakfast" || mealSlot === "lunch" || mealSlot === "dinner");
          return (
            <div key={i} className={`px-4 py-3 ${getMemberBgColor(row.label)}`}>
              <div className="flex items-center gap-2 mb-0.5">
                {row.label !== "Everyone" && (
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${MEMBERS.find(m => m.name === row.label)?.color || "bg-gray-400"}`}>
                    {getMemberEmoji(row.label)}
                  </span>
                )}
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${row.label === "Everyone" ? "text-[var(--text-secondary)]" : row.colorClass}`}>
                  {row.label}
                  {row.timing && (
                    <span className="text-[var(--text-secondary)] font-normal ml-1">{row.timing}</span>
                  )}
                </p>
                {showRowRefresh && (
                  <span className="ml-auto">
                    <RefreshSlotMenu
                      date={date!}
                      mealSlot={mealSlot as "breakfast" | "lunch" | "dinner"}
                      memberScope={row.label.toLowerCase()}
                      triggeredBy={memberId}
                      onSuccess={(_newValue, rationale) => {
                        setRefreshRationale(rationale || null);
                        if (onSlotUpdated) onSlotUpdated();
                      }}
                    />
                  </span>
                )}
              </div>
              <div className="flex items-start gap-1">
                <p className={`text-sm flex-1 ${row.colorClass} ${row.label === "Everyone" ? "font-medium" : ""}`}>
                  {row.value}
                </p>
                {showFavorites && memberId && (
                  <FavoriteButton
                    memberId={memberId}
                    dishName={row.value}
                    mealSlot={mealSlot}
                    date={date}
                    isFavorite={favorites?.has(row.value) || false}
                    onToggle={() => { if (onFavoriteToggle) onFavoriteToggle(row.value, mealSlot); }}
                  />
                )}
              </div>
              {showRowFinish && (
                <div className="mt-2">
                  <FinishRateBar
                    date={date!}
                    mealSlot={mealSlot}
                    memberId={memberKey === "default" ? memberId! : memberKey}
                    dishName={row.value}
                    compact
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Refresh rationale callout */}
      <AnimatePresence>
        {refreshRationale && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2.5 bg-blue-900/15 border-t border-blue-800/30"
          >
            <p className="text-[11px] text-blue-400 font-medium mb-0.5">Why this pick?</p>
            <p className="text-xs text-blue-300/80">{refreshRationale}</p>
            <button
              onClick={() => setRefreshRationale(null)}
              className="text-[10px] text-blue-400/60 mt-1 hover:text-blue-400"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions from others */}
      {showReactions && suggestions.length > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border-color)] bg-amber-900/10 space-y-2">
          {suggestions.map((s) => {
            const agreers = getSuggestionAgreers(s.id);
            const isOwnSuggestion = s.member_id === memberId;
            const alreadyAgreed = hasAgreed(s.id);
            const totalSupport = 1 + agreers.length; // suggester + agreers

            return (
              <div key={s.id} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className={`w-5 h-5 flex-shrink-0 mt-0.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${MEMBERS.find(m => m.id === s.member_id)?.color || "bg-gray-400"}`}>
                    {getMemberEmoji(getMemberName(s.member_id))}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-400">
                      <span className="font-semibold">{getMemberName(s.member_id)}</span> suggests:
                    </p>
                    <p className="text-sm text-amber-300 font-medium">{s.comment}</p>

                    {/* Agreers */}
                    {agreers.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {agreers.map((a) => (
                          <span
                            key={a.id}
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[7px] font-bold ${MEMBERS.find(m => m.id === a.member_id)?.color || "bg-gray-400"}`}
                            title={getMemberName(a.member_id)}
                          >
                            {getMemberEmoji(getMemberName(a.member_id))}
                          </span>
                        ))}
                        <span className="text-[10px] text-amber-400 ml-1">
                          {totalSupport}/2 agree{totalSupport >= 2 ? "d - Switched!" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Agree button - only show for others' suggestions */}
                  {!isOwnSuggestion && !alreadyAgreed && totalSupport < 2 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => submitAgree(s.id, s.comment || "")}
                      disabled={submitting}
                      className="flex-shrink-0 bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      Agree
                    </motion.button>
                  )}
                  {alreadyAgreed && (
                    <span className="flex-shrink-0 text-xs text-green-400 font-medium py-1.5">
                      Agreed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reactions (only on home page) */}
      {showReactions && (
        <div className="px-4 py-3 border-t border-[var(--border-color)] space-y-2">
          {reaction === "ok" && !showInput && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-green-400 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Looks good!
            </motion.div>
          )}
          {reaction === "suggest_change" && !showInput && (
            <div className="text-amber-400 text-sm">
              <span className="font-medium">Your suggestion:</span> {comment}
            </div>
          )}

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => submitReaction("ok")}
              disabled={submitting}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                reaction === "ok"
                  ? "bg-green-900/30 text-green-400 border border-green-800"
                  : "bg-[var(--bg-button)] text-[var(--text-secondary)] active:bg-[var(--bg-button-hover)]"
              }`}
            >
              OK
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowInput(!showInput)}
              disabled={submitting}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                reaction === "suggest_change"
                  ? "bg-amber-900/30 text-amber-400 border border-amber-800"
                  : "bg-[var(--bg-button)] text-[var(--text-secondary)] active:bg-[var(--bg-button-hover)]"
              }`}
            >
              Suggest change
            </motion.button>
          </div>

          <AnimatePresence>
            {showInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What would you prefer?"
                    className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)] border border-[var(--border-color)]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && comment.trim()) {
                        submitReaction("suggest_change", comment.trim());
                      }
                    }}
                    autoFocus
                  />
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (comment.trim()) submitReaction("suggest_change", comment.trim());
                    }}
                    disabled={submitting || !comment.trim()}
                    className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 active:opacity-80"
                  >
                    Send
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
