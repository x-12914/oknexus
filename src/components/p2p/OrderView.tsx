"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  Send,
  ShieldCheck,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import type { P2POrder, P2POrderAction, P2POrderStatus } from "@/lib/exchange/types";
import { MerchantBadge } from "./MerchantBadge";

const STEPS = ["Payment", "Confirmed", "Released"] as const;

function stepIndex(status: P2POrderStatus): number {
  if (status === "PENDING_PAYMENT") return 0;
  if (status === "PAID") return 1;
  if (status === "COMPLETED") return 2;
  return -1; // cancelled / disputed
}

const fmtFiat = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtAsset = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 8 });

export function OrderView({ orderId }: { orderId: string }) {
  const { data: order, refresh } = usePolling(() => api.p2pOrder(orderId), 3000, [orderId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading trade…
      </div>
    );
  }

  const act = async (action: P2POrderAction, key: string) => {
    setBusy(key);
    setError(null);
    try {
      await api.p2pAction(orderId, action);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const step = stepIndex(order.status);
  const terminalBad = order.status === "CANCELLED" || order.status === "DISPUTED";
  const takerBuys = order.takerRole === "buyer";
  const counterparty = takerBuys ? order.sellerName : order.buyerName;

  // The next action the OTHER party must take (exposed as a demo control).
  const counterpartyAction: { action: P2POrderAction; label: string } | null =
    order.status === "PAID" && takerBuys
      ? { action: "RELEASE", label: `Simulate ${order.sellerName} releasing escrow` }
      : order.status === "PENDING_PAYMENT" && !takerBuys
        ? { action: "MARK_PAID", label: `Simulate ${order.buyerName} marking paid` }
        : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        href="/p2p"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Left: escrow flow */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">
                {takerBuys ? "Buy" : "Sell"} {fmtAsset(order.assetAmount)} {order.asset}
              </h1>
              <StatusPill status={order.status} />
            </div>

            {/* Step indicator */}
            {!terminalBad ? (
              <div className="mt-4 flex items-center">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "grid place-items-center h-7 w-7 rounded-full border text-xs",
                          i < step
                            ? "bg-[var(--color-up)] border-[var(--color-up)] text-black"
                            : i === step
                              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                              : "border-[var(--color-border)] text-[var(--color-muted)]",
                        )}
                      >
                        {i < step ? <Check className="h-4 w-4" /> : i + 1}
                      </div>
                      <span
                        className={cn(
                          "mt-1 text-[11px]",
                          i <= step ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 ? (
                      <div
                        className={cn(
                          "h-px flex-1 mx-2",
                          i < step ? "bg-[var(--color-up)]" : "bg-[var(--color-border)]",
                        )}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {order.status === "PENDING_PAYMENT" ? (
              <PaymentWindow expiresAt={order.expiresAt} />
            ) : null}
          </div>

          {/* Order details */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2 text-sm">
            <Row k={takerBuys ? "You pay" : "You receive"}>
              {fmtFiat(order.fiatAmount)} {order.fiat}
            </Row>
            <Row k={takerBuys ? "You receive" : "You send"}>
              {fmtAsset(order.assetAmount)} {order.asset}
            </Row>
            <Row k="Price">
              {order.price.toLocaleString(undefined, { maximumFractionDigits: 4 })} {order.fiat}
            </Row>
            <Row k="Counterparty">{counterparty}</Row>
            <Row k="Order no.">
              <span className="tabular-nums text-xs">{order.id}</span>
            </Row>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <ActionArea order={order} busy={busy} onAct={act} />
            {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}
          </div>

          {/* Demo counterparty control */}
          {counterpartyAction ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)] mb-2">
                Demo · counterparty simulation
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => act(counterpartyAction.action, "sim")}
                className="w-full py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-2)] flex items-center justify-center gap-2"
              >
                {busy === "sim" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {counterpartyAction.label}
              </button>
            </div>
          ) : null}
        </div>

        {/* Right: chat */}
        <ChatPanel order={order} onSent={refresh} />
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--color-muted)]">{k}</span>
      <span className="tabular-nums text-right">{children}</span>
    </div>
  );
}

function StatusPill({ status }: { status: P2POrderStatus }) {
  const map: Record<P2POrderStatus, { label: string; cls: string }> = {
    PENDING_PAYMENT: { label: "Awaiting payment", cls: "text-[var(--color-accent)] border-[var(--color-accent)]/40" },
    PAID: { label: "Paid · awaiting release", cls: "text-amber-400 border-amber-400/40" },
    COMPLETED: { label: "Completed", cls: "text-[var(--color-up)] border-[var(--color-up)]/40" },
    CANCELLED: { label: "Cancelled", cls: "text-[var(--color-muted)] border-[var(--color-border)]" },
    DISPUTED: { label: "Disputed", cls: "text-[var(--color-down)] border-[var(--color-down)]/40" },
  };
  const s = map[status];
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

function PaymentWindow({ expiresAt }: { expiresAt: number }) {
  // Seeded via effect (not render) so Date.now stays out of the render path.
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, expiresAt - Date.now()));
    const t0 = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [expiresAt]);
  if (left === null) return null;
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm">
      <Clock className="h-4 w-4 text-[var(--color-accent)]" />
      {left > 0 ? (
        <span>
          Pay within{" "}
          <span className="tabular-nums font-medium text-[var(--color-foreground)]">
            {mm}:{String(ss).padStart(2, "0")}
          </span>{" "}
          or the order auto-cancels.
        </span>
      ) : (
        <span className="text-[var(--color-down)]">Payment window elapsed.</span>
      )}
    </div>
  );
}

function ActionButton({
  action,
  label,
  variant,
  busy,
  onAct,
}: {
  action: P2POrderAction;
  label: string;
  variant: "primary" | "danger" | "ghost";
  busy: string | null;
  onAct: (a: P2POrderAction, key: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={busy !== null}
      onClick={() => onAct(action, action)}
      className={cn(
        "flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50",
        variant === "primary" && "bg-[var(--color-up)] text-black hover:opacity-90",
        variant === "danger" && "bg-[var(--color-down)] text-white hover:opacity-90",
        variant === "ghost" && "border border-[var(--color-border)] hover:bg-[var(--color-surface-2)]",
      )}
    >
      {busy === action ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
}

function ActionArea({
  order,
  busy,
  onAct,
}: {
  order: P2POrder;
  busy: string | null;
  onAct: (a: P2POrderAction, key: string) => void;
}) {
  const takerBuys = order.takerRole === "buyer";

  if (order.status === "COMPLETED") {
    return (
      <div className="flex items-center gap-2 text-[var(--color-up)]">
        <ShieldCheck className="h-5 w-5" />
        <span className="font-medium">Trade complete — escrow released.</span>
      </div>
    );
  }
  if (order.status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 text-[var(--color-muted)]">
        <XCircle className="h-5 w-5" /> This order was cancelled.
      </div>
    );
  }
  if (order.status === "DISPUTED") {
    return (
      <div className="flex items-center gap-2 text-[var(--color-down)]">
        <ShieldAlert className="h-5 w-5" /> Under dispute — a moderator is reviewing.
      </div>
    );
  }

  if (order.status === "PENDING_PAYMENT") {
    return (
      <div className="space-y-2">
        {takerBuys ? (
          <p className="text-sm text-[var(--color-muted)]">
            Send{" "}
            <span className="text-[var(--color-foreground)] font-medium">
              {fmtFiat(order.fiatAmount)} {order.fiat}
            </span>{" "}
            to {order.sellerName} via the agreed method, then mark as paid.
          </p>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Waiting for {order.buyerName} to send {fmtFiat(order.fiatAmount)} {order.fiat}. Your{" "}
            {fmtAsset(order.assetAmount)} {order.asset} is safe in escrow.
          </p>
        )}
        <div className="flex gap-2">
          {takerBuys ? (
            <ActionButton
              action="MARK_PAID"
              label="Mark as paid"
              variant="primary"
              busy={busy}
              onAct={onAct}
            />
          ) : null}
          <ActionButton
            action="CANCEL"
            label="Cancel order"
            variant="ghost"
            busy={busy}
            onAct={onAct}
          />
        </div>
      </div>
    );
  }

  // PAID
  return (
    <div className="space-y-2">
      {takerBuys ? (
        <p className="text-sm text-[var(--color-muted)]">
          Payment marked as sent. Waiting for {order.sellerName} to confirm receipt and release
          escrow.
        </p>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          {order.buyerName} marked payment sent. Confirm you received{" "}
          <span className="text-[var(--color-foreground)] font-medium">
            {fmtFiat(order.fiatAmount)} {order.fiat}
          </span>{" "}
          then release escrow.
        </p>
      )}
      <div className="flex gap-2">
        {!takerBuys ? (
          <ActionButton
            action="RELEASE"
            label="Release escrow"
            variant="primary"
            busy={busy}
            onAct={onAct}
          />
        ) : null}
        <ActionButton
          action="DISPUTE"
          label="Open dispute"
          variant="ghost"
          busy={busy}
          onAct={onAct}
        />
      </div>
    </div>
  );
}

function ChatPanel({ order, onSent }: { order: P2POrder; onSent: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [order.messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api.p2pSendMessage(order.id, t);
      setText("");
      onSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <MerchantBadge merchant={order.merchant} size="sm" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {order.messages.map((m) => {
          if (m.sender === "system") {
            return (
              <div key={m.id} className="text-center">
                <span className="inline-block rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[11px] text-[var(--color-muted)]">
                  {m.text}
                </span>
              </div>
            );
          }
          const mine = m.sender === order.takerRole;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  mine
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-foreground)]",
                )}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-[var(--color-border)] flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Message the counterparty…"
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || sending}
          className="grid place-items-center h-9 w-9 rounded-lg btn-brand disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
