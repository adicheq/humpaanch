"use client";

import { useState, useEffect } from "react";
import { MemberTaste, TasteCategory } from "@/lib/types";

interface TasteProfileProps {
  memberId: string;
}

const CATEGORIES: { key: TasteCategory; label: string; placeholder: string }[] = [
  { key: "loves", label: "Loves", placeholder: "e.g. paneer, biryani" },
  { key: "dislikes", label: "Dislikes", placeholder: "e.g. bitter gourd" },
  { key: "restrictions", label: "Restrictions", placeholder: "e.g. no onion" },
  { key: "breakfast_pref", label: "Breakfast prefs", placeholder: "e.g. poha, paratha" },
  { key: "dinner_pref", label: "Dinner prefs", placeholder: "e.g. light, no rice" },
  { key: "notes", label: "Notes", placeholder: "e.g. extra spicy" },
];

export default function TasteProfile({ memberId }: TasteProfileProps) {
  const [tastes, setTastes] = useState<Record<TasteCategory, string[]>>({
    loves: [],
    dislikes: [],
    restrictions: [],
    breakfast_pref: [],
    dinner_pref: [],
    notes: [],
  });
  const [inputs, setInputs] = useState<Record<TasteCategory, string>>({
    loves: "",
    dislikes: "",
    restrictions: "",
    breakfast_pref: "",
    dinner_pref: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/taste?member_id=${memberId}`)
      .then((r) => r.json())
      .then((data: MemberTaste[]) => {
        const map = { ...tastes };
        data.forEach((t) => {
          map[t.category] = t.items;
        });
        setTastes(map);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const save = async (category: TasteCategory, items: string[]) => {
    await fetch("/api/taste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: memberId, category, items }),
    });
  };

  const addItem = (category: TasteCategory) => {
    const text = inputs[category].trim();
    if (!text) return;
    const updated = [...tastes[category], text];
    setTastes((prev) => ({ ...prev, [category]: updated }));
    setInputs((prev) => ({ ...prev, [category]: "" }));
    save(category, updated);
  };

  const removeItem = (category: TasteCategory, index: number) => {
    const updated = tastes[category].filter((_, i) => i !== index);
    setTastes((prev) => ({ ...prev, [category]: updated }));
    save(category, updated);
  };

  return (
    <div className="space-y-6">
      {CATEGORIES.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {label}
          </h3>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {tastes[key].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-gray-800 text-white px-3 py-1.5 rounded-full text-sm"
              >
                {item}
                <button
                  onClick={() => removeItem(key, i)}
                  className="text-gray-500 hover:text-red-400 active:text-red-400 ml-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputs[key]}
              onChange={(e) =>
                setInputs((prev) => ({ ...prev, [key]: e.target.value }))
              }
              placeholder={placeholder}
              className="flex-1 bg-gray-900 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
              onKeyDown={(e) => e.key === "Enter" && addItem(key)}
            />
            <button
              onClick={() => addItem(key)}
              disabled={!inputs[key].trim()}
              className="bg-gray-800 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40 active:bg-gray-700"
            >
              + Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
