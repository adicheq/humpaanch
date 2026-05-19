export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getTomorrowIST } from "@/lib/helpers";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  const { meal_plan_date, meal_slot, member_id, reaction, comment, agrees_with } =
    await request.json();
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  if (reaction === "agree" && agrees_with) {
    // Insert an agreement - no upsert, each member can agree once
    const { data: existing } = await supabase
      .from("meal_reactions")
      .select("id")
      .eq("family_id", familyId)
      .eq("meal_plan_date", meal_plan_date)
      .eq("meal_slot", meal_slot)
      .eq("member_id", member_id)
      .eq("reaction", "agree")
      .eq("agrees_with", agrees_with);

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "Already agreed" });
    }

    const { data, error } = await supabase
      .from("meal_reactions")
      .insert({
        family_id: familyId,
        meal_plan_date,
        meal_slot,
        member_id,
        reaction: "agree",
        agrees_with,
        comment,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if 2+ members now agree with this suggestion
    const { data: allAgrees } = await supabase
      .from("meal_reactions")
      .select("member_id")
      .eq("family_id", familyId)
      .eq("agrees_with", agrees_with)
      .eq("reaction", "agree");

    // Get the original suggestion
    const { data: originalSuggestion } = await supabase
      .from("meal_reactions")
      .select("*")
      .eq("id", agrees_with)
      .single();

    // Count: original suggester + agreers = total supporters
    const supporters = new Set<string>();
    if (originalSuggestion) supporters.add(originalSuggestion.member_id);
    if (allAgrees) allAgrees.forEach((a) => supporters.add(a.member_id));

    if (supporters.size >= 2 && originalSuggestion?.comment) {
      // Auto-update the meal plan!
      const { data: plan } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("family_id", familyId)
        .eq("date", meal_plan_date)
        .single();

      if (plan) {
        const planData = { ...plan.plan_data };
        const slot = meal_slot; // e.g. "breakfast", "lunch", "dinner"

        // Update the default value for this meal slot
        if (planData[slot] && typeof planData[slot] === "object") {
          planData[slot] = { ...planData[slot], default: originalSuggestion.comment };
        }

        await supabase
          .from("meal_plans")
          .update({ plan_data: planData })
          .eq("family_id", familyId)
          .eq("date", meal_plan_date);

        // Mark the suggestion as accepted
        await supabase
          .from("meal_reactions")
          .update({ reaction: "accepted" })
          .eq("id", agrees_with);

        return NextResponse.json({
          ...data,
          plan_updated: true,
          new_value: originalSuggestion.comment,
        });
      }
    }

    return NextResponse.json(data);
  }

  // Regular ok or suggest_change reaction - upsert by member+slot+date+reaction_type
  if (reaction === "ok") {
    // Delete any previous suggest_change by this member for this slot
    // Then upsert the ok
    const { data: existing } = await supabase
      .from("meal_reactions")
      .select("id")
      .eq("family_id", familyId)
      .eq("meal_plan_date", meal_plan_date)
      .eq("meal_slot", meal_slot)
      .eq("member_id", member_id)
      .in("reaction", ["ok", "suggest_change"]);

    if (existing && existing.length > 0) {
      await supabase
        .from("meal_reactions")
        .delete()
        .in("id", existing.map((e) => e.id));
    }
  }

  if (reaction === "suggest_change") {
    // Delete any previous ok/suggest by this member for this slot
    const { data: existing } = await supabase
      .from("meal_reactions")
      .select("id")
      .eq("family_id", familyId)
      .eq("meal_plan_date", meal_plan_date)
      .eq("meal_slot", meal_slot)
      .eq("member_id", member_id)
      .in("reaction", ["ok", "suggest_change"]);

    if (existing && existing.length > 0) {
      await supabase
        .from("meal_reactions")
        .delete()
        .in("id", existing.map((e) => e.id));
    }
  }

  const { data, error } = await supabase
    .from("meal_reactions")
    .insert({ family_id: familyId, meal_plan_date, meal_slot, member_id, reaction, comment })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const date = request.nextUrl.searchParams.get("date") || getTomorrowIST();

  const { data, error } = await supabase
    .from("meal_reactions")
    .select("*")
    .eq("family_id", familyId)
    .eq("meal_plan_date", date)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
