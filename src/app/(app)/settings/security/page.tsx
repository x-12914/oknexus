import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { describeDevice } from "@/lib/login-history";
import { TwoFactorCard } from "@/components/security/TwoFactorCard";
import { LoginHistory } from "@/components/security/LoginHistory";
import { SignOutAllCard } from "@/components/security/SignOutAllCard";

export default async function SecurityPage() {
  const u = await sessionUser();
  if (!u) redirect("/login");

  const [user, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id: u.id },
      select: { twoFAEnabled: true },
    }),
    prisma.loginEvent.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage how your OKNexus account is protected.
        </p>
        <div className="mt-8 space-y-6">
          <TwoFactorCard initialEnabled={!!user?.twoFAEnabled} />
          
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-[var(--color-foreground)]">Withdrawal Whitelist</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Restrict withdrawals to verified addresses only.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-muted)]">
              Coming soon
            </div>
          </div>

          <LoginHistory
            events={events.map((e) => ({
              id: e.id,
              device: describeDevice(e.userAgent),
              ip: e.ip,
              at: e.createdAt.getTime(),
            }))}
          />
          <SignOutAllCard />
        </div>
      </div>
    </div>
  );
}
