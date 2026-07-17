import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TwoFactorCard } from "@/components/security/TwoFactorCard";

export default async function SecurityPage() {
  const u = await sessionUser();
  if (!u) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: u.id },
    select: { twoFAEnabled: true },
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage how your OKNexus account is protected.
        </p>
        <div className="mt-6">
          <TwoFactorCard initialEnabled={!!user?.twoFAEnabled} />
        </div>
      </div>
    </div>
  );
}
