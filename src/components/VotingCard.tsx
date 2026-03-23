"use client";

import { useState } from "react";
import { Vote, MEMBERS } from "@/lib/types";

interface VotingCardProps {
  options: string[];
  votes: Vote[];
  memberId: string;
  date: string;
  votingOpen: boolean;
}

export default function VotingCard({
  options,
  votes: initialVotes,
  memberId,
  date,
  votingOpen,
}: VotingCardProps) {
  const [votes, setVotes] = useState<Vote[]>(initialVotes);
  const [submitting, setSubmitting] = useState(false);

  const myVote = votes.find((v) => v.member_id === memberId);
  const voteCounts = options.map(
    (_, i) => votes.filter((v) => v.option_index === i).length
  );
  const maxVotes = Math.max(...voteCounts, 0);
  const winnerIndex = !votingOpen && maxVotes > 0
    ? voteCounts.indexOf(maxVotes)
    : -1;

  const handleVote = async (optionIndex: number) => {
    if (!votingOpen || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          option_index: optionIndex,
          date,
        }),
      });
      if (res.ok) {
        const newVote = await res.json();
        setVotes((prev) => {
          const without = prev.filter((v) => v.member_id !== memberId);
          return [...without, newVote];
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getVotersForOption = (index: number) =>
    votes
      .filter((v) => v.option_index === index)
      .map((v) => MEMBERS.find((m) => m.id === v.member_id))
      .filter(Boolean);

  if (options.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 text-gray-500 text-sm text-center">
        No dinner options posted yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Dinner Vote
        </h3>
        {votingOpen ? (
          <span className="text-xs text-green-400 font-medium">Voting open</span>
        ) : (
          <span className="text-xs text-gray-500 font-medium">Voting closed</span>
        )}
      </div>

      {options.map((option, index) => {
        const isMyChoice = myVote?.option_index === index;
        const isWinner = winnerIndex === index;
        const voters = getVotersForOption(index);

        return (
          <button
            key={index}
            onClick={() => handleVote(index)}
            disabled={!votingOpen || submitting}
            className={`w-full text-left p-4 rounded-xl transition-all ${
              isWinner
                ? "bg-green-900/40 border-2 border-green-600"
                : isMyChoice
                ? "bg-orange-900/30 border-2 border-orange-600"
                : "bg-gray-900 border-2 border-transparent active:bg-gray-800"
            } ${!votingOpen && !isWinner ? "opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{option}</span>
              <div className="flex items-center gap-2">
                {isWinner && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-400">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-gray-400 text-sm">
                  {voteCounts[index]} vote{voteCounts[index] !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {voters.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {voters.map((member) =>
                  member ? (
                    <div
                      key={member.id}
                      className={`${member.color} w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold`}
                      title={member.name}
                    >
                      {member.emoji}
                    </div>
                  ) : null
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
