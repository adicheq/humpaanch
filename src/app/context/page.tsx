"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { MealContext, ContextType } from "@/lib/v2-types";
import { MEMBERS } from "@/lib/types";

const TYPES: { v: ContextType; label: string; emoji: string }[] = [
  { v: "travel", label: "Travel", emoji: "✈️" },
  { v: "guests", label: "Guests", emoji: "👥" },
  { v: "fasting", label: "Fasting", emoji: "🌙" },
  { v: "exam", label: "Exam", emoji: "📚" },
  { v: "going_out", label: "Going Out", emoji: "🍽️" },
  { v: "sick", label: "Sick", emoji: "🤒" },
  { v: "celebration", label: "Celebration", emoji: "🎉" },
  { v: "other", label: "Other", emoji: "📝" },
];

export default function ContextPage() {
  const [contexts, setContexts] = useState<MealContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ContextType>("travel");
  const [memberId, setMemberId] = useState<string>("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [note, setNote] = useState("");

  const fetchContexts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/context");
      if (res.ok) setContexts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContexts();
    const today = new Date().toISOString().split("T")[0];
    setDateStart(today);
    setDateEnd(today);
  }, []);

  const submit = async () => {
    if (!dateStart || !dateEnd) {
      toast.error("Pick dates");
      return;
    }
    const res = await fetch("/api/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        member_id: memberId || null,
        date_start: dateStart,
        date_end: dateEnd,
        note,
      }),
    });
    if (res.ok) {
      toast.success("Saved");
      setShowForm(false);
      setNote("");
      fetchContexts();
    } else {
      toast.error("Failed");
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/context?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setContexts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cleared");
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Context</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Travel, guests, fasting — the planner adjusts
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="bg-[var(--text-primary)] text-[var(--bg-primary)] p-2 rounded-full"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
        </motion.button>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] space-y-3"
          >
            <div className="grid grid-cols-4 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.v}
                  onClick={() => setType(t.v)}
                  className={`text-xs py-2 rounded-lg border ${
                    type === t.v
                      ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent"
                      : "bg-[var(--bg-button)] text-[var(--text-primary)] border-[var(--border-subtle)]"
                  }`}
                >
                  <div className="text-base">{t.emoji}</div>
                  <div>{t.label}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[var(--text-secondary)]">Who? (optional)</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)]"
              >
                <option value="">Whole family</option>
                {MEMBERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                <option value="nyra">Nyra</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--text-secondary)]">From</label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)]">To</label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)]"
                />
              </div>
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (e.g. 'easy comfort food')"
              className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)] placeholder-[var(--text-muted)]"
            />

            <button
              onClick={submit}
              className="w-full py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-semibold text-sm"
            >
              Save context
            </button>
          </motion.div>
        )}

        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : contexts.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center mt-10">
            No active context. Tap + to add travel, guests, fasting, etc.
          </p>
        ) : (
          contexts.map((c) => {
            const t = TYPES.find((x) => x.v === c.type);
            return (
              <motion.div
                key={c.id}
                layout
                className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] flex items-start gap-3"
              >
                <div className="text-2xl">{t?.emoji || "📝"}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {t?.label || c.type}
                    {c.member_id ? ` · ${c.member_id}` : " · Family"}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {c.date_start === c.date_end ? c.date_start : `${c.date_start} → ${c.date_end}`}
                  </div>
                  {c.note && <div className="text-sm text-[var(--text-secondary)] mt-1">{c.note}</div>}
                </div>
                <button onClick={() => remove(c.id)} className="text-[var(--text-muted)] hover:text-red-400">
                  <X size={16} />
                </button>
              </motion.div>
            );
          })
        )}
      </main>

      <BottomNav currentTab="context" />
    </div>
  );
}
