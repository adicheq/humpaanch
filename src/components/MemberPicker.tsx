"use client";

import { MEMBERS, MemberId } from "@/lib/types";

interface MemberPickerProps {
  onSelect: (memberId: MemberId) => void;
}

export default function MemberPicker({ onSelect }: MemberPickerProps) {
  const handleSelect = (id: MemberId) => {
    localStorage.setItem("humpaanch_member", id);
    onSelect(id);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-6">
      <h1 className="text-2xl font-bold text-white mb-2">Who are you?</h1>
      <p className="text-gray-400 mb-10 text-sm">Tap to continue</p>
      <div className="grid grid-cols-2 gap-6">
        {MEMBERS.map((member) => (
          <button
            key={member.id}
            onClick={() => handleSelect(member.id)}
            className="flex flex-col items-center gap-2 group"
          >
            <div
              className={`${member.color} w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold transition-transform group-active:scale-90`}
            >
              {member.emoji}
            </div>
            <span className="text-white text-sm font-medium">
              {member.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
