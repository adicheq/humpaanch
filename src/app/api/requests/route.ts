export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  const { member_id, message, expires_at } = await request.json();
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("requests")
    .insert({ family_id: familyId, member_id, message, active: true, expires_at: expires_at || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET() {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("family_id", familyId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { error } = await supabase
    .from("requests")
    .update({ active: false })
    .eq("id", id)
    .eq("family_id", familyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
