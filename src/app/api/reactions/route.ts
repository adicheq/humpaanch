export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getTomorrowIST } from "@/lib/helpers";

export async function POST(request: NextRequest) {
  const { meal_plan_date, meal_slot, member_id, reaction, comment } =
    await request.json();
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("meal_reactions")
    .upsert(
      { meal_plan_date, meal_slot, member_id, reaction, comment },
      { onConflict: "meal_plan_date,meal_slot,member_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const date = request.nextUrl.searchParams.get("date") || getTomorrowIST();

  const { data, error } = await supabase
    .from("meal_reactions")
    .select("*")
    .eq("meal_plan_date", date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
