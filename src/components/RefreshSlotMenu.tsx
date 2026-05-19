"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { REFRESH_REASONS, RefreshReason } from "@/lib/v2-types";

interface Props {
  date: string;
  mealSlot: "breakfast" | "lunch" | "dinner" | "lunchbox_nyra";
  memberScope?: string;
  triggeredBy?: string;
  onSuccess?: (newValue: string, rationale: string) => void;
}

export default function RefreshSlotMenu({
  date,
  mealSlot,
  memberScope = "default",
  triggeredBy,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<RefreshReason | null>(null);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/refresh-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          meal_slot: mealSlot,
          member_scope: memberScope,
          reason_tag: reason || undefined,
          reason_note: note || undefined,
          triggered_by: triggeredBy,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Refresh failed");
        return;
      }
      const data = await res.json();
      toast.success("Refreshed!");
      setOpen(false);
      setNote("");
      setReason(null);
      if (onSuccess) onSuccess(data.new_value, data.rationale || "");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-button)] hover:bg-[var(--bg-button-hover)] text-[var(--text-secondary)] text-[11px] font-medium"
        title="Refresh this slot"
      >
        <RefreshCw size={12} />
        <span>Try another</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-[var(--bg-card)] rounded-2xl p-5 w-full max-w-md border border-[var(--border-color)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                Refresh {mealSlot.replace("_", " ")}
                {memberScope !== "default" && memberScope !== "all" ? ` (${memberScope})` : ""}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Tell us why so we can pick something better
              </p>

              <div className="space-y-1.5 mb-3">
                {REFRESH_REASONS.map((r) => (
                  <button
                    key={r.tag}
                    onClick={() => setReason(r.tag)}
                    disabled={busy}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                      reason === r.tag
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent"
                        : "bg-[var(--bg-button)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-button-hover)]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Optional note (e.g. 'we have guests')"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
                className="w-full mb-3 bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)] focus:outline-none placeholder-[var(--text-muted)]"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-[var(--bg-button)] text-[var(--text-secondary)] hover:bg-[var(--bg-button-hover)]"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={submit}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-lg text-sm bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full" />
                      Picking…
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Refresh
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
