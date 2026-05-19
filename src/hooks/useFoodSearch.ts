import { useMemo } from "react";
import { FOOD_LIBRARY, Cuisine, FoodCategory, DietTag, FoodItem } from "@/data/food-library";

interface UseFoodSearchOptions {
  query: string;
  cuisineFilters: Cuisine[];
  categoryFilters: FoodCategory[];
  dietFilter: DietTag | null;
}

export function useFoodSearch({
  query,
  cuisineFilters,
  categoryFilters,
  dietFilter,
}: UseFoodSearchOptions): FoodItem[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();

    let results = FOOD_LIBRARY;

    // Filter by diet
    if (dietFilter) {
      results = results.filter((item) => item.diet.includes(dietFilter));
    }

    // Filter by cuisine
    if (cuisineFilters.length > 0) {
      results = results.filter((item) => cuisineFilters.includes(item.cuisine));
    }

    // Filter by category
    if (categoryFilters.length > 0) {
      results = results.filter((item) =>
        item.category.some((c) => categoryFilters.includes(c))
      );
    }

    // Search by query
    if (q.length > 0) {
      const scored = results.map((item) => {
        const nameLower = item.name.toLowerCase();
        let score = 0;

        // Exact name match
        if (nameLower === q) score = 100;
        // Name starts with query
        else if (nameLower.startsWith(q)) score = 80;
        // Name contains query
        else if (nameLower.includes(q)) score = 60;
        // Ingredient exact match
        else if (item.ingredients.some((ing) => ing === q)) score = 50;
        // Ingredient starts with
        else if (item.ingredients.some((ing) => ing.startsWith(q))) score = 40;
        // Ingredient contains
        else if (item.ingredients.some((ing) => ing.includes(q))) score = 30;
        // No match
        else score = 0;

        return { item, score };
      });

      return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.item);
    }

    // No query: sort dishes first, then ingredients, alphabetically
    return results.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dish" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [query, cuisineFilters, categoryFilters, dietFilter]);
}
