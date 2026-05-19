export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { sendPushToAll } from "@/lib/web-push";
import { verifyApiKey, getTomorrowIST } from "@/lib/helpers";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("meal_plans")
    .upsert(
      {
        family_id: familyId,
        date: body.date,
        day: body.day,
        plan_data: body.plan_data,
        dinner_options: body.dinner_options || [],
        status: body.dinner_options?.length > 0 ? "voting_open" : "finalized",
      },
      { onConflict: "family_id,date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send push notifications
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("family_id", familyId);

  if (subs && subs.length > 0) {
    await sendPushToAll(subs, {
      title: "Hum Paanch - Meal Plan Ready!",
      body: `${body.day}'s meal plan is here. Tap to view & vote!`,
      url: "/",
    });
  }

  return NextResponse.json({ success: true, data });
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const date = request.nextUrl.searchParams.get("date") || getTomorrowIST();

  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("family_id", familyId)
    .eq("date", date)
    .single();

  if (error) {
    return NextResponse.json({ error: "No plan found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
