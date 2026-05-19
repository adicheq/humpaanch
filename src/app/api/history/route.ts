export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getTodayIST } from "@/lib/helpers";
import { getDefaultFamilyId } from "@/lib/family";

export async function GET(request: NextRequest) {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "7");
  const today = getTodayIST();

  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("family_id", familyId)
    .lte("date", today)
    .order("date", { ascending: false })
    .range(offset, offset + limit); // fetch limit+1 to check hasMore

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const plans = data || [];
  const hasMore = plans.length > limit;
  const trimmed = hasMore ? plans.slice(0, limit) : plans;

  return NextResponse.json({ plans: trimmed, hasMore });
}
