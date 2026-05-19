export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, meal_slot, member_scope, value } = body;
  if (!date || !meal_slot || !value) {
    return NextResponse.json({ error: "date, meal_slot, value required" }, { status: 400 });
  }
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const { data, error } = await supabase
    .from("plan_locks")
    .upsert(
      {
        family_id: familyId,
        date,
        meal_slot,
        member_scope: member_scope || "default",
        value,
      },
      { onConflict: "family_id,date,meal_slot,member_scope" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const date = request.nextUrl.searchParams.get("date");
  let q = supabase.from("plan_locks").select("*").eq("family_id", familyId);
  if (date) q = q.eq("date", date);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const { error } = await supabase
    .from("plan_locks")
    .delete()
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
