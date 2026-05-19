export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date_start, date_end, member_id, type, note } = body;
  if (!date_start || !date_end || !type) {
    return NextResponse.json({ error: "date_start, date_end and type required" }, { status: 400 });
  }
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const { data, error } = await supabase
    .from("meal_contexts")
    .insert({
      family_id: familyId,
      date_start,
      date_end,
      member_id: member_id || null,
      type,
      note: note || null,
      active: true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const date = request.nextUrl.searchParams.get("date");

  let q = supabase.from("meal_contexts").select("*").eq("family_id", familyId).eq("active", true);
  if (date) {
    q = q.lte("date_start", date).gte("date_end", date);
  }
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function DELETE(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase
    .from("meal_contexts")
    .update({ active: false })
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
