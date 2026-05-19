export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";
import { scoreDiversity, diversityHint } from "@/lib/diversity";
import { sendPushToAll } from "@/lib/web-push";

interface RefreshBody {
  date: string;
  meal_slot: "breakfast" | "lunch" | "dinner" | "lunchbox_nyra";
  member_scope?: string; // 'all' | 'kamini' | 'nyra' | 'default'
  reason_tag?: string;
  reason_note?: string;
  triggered_by?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RefreshBody;
  const { date, meal_slot, member_scope = "default", reason_tag, reason_note, triggered_by } = body;

  if (!date || !meal_slot) {
    return NextResponse.json({ error: "date and meal_slot are required" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  // 1) Load current plan
  const { data: plan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("family_id", familyId)
    .eq("date", date)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "No plan found for this date" }, { status: 404 });
  }

  const planData = plan.plan_data || {};

  // 2) Capture old value
  let oldValue = "";
  if (meal_slot === "lunchbox_nyra") {
    oldValue = planData.lunchbox_nyra || "";
  } else if (member_scope === "all" || member_scope === "default") {
    oldValue = planData[meal_slot]?.default || "";
  } else {
    oldValue = planData[meal_slot]?.[member_scope] || planData[meal_slot]?.default || "";
  }

  // 3) Pull context for prompt
  const [historyRes, tastesRes, contextsRes, pantryRes, finishRes] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("date, day, plan_data")
      .eq("family_id", familyId)
      .order("date", { ascending: false })
      .limit(7),
    supabase.from("member_tastes").select("*").eq("family_id", familyId),
    supabase
      .from("meal_contexts")
      .select("*")
      .eq("family_id", familyId)
      .eq("active", true)
      .lte("date_start", date)
      .gte("date_end", date),
    supabase
      .from("pantry_items")
      .select("name, status")
      .eq("family_id", familyId)
      .in("status", ["low", "out"]),
    supabase
      .from("meal_finish_log")
      .select("member_id, meal_slot, finish_rate, dish_name")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const recentPlans = historyRes.data || [];
  const tastes = tastesRes.data || [];
  const contexts = contextsRes.data || [];
  const lowOrOut = pantryRes.data || [];
  const finishes = finishRes.data || [];

  const diversity = scoreDiversity(recentPlans, ["default", "kamini", "nyra"]);

  const tastesByMember: Record<string, Record<string, string[]>> = {};
  for (const t of tastes) {
    if (!tastesByMember[t.member_id]) tastesByMember[t.member_id] = {};
    tastesByMember[t.member_id][t.category] = t.items;
  }

  const refusedDishes = finishes
    .filter((f) => f.finish_rate === "refused" || f.finish_rate === "ate_some")
    .map((f) => `${f.member_id} didn't finish ${f.dish_name || "?"}`);

  const lovedDishes = finishes
    .filter((f) => f.finish_rate === "loved")
    .map((f) => `${f.member_id} loved ${f.dish_name || "?"}`);

  // 4) Build prompt for slot-only generation
  const slotLabel =
    meal_slot === "lunchbox_nyra"
      ? "Nyra's school lunch box"
      : `${meal_slot} for ${member_scope === "default" || member_scope === "all" ? "everyone (Riya/Arth/Aditya)" : member_scope}`;

  const prompt = `You are the Hum Paanch (Soni Family) meal planner. The family has rejected the current pick for ${slotLabel} on ${plan.day} ${date} and asked for a refresh.

## Current pick (REJECTED — propose something genuinely different):
"${oldValue}"

## Reason for refresh:
- Tag: ${reason_tag || "not specified"}
- Note: ${reason_note || "—"}

## Family quick-reference:
- Kamini (42): pure veg, NO eggs, health-conscious. Dinner before 7 PM, prefers SOMETHING DIFFERENT FROM SABZI-ROTI (soups, salads, bowls, wraps, dosa, thepla).
- Riya (28): veg + eggs. Loves eggs at breakfast. Comes home 8:30 PM hungry.
- Arth (30): veg + eggs. Easy.
- Aditya (42): veg + eggs. NO karela/lauki/tori/parval/tinda. Loves south indian.
- Nyra (8): VERY finicky. ONLY: aloo, bhindi, roti, fruits, milk, cereals, french fries, paratha, pasta. NO dal, NO chawal.

## Active context for ${date}:
${contexts.map((c) => `- [${c.type}] ${c.member_id || "family"}: ${c.note || ""}`).join("\n") || "None"}

## Pantry items LOW or OUT (avoid using):
${lowOrOut.map((p) => `- ${p.name} (${p.status})`).join("\n") || "All staples in stock"}

## Recent eating feedback (use this!):
Loved: ${lovedDishes.slice(0, 5).join("; ") || "—"}
Refused / didn't finish: ${refusedDishes.slice(0, 5).join("; ") || "—"}

## Diversity report (last ${diversity.total_meals_analyzed} meals analyzed):
${diversityHint(diversity) || "balanced so far"}

## Recent meal history (DO NOT repeat any of these):
${recentPlans
  .map((p) => {
    const pd = p.plan_data;
    const b = pd.breakfast?.default || "?";
    const l = pd.lunch?.default || "?";
    const d = pd.dinner?.default || "?";
    return `${p.day} ${p.date}: B=${b} | L=${l} | D=${d}`;
  })
  .join("\n") || "None"}

## Taste profiles:
${JSON.stringify(tastesByMember, null, 2)}

## Your task:
Propose ONE single replacement for ${slotLabel}. It must:
1. Be DIFFERENT from the rejected pick AND from anything in recent history.
2. Fit the reason tag.
3. Avoid pantry-out ingredients.
4. Honor refused-dish patterns.
5. Push toward an UNDERUSED tag from diversity report when possible.

Reply with ONLY a JSON object:
{
  "value": "the new dish description, single line",
  "rationale": "1 sentence why this fits"
}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  let parsed: { value?: string; rationale?: string } = {};
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  } catch {
    return NextResponse.json({ error: "Failed to parse Claude response", raw: text }, { status: 500 });
  }

  const newValue = parsed.value;
  if (!newValue) {
    return NextResponse.json({ error: "Claude did not propose a value", raw: text }, { status: 500 });
  }

  // 5) Apply update
  const updated = { ...planData };
  if (meal_slot === "lunchbox_nyra") {
    updated.lunchbox_nyra = newValue;
  } else {
    if (!updated[meal_slot] || typeof updated[meal_slot] !== "object") {
      updated[meal_slot] = { default: oldValue };
    }
    if (member_scope === "all" || member_scope === "default") {
      updated[meal_slot] = { ...updated[meal_slot], default: newValue };
    } else {
      updated[meal_slot] = { ...updated[meal_slot], [member_scope]: newValue };
    }
  }

  await supabase
    .from("meal_plans")
    .update({ plan_data: updated })
    .eq("family_id", familyId)
    .eq("date", date);

  // 6) Log refresh
  await supabase.from("refresh_log").insert({
    family_id: familyId,
    meal_plan_date: date,
    meal_slot,
    member_scope,
    reason_tag: reason_tag || null,
    reason_note: reason_note || null,
    old_value: oldValue,
    new_value: newValue,
    triggered_by: triggered_by || null,
  });

  // 7) Push notify
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("family_id", familyId);
  if (subs && subs.length > 0) {
    await sendPushToAll(subs, {
      title: "Meal refreshed",
      body: `${meal_slot} updated → ${newValue.slice(0, 60)}`,
      url: "/",
    });
  }

  return NextResponse.json({
    success: true,
    new_value: newValue,
    rationale: parsed.rationale || "",
    old_value: oldValue,
  });
}
