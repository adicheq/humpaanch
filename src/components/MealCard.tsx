"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-[var(--bg-card)] rounded-xl p-4 space-y-3 border border-[var(--border-color)]"
    >
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          {title}
        </h3>
        <div className="mt-1">{content}</div>
      </div>

      {reaction === "ok" && !showInput && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 text-green-400 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
          Looks good!
        </motion.div>
      )}
      {reaction === "suggest_change" && !showInput && (
        <div className="text-amber-400 text-sm">
          <span className="font-medium">Your suggestion:</span> {comment}
        </div>
      )}

      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleOk}
          disabled={submitting}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            reaction === "ok"
              ? "bg-green-900/30 text-green-400 border border-green-800"
              : "bg-[var(--bg-button)] text-[var(--text-secondary)] active:bg-[var(--bg-button-hover)]"
          }`}
        >
          OK
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowInput(!showInput)}
          disabled={submitting}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            reaction === "suggest_change"
              ? "bg-amber-900/30 text-amber-400 border border-amber-800"
              : "bg-[var(--bg-button)] text-[var(--text-secondary)] active:bg-[var(--bg-button-hover)]"
          }`}
        >
          Suggest change
        </motion.button>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What would you prefer?"
                className="flex-1 bg-[var(--bg-input)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)] border border-[var(--border-color)]"
                onKeyDown={(e) => e.key === "Enter" && handleSuggestSubmit()}
                autoFocus
              />
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSuggestSubmit}
                disabled={submitting || !comment.trim()}
                className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 active:opacity-80"
              >
                Send
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
