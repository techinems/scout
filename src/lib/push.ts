import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";

let configured = false;

export function pushEnabled(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured(): boolean {
  if (!pushEnabled()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.org",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    configured = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Path to open when the notification is tapped. */
  url: string;
};

/**
 * Send a push notification to every registered device of the given users.
 * Dead subscriptions (410/404) are pruned. Failures never throw — push is
 * best-effort; the in-app timeline is the source of truth.
 */
export async function notifyUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !ensureConfigured()) return;

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 3600, urgency: "high" },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`Push to subscription ${sub.id} failed:`, err);
        }
      }
    }),
  );
}

/** User ids linked (directly or by email) to personnel assigned to a mission. */
export async function missionUserIds(missionId: string, excludeUserId?: string): Promise<string[]> {
  const assignments = await db.missionAssignment.findMany({
    where: { missionId },
    include: { personnel: { select: { userId: true, email: true } } },
  });

  const ids = new Set<string>();
  const unlinkedEmails: string[] = [];
  for (const a of assignments) {
    if (a.personnel.userId) ids.add(a.personnel.userId);
    else if (a.personnel.email) unlinkedEmails.push(a.personnel.email.toLowerCase());
  }
  if (unlinkedEmails.length > 0) {
    const users = await db.user.findMany({ where: { email: { in: unlinkedEmails } }, select: { id: true } });
    for (const u of users) ids.add(u.id);
  }
  if (excludeUserId) ids.delete(excludeUserId);
  return [...ids];
}
