export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";
import { classifyDish } from "@/lib/diversity";

// Per-member variety scoring. Default focus: Kamini's dinners.
export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const memberId = request.nextUrl.searchParams.get("member_id") || "kamini";
  const slot = request.nextUrl.searchParams.get("slot") || "dinner";
  const days = parseInt(request.nextUrl.searchParams.get("days") || "7", 10);

  const { data: plans } = await supabase
    .from("meal_plans")
    .select("date, day, plan_data")
    .eq("family_id", familyId)
    .order("date", { ascending: false })
    .limit(days);

  const recent: { date: string; day: string; dish: string; tags: string[] }[] = [];
  for (const p of plans || []) {
    const slotData = p.plan_data?.[slot];
    if (!slotData) continue;
    let dish: string | null = null;
    if (typeof slotData === "string") dish = slotData;
    else if (slotData[memberId]) dish = slotData[memberId];
    else if (slotData.default) dish = slotData.default;
    if (!dish) continue;
    const c = classifyDish(dish);
    recent.push({
      date: p.date,
      day: p.day,
      dish,
      tags: [c.cuisine, ...(c.protein ? [c.protein] : []), ...c.categories],
    });
  }

  // Variety score: (# unique cuisine+category combos) / (# meals)
  const seen = new Set<string>();
  for (const r of recent) {
    const c = classifyDish(r.dish);
    seen.add(`${c.cuisine}/${c.categories.join(",")}`);
  }
  const variety_score = recent.length === 0 ? 0 : seen.size / recent.length;

  // Detect runs of same category
  const runs: { tag: string; count: number }[] = [];
  let currentRun: { tag: string; count: number } | null = null;
  for (const r of recent) {
    const sig = classifyDish(r.dish).categories[0] || "none";
    if (currentRun && currentRun.tag === sig) {
      currentRun.count += 1;
    } else {
      if (currentRun) runs.push(currentRun);
      currentRun = { tag: sig, count: 1 };
    }
  }
  if (currentRun) runs.push(currentRun);
  const longestRun = runs.reduce((m, r) => (r.count > m.count ? r : m), { tag: "", count: 0 });

  return NextResponse.json({
    member_id: memberId,
    slot,
    window_days: days,
    meals_analyzed: recent.length,
    variety_score: Math.round(variety_score * 100) / 100,
    recent,
    longest_run: longestRun,
    summary: longestRun.count >= 3
      ? `${longestRun.count} ${slot}s in a row were ${longestRun.tag} — push for variety.`
      : `Variety looks healthy.`,
  });
}
