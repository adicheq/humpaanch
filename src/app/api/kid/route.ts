export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

// Returns a kid's stats: badges + dish finish-rate aggregations.
export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const memberId = request.nextUrl.searchParams.get("member_id") || "nyra";

  const [badgesRes, finishesRes] = await Promise.all([
    supabase
      .from("kid_badges")
      .select("*")
      .eq("family_id", familyId)
      .eq("member_id", memberId)
      .order("earned_at", { ascending: false }),
    supabase
      .from("meal_finish_log")
      .select("dish_name, finish_rate, meal_plan_date")
      .eq("family_id", familyId)
      .eq("member_id", memberId)
      .not("dish_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const badges = badgesRes.data || [];
  const finishes = finishesRes.data || [];

  // Aggregate per dish
  type Bucket = { total: number; loved: number; ate_all: number; ate_some: number; refused: number };
  const perDish: Record<string, Bucket> = {};
  for (const f of finishes) {
    const name = (f.dish_name || "").trim();
    if (!name) continue;
    if (!perDish[name]) perDish[name] = { total: 0, loved: 0, ate_all: 0, ate_some: 0, refused: 0 };
    perDish[name].total += 1;
    if (f.finish_rate === "loved") perDish[name].loved += 1;
    else if (f.finish_rate === "ate_all") perDish[name].ate_all += 1;
    else if (f.finish_rate === "ate_some") perDish[name].ate_some += 1;
    else if (f.finish_rate === "refused") perDish[name].refused += 1;
  }

  const ranked = Object.entries(perDish)
    .map(([name, b]) => ({
      dish: name,
      total: b.total,
      loved: b.loved,
      ate_all: b.ate_all,
      ate_some: b.ate_some,
      refused: b.refused,
      finish_score: b.total > 0 ? (b.loved * 1.0 + b.ate_all * 0.8 + b.ate_some * 0.4) / b.total : 0,
    }))
    .sort((a, b) => b.finish_score - a.finish_score);

  const winners = ranked.slice(0, 5);
  const losers = ranked
    .filter((d) => d.finish_score < 0.4 && d.total >= 2)
    .slice(0, 5);

  // Streak: how many CONSECUTIVE days the kid finished SOMETHING
  const sortedFinishes = [...finishes].sort((a, b) =>
    a.meal_plan_date < b.meal_plan_date ? 1 : -1
  );
  let streak = 0;
  let lastDate: string | null = null;
  for (const f of sortedFinishes) {
    if (f.finish_rate === "loved" || f.finish_rate === "ate_all") {
      if (lastDate === null) {
        streak = 1;
        lastDate = f.meal_plan_date;
      } else {
        const prev = new Date(lastDate + "T12:00:00");
        const cur = new Date(f.meal_plan_date + "T12:00:00");
        const diff = Math.round((prev.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          streak += 1;
          lastDate = f.meal_plan_date;
        } else if (diff === 0) {
          // same day, no change
        } else {
          break;
        }
      }
    }
  }

  return NextResponse.json({
    member_id: memberId,
    badges,
    badge_count: badges.length,
    streak,
    winners,
    losers,
    total_logs: finishes.length,
  });
}
