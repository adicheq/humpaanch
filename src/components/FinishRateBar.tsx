"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FINISH_RATE_OPTIONS, FinishRate } from "@/lib/v2-types";

interface Props {
  date: string;
  mealSlot: string;
  memberId: string;
  dishName?: string;
  initialValue?: FinishRate | null;
  compact?: boolean;
}

export default function FinishRateBar({
  date,
  mealSlot,
  memberId,
  dishName,
  initialValue = null,
  compact = false,
}: Props) {
  const [val, setVal] = useState<FinishRate | null>(initialValue);
  const [busy, setBusy] = useState(false);

  const pick = async (rate: FinishRate) => {
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
        setVal(rate);
        toast.success("Logged");
      } else {
        toast.error("Failed to log");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-1"}`}>
      {FINISH_RATE_OPTIONS.map((opt) => (
        <motion.button
          key={opt.value}
          whileTap={{ scale: 0.92 }}
          onClick={() => pick(opt.value)}
          disabled={busy}
          className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
            val === opt.value
              ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent"
              : "bg-[var(--bg-button)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-button-hover)]"
          }`}
          title={opt.label}
        >
          <span>{opt.emoji}</span>{" "}
          <span className={compact ? "hidden sm:inline" : ""}>{opt.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
