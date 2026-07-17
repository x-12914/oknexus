import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { describeDevice } from "@/lib/login-history";
import { TwoFactorCard } from "@/components/security/TwoFactorCard";
import { LoginHistory } from "@/components/security/LoginHistory";

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
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage how your OKNexus account is protected.
        </p>
        <div className="mt-6 space-y-6">
          <TwoFactorCard initialEnabled={!!user?.twoFAEnabled} />
          <LoginHistory
            events={events.map((e) => ({
              id: e.id,
              device: describeDevice(e.userAgent),
              ip: e.ip,
              at: e.createdAt.getTime(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
