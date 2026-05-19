"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MEMBERS } from "@/lib/types";

interface Props {
  date: string;
  memberId: string;
  onSkipChanged?: () => void;
}

const SKIP_OPTIONS = [
  { label: "Skip Breakfast", slot: "breakfast", note: "Skipping breakfast" },
  { label: "Skip Lunch", slot: "lunch", note: "Skipping lunch" },
  { label: "Skip Dinner", slot: "dinner", note: "Skipping dinner" },
  { label: "Out All Day", slot: "all", note: "Out all day" },
];

interface ActiveSkip {
  id: string;
  slot: string;
}

export default function SkipMeBar({ date, memberId, onSkipChanged }: Props) {
  const [activeSkips, setActiveSkips] = useState<ActiveSkip[]>([]);
  const [confirmSlot, setConfirmSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const member = MEMBERS.find((m) => m.id === memberId);

  useEffect(() => {
    fetch(`/api/context?date=${date}`)
      .then((r) => r.json())
      .then((contexts) => {
        const mySkips: ActiveSkip[] = [];
        for (const c of contexts) {
          if (c.member_id !== memberId || c.type !== "going_out") continue;
          if (c.note?.includes("breakfast")) mySkips.push({ id: c.id, slot: "breakfast" });
          else if (c.note?.includes("lunch")) mySkips.push({ id: c.id, slot: "lunch" });
          else if (c.note?.includes("dinner")) mySkips.push({ id: c.id, slot: "dinner" });
          else if (c.note?.includes("all day")) mySkips.push({ id: c.id, slot: "all" });
          else mySkips.push({ id: c.id, slot: "all" });
        }
        setActiveSkips(mySkips);
      })
      .catch(() => {});
  }, [date, memberId]);

  const isSkipped = (slot: string) => {
    if (activeSkips.some((s) => s.slot === "all")) return true;
    return activeSkips.some((s) => s.slot === slot);
  };

  const handleSkip = async (slot: string, note: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_start: date,
          date_end: date,
          member_id: memberId,
          type: "going_out",
          note,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSkips((prev) => [...prev, { id: data.id, slot }]);
        toast.success(slot === "all" ? "Marked as out all day" : `Skipping ${slot}`);
        setConfirmSlot(null);
        if (onSkipChanged) onSkipChanged();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnskip = async (slot: string) => {
    const skip = activeSkips.find((s) => s.slot === slot);
    if (!skip) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/context?id=${skip.id}`, { method: "DELETE" });
      if (res.ok) {
        setActiveSkips((prev) => prev.filter((s) => s.id !== skip.id));
        toast.success("Skip removed");
        if (onSkipChanged) onSkipChanged();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {SKIP_OPTIONS.map((opt) => {
          const active = isSkipped(opt.slot);
          return (
            <motion.button
              key={opt.slot}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (active) handleUnskip(opt.slot);
                else setConfirmSlot(opt.slot);
              }}
              disabled={busy}
              className={`flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-amber-900/30 text-amber-400 border-amber-800"
                  : "bg-[var(--bg-button)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-button-hover)]"
              }`}
            >
              {active ? `✓ ${opt.label}` : opt.label}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {confirmSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => !busy && setConfirmSlot(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-[var(--bg-card)] rounded-2xl p-5 w-full max-w-sm border border-[var(--border-color)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`${member?.color} w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                  {member?.emoji}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{member?.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {SKIP_OPTIONS.find((o) => o.slot === confirmSlot)?.label} on {date}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmSlot(null)}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-[var(--bg-button)] text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const opt = SKIP_OPTIONS.find((o) => o.slot === confirmSlot);
                    if (opt) handleSkip(opt.slot, opt.note);
                  }}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-amber-600 text-white font-semibold disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Confirm"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
