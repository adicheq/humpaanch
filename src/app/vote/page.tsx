"use client";

import { useEffect, useState } from "react";
import { MemberId, MealPlan, Vote } from "@/lib/types";
import { getTomorrowIST, isVotingOpen } from "@/lib/helpers";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import VotingCard from "@/components/VotingCard";

export default function VotePage() {
  const [memberId, setMemberId] = useState<MemberId | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("humpaanch_member") as MemberId | null;
    if (stored) {
      setMemberId(stored);
    }
  }, []);

  useEffect(() => {
    if (!memberId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const date = getTomorrowIST();
        const [planRes, votesRes] = await Promise.all([
          fetch(`/api/meal-plan?date=${date}`),
          fetch(`/api/vote?date=${date}`),
        ]);

        if (planRes.ok) {
          setPlan(await planRes.json());
        }
        if (votesRes.ok) {
          setVotes(await votesRes.json());
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [memberId]);

  if (!memberId) {
    return <MemberPicker onSelect={(id) => setMemberId(id)} />;
  }

  const votingOpen = isVotingOpen();
  const hasOptions = plan && plan.dinner_options && plan.dinner_options.length > 0;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-orange-500 text-white px-4 py-3 shadow-md">
        <h1 className="text-xl font-bold">Vote for Dinner</h1>
        {plan && (
          <p className="text-orange-100 text-sm">{plan.day} &middot; {plan.date}</p>
        )}
      </header>

      <main className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full" />
          </div>
        ) : !hasOptions ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="text-4xl mb-3" role="img" aria-label="plate">&#127869;</span>
            <p className="text-lg font-semibold text-gray-700">No voting today</p>
            <p className="text-sm text-gray-500 mt-1">
              Dinner has already been decided, or the plan isn&apos;t ready yet.
            </p>
          </div>
        ) : (
          <VotingCard
            options={plan!.dinner_options}
            votes={votes}
            memberId={memberId}
            date={plan!.date}
            votingOpen={votingOpen}
          />
        )}
      </main>

      <BottomNav currentTab="vote" />
    </div>
  );
}
