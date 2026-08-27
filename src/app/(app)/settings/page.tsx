import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CreditCard,
  Gift,
  LifeBuoy,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { sessionUserId } from "@/lib/auth";

/**
 * Settings hub.
 *
 * This page used to be the profile — same title, same account fields — which
 * made it a duplicate of /profile once that existed. Account identity now lives
 * there; this is purely a way into the sub-pages.
 */
const SECTIONS = [
  {
    href: "/settings/security",
    label: "Security",
    desc: "Password, two-factor, sessions and withdrawal whitelist",
    icon: Shield,
  },
  {
    href: "/settings/preferences",
    label: "Preferences",
    desc: "Appearance, language and display",
    icon: SlidersHorizontal,
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    desc: "Choose what we contact you about",
    icon: Bell,
  },
  {
    href: "/settings/payment-methods",
    label: "Payment methods",
    desc: "Bank accounts and cards",
    icon: CreditCard,
  },
  {
    href: "/settings/rewards",
    label: "Rewards",
    desc: "Your rewards and history",
    icon: Gift,
  },
  {
    href: "/settings/affiliates",
    label: "Affiliates & referrals",
    desc: "Invite others and track commission",
    icon: Users,
  },
  {
    href: "/settings/support",
    label: "Help & support",
    desc: "FAQs and contacting us",
    icon: LifeBuoy,
  },
];

export default async function SettingsPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Your account details live on your{" "}
          <Link href="/profile" className="text-[var(--color-accent)] hover:underline">
            profile
          </Link>
          .
        </p>

        <div className="mt-8 space-y-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)]">
                <s.icon className="h-4 w-4 text-[var(--color-accent)]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--color-foreground)]">
                  {s.label}
                </span>
                <span className="block text-xs text-[var(--color-muted)]">{s.desc}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
