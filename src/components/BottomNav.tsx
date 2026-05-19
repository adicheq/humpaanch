"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Vote,
  MessageSquare,
  Heart,
  Clock,
  MoreHorizontal,
  CalendarRange,
  ShoppingBasket,
  ChefHat,
  Smile,
  Plane,
  PencilLine,
} from "lucide-react";

interface BottomNavProps {
  currentTab: string;
}

const PRIMARY = [
  { key: "plan", label: "Plan", href: "/", icon: CalendarDays },
  { key: "week", label: "Week", href: "/week", icon: CalendarRange },
  { key: "log", label: "Log", href: "/log", icon: PencilLine },
  { key: "kid", label: "Nyra", href: "/kid", icon: Smile },
];

const MORE = [
  { key: "history", label: "History", href: "/history", icon: Clock },
  { key: "vote", label: "Vote", href: "/vote", icon: Vote },
  { key: "requests", label: "Requests", href: "/requests", icon: MessageSquare },
  { key: "taste", label: "My Taste", href: "/my-taste", icon: Heart },
  { key: "context", label: "Context", href: "/context", icon: Plane },
  { key: "pantry", label: "Pantry", href: "/pantry", icon: ShoppingBasket },
  { key: "cook", label: "Cook View", href: "/cook", icon: ChefHat },
];

export default function BottomNav({ currentTab }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((m) => m.key === currentTab);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-primary)] border-t border-[var(--border-color)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {PRIMARY.map((tab) => {
            const active = currentTab === tab.key;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center gap-1 ${
                    active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </motion.div>
                {active && (
                  <motion.div
                    layoutId="bottomnav-indicator"
                    className="absolute -bottom-1 w-6 h-1 bg-[var(--text-primary)] rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors"
          >
            <div
              className={`flex flex-col items-center gap-1 ${
                moreActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] font-medium">More</span>
            </div>
            {moreActive && (
              <motion.div
                layoutId="bottomnav-indicator"
                className="absolute -bottom-1 w-6 h-1 bg-[var(--text-primary)] rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 flex items-end justify-center"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-[var(--bg-card)] w-full max-w-lg rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 rounded-full bg-[var(--border-color)] mx-auto mb-3" />
              <div className="grid grid-cols-4 gap-2">
                {MORE.map((m) => {
                  const Icon = m.icon;
                  const active = currentTab === m.key;
                  return (
                    <Link
                      key={m.key}
                      href={m.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl ${
                        active
                          ? "bg-[var(--bg-button-hover)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-medium text-center">{m.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
