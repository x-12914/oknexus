import "server-only";
import { prisma } from "@/lib/db";
import type { NotificationType, NotificationView } from "@/lib/notification-types";

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}

/** Create a notification for a user. Best-effort — never throws into the caller's flow. */
export async function notify(userId: string, n: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, type: n.type, title: n.title, body: n.body, href: n.href ?? null },
    });
  } catch {
    // Notifications are non-critical; a failure here must never break the action
    // that triggered it (a deposit credit, a transfer, a security change, …).
  }
}

export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<{ items: NotificationView[]; unread: number }> {
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      href: r.href,
      read: r.read,
      createdAt: r.createdAt.getTime(),
    })),
    unread,
  };
}

/** Mark the given notifications read (or all of the user's unread ones if no ids). */
export async function markRead(userId: string, ids?: string[]): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false, ...(ids && ids.length ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
}
