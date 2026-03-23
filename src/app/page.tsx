"use client";

import { useEffect, useState, useCallback } from "react";
import { MemberId, MealPlan, MEMBERS } from "@/lib/types";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import MealCard from "@/components/MealCard";

export default function HomePage() {
  const [memberId, setMemberId] = useState<MemberId | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("humpaanch_member") as MemberId | null;
    if (stored) setMemberId(stored);
    else setLoading(false);
  }, []);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meal-plan");
      if (res.ok) setPlan(await res.json());
      else setPlan(null);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (memberId) fetchPlan();
  }, [memberId, fetchPlan]);

  const handleMemberSelect = (id: MemberId) => {
    localStorage.setItem("humpaanch_member", id);
    setMemberId(id);
    setShowPicker(false);
  };

  // Register service worker for push notifications
  useEffect(() => {
    if ("serviceWorker" in navigator && memberId) {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const existingSub = await reg.pushManager.getSubscription();
        if (!existingSub) {
          try {
            const res = await fetch("/api/push/vapid-key");
            if (!res.ok) return;
            const { key } = await res.json();
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: key,
            });
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ member_id: memberId, subscription: sub.toJSON() }),
            });
          } catch {
            // Push not supported or denied
          }
        }
      });
    }
  }, [memberId]);

  const currentMember = MEMBERS.find((m) => m.id === memberId);

  if (!memberId) return <MemberPicker onSelect={handleMemberSelect} />;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold">Hum Paanch</h1>
        <button
          onClick={() => setShowPicker(true)}
          className={`${currentMember?.color} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform`}
        >
          {currentMember?.emoji}
        </button>
      </header>

      {/* Member Picker Overlay */}
      {showPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Switch Member</h2>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MEMBERS.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberSelect(member.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${
                    member.id === memberId ? "bg-orange-50 ring-2 ring-orange-400" : "hover:bg-gray-50"
                  }`}
                >
                  <div className={`${member.color} w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold`}>
                    {member.emoji}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{member.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full" />
          </div>
        ) : !plan ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-5xl mb-4">&#128336;</p>
            <p className="text-lg font-semibold text-gray-700">Plan not ready yet</p>
            <p className="text-sm text-gray-500 mt-1">Check back at 5 PM!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 font-medium">
              {plan.day} &middot; {plan.date}
            </p>

            <MealCard title="Breakfast" mealSlot="breakfast" date={plan.date} memberId={memberId} content={
              <div>
                <p className="text-gray-800">{plan.plan_data.breakfast.adults}</p>
                {plan.plan_data.breakfast.kamini && plan.plan_data.breakfast.kamini !== "Same" && (
                  <p className="text-sm text-pink-600 mt-1">Kamini: {plan.plan_data.breakfast.kamini}</p>
                )}
                <p className="text-sm text-purple-600 mt-1">Nyra: {plan.plan_data.breakfast.nyra}</p>
              </div>
            } />

            <MealCard title="Nyra's Lunch Box" mealSlot="lunchbox" date={plan.date} memberId={memberId}
              content={<p className="text-gray-800">{plan.plan_data.lunchbox_nyra}</p>} />

            <MealCard title="Lunch" mealSlot="lunch" date={plan.date} memberId={memberId} content={
              <div>
                <p className="text-gray-800">{plan.plan_data.lunch.main}</p>
                <p className="text-sm text-purple-600 mt-1">Nyra: {plan.plan_data.lunch.nyra}</p>
              </div>
            } />

            <MealCard title="Kamini's Dinner (~7 PM)" mealSlot="dinner_kamini" date={plan.date} memberId={memberId}
              content={<p className="text-gray-800">{plan.plan_data.dinner_kamini}</p>} />

            <MealCard title="Nyra's Dinner (~7:30 PM)" mealSlot="dinner_nyra" date={plan.date} memberId={memberId}
              content={<p className="text-gray-800">{plan.plan_data.dinner_nyra}</p>} />

            <MealCard title="Dinner (~8:30 PM)" mealSlot="dinner_others" date={plan.date} memberId={memberId} content={
              <div>
                <p className="text-gray-800">{plan.plan_data.dinner_others}</p>
                <p className="text-xs text-gray-400 mt-1">Riya, Arth, Aditya</p>
              </div>
            } />

            {plan.plan_data.need_to_buy && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">Need to Buy</h3>
                <p className="text-sm text-yellow-700">{plan.plan_data.need_to_buy}</p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav currentTab="plan" />
    </div>
  );
}
