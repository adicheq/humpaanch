"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MemberId } from "@/lib/types";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import TasteProfile from "@/components/TasteProfile";
import ThemeToggle from "@/components/ThemeToggle";

export default function MyTastePage() {
  const [memberId, setMemberId] = useState<MemberId | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("humpaanch_member") as MemberId | null;
    if (stored) {
      setMemberId(stored);
    }
  }, []);

  if (!memberId) {
    return <MemberPicker onSelect={(id) => setMemberId(id)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col min-h-screen pb-20"
    >
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-bold">My Taste</h1>
          <p className="text-[var(--text-secondary)] text-sm">Your food preferences</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 py-4">
        <TasteProfile memberId={memberId} />
      </main>

      <BottomNav currentTab="taste" />
    </motion.div>
  );
}
