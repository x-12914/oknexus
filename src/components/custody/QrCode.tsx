"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a value (e.g. a deposit address) as a scannable QR code. */
export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse rounded-lg bg-[var(--color-surface-2)]"
        aria-hidden
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt="Deposit address QR code"
      className="rounded-lg bg-white p-2"
    />
  );
}
