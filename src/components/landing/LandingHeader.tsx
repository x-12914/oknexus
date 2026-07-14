"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "#products", label: "Products" },
  { href: "#assets", label: "Assets" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        scrolled
          ? "border-b border-white/10 bg-[var(--topbar-bg)] backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Nexus home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[var(--color-muted)] md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="spectrum-bg inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
