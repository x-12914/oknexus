import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { describeDevice } from "@/lib/login-history";
import { enabledSocialProviders, socialProviderLabel } from "@/lib/social-auth";
import { TwoFactorCard } from "@/components/security/TwoFactorCard";
import { LoginHistory } from "@/components/security/LoginHistory";
import { SignOutAllCard } from "@/components/security/SignOutAllCard";
import { PasswordManagementCard } from "@/components/security/PasswordManagementCard";
import { ConnectedAccountsCard } from "@/components/security/ConnectedAccountsCard";
import { WithdrawalWhitelistCard } from "@/components/security/WithdrawalWhitelistCard";

export default async function SecurityPage() {
  const u = await sessionUser();
  if (!u) redirect("/login");

  const [user, events, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: u.id },
      select: { twoFAEnabled: true, passwordHash: true },
    }),
    prisma.loginEvent.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.account.findMany({
      where: { userId: u.id },
      select: { provider: true },
      distinct: ["provider"],
    }),
  ]);

  const connected = accounts.map((a) => ({ id: a.provider, label: socialProviderLabel(a.provider) }));
  const linked = new Set(connected.map((a) => a.id));
  const available = enabledSocialProviders()
    .filter((p) => !linked.has(p.id))
    .map((p) => ({ id: p.id, label: p.label }));

  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage how your OKNexus account is protected.
        </p>
        <div className="mt-8 space-y-6">
          <PasswordManagementCard />
          <TwoFactorCard initialEnabled={!!user?.twoFAEnabled} />
          <ConnectedAccountsCard
            connected={connected}
            available={available}
            hasPassword={Boolean(user?.passwordHash)}
          />

          <WithdrawalWhitelistCard />

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
