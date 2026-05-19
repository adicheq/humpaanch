"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { PantryItem, PantryStatus } from "@/lib/v2-types";

const STATUS_OPTIONS: { v: PantryStatus; label: string; color: string }[] = [
  { v: "in_stock", label: "In stock", color: "bg-green-900/30 text-green-400 border-green-800" },
  { v: "low", label: "Low", color: "bg-amber-900/30 text-amber-400 border-amber-800" },
  { v: "out", label: "Out", color: "bg-red-900/30 text-red-400 border-red-800" },
];

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pantry");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), category: newCat.trim() || null }),
    });
    if (res.ok) {
      toast.success("Added");
      setNewName("");
      setNewCat("");
      fetchItems();
    } else {
      toast.error("Failed");
    }
  };

  const setStatus = async (id: string, status: PantryStatus) => {
    const res = await fetch("/api/pantry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    } else {
      toast.error("Failed to update");
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/pantry?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const grouped: Record<string, PantryItem[]> = {};
  for (const it of items) {
    const cat = it.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(it);
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold">Pantry</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          Mark what&apos;s low or out — the planner avoids those ingredients
        </p>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Add new */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Item name"
            className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)] focus:outline-none placeholder-[var(--text-muted)]"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Category"
            className="w-24 bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm border border-[var(--border-color)] focus:outline-none placeholder-[var(--text-muted)]"
            onKeyDown={(e) => e.key === "Enter" && addItem()}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={addItem}
            className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-3 rounded-lg"
          >
            <Plus size={16} />
          </motion.button>
        </motion.div>

        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
        ) : (
          Object.entries(grouped)
            .sort()
            .map(([cat, list]) => (
              <div key={cat} className="space-y-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {cat}
                </h2>
                <div className="space-y-1.5">
                  {list.map((it) => (
                    <motion.div
                      key={it.id}
                      layout
                      className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] flex items-center gap-2"
                    >
                      <span className="flex-1 text-sm text-[var(--text-primary)] capitalize">
                        {it.name}
                      </span>
                      <div className="flex gap-1">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s.v}
                            onClick={() => setStatus(it.id, s.v)}
                            className={`text-[10px] px-2 py-1 rounded-full border ${
                              it.status === s.v
                                ? s.color
                                : "bg-[var(--bg-button)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => remove(it.id)}
                        className="text-[var(--text-muted)] hover:text-red-400 ml-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
        )}
      </main>

      <BottomNav currentTab="pantry" />
    </div>
  );
}
