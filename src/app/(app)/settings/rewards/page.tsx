import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";

export default async function RewardsPage() {
  const u = await sessionUser();
  if (!u) redirect("/login");

  const features = [
    { title: "Loyalty rewards", desc: "Earn points for your daily activity and trades." },
    { title: "Bonuses", desc: "Claim special deposit and trading bonuses." },
    { title: "Campaigns", desc: "Participate in exclusive time-limited events." },
    { title: "Airdrops", desc: "Receive free tokens from new project listings." },
  ];

  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Rewards Hub</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Discover tasks, bonuses, and special promotions tailored for you.
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
