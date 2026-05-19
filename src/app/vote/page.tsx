"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MemberId, MealPlan, Vote } from "@/lib/types";
import { getTomorrowIST, isVotingOpen } from "@/lib/helpers";
import MemberPicker from "@/components/MemberPicker";
import BottomNav from "@/components/BottomNav";
import VotingCard from "@/components/VotingCard";
import ThemeToggle from "@/components/ThemeToggle";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col min-h-screen pb-20"
    >
      <header className="sticky top-0 z-10 bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-bold">Vote for Dinner</h1>
          {plan && (
            <p className="text-[var(--text-secondary)] text-sm">{plan.day} &middot; {plan.date}</p>
          )}
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--border-color)] border-t-[var(--text-primary)] rounded-full" />
          </div>
        ) : !hasOptions ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <span className="text-4xl mb-3" role="img" aria-label="plate">&#127869;</span>
            <p className="text-lg font-semibold text-[var(--text-primary)]">No voting today</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Dinner has already been decided, or the plan isn&apos;t ready yet.
            </p>
          </motion.div>
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
    </motion.div>
  );
}
