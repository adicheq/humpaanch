export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";
import { getTodayIST } from "@/lib/helpers";

interface PrepItem {
  time_label: string;
  for_who: string;
  dish: string;
  prep_starts: string;
  notes?: string;
}

// Render a cook-friendly view with timing for each meal slot.
export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const date = request.nextUrl.searchParams.get("date") || getTodayIST();

  const { data: plan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("family_id", familyId)
    .eq("date", date)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "No plan for this date" }, { status: 404 });
  }

  const pd = plan.plan_data || {};

  const items: PrepItem[] = [];

  // Breakfast — Nyra at 7:45, others 8:30
  if (pd.breakfast?.nyra) {
    items.push({
      time_label: "07:45 AM",
      for_who: "Nyra (school)",
      dish: pd.breakfast.nyra,
      prep_starts: "07:30 AM",
    });
  }
  if (pd.breakfast?.default) {
    items.push({
      time_label: "08:30 AM",
      for_who: "Riya, Arth, Aditya",
      dish: pd.breakfast.default,
      prep_starts: "08:00 AM",
    });
  }
  if (pd.breakfast?.kamini && pd.breakfast.kamini !== pd.breakfast?.default) {
    items.push({
      time_label: "08:00 AM",
      for_who: "Kamini",
      dish: pd.breakfast.kamini,
      prep_starts: "07:45 AM",
    });
  }

  // Lunchbox Nyra
  if (pd.lunchbox_nyra) {
    items.push({
      time_label: "07:30 AM",
      for_who: "Nyra (lunch box)",
      dish: pd.lunchbox_nyra,
      prep_starts: "07:00 AM",
      notes: "Pack into lunch box",
    });
  }

  // Lunch
  if (pd.lunch?.default) {
    items.push({
      time_label: "01:00 PM",
      for_who: "Family lunch",
      dish: pd.lunch.default,
      prep_starts: "12:00 PM",
    });
  }
  if (pd.lunch?.nyra && pd.lunch.nyra !== pd.lunch?.default) {
    items.push({
      time_label: "12:30 PM",
      for_who: "Nyra (separate)",
      dish: pd.lunch.nyra,
      prep_starts: "12:15 PM",
    });
  }

  // Dinners — staggered
  if (pd.dinner?.kamini && pd.dinner.kamini !== pd.dinner?.default) {
    items.push({
      time_label: pd.dinner_time_kamini || "07:00 PM",
      for_who: "Kamini",
      dish: pd.dinner.kamini,
      prep_starts: "06:30 PM",
    });
  }
  if (pd.dinner?.nyra && pd.dinner.nyra !== pd.dinner?.default) {
    items.push({
      time_label: pd.dinner_time_nyra || "07:30 PM",
      for_who: "Nyra",
      dish: pd.dinner.nyra,
      prep_starts: "07:00 PM",
    });
  }
  if (pd.dinner?.default) {
    items.push({
      time_label: pd.dinner_time_others || "08:30 PM",
      for_who: "Riya, Arth, Aditya",
      dish: pd.dinner.default,
      prep_starts: "08:00 PM",
    });
  }

  // Aggregate prep list (rough — extracted from dish names)
  const ingredients = new Set<string>();
  for (const it of items) {
    const lc = it.dish.toLowerCase();
    const candidates = [
      "paneer", "bhindi", "aloo", "palak", "matar", "gobhi", "rajma", "chole",
      "egg", "anda", "paratha", "dal", "rice", "atta", "milk", "curd", "mushroom",
      "onion", "tomato", "lemon", "ginger", "garlic", "coriander", "pav", "bread",
    ];
    for (const c of candidates) if (lc.includes(c)) ingredients.add(c);
  }

  return NextResponse.json({
    date,
    day: plan.day,
    items,
    ingredient_checklist: Array.from(ingredients).sort(),
    need_to_buy: pd.need_to_buy || null,
  });
}
