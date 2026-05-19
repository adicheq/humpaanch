// Anti-staleness scoring: detect over-used tags / dishes across recent plans
// and suggest under-used directions.

import { DishTag } from "./v2-types";

interface RecentPlanRow {
  date: string;
  day: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan_data: Record<string, any>;
}

export interface DiversityReport {
  total_meals_analyzed: number;
  cuisine_counts: Record<string, number>;
  protein_counts: Record<string, number>;
  category_counts: Record<string, number>;
  overused: string[];      // labels like "paneer", "north_indian", "soup"
  underused: string[];     // suggestions
  member_focus: Record<string, string[]>; // per-member overused list
}

const KNOWN_PROTEINS = [
  "paneer", "egg", "anda", "rajma", "chole", "chana", "dal", "tofu",
  "soya", "mushroom", "moong", "masoor", "urad",
];

const KNOWN_CUISINES = [
  ["dosa", "idli", "uttapam", "sambhar", "rasam", "vada"], // south_indian
  ["pav bhaji", "chole bhature", "vada pav"],              // street_food
  ["fried rice", "manchurian", "noodles", "hakka", "schezwan", "spring roll", "chowmein"], // indo_chinese
  ["pasta", "pizza", "lasagna", "risotto", "spaghetti"],   // italian
  ["sandwich", "toast", "wrap", "burger", "salad"],        // continental
  ["dal bati", "kadhi", "gatte", "ker sangri", "bajra"],   // marwadi
  ["paratha", "sabzi", "dal", "roti", "rajma", "chole"],   // north_indian (default)
];

const CUISINE_NAMES = ["south_indian", "street_food", "indo_chinese", "italian", "continental", "marwadi", "north_indian"];

const CATEGORIES: { key: string; needles: string[] }[] = [
  { key: "soup", needles: ["soup"] },
  { key: "khichdi", needles: ["khichdi"] },
  { key: "rice_dish", needles: ["biryani", "pulao", "fried rice", "khichdi", "chawal"] },
  { key: "noodles", needles: ["noodles", "maggi", "spaghetti", "pasta", "chowmein"] },
  { key: "paratha", needles: ["paratha"] },
  { key: "dosa_idli", needles: ["dosa", "idli", "uttapam"] },
  { key: "sandwich", needles: ["sandwich", "toast", "burger", "wrap"] },
  { key: "sabzi_roti", needles: ["sabzi", "roti", "phulka"] },
  { key: "bowl", needles: ["bowl"] },
  { key: "chilla_cheela", needles: ["chilla", "cheela"] },
];

export function classifyDish(name: string): {
  cuisine: string;
  protein: string | null;
  categories: string[];
} {
  const lc = name.toLowerCase();

  let cuisine = "north_indian";
  for (let i = 0; i < KNOWN_CUISINES.length; i++) {
    if (KNOWN_CUISINES[i].some((kw) => lc.includes(kw))) {
      cuisine = CUISINE_NAMES[i];
      break;
    }
  }

  let protein: string | null = null;
  for (const p of KNOWN_PROTEINS) {
    if (lc.includes(p)) {
      protein = p;
      break;
    }
  }

  const categories: string[] = [];
  for (const cat of CATEGORIES) {
    if (cat.needles.some((n) => lc.includes(n))) categories.push(cat.key);
  }

  return { cuisine, protein, categories };
}

function bump<K extends string>(map: Record<K, number>, key: K) {
  map[key] = (map[key] || 0) + 1;
}

export function scoreDiversity(
  recentPlans: RecentPlanRow[],
  memberFocus?: string[]
): DiversityReport {
  const cuisine_counts: Record<string, number> = {};
  const protein_counts: Record<string, number> = {};
  const category_counts: Record<string, number> = {};
  const member_focus: Record<string, string[]> = {};
  let total = 0;

  for (const plan of recentPlans) {
    const slots = ["breakfast", "lunch", "dinner"];
    for (const slot of slots) {
      const slotData = plan.plan_data?.[slot];
      if (!slotData) continue;

      const dishesByMember: Array<{ member: string; dish: string }> = [];
      if (typeof slotData === "string") {
        dishesByMember.push({ member: "default", dish: slotData });
      } else if (typeof slotData === "object") {
        for (const [member, dish] of Object.entries(slotData)) {
          if (typeof dish === "string" && dish.trim()) {
            dishesByMember.push({ member, dish });
          }
        }
      }

      for (const { member, dish } of dishesByMember) {
        total += 1;
        const c = classifyDish(dish);
        bump(cuisine_counts, c.cuisine);
        if (c.protein) bump(protein_counts, c.protein);
        for (const cat of c.categories) bump(category_counts, cat);

        if (memberFocus?.includes(member)) {
          if (!member_focus[member]) member_focus[member] = [];
          member_focus[member].push(`${c.cuisine}/${c.protein || "noprot"}/${c.categories.join(",") || "none"}`);
        }
      }
    }
  }

  // overused = appears > 30% of meals analyzed
  const threshold = Math.max(2, Math.ceil(total * 0.3));
  const overused: string[] = [];
  for (const [k, v] of Object.entries(cuisine_counts)) {
    if (v >= threshold) overused.push(`cuisine:${k}`);
  }
  for (const [k, v] of Object.entries(protein_counts)) {
    if (v >= threshold) overused.push(`protein:${k}`);
  }
  for (const [k, v] of Object.entries(category_counts)) {
    if (v >= threshold) overused.push(`category:${k}`);
  }

  // underused suggestions
  const allCuisines = ["south_indian", "indo_chinese", "italian", "continental", "marwadi", "north_indian", "street_food"];
  const underused: string[] = [];
  for (const c of allCuisines) {
    if ((cuisine_counts[c] || 0) === 0) underused.push(`cuisine:${c}`);
  }
  // suggest a millet/healthy push if not present
  if ((category_counts["bowl"] || 0) === 0) underused.push("category:bowl");
  if ((category_counts["soup"] || 0) === 0) underused.push("category:soup");
  if ((category_counts["dosa_idli"] || 0) === 0) underused.push("category:dosa_idli");

  return {
    total_meals_analyzed: total,
    cuisine_counts,
    protein_counts,
    category_counts,
    overused,
    underused,
    member_focus,
  };
}

export function diversityHint(report: DiversityReport): string {
  const lines: string[] = [];
  if (report.overused.length) {
    lines.push(`OVERUSED in last ${report.total_meals_analyzed} meals: ${report.overused.join(", ")}. AVOID these.`);
  }
  if (report.underused.length) {
    lines.push(`UNDERUSED — prefer: ${report.underused.join(", ")}.`);
  }
  return lines.join(" ");
}

// Build a quick tag map for known dishes (extensible — falls back to classify)
export function buildDishTags(dishName: string, existing?: DishTag): DishTag {
  const c = classifyDish(dishName);
  return {
    id: existing?.id || "",
    family_id: existing?.family_id || null,
    dish_name: dishName,
    tags: [c.cuisine, ...(c.protein ? [c.protein] : []), ...c.categories],
    cuisine: c.cuisine,
    base_protein: c.protein,
    meal_category: c.categories[0] || null,
    is_indulgent: /pav bhaji|bhature|biryani|pizza|french fries|maggi|fried/i.test(dishName),
    is_millet: /millet|ragi|jowar|bajra|quinoa|oats/i.test(dishName),
    has_eggs: /egg|anda|omelette|bhurji/i.test(dishName),
    updated_at: existing?.updated_at || new Date().toISOString(),
  };
}
