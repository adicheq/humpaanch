export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { isVotingOpen, getTomorrowIST } from "@/lib/helpers";

export async function POST(request: NextRequest) {
  if (!isVotingOpen()) {
    return NextResponse.json(
      { error: "Voting closed at 5:20 PM" },
      { status: 400 }
    );
  }

  const { member_id, option_index, date } = await request.json();
  const supabase = getServiceClient();
  const mealDate = date || getTomorrowIST();

  const { data, error } = await supabase
    .from("votes")
    .upsert(
      { meal_plan_date: mealDate, member_id, option_index },
      { onConflict: "meal_plan_date,member_id" }
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
    .from("votes")
    .select("*")
    .eq("meal_plan_date", date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
