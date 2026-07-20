import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ProfilePage() {
  const u = await sessionUser();
  if (!u) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: u.id },
    select: { email: true, name: true, createdAt: true, kycStatus: true, role: true },
  });

  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage your personal information and account details.
        </p>

        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-[var(--color-foreground)]">Account Info</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-[var(--color-muted)]">Email</div>
                <div className="mt-1 text-sm font-medium">{user?.email}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-muted)]">Name</div>
                <div className="mt-1 text-sm font-medium">{user?.name || "Not set"}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-muted)]">Account Role</div>
                <div className="mt-1 text-sm font-medium">{user?.role}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-muted)]">Joined</div>
                <div className="mt-1 text-sm font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-[var(--color-foreground)]">Verification Status (KYC)</h3>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Current Tier: <span className="font-semibold uppercase">{user?.kycStatus}</span>
                </p>
              </div>
              <a
                href="/kyc"
                className="rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
              >
                Upgrade Tier
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
