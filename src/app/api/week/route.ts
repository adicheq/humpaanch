export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";
import { scoreDiversity } from "@/lib/diversity";

function startOfWeekIST(d: Date): Date {
  // Monday-start week
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // Mon=0
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  return out;
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const startParam = request.nextUrl.searchParams.get("start");
  const start = startParam ? new Date(startParam + "T12:00:00") : startOfWeekIST(new Date());
  const days: { date: string; day: string }[] = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: fmt(d), day: dayNames[d.getDay()] });
  }

  const dateList = days.map((d) => d.date);
  const { data: plans } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("family_id", familyId)
    .in("date", dateList);

  const plansByDate: Record<string, unknown> = {};
  for (const p of plans || []) plansByDate[p.date] = p;

  // contexts active anywhere in this week
  const weekStart = days[0].date;
  const weekEnd = days[6].date;
  const { data: contexts } = await supabase
    .from("meal_contexts")
    .select("*")
    .eq("family_id", familyId)
    .eq("active", true)
    .lte("date_start", weekEnd)
    .gte("date_end", weekStart);

  // diversity over the week
  const diversity = scoreDiversity((plans || []).map((p) => ({
    date: p.date,
    day: p.day,
    plan_data: p.plan_data,
  })));

  return NextResponse.json({
    week_start: weekStart,
    week_end: weekEnd,
    days: days.map((d) => ({
      ...d,
      plan: plansByDate[d.date] || null,
      contexts: (contexts || []).filter((c) => c.date_start <= d.date && c.date_end >= d.date),
    })),
    diversity,
  });
}
