import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";

export default async function AffiliatesPage() {
  const u = await sessionUser();
  if (!u) redirect("/login");

  const features = [
    { title: "Referral link", desc: "Share your unique link to invite friends." },
    { title: "Earnings overview", desc: "Track your total referral earnings in real-time." },
    { title: "Commission history", desc: "View a detailed log of your commission payouts." },
    { title: "Referral statistics", desc: "Analyze the performance of your invites." },
  ];

  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Affiliates & Referrals</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Invite friends and earn a percentage of their trading fees.
        </p>
        <div className="mt-8 space-y-4">
          {features.map((f, i) => (
            <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
              <h3 className="font-medium text-[var(--color-foreground)]">{f.title}</h3>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{f.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-muted)]">
                Coming soon
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
