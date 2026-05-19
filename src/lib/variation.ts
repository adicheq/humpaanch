// Variation generator. Given a base dish, returns/produces variants.
// Caches per family in dish_variations table.

import Anthropic from "@anthropic-ai/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { DishVariation } from "./v2-types";

const STATIC_VARIATIONS: Record<string, DishVariation[]> = {
  bhindi: [
    { name: "Bhindi Fry", tags: ["dry", "simple"] },
    { name: "Bhindi Do Pyaza", tags: ["onion", "punjabi"] },
    { name: "Kurkuri Bhindi", tags: ["crispy", "snack-style"] },
    { name: "Dahi Bhindi", tags: ["curd", "gravy"] },
    { name: "Bhindi Masala", tags: ["tomato", "north_indian"] },
    { name: "Bharwa Bhindi", tags: ["stuffed", "rajasthani"] },
  ],
  aloo: [
    { name: "Aloo Jeera", tags: ["dry", "simple"] },
    { name: "Aloo Gobhi", tags: ["gobhi", "north_indian"] },
    { name: "Aloo Matar", tags: ["peas"] },
    { name: "Dum Aloo", tags: ["rich", "kashmiri"] },
    { name: "Aloo Palak", tags: ["spinach"] },
    { name: "Aloo Methi", tags: ["fenugreek"] },
    { name: "Aloo Tamatar", tags: ["tomato", "homestyle"] },
  ],
  paneer: [
    { name: "Matar Paneer", tags: ["peas", "homestyle"] },
    { name: "Palak Paneer", tags: ["spinach"] },
    { name: "Kadai Paneer", tags: ["bell-pepper", "punjabi"] },
    { name: "Paneer Bhurji", tags: ["scrambled", "quick"] },
    { name: "Paneer Tikka Masala", tags: ["restaurant"] },
    { name: "Paneer Lababdar", tags: ["creamy"] },
    { name: "Shahi Paneer", tags: ["rich"] },
  ],
  dal: [
    { name: "Dal Tadka", tags: ["arhar"] },
    { name: "Dal Fry", tags: ["yellow"] },
    { name: "Dal Makhani", tags: ["urad", "creamy", "punjabi"] },
    { name: "Panchmel Dal", tags: ["mixed", "marwadi"] },
    { name: "Moong Dal", tags: ["light"] },
    { name: "Chana Dal", tags: ["heavy"] },
    { name: "Mix Dal", tags: ["mixed"] },
  ],
  soup: [
    { name: "Tomato Soup", tags: ["classic"] },
    { name: "Sweet Corn Veg Soup", tags: ["sweet"] },
    { name: "Hot & Sour Soup", tags: ["chinese", "tangy"] },
    { name: "Manchow Soup", tags: ["chinese", "crunchy"] },
    { name: "Palak Soup", tags: ["green"] },
    { name: "Mushroom Soup", tags: ["creamy"] },
    { name: "Lemon Coriander Soup", tags: ["citrus", "light"] },
    { name: "Mixed Veg Clear Soup", tags: ["clear", "lightest"] },
    { name: "Carrot Ginger Soup", tags: ["spicy", "warming"] },
  ],
  khichdi: [
    { name: "Moong Dal Khichdi", tags: ["classic"] },
    { name: "Bajra Khichdi", tags: ["millet", "winter"] },
    { name: "Sabudana Khichdi", tags: ["fasting", "marwadi"] },
    { name: "Masala Khichdi", tags: ["spiced"] },
    { name: "Vegetable Khichdi", tags: ["mixed"] },
    { name: "Millet Khichdi", tags: ["healthy"] },
  ],
  dosa: [
    { name: "Plain Dosa + Chutney", tags: ["light"] },
    { name: "Masala Dosa", tags: ["potato-stuffed", "classic"] },
    { name: "Rava Dosa", tags: ["semolina", "crispy"] },
    { name: "Onion Uttapam", tags: ["thick"] },
    { name: "Tomato Uttapam", tags: ["thick"] },
    { name: "Mysore Masala Dosa", tags: ["spicy-chutney"] },
    { name: "Set Dosa", tags: ["soft"] },
    { name: "Pesarattu", tags: ["andhra", "moong-based"] },
  ],
  paratha: [
    { name: "Aloo Paratha", tags: ["potato"] },
    { name: "Gobhi Paratha", tags: ["cauliflower"] },
    { name: "Methi Paratha", tags: ["fenugreek"] },
    { name: "Paneer Paratha", tags: ["protein"] },
    { name: "Onion Paratha", tags: ["pyaaz"] },
    { name: "Mooli Paratha", tags: ["radish"] },
    { name: "Mix Veg Paratha", tags: ["mixed"] },
  ],
};

export function localVariations(baseDish: string): DishVariation[] {
  const lc = baseDish.toLowerCase();
  for (const key of Object.keys(STATIC_VARIATIONS)) {
    if (lc.includes(key)) return STATIC_VARIATIONS[key];
  }
  return [];
}

export async function getOrGenerateVariations(
  supabase: SupabaseClient,
  familyId: string,
  baseDish: string
): Promise<DishVariation[]> {
  // 1) Check static
  const local = localVariations(baseDish);
  if (local.length > 0) return local;

  // 2) Check cache
  const { data: cached } = await supabase
    .from("dish_variations")
    .select("variations")
    .eq("base_dish", baseDish.toLowerCase())
    .or(`family_id.eq.${familyId},family_id.is.null`)
    .limit(1)
    .single();

  if (cached?.variations && Array.isArray(cached.variations) && cached.variations.length > 0) {
    return cached.variations as DishVariation[];
  }

  // 3) Generate via Anthropic
  if (!process.env.ANTHROPIC_API_KEY) return [];

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Generate 6 to 10 distinct preparation variations of the Indian dish "${baseDish}" suitable for a North Indian / Marwadi vegetarian family.
Return ONLY a JSON array, no prose. Each item: {"name": "string", "tags": ["string"], "notes": "1-line"}.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  let variations: DishVariation[] = [];
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) variations = JSON.parse(match[0]);
  } catch {
    variations = [];
  }

  if (variations.length > 0) {
    await supabase.from("dish_variations").upsert(
      {
        family_id: familyId,
        base_dish: baseDish.toLowerCase(),
        variations,
      },
      { onConflict: "family_id,base_dish" }
    );
  }
  return variations;
}
