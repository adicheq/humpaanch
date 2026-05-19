export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function POST(request: NextRequest) {
  const { member_id, subscription } = await request.json();
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { family_id: familyId, member_id, subscription },
      { onConflict: "family_id,member_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
