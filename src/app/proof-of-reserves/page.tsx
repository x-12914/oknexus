import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { landingStyle } from "@/components/landing/landingStyle";
import { ReservesTable } from "@/components/reserves/ReservesTable";

export const metadata: Metadata = {
  title: "Proof of Reserves | OKNexus Exchange",
  description:
    "A live comparison of the assets OKNexus holds on chain against the balances owed to customers.",
};

/**
 * Public proof of reserves.
 *
 * The design mockup carried a "Proof of Reserves verified · 21 Aug 2026" badge.
 * A date is a claim about the past that a reader cannot check, and calling an
 * automated self-check an audit is precisely the sentence a regulator quotes
 * back. So this publishes the reconciliation itself, computed when the page is
 * read, and states plainly what it is and is not.
 */
export default function ProofOfReservesPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip" style={landingStyle}>
      <LandingHeader />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 md:pt-28">
        <section className="text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Proof of Reserves
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--color-muted)]">
            What we hold on chain, against what we owe you. Calculated when you open this page,
            not copied from a report.
          </p>
        </section>

        <ReservesTable />

        <section className="mt-10 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-sm font-semibold text-white">How this is calculated</h2>
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            We read the balance of every address we control on every network we support, and add
            them up. Separately we add up every customer balance in our ledger, including funds
            reserved in open orders and escrow. The two numbers are shown side by side. Holding at
            least as much as we owe is the whole point; anything less would be a shortfall, and it
            would be shown here rather than hidden.
          </p>
        </section>

        {/* Stated as prominently as the numbers themselves. An automated
            self-check that is mistaken for an audit is worse than no page. */}
        <section className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-sm font-semibold text-white">What this is not</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            This is our own reconciliation, run automatically. It has not been reviewed by an
            independent auditor, and we do not describe it as verified or attested. It also does
            not yet let you confirm that your individual balance is included in the total — that
            requires a cryptographic proof we have not built. We would rather tell you exactly
            what this page proves than let it imply more.
          </p>
        </section>
      </main>
    </div>
  );
}
