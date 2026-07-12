import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";

// Manrope: clean geometric sans, close to the Exodus brand type.
const geistSans = Manrope({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OKNexus Exchange — Connecting You to the Future of Finance",
  description:
    "A next-generation digital asset exchange. Trade crypto with spot, instant swap, fiat on/off ramp, OTC, and P2P — secure, fast, and compliance-first.",
};

// Set the theme before first paint to avoid a flash. Defaults to light.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t='light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
