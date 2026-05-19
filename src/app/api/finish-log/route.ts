export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meal_plan_date, meal_slot, member_id, finish_rate, dish_name, comment } = body;

  if (!meal_plan_date || !meal_slot || !member_id || !finish_rate) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("meal_finish_log")
    .upsert(
      {
        family_id: familyId,
        meal_plan_date,
        meal_slot,
        member_id,
        finish_rate,
        dish_name: dish_name || null,
        comment: comment || null,
      },
      { onConflict: "family_id,meal_plan_date,meal_slot,member_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award badge to Nyra if she 'loved' or 'ate_all' something new
  if (member_id === "nyra" && (finish_rate === "loved" || finish_rate === "ate_all") && dish_name) {
    const { data: priorLoved } = await supabase
      .from("meal_finish_log")
      .select("id")
      .eq("family_id", familyId)
      .eq("member_id", "nyra")
      .eq("dish_name", dish_name)
      .in("finish_rate", ["loved", "ate_all"]);

    // First time? award "tried_new"
    if (!priorLoved || priorLoved.length <= 1) {
      await supabase.from("kid_badges").insert({
        family_id: familyId,
        member_id: "nyra",
        badge_key: "tried_new",
        badge_label: "Tried something new!",
        badge_emoji: "✨",
        earned_for: dish_name,
      });
    }
  }

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const date = request.nextUrl.searchParams.get("date");
  const memberId = request.nextUrl.searchParams.get("member_id");
  const dish = request.nextUrl.searchParams.get("dish");

  let q = supabase.from("meal_finish_log").select("*").eq("family_id", familyId);
  if (date) q = q.eq("meal_plan_date", date);
  if (memberId) q = q.eq("member_id", memberId);
  if (dish) q = q.eq("dish_name", dish);

  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
