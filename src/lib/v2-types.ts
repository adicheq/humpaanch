// Shared V2 types

export type MealSlot =
  | "breakfast"
  | "lunchbox"
  | "lunch"
  | "dinner"
  | "dinner_kamini"
  | "dinner_nyra"
  | "dinner_others";

export type FinishRate =
  | "loved"
  | "ate_all"
  | "ate_some"
  | "refused"
  | "ordered_out"
  | "skipped";

export type RefreshReason =
  | "similar"
  | "lighter"
  | "mood"
  | "no_ingredient"
  | "fasting"
  | "no_time"
  | "other";

export type ContextType =
  | "travel"
  | "guests"
  | "fasting"
  | "exam"
  | "going_out"
  | "sick"
  | "celebration"
  | "other";

export type PantryStatus = "in_stock" | "low" | "out";

export interface PantryItem {
  id: string;
  family_id: string;
  name: string;
  category: string | null;
  status: PantryStatus;
  notes: string | null;
  updated_at: string;
}

export interface MealContext {
  id: string;
  family_id: string;
  date_start: string;
  date_end: string;
  member_id: string | null;
  type: ContextType;
  note: string | null;
  active: boolean;
  created_at: string;
}

export interface FinishLogEntry {
  id: string;
  family_id: string;
  meal_plan_date: string;
  meal_slot: string;
  member_id: string;
  finish_rate: FinishRate;
  dish_name: string | null;
  comment: string | null;
  created_at: string;
}

export interface KidBadge {
  id: string;
  family_id: string;
  member_id: string;
  badge_key: string;
  badge_label: string;
  badge_emoji: string;
  earned_for: string | null;
  earned_at: string;
}

export interface PlanLock {
  id: string;
  family_id: string;
  date: string;
  meal_slot: string;
  member_scope: string;
  value: string;
  created_at: string;
}

export interface DishTag {
  id: string;
  family_id: string | null;
  dish_name: string;
  tags: string[];
  cuisine: string | null;
  base_protein: string | null;
  meal_category: string | null;
  is_indulgent: boolean;
  is_millet: boolean;
  has_eggs: boolean;
  updated_at: string;
}

export interface DishVariation {
  name: string;
  tags: string[];
  notes?: string;
}

export interface QuickLog {
  id: string;
  family_id: string;
  member_id: string | null;
  raw_text: string;
  parsed_kind:
    | "finish_rate"
    | "context"
    | "request"
    | "pantry"
    | "note"
    | null;
  parsed_payload: Record<string, unknown> | null;
  applied: boolean;
  created_at: string;
}

export const REFRESH_REASONS: { tag: RefreshReason; label: string }[] = [
  { tag: "similar", label: "Too similar to recent meals" },
  { tag: "lighter", label: "Want something lighter" },
  { tag: "mood", label: "Just not in the mood" },
  { tag: "no_ingredient", label: "Ingredient not available" },
  { tag: "fasting", label: "Someone is fasting" },
  { tag: "no_time", label: "Need something quicker" },
  { tag: "other", label: "Other" },
];

export const FINISH_RATE_OPTIONS: { value: FinishRate; label: string; emoji: string }[] =
  [
    { value: "loved", label: "Loved it", emoji: "🤩" },
    { value: "ate_all", label: "Ate everything", emoji: "✅" },
    { value: "ate_some", label: "Ate some", emoji: "🍽️" },
    { value: "refused", label: "Didn't eat", emoji: "🙅" },
    { value: "ordered_out", label: "Ordered out instead", emoji: "📦" },
    { value: "skipped", label: "Skipped this meal", emoji: "⏭️" },
  ];
