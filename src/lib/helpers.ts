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
