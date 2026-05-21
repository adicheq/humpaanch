export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase";
import { getTomorrowIST } from "@/lib/helpers";
import { getDefaultFamilyId } from "@/lib/family";
import { scoreDiversity, diversityHint } from "@/lib/diversity";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return DAYS[d.getDay()];
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const familyId = getDefaultFamilyId();
  const targetDate =
    request.nextUrl.searchParams.get("date") || getTomorrowIST();
  const force = request.nextUrl.searchParams.get("force") === "1";
  const dayName = getDayName(targetDate);
  const isWeekend = dayName === "Saturday" || dayName === "Sunday";

  // Existing plan?
  const { data: existingPlan } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("family_id", familyId)
    .eq("date", targetDate)
    .single();
  if (existingPlan && !force) {
    return NextResponse.json({
      message: `Plan already exists for ${targetDate}`,
      already_exists: true,
    });
  }

  // Pull all V2 context
  const [
    tastesRes,
    historyRes,
    requestsRes,
    reactionsRes,
    contextsRes,
    pantryRes,
    finishRes,
    locksRes,
  ] = await Promise.all([
    supabase.from("member_tastes").select("*").eq("family_id", familyId),
    supabase
      .from("meal_plans")
      .select("date, day, plan_data")
      .eq("family_id", familyId)
      .order("date", { ascending: false })
      .limit(7),
    supabase.from("requests").select("*").eq("family_id", familyId).eq("active", true),
    supabase
      .from("meal_reactions")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("meal_contexts")
      .select("*")
      .eq("family_id", familyId)
      .eq("active", true)
      .lte("date_start", targetDate)
      .gte("date_end", targetDate),
    supabase
      .from("pantry_items")
      .select("name, status")
      .eq("family_id", familyId)
      .in("status", ["low", "out"]),
    supabase
      .from("meal_finish_log")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("plan_locks")
      .select("*")
      .eq("family_id", familyId)
      .eq("date", targetDate),
  ]);

  const tastes = tastesRes.data || [];
  const recentPlans = historyRes.data || [];
  const requests = requestsRes.data || [];
  const recentReactions = reactionsRes.data || [];
  const contexts = contextsRes.data || [];
  const lowOrOut = pantryRes.data || [];
  const finishes = finishRes.data || [];
  const locks = locksRes.data || [];

  // Diversity report
  const diversity = scoreDiversity(recentPlans, ["default", "kamini", "nyra"]);

  const tastesByMember: Record<string, Record<string, string[]>> = {};
  for (const t of tastes) {
    if (!tastesByMember[t.member_id]) tastesByMember[t.member_id] = {};
    tastesByMember[t.member_id][t.category] = t.items;
  }

  const refused = finishes.filter((f) => f.finish_rate === "refused" || f.finish_rate === "ate_some");
  const loved = finishes.filter((f) => f.finish_rate === "loved");

  // Variety hint specifically for Kamini's dinners
  const kaminiRecent = recentPlans
    .map((p) => p.plan_data?.dinner?.kamini || p.plan_data?.dinner?.default)
    .filter(Boolean)
    .slice(0, 5)
    .join(" | ");

  const lockedSlots = locks
    .map((l) => `- ${l.meal_slot} (${l.member_scope}) → MUST be: ${l.value}`)
    .join("\n");

  const prompt = `You are the Hum Paanch (Soni Family) meal planner — V2.
Plan ONE day: ${dayName}, ${targetDate}.

## Family

1. **Kamini** (42, F): pure veg, NO eggs. Health-conscious. Eats onion/garlic/aloo.
   - BREAKFAST ROTATION (pick a DIFFERENT one each day, never repeat 2 days in a row):
     Overnight oats (vary toppings: mango+coconut, apple+cinnamon, banana+peanut butter, fig+honey, berry+chia),
     Smoothie bowl (mango-banana, mixed berry, spinach-banana, papaya),
     Millet dosa + chutney, Ragi porridge + jaggery, Chia pudding + seasonal fruit,
     Sprouts chaat, Thepla + curd + pickle, Quinoa upma, Moong dal chilla + green chutney,
     Besan chilla + mint chutney, Poha + sev + peanuts, Sabudana khichdi,
     Daliya/broken wheat upma, Muesli + yogurt + fruits, Idli + sambhar,
     Jowar dosa + chutney, Bajra roti + garlic chutney, Avocado toast, Fruit bowl + granola + nuts
   - DINNER (before 7 PM, must feel DIFFERENT from lunch — not sabzi-roti):
     Tomato soup + grilled sandwich, Minestrone + bread, Mixed veg soup + paneer tikka,
     Mushroom soup + multigrain toast, Corn soup + grilled veggies, Palak soup + cheese toast,
     Pumpkin soup + seeds + toast, Beetroot soup + toast, Moong dal soup + salad,
     Vegetable stew + appam, Dalia khichdi, Masala oats, Millet khichdi,
     Thepla + yogurt + pickle, Stuffed bell peppers, Vegetable wrap + hummus,
     Buddha bowl (grain + roasted veggies + dressing), Quinoa bowl (vary: Mexican/Mediterranean/Indian),
     Paneer tikka wrap, Dosa + chutney (light dinner), Idli + sambhar (light dinner),
     Veg clear soup + stir-fried veggies + brown rice

2. **Riya** (28, F): veg + eggs. Loves eggs at breakfast (vary: omelette, bhurji, boiled, poached, egg sandwich, egg paratha, shakshuka, anda curry on toast). Comes home 8:30 PM after gym — needs protein-rich, satisfying dinner.

3. **Arth** (30, M): veg + eggs. Easy, eats most things.

4. **Aditya** (42, M): veg + eggs. NO karela, lauki, tori, parval, tinda. Loves South Indian. Suggest south indian at least 2x/week.

5. **Nyra** (8, F): Finicky eater. NO dal, NO chawal (rice), NO eggs, NO meat.
   - BREAKFAST ROTATION (must vary — do NOT default to Chocos+Milk every day):
     Milk + Chocos + fruit, Cornflakes + milk + banana, Butter toast + milk,
     Idli + butter/ketchup, Mini uttapam + ketchup, Plain dosa + butter,
     Suji halwa + milk, Banana milkshake + toast, Bread + Nutella/jam + milk,
     Pancake + honey + milk, Ragi malt (sweetened) + banana, Toast + cheese + milk,
     Mini paratha + curd, Upma (mild, buttery) + milk
   - LUNCHBOX (must vary — do NOT default to Aloo Paratha every day):
     Aloo paratha + curd/ketchup + fruit, Mini cheese sandwiches + fruit,
     Pasta (penne/fusilli) with butter or red sauce, Plain hakka noodles,
     Bread rolls with aloo stuffing, Mini veg cutlets + bread,
     Cheese paratha + ketchup + fruit, Roti + bhindi (she loves bhindi),
     Bread pizza (cheese+tomato), Macaroni + cheese, Corn sandwich + fruit,
     Paneer paratha + ketchup, Mini aloo tikkis + ketchup + fruit,
     Veg frankie/roll, Pasta salad (mayo-based, mild), Idli + butter (in box)
   - LUNCH: Roti + sabzi from her safe list (aloo jeera, aloo matar, bhindi fry, aloo gobhi, aloo palak, paneer bhurji, matar paneer — vary the prep and combination)
   - DINNER (~7:30 PM, simple and appealing):
     Roti + aloo sabzi (vary: jeera/matar/dum/gobhi), Roti + bhindi fry,
     Pasta with red sauce, Noodles with veggies, Mini dosa + chutney,
     French fries + fruit bowl, Macaroni + cheese, Aloo paratha + curd,
     Toast + cheese + soup (tomato), Paneer paratha + curd,
     Bread pizza, Butter naan + paneer, Uttapam + ketchup

## Saved taste profiles
${JSON.stringify(tastesByMember, null, 2)}

## ACTIVE REQUESTS (honor these)
${requests.map((r) => `- ${r.member_id}: "${r.message}"`).join("\n") || "None"}

## ACTIVE CONTEXT for ${targetDate}
${contexts.map((c) => `- [${c.type}] ${c.member_id || "family"}: ${c.note || ""}`).join("\n") || "None"}

## PANTRY low/out (do not require these)
${lowOrOut.map((p) => `- ${p.name} (${p.status})`).join("\n") || "All staples in stock"}

## LOCKED SLOTS (must use exactly)
${lockedSlots || "None"}

## RECENT FINISH-RATE FEEDBACK
Loved: ${loved.slice(0, 6).map((f) => `${f.member_id} loved ${f.dish_name}`).join("; ") || "—"}
Refused / didn't finish: ${refused.slice(0, 6).map((f) => `${f.member_id} on ${f.meal_slot}: ${f.dish_name}`).join("; ") || "—"}

## RECENT SUGGEST-CHANGE COMMENTS
${recentReactions
  .filter((r) => r.reaction === "suggest_change" && r.comment)
  .slice(0, 6)
  .map((r) => `- ${r.member_id} on ${r.meal_slot}: "${r.comment}"`)
  .join("\n") || "None"}

## RECENT MEAL HISTORY (do NOT repeat any of these)
${recentPlans
  .map((p) => {
    const pd = p.plan_data;
    const b = pd.breakfast?.default || "?";
    const l = pd.lunch?.default || "?";
    const d = pd.dinner?.default || "?";
    const dk = pd.dinner?.kamini || "?";
    return `${p.day} ${p.date}: B=${b} | L=${l} | D=${d} | Kamini=${dk}`;
  })
  .join("\n") || "None"}

Kamini's last 5 dinners: ${kaminiRecent || "—"}

Nyra's last 5 breakfasts: ${recentPlans.map((p) => p.plan_data?.breakfast?.nyra).filter(Boolean).slice(0, 5).join(" | ") || "—"}
Nyra's last 5 lunchboxes: ${recentPlans.map((p) => p.plan_data?.lunchbox_nyra).filter(Boolean).slice(0, 5).join(" | ") || "—"}
Nyra's last 5 dinners: ${recentPlans.map((p) => p.plan_data?.dinner?.nyra).filter(Boolean).slice(0, 5).join(" | ") || "—"}
Kamini's last 5 breakfasts: ${recentPlans.map((p) => p.plan_data?.breakfast?.kamini).filter(Boolean).slice(0, 5).join(" | ") || "—"}

## DIVERSITY ANALYSIS (last ${diversity.total_meals_analyzed} meals)
${diversityHint(diversity) || "Balanced so far."}

## Today is ${dayName}, ${targetDate}.
${
  isWeekend
    ? `WEEKEND. ${
        dayName === "Saturday"
          ? "Saturday morning: Aditya & Riya want veg/egg Maggi (their ritual). Saturday dinner = something fun/indulgent if not going out (pav bhaji, chole bhature, dabeli, etc.)."
          : "Sunday: family usually orders out for dinner — suggest a cuisine type instead of cooking."
      }`
    : "Weekday — keep it simple, family has a cook."
}

## RULES
1. Do NOT repeat any dish from the last 3 days for ANY member. Check history carefully.
2. **NYRA VARIETY IS CRITICAL**: Do NOT give her Chocos+Milk for breakfast more than 2x/week. Do NOT give her Aloo Paratha for lunchbox more than 2x/week. Rotate through the full list above. She CAN eat many things — the list has 14+ breakfast options and 15+ lunchbox options. USE THEM.
3. **KAMINI VARIETY IS CRITICAL**: Do NOT give her Overnight Oats for breakfast more than 2x/week. Do NOT give her Quinoa Salad or the same soup for dinner more than 1x/week. Rotate through the full rotation lists above.
4. Kamini's dinner MUST be different from sabzi-roti and different from her last 5 dinners listed above.
5. Push toward UNDERUSED categories from the diversity report.
6. AVOID over-used categories.
7. Honor active context (travel, fasting, guests, exam, going_out).
8. Skip dishes whose key ingredient is in the pantry-low/out list.
9. Honor every locked slot exactly.
10. Honor active requests.
11. Avoid dishes that recently got 'refused'/'ate_some' for that member.
12. Include a "need_to_buy" list for anything that may not be at home.
13. For Nyra's lunchbox: pick something she will ACTUALLY finish at school. It must be easy to eat, room-temperature friendly, and appealing to an 8-year-old.

## Output
Return ONLY valid JSON, no markdown:
{
  "breakfast": {
    "default": "string",
    "kamini": "different from default OR omit if same",
    "nyra": "string"
  },
  "lunchbox_nyra": "string",
  "lunch": {
    "default": "main lunch (sabzi+dal+roti+rice)",
    "nyra": "what Nyra eats"
  },
  "dinner": {
    "default": "Riya/Arth/Aditya at ~8:30 PM",
    "kamini": "Kamini's lighter, different-from-lunch option at ~7 PM",
    "nyra": "Nyra's dinner at ~7:30 PM"
  },
  "dinner_time_kamini": "~7 PM",
  "dinner_time_nyra": "~7:30 PM",
  "dinner_time_others": "~8:30 PM",
  "need_to_buy": "comma-separated list, omit if nothing"
}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    let planData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) planData = JSON.parse(jsonMatch[0]);
      else throw new Error("No JSON found");
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Claude response", raw: responseText },
        { status: 500 }
      );
    }

    // Apply locks (in case Claude ignored them)
    for (const l of locks) {
      const slot = l.meal_slot;
      if (!planData[slot] || typeof planData[slot] !== "object") {
        planData[slot] = { default: l.value };
      }
      if (l.member_scope === "default" || l.member_scope === "all") {
        planData[slot].default = l.value;
      } else {
        planData[slot][l.member_scope] = l.value;
      }
    }

    const { data, error } = await supabase
      .from("meal_plans")
      .upsert(
        {
          family_id: familyId,
          date: targetDate,
          day: dayName,
          plan_data: planData,
          status: "finalized",
        },
        { onConflict: "family_id,date" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark fulfilled requests inactive
    if (requests.length > 0) {
      await supabase
        .from("requests")
        .update({ active: false })
        .in("id", requests.map((r) => r.id));
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      day: dayName,
      plan: data,
      diversity,
      locks_applied: locks.length,
      contexts_applied: contexts.length,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Claude API call failed: " + errorMessage },
      { status: 500 }
    );
  }
}
