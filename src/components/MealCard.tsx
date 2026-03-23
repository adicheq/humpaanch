"use client";

import { useState, ReactNode } from "react";

interface MealCardProps {
  title: string;
  content: ReactNode;
  mealSlot: string;
  date: string;
  memberId: string;
  initialReaction?: "ok" | "suggest_change" | null;
  initialComment?: string;
}

export default function MealCard({
  title,
  content,
  mealSlot,
  date,
  memberId,
  initialReaction = null,
  initialComment = "",
}: MealCardProps) {
  const [reaction, setReaction] = useState<"ok" | "suggest_change" | null>(initialReaction);
  const [comment, setComment] = useState(initialComment);
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitReaction = async (
    type: "ok" | "suggest_change",
    suggestionComment?: string
  ) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_plan_date: date,
          meal_slot: mealSlot,
          member_id: memberId,
          reaction: type,
          comment: suggestionComment || null,
        }),
      });
      if (res.ok) {
        setReaction(type);
        if (type === "suggest_change" && suggestionComment) {
          setComment(suggestionComment);
        }
        setShowInput(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOk = () => submitReaction("ok");

  const handleSuggestSubmit = () => {
    if (comment.trim()) {
      submitReaction("suggest_change", comment.trim());
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 space-y-3 shadow-sm border border-gray-100">
      <div>
        <h3 className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
          {title}
        </h3>
        <div className="mt-1">{content}</div>
      </div>

      {reaction === "ok" && !showInput && (
        <div className="flex items-center gap-1.5 text-green-600 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
          Looks good!
        </div>
      )}
      {reaction === "suggest_change" && !showInput && (
        <div className="text-amber-600 text-sm">
          <span className="font-medium">Your suggestion:</span> {comment}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleOk}
          disabled={submitting}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            reaction === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-50 text-gray-600 active:bg-gray-100"
          }`}
        >
          OK
        </button>
        <button
          onClick={() => setShowInput(!showInput)}
          disabled={submitting}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            reaction === "suggest_change"
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-gray-50 text-gray-600 active:bg-gray-100"
          }`}
        >
          Suggest change
        </button>
      </div>

      {showInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What would you prefer?"
            className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 border border-gray-200"
            onKeyDown={(e) => e.key === "Enter" && handleSuggestSubmit()}
            autoFocus
          />
          <button
            onClick={handleSuggestSubmit}
            disabled={submitting || !comment.trim()}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 active:bg-orange-600"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
