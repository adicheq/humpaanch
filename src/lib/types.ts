export type MemberId = "kamini" | "riya" | "arth" | "aditya";

export interface Member {
  id: MemberId;
  name: string;
  emoji: string;
  color: string;
}

export const MEMBERS: Member[] = [
  { id: "kamini", name: "Kamini", emoji: "K", color: "bg-pink-500" },
  { id: "riya", name: "Riya", emoji: "R", color: "bg-purple-500" },
  { id: "arth", name: "Arth", emoji: "A", color: "bg-blue-500" },
  { id: "aditya", name: "Aditya", emoji: "Ad", color: "bg-green-500" },
];

export interface MealSlotData {
  default: string;
  kamini?: string;
  riya?: string;
  arth?: string;
  aditya?: string;
  nyra?: string;
}

export interface MealPlanData {
  // New format
  breakfast: MealSlotData;
  lunchbox_nyra?: string;
  lunch: MealSlotData;
  dinner: MealSlotData;
  dinner_time_kamini?: string;
  dinner_time_nyra?: string;
  dinner_time_others?: string;
  need_to_buy?: string;

  // Legacy fields (old format - kept for backward compat)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface MealPlan {
  id: string;
  date: string;
  day: string;
  plan_data: MealPlanData;
  dinner_options: string[];
  winning_option: string | null;
  status: "voting_open" | "finalized";
  created_at: string;
}

export type MealSlotKey =
  | "breakfast"
  | "lunchbox"
  | "lunch"
  | "dinner"
  | "dinner_kamini"
  | "dinner_nyra"
  | "dinner_others";

export interface MealReaction {
  id: string;
  meal_plan_date: string;
  meal_slot: MealSlotKey;
  member_id: MemberId;
  reaction: "ok" | "suggest_change" | "agree" | "accepted";
  comment: string | null;
  agrees_with: string | null;
  created_at: string;
}

export interface Vote {
  id: string;
  meal_plan_date: string;
  member_id: MemberId;
  option_index: number;
  created_at: string;
}

export interface Request {
  id: string;
  member_id: MemberId;
  message: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

export type TasteCategory =
  | "loves"
  | "dislikes"
  | "restrictions"
  | "breakfast_pref"
  | "dinner_pref"
  | "notes";

export interface MemberTaste {
  id: string;
  member_id: MemberId;
  category: TasteCategory;
  items: string[];
  updated_at: string;
}

export interface PushSubscription {
  id: string;
  member_id: MemberId;
  subscription: PushSubscriptionJSON;
  created_at: string;
}
