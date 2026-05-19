"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { MemberId } from "@/lib/types";

interface QuickLog {
  id: string;
  raw_text: string;
  parsed_kind: string | null;
  applied: boolean;
  created_at: string;
}

const SAMPLE = [
  "Nyra didn't eat her lunch today",
  "We're out of paneer",
  "Aditya travelling Mon to Wed",
  "Riya is fasting tomorrow",
  "Loved the pav bhaji last night",
  "Ordered pizza for Sunday dinner",
];

export default function LogPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [memberId, setMemberId] = useState<MemberId | null>(null);
  const [logs, setLogs] = useState<QuickLog[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("humpaanch_member") as MemberId | null;
    if (stored) setMemberId(stored);
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const res = await fetch("/api/quick-log");
    if (res.ok) setLogs(await res.json());
  };

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, member_id: memberId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.applied) {
          toast.success(`Logged as ${data.parsed.kind}`);
        } else {
          toast.success("Saved");
        }
        setText("");
        fetchLogs();
      } else {
        toast.error("Failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold">Quick Log</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Just type — we&apos;ll figure out where it goes
        </p>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)]"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What happened? e.g. 'Nyra didn't eat lunch' or 'guests Saturday'"
            rows={3}
            className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)] resize-none focus:outline-none placeholder-[var(--text-muted)]"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={submit}
            disabled={busy || !text.trim()}
            className="mt-2 w-full py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full" />
                Routing…
              </>
            ) : (
              <>
                <Send size={14} /> Send
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Sample prompts */}
        <div>
          <h2 className="text-[11px] uppercase text-[var(--text-secondary)] font-semibold mb-2">
            Try these
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE.map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="text-[11px] px-2 py-1 rounded-full bg-[var(--bg-button)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-button-hover)]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        {logs.length > 0 && (
          <div>
            <h2 className="text-[11px] uppercase text-[var(--text-secondary)] font-semibold mb-2">
              Recent
            </h2>
            <div className="space-y-1.5">
              {logs.slice(0, 12).map((l) => (
                <div
                  key={l.id}
                  className="bg-[var(--bg-card)] rounded-lg px-3 py-2 border border-[var(--border-color)] flex items-start gap-2"
                >
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full mt-0.5 ${
                      l.applied
                        ? "bg-green-900/30 text-green-400"
                        : "bg-[var(--bg-button)] text-[var(--text-muted)]"
                    }`}
                  >
                    {l.parsed_kind || "note"}
                  </span>
                  <span className="text-sm text-[var(--text-primary)] flex-1">{l.raw_text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav currentTab="log" />
    </div>
  );
}
