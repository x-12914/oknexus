// Client-safe notification types (no server imports).

export type NotificationType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER"
  | "SECURITY"
  | "TRADE"
  | "SYSTEM";

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: number;
}
