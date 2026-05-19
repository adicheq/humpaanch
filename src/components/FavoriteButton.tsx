"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Props {
  memberId: string;
  dishName: string;
  mealSlot: string;
  date?: string;
  isFavorite: boolean;
  favoriteId?: string;
  onToggle?: (added: boolean) => void;
}

export default function FavoriteButton({
  memberId,
  dishName,
  mealSlot,
  date,
  isFavorite: initialFav,
  favoriteId: initialId,
  onToggle,
}: Props) {
  const [fav, setFav] = useState(initialFav);
  const [favId, setFavId] = useState(initialId);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      if (fav && favId) {
        const res = await fetch(`/api/favorites?id=${favId}`, { method: "DELETE" });
        if (res.ok) {
          setFav(false);
          setFavId(undefined);
          toast.success("Removed from favorites");
          if (onToggle) onToggle(false);
        }
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: memberId,
            dish_name: dishName,
            meal_slot: mealSlot,
            source_date: date || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setFav(true);
          setFavId(data.id);
          toast.success("Added to favorites");
          if (onToggle) onToggle(true);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      disabled={busy}
      className="p-1 rounded-full transition-colors disabled:opacity-50"
      title={fav ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        size={14}
        className={fav ? "text-yellow-400 fill-yellow-400" : "text-[var(--text-muted)]"}
      />
    </motion.button>
  );
}
