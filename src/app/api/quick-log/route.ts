export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase";
import { getDefaultFamilyId } from "@/lib/family";
import { getTodayIST } from "@/lib/helpers";

// POST { text, member_id? } → parse with Claude, route to:
//   - finish_rate → meal_finish_log
//   - context    → meal_contexts
//   - request    → requests
//   - pantry     → pantry_items
//   - note       → just stored raw

interface Parsed {
  kind: "finish_rate" | "context" | "request" | "pantry" | "note";
  payload: Record<string, unknown>;
  summary: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, member_id } = body;
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const today = getTodayIST();

  let parsed: Parsed = { kind: "note", payload: { text }, summary: text };

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const sys = `You are a router for a family meal app. Given a single short message, decide which action to take.

Possible kinds:
1. "finish_rate" — about whether someone ate a meal. Examples: "Nyra didn't eat dinner", "we loved the pav bhaji", "ordered pizza instead of dinner".
   payload: { meal_plan_date (YYYY-MM-DD, default today=${today}), meal_slot (breakfast|lunch|dinner|lunchbox), member_id, finish_rate (loved|ate_all|ate_some|refused|ordered_out|skipped), dish_name? }
2. "context" — travel/guests/fasting/exam/going_out. Examples: "Aditya travelling Mon-Wed", "guests for dinner Saturday", "Riya fasting tomorrow".
   payload: { date_start, date_end, member_id?, type, note }
3. "request" — a meal wish. Example: "I want pav bhaji this week".
   payload: { member_id, message }
4. "pantry" — out/low/restocked items. Example: "we're out of paneer", "bought eggs".
   payload: { name, status (in_stock|low|out) }
5. "note" — anything else.
   payload: { text }

Return ONLY one JSON object: {"kind": "...", "payload": {...}, "summary": "human-readable"}`;
      const m = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: sys,
        messages: [
          {
            role: "user",
            content: `Member who logged: ${member_id || "unknown"}\nMessage: "${text}"`,
          },
        ],
      });
      const out = m.content[0].type === "text" ? m.content[0].text : "";
      const match = out.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (err) {
      console.warn("quick-log parse failed", err);
    }
  }

  // Apply
  let applied = false;
  let appliedRecord: unknown = null;

  if (parsed.kind === "finish_rate") {
    const p = parsed.payload as {
      meal_plan_date?: string;
      meal_slot?: string;
      member_id?: string;
      finish_rate?: string;
      dish_name?: string;
    };
    if (p.meal_slot && p.member_id && p.finish_rate) {
      const { data, error } = await supabase
        .from("meal_finish_log")
        .upsert(
          {
            family_id: familyId,
            meal_plan_date: p.meal_plan_date || today,
            meal_slot: p.meal_slot,
            member_id: p.member_id,
            finish_rate: p.finish_rate,
            dish_name: p.dish_name || null,
            comment: text,
          },
          { onConflict: "family_id,meal_plan_date,meal_slot,member_id" }
        )
        .select()
        .single();
      if (!error) {
        applied = true;
        appliedRecord = data;
      }
    }
  } else if (parsed.kind === "context") {
    const p = parsed.payload as {
      date_start?: string;
      date_end?: string;
      member_id?: string;
      type?: string;
      note?: string;
    };
    if (p.date_start && p.date_end && p.type) {
      const { data, error } = await supabase
        .from("meal_contexts")
        .insert({
          family_id: familyId,
          date_start: p.date_start,
          date_end: p.date_end,
          member_id: p.member_id || null,
          type: p.type,
          note: p.note || text,
          active: true,
        })
        .select()
        .single();
      if (!error) {
        applied = true;
        appliedRecord = data;
      }
    }
  } else if (parsed.kind === "request") {
    const p = parsed.payload as { member_id?: string; message?: string };
    if (p.member_id && p.message) {
      const { data, error } = await supabase
        .from("requests")
        .insert({
          family_id: familyId,
          member_id: p.member_id,
          message: p.message,
          active: true,
        })
        .select()
        .single();
      if (!error) {
        applied = true;
        appliedRecord = data;
      }
    }
  } else if (parsed.kind === "pantry") {
    const p = parsed.payload as { name?: string; status?: string };
    if (p.name && p.status) {
      const { data, error } = await supabase
        .from("pantry_items")
        .upsert(
          {
            family_id: familyId,
            name: p.name.toLowerCase(),
            status: p.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "family_id,name" }
        )
        .select()
        .single();
      if (!error) {
        applied = true;
        appliedRecord = data;
      }
    }
  }

  // Always store the raw log
  await supabase.from("quick_logs").insert({
    family_id: familyId,
    member_id: member_id || null,
    raw_text: text,
    parsed_kind: parsed.kind,
    parsed_payload: parsed.payload,
    applied,
  });

  return NextResponse.json({
    success: true,
    parsed,
    applied,
    record: appliedRecord,
  });
}

export async function GET() {
  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const { data, error } = await supabase
    .from("quick_logs")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
