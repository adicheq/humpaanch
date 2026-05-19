export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";

export async function GET() {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const { data, error } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("family_id", familyId)
    .order("category")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, category, status, notes } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const { data, error } = await supabase
    .from("pantry_items")
    .upsert(
      {
        family_id: familyId,
        name: name.trim().toLowerCase(),
        category: category || null,
        status: status || "in_stock",
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "family_id,name" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) update.status = status;
  if (notes !== undefined) update.notes = notes;
  const { data, error } = await supabase
    .from("pantry_items")
    .update(update)
    .eq("id", id)
    .eq("family_id", familyId)
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
    .from("pantry_items")
    .delete()
    .eq("id", id)
    .eq("family_id", familyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
