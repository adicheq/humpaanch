import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (!configured && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:absoni@gmail.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    configured = true;
  }
}

export async function sendPushToAll(
  subscriptions: { subscription: PushSubscriptionJSON }[],
  payload: { title: string; body: string; url?: string }
) {
  ensureConfigured();
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        sub.subscription as unknown as webpush.PushSubscription,
        JSON.stringify(payload)
      )
    )
  );
  return results;
}
