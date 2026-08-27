import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldAlert, Ticket, Users } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { landingStyle } from "@/components/landing/landingStyle";
import { SocialLinks } from "@/components/landing/SocialLinks";

export const metadata = {
  title: "Contact OKNexus — Reach our support team",
  description:
    "Get in touch with OKNexus support. Live chat, support tickets and community channels.",
};

const OPTIONS = [
  {
    icon: Ticket,
    title: "Support ticket",
    body: "For anything tied to your account — identity verification, a disputed P2P trade, or a security concern. Raise it from inside your account so we can see the transaction you're asking about.",
    href: "/settings/support",
    cta: "Submit a request",
  },
  {
    icon: MessageCircle,
    title: "Live chat",
    body: "The quickest route for general questions. Available from the Support section once you're signed in.",
    href: "/settings/support",
    cta: "Open support",
  },
  {
    icon: Users,
    title: "Community channels",
    body: "Telegram, Discord and our social channels, for general questions and announcements.",
    href: "/settings/community",
    cta: "Join the community",
  },
];

export default function ContactPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip" style={landingStyle}>
      <LandingHeader />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 md:pt-28">
        <section className="text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Reach our support team
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--color-muted)]">
            Have a question we haven&apos;t answered yet? Get in touch.
          </p>
        </section>

        {/* Self-serve first: the client's brief was explicit that the Help
            Center should reduce ticket volume, so it leads rather than hides
            below the contact options. */}
        <section className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-sm font-semibold text-white">Before you contact us</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
            Most questions are answered instantly in the Help Center — deposits, withdrawals, fees
            and verification are all covered there.
          </p>
          <Link
            href="/help"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            Search the Help Center <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="mt-6 space-y-3">
          {OPTIONS.map((o) => (
            <div
              key={o.title}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
                  <o.icon className="h-5 w-5 text-[var(--color-accent)]" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">{o.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{o.body}</p>
                  <Link
                    href={o.href}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {o.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Kept prominent rather than as small print: impersonation is the most
            common way exchange users lose funds. */}
        <section className="mt-6 rounded-2xl border border-[var(--color-down)]/30 bg-[var(--color-down-bg)] p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-down)]" />
            <div>
              <h2 className="text-sm font-semibold text-white">A note on security</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">
                OKNexus staff will never ask for your password, your two-factor codes, or your
                private keys — not in chat, not by email, not ever. Only trust messages from our
                official channels and verified email domains. If someone contacts you claiming to
                be from OKNexus and asks for any of those, it is not us.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 text-center">
          <p className="text-sm text-[var(--color-muted)]">Or find us on social</p>
          <div className="mt-4 flex justify-center">
            <SocialLinks />
          </div>
        </section>
      </main>
    </div>
  );
}
