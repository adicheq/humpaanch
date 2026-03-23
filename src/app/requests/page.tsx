"use client";

import { useEffect, useState } from "react";
import { MemberId } from "@/lib/types";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import RequestForm from "@/components/RequestForm";

export default function RequestsPage() {
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
        <h1 className="text-xl font-bold">Requests</h1>
        <p className="text-orange-100 text-sm">Ask for something specific</p>
      </header>

      <main className="flex-1 px-4 py-4">
        <RequestForm memberId={memberId} />
      </main>

      <BottomNav currentTab="requests" />
    </div>
  );
}
