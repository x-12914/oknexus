"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

type NavItem = { href: string; label: string; desc: string };
type NavMenu = { label: string; items: NavItem[] };

// Not-yet-built destinations point at the dashboard's Coming Soon hub for now.
const SOON = "/dashboard";

const MENUS: NavMenu[] = [
  {
    label: "Products",
    items: [
      { href: "/trade/BTC-USDT", label: "Spot Trading", desc: "Order book, market & limit orders" },
      { href: "/convert", label: "Convert", desc: "Swap instantly — large orders auto-route to OTC" },
      { href: "/buy", label: "Buy & Sell", desc: "Cash in and out with fiat" },
      { href: "/p2p", label: "P2P Marketplace", desc: "Escrow-protected peer trades" },
      { href: "/wallet", label: "Wallet", desc: "Balances, deposits & withdrawals" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: SOON, label: "About Oknexus", desc: "Our mission and the team" },
      { href: SOON, label: "Careers", desc: "Help build the future of finance" },
      { href: SOON, label: "We Care", desc: "Community & social impact" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: SOON, label: "Academy", desc: "Learn crypto from the ground up" },
      { href: SOON, label: "Blog", desc: "News, insights & updates" },
      { href: SOON, label: "Rate Calculator", desc: "Estimate fees before you trade" },
      { href: SOON, label: "Crypto Converter", desc: "Live rates between any assets" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: SOON, label: "Help Center", desc: "Guides and answers, 24/7" },
      { href: SOON, label: "Contact", desc: "Reach our support team" },
    ],
  },
];

/** A desktop nav item that reveals its menu on hover/focus. */
function Dropdown({ menu }: { menu: NavMenu }) {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 py-2 transition-colors hover:text-white"
        aria-haspopup="true"
      >
        {menu.label}
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-1/2 top-full -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="w-72 rounded-2xl border border-white/10 bg-[#100d1c]/95 p-2 shadow-2xl backdrop-blur-xl">
          {menu.items.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              className="flex flex-col rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
            >
              <span className="text-sm font-medium text-white">{it.label}</span>
              <span className="text-xs text-[var(--color-muted)]">{it.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // While the full-screen menu is open: lock body scroll and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setOpenSection(null);
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-colors duration-300",
          scrolled
            ? "border-b border-white/10 bg-[var(--topbar-bg)] backdrop-blur-xl"
            : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="OKNexus home" onClick={close}>
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-7 text-sm text-[var(--color-muted)] md:flex">
            {MENUS.map((m) => (
              <Dropdown key={m.label} menu={m} />
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-white md:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="hidden items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#0b0a12] transition-colors hover:bg-white/90 md:inline-flex"
            >
              Get started
            </Link>
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen overlay menu */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-[#08060f] transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <Link href="/" aria-label="OKNexus home" onClick={close}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2">
          {MENUS.map((m) => {
            const sectionOpen = openSection === m.label;
            return (
              <div key={m.label} className="border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setOpenSection(sectionOpen ? null : m.label)}
                  aria-expanded={sectionOpen}
                  className="flex w-full items-center justify-between py-4 text-left text-lg font-medium text-white"
                >
                  {m.label}
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-[var(--color-muted)] transition-transform duration-200",
                      sectionOpen && "rotate-180",
                    )}
                  />
                </button>
                {sectionOpen && (
                  <div className="flex flex-col pb-2">
                    {m.items.map((it) => (
                      <Link
                        key={it.label}
                        href={it.href}
                        onClick={close}
                        className="rounded-lg py-2.5 pl-3 text-base text-white/75 transition-colors hover:text-white"
                      >
                        {it.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-3 border-t border-white/10 px-5 py-5">
          <Link
            href="/login"
            onClick={close}
            className="block rounded-full py-3 text-center text-base font-medium text-white ring-1 ring-white/15 transition-colors hover:bg-white/5"
          >
            Log in
          </Link>
          <Link
            href="/register"
            onClick={close}
            className="block rounded-full bg-white py-3 text-center text-base font-semibold text-[#0b0a12] transition-colors hover:bg-white/90"
          >
            Get started
          </Link>
        </div>
      </div>
    </>
  );
}
