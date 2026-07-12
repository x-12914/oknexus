"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/nav/ThemeToggle";

const LINKS = [
  { href: "#pillars", label: "Why Nexus" },
  { href: "#ecosystem", label: "Products" },
  { href: "#security", label: "Security" },
  { href: "#company", label: "Company" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--topbar-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Nexus home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-[var(--color-muted)] md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-[var(--color-foreground)]">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/trade/BTC-USDT"
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Launch App <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
