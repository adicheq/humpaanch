export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { member_id, badge_key, badge_label, badge_emoji, earned_for } = body;
  if (!member_id || !badge_key || !badge_label) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const { data, error } = await supabase
    .from("kid_badges")
    .insert({
      family_id: familyId,
      member_id,
      badge_key,
      badge_label,
      badge_emoji: badge_emoji || "🏅",
      earned_for: earned_for || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const memberId = request.nextUrl.searchParams.get("member_id");
  let q = supabase.from("kid_badges").select("*").eq("family_id", familyId);
  if (memberId) q = q.eq("member_id", memberId);
  const { data, error } = await q.order("earned_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
