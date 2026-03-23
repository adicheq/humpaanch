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

export interface MealPlanData {
  breakfast: { adults: string; kamini?: string; nyra: string };
  lunchbox_nyra: string;
  lunch: { main: string; nyra: string };
  dinner_kamini: string;
  dinner_nyra: string;
  dinner_others: string;
  need_to_buy?: string;
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

export type MealSlot =
  | "breakfast"
  | "lunchbox"
  | "lunch"
  | "dinner_kamini"
  | "dinner_nyra"
  | "dinner_others";

export interface MealReaction {
  id: string;
  meal_plan_date: string;
  meal_slot: MealSlot;
  member_id: MemberId;
  reaction: "ok" | "suggest_change";
  comment: string | null;
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
