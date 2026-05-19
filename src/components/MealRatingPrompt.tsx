"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { FINISH_RATE_OPTIONS, FinishRate } from "@/lib/v2-types";

interface Props {
  date: string;
  mealSlot: string;
  memberId: string;
  dishName: string;
  onRated?: () => void;
}

export default function MealRatingPrompt({ date, mealSlot, memberId, dishName, onRated }: Props) {
  const [rated, setRated] = useState<FinishRate | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleRate = async (rate: FinishRate) => {
    setBusy(true);
    try {
      const res = await fetch("/api/finish-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_plan_date: date,
          meal_slot: mealSlot,
          member_id: memberId,
          finish_rate: rate,
          dish_name: dishName,
        }),
      });
      if (res.ok) {
        setRated(rate);
        toast.success("Thanks for rating!");
        if (onRated) onRated();
      }
    } finally {
      setBusy(false);
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {!rated ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-[var(--bg-card)] rounded-xl border border-purple-800/30 overflow-hidden"
        >
          <div className="bg-purple-900/20 px-4 py-2.5 border-b border-purple-800/20 flex items-center justify-between">
            <p className="text-sm font-semibold text-purple-300">
              How was {mealSlot}?
            </p>
            <button
              onClick={() => setDismissed(true)}
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Later
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)] mb-3 truncate">{dishName}</p>
            <div className="grid grid-cols-3 gap-2">
              {FINISH_RATE_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleRate(opt.value)}
                  disabled={busy}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[var(--bg-button)] hover:bg-[var(--bg-button-hover)] border border-[var(--border-subtle)] transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">{opt.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--bg-card)] rounded-xl border border-green-800/30 px-4 py-3 flex items-center gap-2"
        >
          <span className="text-lg">{FINISH_RATE_OPTIONS.find((o) => o.value === rated)?.emoji}</span>
          <p className="text-sm text-green-400 font-medium">Logged! Thanks.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
