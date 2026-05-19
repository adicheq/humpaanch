export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

// Auto-generate a grocery list:
//   1) all pantry items currently 'low' or 'out'
//   2) plus any "need_to_buy" entries from upcoming + past 2 plans
export async function GET() {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const today = new Date().toISOString().split("T")[0];

  const [pantryRes, plansRes] = await Promise.all([
    supabase
      .from("pantry_items")
      .select("name, category, status")
      .eq("family_id", familyId)
      .in("status", ["low", "out"]),
    supabase
      .from("meal_plans")
      .select("date, plan_data")
      .eq("family_id", familyId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(7),
  ]);

  const pantryItems = pantryRes.data || [];
  const upcomingPlans = plansRes.data || [];

  const needToBuy: { source: string; items: string[] }[] = [];
  for (const p of upcomingPlans) {
    const ntb = p.plan_data?.need_to_buy;
    if (ntb && typeof ntb === "string" && ntb.trim()) {
      needToBuy.push({
        source: p.date,
        items: ntb.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean),
      });
    }
  }

  return NextResponse.json({
    pantry_low_or_out: pantryItems,
    need_to_buy_from_plans: needToBuy,
    generated_at: new Date().toISOString(),
  });
}
