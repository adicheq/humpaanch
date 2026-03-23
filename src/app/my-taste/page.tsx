"use client";

import { useEffect, useState } from "react";
import { MemberId } from "@/lib/types";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import TasteProfile from "@/components/TasteProfile";

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
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-orange-500 text-white px-4 py-3 shadow-md">
        <h1 className="text-xl font-bold">My Taste</h1>
        <p className="text-orange-100 text-sm">Your food preferences</p>
      </header>

      <main className="flex-1 px-4 py-4">
        <TasteProfile memberId={memberId} />
      </main>

      <BottomNav currentTab="taste" />
    </div>
  );
}
