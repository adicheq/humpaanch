"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check } from "lucide-react";
import { useFoodSearch } from "@/hooks/useFoodSearch";
import { Cuisine, FoodCategory, DietTag, FoodItem } from "@/data/food-library";
import { TasteCategory, MemberId } from "@/lib/types";

interface FoodSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (foodName: string) => void;
  category: TasteCategory;
  memberId: MemberId;
  existingItems: string[];
}

const CUISINE_OPTIONS: { value: Cuisine; label: string }[] = [
  { value: "north_indian", label: "North Indian" },
  { value: "south_indian", label: "South Indian" },
  { value: "punjabi", label: "Punjabi" },
  { value: "gujarati", label: "Gujarati" },
  { value: "rajasthani", label: "Rajasthani" },
  { value: "indo_chinese", label: "Indo-Chinese" },
  { value: "italian", label: "Italian" },
  { value: "continental", label: "Continental" },
  { value: "street_food", label: "Street Food" },
];

const CATEGORY_OPTIONS: { value: FoodCategory; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "sweet", label: "Sweet" },
];

// Map taste categories to auto-applied food category filters
function getAutoFilter(category: TasteCategory): FoodCategory[] {
  switch (category) {
    case "breakfast_pref":
      return ["breakfast"];
    case "dinner_pref":
      return ["dinner"];
    default:
      return [];
  }
}

export default function FoodSearchSheet({
  isOpen,
  onClose,
  onSelect,
  category,
  memberId,
  existingItems,
}: FoodSearchSheetProps) {
  const [query, setQuery] = useState("");
  const [cuisineFilters, setCuisineFilters] = useState<Cuisine[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<FoodCategory[]>([]);
  const [dietFilter, setDietFilter] = useState<DietTag | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-apply filters based on taste category and member
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCuisineFilters([]);
      setCategoryFilters(getAutoFilter(category));
      setDietFilter(memberId === "kamini" ? "jain" : null);
      setJustAdded(null);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, category, memberId]);

  const results = useFoodSearch({
    query,
    cuisineFilters,
    categoryFilters,
    dietFilter,
  });

  const toggleCuisine = (c: Cuisine) => {
    setCuisineFilters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const toggleCategory = (c: FoodCategory) => {
    setCategoryFilters((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSelect = (item: FoodItem) => {
    if (existingItems.includes(item.name)) return;
    onSelect(item.name);
    setJustAdded(item.id);
    setTimeout(() => setJustAdded(null), 1500);
  };

  const handleCustomAdd = () => {
    const trimmed = query.trim();
    if (trimmed && !existingItems.includes(trimmed)) {
      onSelect(trimmed);
      setQuery("");
    }
  };

  const existingLower = existingItems.map((i) => i.toLowerCase());

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] rounded-t-2xl max-h-[85vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[var(--border-color)]" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Browse Foods</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-button)] text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dishes, ingredients..."
                  className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl pl-10 pr-4 py-3 text-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)] border border-[var(--border-color)]"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Chips */}
            <div className="px-4 pb-3 space-y-2">
              {/* Cuisine filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {CUISINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleCuisine(opt.value)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      cuisineFilters.includes(opt.value)
                        ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                        : "bg-[var(--bg-button)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Category + Diet filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleCategory(opt.value)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      categoryFilters.includes(opt.value)
                        ? "bg-blue-600 text-white"
                        : "bg-[var(--bg-button)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setDietFilter((prev) => (prev === "jain" ? null : "jain"))
                  }
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    dietFilter === "jain"
                      ? "bg-green-600 text-white"
                      : "bg-[var(--bg-button)] text-[var(--text-secondary)]"
                  }`}
                >
                  Jain-safe
                </button>
                <button
                  onClick={() =>
                    setDietFilter((prev) => (prev === "egg" ? null : "egg"))
                  }
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    dietFilter === "egg"
                      ? "bg-yellow-600 text-white"
                      : "bg-[var(--bg-button)] text-[var(--text-secondary)]"
                  }`}
                >
                  Egg dishes
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {results.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {results.map((item) => {
                    const isAdded = existingLower.includes(
                      item.name.toLowerCase()
                    );
                    const wasJustAdded = justAdded === item.id;

                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => handleSelect(item)}
                        disabled={isAdded}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          isAdded || wasJustAdded
                            ? "bg-green-900/30 text-green-400 border border-green-800"
                            : "bg-[var(--bg-button)] text-[var(--text-primary)] border border-[var(--border-color)] active:bg-[var(--bg-button-hover)] active:border-[var(--border-color)]"
                        }`}
                      >
                        {(isAdded || wasJustAdded) && (
                          <Check size={14} className="text-green-400" />
                        )}
                        {item.name}
                        <span className="text-[10px] text-[var(--text-muted)] ml-0.5">
                          {item.calories} cal
                        </span>
                        {item.type === "ingredient" && (
                          <span className="text-[10px] text-[var(--text-secondary)] ml-0.5">
                            ing.
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div className="text-center py-8">
                  <p className="text-[var(--text-secondary)] text-sm mb-3">
                    No matches for &quot;{query}&quot;
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCustomAdd}
                    className="bg-[var(--text-primary)] text-[var(--bg-primary)] px-5 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    Add &quot;{query.trim()}&quot; as custom
                  </motion.button>
                </div>
              ) : (
                <p className="text-center text-[var(--text-secondary)] text-sm py-8">
                  Try searching or select a filter above
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
