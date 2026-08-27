import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SocialLinks } from "@/components/landing/SocialLinks";

/**
 * The marketing footer. The older pages still carry their own inline copy of
 * this markup; new pages should use this component so the links only have to be
 * corrected in one place.
 */

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "TRADE",
    links: [
      ["Spot Trading", "/trade/BTC-USDT"],
      ["Instant Swap", "/swap"],
      ["Buy & Sell Crypto", "/buy"],
      ["P2P Marketplace", "/p2p"],
      ["OTC Desk", "/otc"],
      ["Wallet", "/wallet"],
    ],
  },
  {
    title: "RESOURCES",
    links: [
      ["Academy", "/academy"],
      ["Blog", "/blog"],
      ["Help Center", "/help"],
      ["Rate Calculator", "/rate-calculator"],
      ["Crypto Converter", "/crypto-converter"],
    ],
  },
  {
    title: "COMPANY",
    links: [
      ["About Oknexus", "/about"],
      ["Careers", "/careers"],
      ["We Care", "/we-care"],
      ["Contact", "/contact"],
      ["Newsletter", "/blog"],
    ],
  },
  {
    title: "LEGAL",
    links: [
      ["Privacy Policy", "/privacy"],
      ["Terms of Service", "/terms"],
      ["KYC Policy", "/kyc"],
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 grid-cols-2 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1 max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
              A single, secure venue to trade, swap, ramp and move digital assets, built on a
              compliance-first foundation.
            </p>
            <SocialLinks className="mt-5" />
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-bold uppercase tracking-wider text-white">
                {col.title}
              </div>
              <ul className="mt-3 space-y-2.5 text-sm text-[var(--color-muted)]">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 OKNexus Exchange. All rights reserved.</span>
          <span>Built for a secure, compliance-first digital asset ecosystem.</span>
        </div>
      </div>
    </footer>
  );
}
