export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const memberId = request.nextUrl.searchParams.get("member_id");

  let q = supabase.from("meal_favorites").select("*").eq("family_id", familyId);
  if (memberId) q = q.eq("member_id", memberId);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { member_id, dish_name, meal_slot, source_date } = body;
  if (!member_id || !dish_name || !meal_slot) {
    return NextResponse.json({ error: "member_id, dish_name, meal_slot required" }, { status: 400 });
  }
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("meal_favorites")
    .upsert(
      {
        family_id: familyId,
        member_id,
        dish_name,
        meal_slot,
        source_date: source_date || null,
      },
      { onConflict: "family_id,member_id,dish_name,meal_slot" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { error } = await supabase
    .from("meal_favorites")
    .delete()
    .eq("id", id)
    .eq("family_id", familyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
