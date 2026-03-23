"use client";

import { useState, useEffect } from "react";
import { Request as MealRequest, MEMBERS } from "@/lib/types";

interface RequestFormProps {
  memberId: string;
}

const QUICK_CHIPS = [
  "Going out for dinner",
  "Want something spicy",
  "Light food today",
  "Order from outside",
];

export default function RequestForm({ memberId }: RequestFormProps) {
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((data) => setRequests(data))
      .catch(() => {});
  }, []);

  const addRequest = async (text: string) => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, message: text.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests((prev) => [data, ...prev]);
        setMessage("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRequest = async (id: string) => {
    const res = await fetch("/api/requests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const getMember = (id: string) => MEMBERS.find((m) => m.id === id);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Any food requests for tomorrow?"
            className="flex-1 bg-gray-900 text-white rounded-xl px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            onKeyDown={(e) => e.key === "Enter" && addRequest(message)}
          />
          <button
            onClick={() => addRequest(message)}
            disabled={submitting || !message.trim()}
            className="bg-orange-600 text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50 active:bg-orange-700"
          >
            Add
          </button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => addRequest(chip)}
              disabled={submitting}
              className="bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium active:bg-gray-700 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Active requests */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Active requests
        </h3>
        {requests.length === 0 && (
          <p className="text-gray-600 text-sm py-4 text-center">
            No active requests
          </p>
        )}
        {requests.map((req) => {
          const member = getMember(req.member_id);
          const isOwn = req.member_id === memberId;

          return (
            <div
              key={req.id}
              className="flex items-center gap-3 bg-gray-900 rounded-xl px-4 py-3"
            >
              {member && (
                <div
                  className={`${member.color} w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                >
                  {member.emoji}
                </div>
              )}
              <span className="text-white text-sm flex-1">{req.message}</span>
              {isOwn && (
                <button
                  onClick={() => deleteRequest(req.id)}
                  className="text-gray-500 hover:text-red-400 active:text-red-400 p-1 flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
