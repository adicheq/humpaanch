export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

// POST /api/auth - Login with PIN or Setup PIN
// body: { member_id, pin, action: "login" | "setup" | "check" }
export async function POST(request: NextRequest) {
  const { member_id, pin, action } = await request.json();
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();

  if (action === "check") {
    // Check if a member has a PIN set
    const { data } = await supabase
      .from("member_pins")
      .select("member_id")
      .eq("family_id", familyId)
      .eq("member_id", member_id)
      .single();

    return NextResponse.json({ has_pin: !!data });
  }

  if (action === "setup") {
    // Set a new PIN (only if none exists)
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    // Check if PIN already exists
    const { data: existing } = await supabase
      .from("member_pins")
      .select("member_id")
      .eq("family_id", familyId)
      .eq("member_id", member_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "PIN already set. Contact admin to reset." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("member_pins")
      .insert({ family_id: familyId, member_id, pin });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "login") {
    // Verify PIN
    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { error: "PIN must be 4 digits" },
        { status: 400 }
      );
    }

    const { data } = await supabase
      .from("member_pins")
      .select("pin")
      .eq("family_id", familyId)
      .eq("member_id", member_id)
      .single();

    if (!data) {
      return NextResponse.json(
        { error: "No PIN set for this member" },
        { status: 404 }
      );
    }

    if (data.pin !== pin) {
      return NextResponse.json(
        { error: "Incorrect PIN" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
