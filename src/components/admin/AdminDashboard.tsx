"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  AdminOverview,
  AdminUser,
  AdminDispute,
  AdminLedgerRow,
  AdminAd,
  AdminActionBody,
} from "@/lib/admin-types";

const TABS = ["Overview", "Users", "Disputes", "Transactions", "Ads"] as const;
type Tab = (typeof TABS)[number];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("Overview");
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin console</h1>
      <div className="flex flex-wrap gap-1 mb-5 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm -mb-px border-b-2",
              tab === t
                ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && <OverviewTab />}
      {tab === "Users" && <UsersTab />}
      {tab === "Disputes" && <DisputesTab />}
      {tab === "Transactions" && <LedgerTab />}
      {tab === "Ads" && <AdsTab />}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[var(--color-muted)]">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function OverviewTab() {
  const [d, setD] = useState<AdminOverview | null>(null);
  useEffect(() => {
    api.adminOverview().then(setD).catch(() => {});
  }, []);
  if (!d) return <Spinner />;
  const stats: [string, number][] = [
    ["Users", d.users],
    ["Suspended", d.suspended],
    ["Pending KYC", d.pendingKyc],
    ["Open disputes", d.disputes],
    ["Spot orders", d.spotOrders],
    ["Open orders", d.openOrders],
    ["P2P trades", d.p2pOrders],
    ["Active ads", d.activeAds],
    ["Swaps", d.swaps],
    ["Ramps", d.ramps],
    ["OTC trades", d.otc],
    ["Deposits", d.deposits],
    ["Withdrawals", d.withdrawals],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {stats.map(([label, val]) => (
        <div key={label} className="rounded-xl border border-[var(--color-border)] p-4">
          <div className="text-2xl font-semibold tabular-nums">{val.toLocaleString()}</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

const ROLES = ["USER", "ADMIN", "SUPPORT"];

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(
    () => api.adminUsers().then((r) => setUsers(r.users)).catch(() => {}),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const act = async (key: string, body: AdminActionBody) => {
    setBusy(key);
    try {
      await api.adminAction(body);
      await load();
    } catch {
      /* refetched anyway */
    } finally {
      setBusy(null);
    }
  };
  if (!users) return <Spinner />;
  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead className="text-xs text-[var(--color-muted)] bg-[var(--color-surface-2)]">
          <tr>
            <th className="text-left px-3 py-2">User</th>
            <th className="text-left px-3 py-2">Role</th>
            <th className="text-left px-3 py-2">KYC</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2">
                <div>{u.email}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {u.name ?? "—"} · {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </td>
              <td className="px-3 py-2">
                <select
                  value={u.role}
                  disabled={busy === u.id + "role"}
                  onChange={(e) =>
                    act(u.id + "role", { type: "role", userId: u.id, value: e.target.value })
                  }
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-xs",
                      u.kycStatus === "APPROVED"
                        ? "text-[var(--color-up)]"
                        : u.kycStatus === "PENDING"
                          ? "text-amber-500"
                          : u.kycStatus === "REJECTED"
                            ? "text-[var(--color-down)]"
                            : "text-[var(--color-muted)]",
                    )}
                  >
                    {u.kycStatus}
                  </span>
                  {u.kycStatus === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          act(u.id + "kyc", { type: "kyc", userId: u.id, value: "APPROVED" })
                        }
                        className="text-xs text-[var(--color-up)] hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          act(u.id + "kyc", { type: "kyc", userId: u.id, value: "REJECTED" })
                        }
                        className="text-xs text-[var(--color-down)] hover:underline"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
                {u.kycLegalName ? (
                  <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                    {u.kycLegalName} · {u.kycCountry} · {u.kycIdNumber}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    "text-xs",
                    u.suspended ? "text-[var(--color-down)]" : "text-[var(--color-up)]",
                  )}
                >
                  {u.suspended ? "Suspended" : "Active"}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  disabled={busy === u.id + "susp"}
                  onClick={() =>
                    act(u.id + "susp", { type: "suspend", userId: u.id, value: !u.suspended })
                  }
                  className="text-xs rounded-md border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface-2)]"
                >
                  {u.suspended ? "Unsuspend" : "Suspend"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisputesTab() {
  const [disputes, setDisputes] = useState<AdminDispute[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(
    () => api.adminDisputes().then((r) => setDisputes(r.disputes)).catch(() => {}),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  const resolve = async (id: string, value: "release" | "refund") => {
    setBusy(id + value);
    try {
      await api.adminAction({ type: "dispute", orderId: id, value });
      await load();
    } catch {
      /* refetched */
    } finally {
      setBusy(null);
    }
  };
  if (!disputes) return <Spinner />;
  if (disputes.length === 0)
    return (
      <div className="rounded-xl border border-[var(--color-border)] py-16 text-center text-[var(--color-muted)]">
        No open disputes.
      </div>
    );
  return (
    <div className="space-y-2">
      {disputes.map((d) => (
        <div
          key={d.id}
          className="rounded-xl border border-[var(--color-border)] p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="text-sm">
            <div className="font-medium">
              {d.assetAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })} {d.asset} ·{" "}
              {d.fiatAmount.toLocaleString()} {d.fiat}
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              Buyer {d.buyerName} · Seller {d.sellerName} ·{" "}
              {d.twoParty ? "user-to-user" : "with house merchant"} ·{" "}
              {new Date(d.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => resolve(d.id, "release")}
              className="text-xs rounded-md bg-[var(--color-up)] text-black px-3 py-1.5 font-medium disabled:opacity-50"
            >
              Release to buyer
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => resolve(d.id, "refund")}
              className="text-xs rounded-md bg-[var(--color-down)] text-white px-3 py-1.5 font-medium disabled:opacity-50"
            >
              Refund seller
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LedgerTab() {
  const [rows, setRows] = useState<AdminLedgerRow[] | null>(null);
  useEffect(() => {
    api.adminLedger().then((r) => setRows(r.rows)).catch(() => {});
  }, []);
  if (!rows) return <Spinner />;
  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm min-w-[680px]">
        <thead className="text-xs text-[var(--color-muted)] bg-[var(--color-surface-2)]">
          <tr>
            <th className="text-left px-3 py-2">User</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Memo</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="text-right px-3 py-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2">{r.userEmail}</td>
              <td className="px-3 py-2 text-[var(--color-muted)]">{r.type}</td>
              <td className="px-3 py-2 text-[var(--color-muted)]">{r.memo ?? "—"}</td>
              <td
                className={cn(
                  "px-3 py-2 text-right tabular-nums",
                  r.delta >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
                )}
              >
                {r.delta >= 0 ? "+" : "−"}
                {Math.abs(r.delta).toLocaleString(undefined, { maximumFractionDigits: 8 })} {r.symbol}
              </td>
              <td className="px-3 py-2 text-right text-[var(--color-muted)]">
                {new Date(r.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdsTab() {
  const [ads, setAds] = useState<AdminAd[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => api.adminAds().then((r) => setAds(r.ads)).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);
  const deactivate = async (id: string) => {
    setBusy(id);
    try {
      await api.adminAction({ type: "deactivateAd", adId: id });
      await load();
    } catch {
      /* refetched */
    } finally {
      setBusy(null);
    }
  };
  if (!ads) return <Spinner />;
  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead className="text-xs text-[var(--color-muted)] bg-[var(--color-surface-2)]">
          <tr>
            <th className="text-left px-3 py-2">Advertiser</th>
            <th className="text-left px-3 py-2">Offer</th>
            <th className="text-right px-3 py-2">Price</th>
            <th className="text-right px-3 py-2">Available</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {ads.map((a) => (
            <tr key={a.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2">
                {a.merchantName}
                {a.advertiserId ? (
                  <span className="text-[10px] text-[var(--color-accent)] ml-1">user</span>
                ) : (
                  <span className="text-[10px] text-[var(--color-muted)] ml-1">house</span>
                )}
              </td>
              <td className="px-3 py-2">
                <span className={a.side === "SELL" ? "text-[var(--color-down)]" : "text-[var(--color-up)]"}>
                  {a.side}
                </span>{" "}
                {a.asset}/{a.fiat}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {a.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {a.available.toLocaleString(undefined, { maximumFractionDigits: 8 })}
              </td>
              <td className="px-3 py-2">
                <span className={a.active ? "text-[var(--color-up)]" : "text-[var(--color-muted)]"}>
                  {a.active ? "Active" : "Closed"}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {a.active ? (
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => deactivate(a.id)}
                    className="text-xs rounded-md border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface-2)]"
                  >
                    Deactivate
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
