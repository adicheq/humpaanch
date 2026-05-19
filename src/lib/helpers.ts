export function getTomorrowIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const tomorrow = new Date(istNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  return istNow.toISOString().split("T")[0];
}

export function isVotingOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  const hours = istNow.getHours();
  const minutes = istNow.getMinutes();
  // Voting closes at 5:20 PM IST
  return hours < 17 || (hours === 17 && minutes < 20);
}

export function verifyApiKey(request: Request): boolean {
  const apiKey = request.headers.get("x-api-key");
  return apiKey === process.env.API_SECRET;
}

/**
 * Normalize old-format meal plan data to new MealSlotData format.
 * Handles both old plans (breakfast.adults, dinner_kamini, etc.)
 * and new plans (breakfast.default, dinner.default, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePlanData(raw: any): any {
  // Already new format - has breakfast.default
  if (raw.breakfast?.default) return raw;

  // Old format → convert
  return {
    breakfast: {
      default: raw.breakfast?.adults || "",
      kamini: raw.breakfast?.kamini && raw.breakfast.kamini !== "Same" ? raw.breakfast.kamini : undefined,
      nyra: raw.breakfast?.nyra || undefined,
    },
    lunchbox_nyra: raw.lunchbox_nyra || undefined,
    lunch: {
      default: raw.lunch?.main || "",
      nyra: raw.lunch?.nyra || undefined,
    },
    dinner: {
      default: raw.dinner_others || "",
      kamini: raw.dinner_kamini || undefined,
      nyra: raw.dinner_nyra || undefined,
    },
    dinner_time_kamini: "~7 PM",
    dinner_time_nyra: "~7:30 PM",
    dinner_time_others: "~8:30 PM",
    need_to_buy: raw.need_to_buy || undefined,
  };
}
