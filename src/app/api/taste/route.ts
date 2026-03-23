export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const memberId = request.nextUrl.searchParams.get("member_id");

  let query = supabase.from("member_tastes").select("*");
  if (memberId) {
    query = query.eq("member_id", memberId);
  }

  const { data, error } = await query.order("member_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { member_id, category, items } = await request.json();
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("member_tastes")
    .upsert(
      { member_id, category, items, updated_at: new Date().toISOString() },
      { onConflict: "member_id,category" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
