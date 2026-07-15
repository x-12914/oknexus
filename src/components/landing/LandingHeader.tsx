"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

const PRODUCTS = [
  { href: "/trade/BTC-USDT", label: "Spot Trading", desc: "Order book, market & limit orders" },
  { href: "/swap", label: "Instant Swap", desc: "Convert any two assets in a tap" },
  { href: "/buy", label: "Buy & Sell", desc: "Cash in and out with fiat" },
  { href: "/otc", label: "OTC Desk", desc: "Large trades, tighter spreads" },
  { href: "/p2p", label: "P2P Marketplace", desc: "Escrow-protected peer trades" },
];

const NAV = [
  { href: "#assets", label: "Assets" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on Escape or a click outside the header.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        scrolled || open
          ? "border-b border-white/10 bg-[var(--topbar-bg)] backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Nexus home" onClick={close}>
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-7 text-sm text-[var(--color-muted)] md:flex">
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 py-2 transition-colors hover:text-white"
              aria-haspopup="true"
            >
              Products
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-1/2 top-full -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="w-72 rounded-2xl border border-white/10 bg-[#100d1c]/95 p-2 shadow-2xl backdrop-blur-xl">
                {PRODUCTS.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    className="flex flex-col rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
                  >
                    <span className="text-sm font-medium text-white">{p.label}</span>
                    <span className="text-xs text-[var(--color-muted)]">{p.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {NAV.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </a>
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
            className="spectrum-bg hidden items-center rounded-full px-5 py-2 text-sm font-semibold text-white md:inline-flex"
          >
            Get started
          </Link>
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out md:hidden",
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-4 text-[var(--color-muted)]">
          <a
            href="#products"
            onClick={close}
            className="rounded-xl px-3 py-3 text-base transition-colors hover:bg-white/5 hover:text-white"
          >
            Products
          </a>
          {NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={close}
              className="rounded-xl px-3 py-3 text-base transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <div className="my-2 h-px bg-white/10" />
          <Link
            href="/login"
            onClick={close}
            className="rounded-xl px-3 py-3 text-base text-white transition-colors hover:bg-white/5"
          >
            Log in
          </Link>
          <Link
            href="/register"
            onClick={close}
            className="spectrum-bg mt-1 rounded-full px-5 py-3 text-center text-sm font-semibold text-white"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
