import "server-only";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { getExchange } from "@/lib/exchange";
import { bitnobConfigured, bitnobWhoami, getCompanyBalances } from "@/lib/bitnob";
import { getChainAdapter, ALL_CHAINS } from "@/lib/custody/registry";
import { reconcileAll } from "@/lib/custody/reconcile";

/**
 * Health checks and alerting.
 *
 * Every dependency here has a fallback, which is exactly the problem: when
 * CoinGecko's quota ran out the Binance fallback carried production so well that
 * nobody noticed for weeks. Graceful degradation without monitoring just means
 * failing quietly.
 *
 * Alerts fire on TRANSITIONS — healthy → firing, and back — with a re-notify
 * after a long silence. A check that shouts every minute becomes a check people
 * mute.
 */

export type Severity = "critical" | "warning";

export interface CheckResult {
  key: string;
  severity: Severity;
  title: string;
  /** Present when the condition is unhealthy. */
  detail?: string;
  ok: boolean;
}

/** Re-notify on a still-firing alert at most this often. */
const RENOTIFY_MS = 6 * 60 * 60 * 1000;
/** A payout sitting in-flight longer than this is stuck, not slow. */
const STUCK_PAYOUT_MS = 30 * 60 * 1000;
const LOW_FLOAT = Number(process.env.BITNOB_FLOAT_MIN ?? 5);

async function check(
  key: string,
  severity: Severity,
  title: string,
  fn: () => Promise<string | null>,
): Promise<CheckResult> {
  try {
    const detail = await fn();
    return detail === null
      ? { key, severity, title, ok: true }
      : { key, severity, title, detail, ok: false };
  } catch (e) {
    // A check that throws is itself a signal — report it rather than swallow it.
    return { key, severity, title, detail: `Check failed: ${(e as Error).message}`, ok: false };
  }
}

export interface HealthContext {
  /** Reuse the cron's reconciliation rather than re-reading every address on chain. */
  reconcile?: { shortfalls: { chain: string; symbol: string; heldOnChain: number; owedToUsers: number }[] };
}

export async function runHealthChecks(ctx: HealthContext = {}): Promise<CheckResult[]> {
  const checks: Promise<CheckResult>[] = [];

  // Market data. Every price on the platform depends on this answering.
  checks.push(
    check("provider:marketdata", "critical", "Market data unavailable", async () => {
      const t = await getExchange().getTicker("BTC/USDT");
      return t.last > 0 ? null : "Ticker returned a zero price";
    }),
  );

  // Chain RPC, per enabled chain. A stalled tip means deposits stop crediting.
  for (const chain of ALL_CHAINS) {
    checks.push(
      check(`chain:${chain}`, "critical", `${chain} RPC unreachable`, async () => {
        const tip = await getChainAdapter(chain).getBlockNumber();
        return tip > BigInt(0) ? null : "Chain tip is zero";
      }),
    );
  }

  if (bitnobConfigured()) {
    checks.push(
      check("provider:bitnob", "critical", "Payout provider unreachable", async () => {
        const r = await bitnobWhoami();
        return r.ok ? null : `whoami returned ${r.status}`;
      }),
    );

    checks.push(
      check("float:low", "warning", "Payout float is low", async () => {
        const accounts = await getCompanyBalances();
        const total = accounts
          .filter((a) => a.currency === "USDT" || a.currency === "USDC")
          .reduce((s, a) => s + Number.parseFloat(a.available_balance_formatted ?? "0"), 0);
        return total < LOW_FLOAT
          ? `Only ${total.toFixed(2)} left — bank withdrawals will start failing.`
          : null;
      }),
    );
  }

  // Holding less than we owe is the worst state this system can be in.
  checks.push(
    check("ledger:shortfall", "critical", "Custody shortfall", async () => {
      const { shortfalls } = ctx.reconcile ?? (await reconcileAll());
      if (shortfalls.length === 0) return null;
      return shortfalls
        .map((s) => `${s.chain}/${s.symbol}: hold ${s.heldOnChain}, owe ${s.owedToUsers}`)
        .join("; ");
    }),
  );

  // Money that left the platform but never reached a terminal state.
  checks.push(
    check("payouts:stuck", "warning", "Payouts stuck in flight", async () => {
      const cutoff = new Date(Date.now() - STUCK_PAYOUT_MS);
      const stuck = await prisma.fiatPayout.count({
        where: { status: "PROCESSING", createdAt: { lt: cutoff } },
      });
      return stuck > 0 ? `${stuck} payout(s) processing for over 30 minutes` : null;
    }),
  );

  checks.push(
    check("withdrawals:stuck", "warning", "Withdrawals awaiting reconciliation", async () => {
      const stuck = await prisma.withdrawal.count({
        where: { status: "BROADCAST", txHash: null },
      });
      return stuck > 0
        ? `${stuck} withdrawal(s) broadcast with no tx hash — needs manual reconciliation`
        : null;
    }),
  );

  return Promise.all(checks);
}

export interface AlertSummary {
  firing: number;
  opened: string[];
  resolved: string[];
}

/**
 * Reconcile check results against stored state and notify on changes.
 *
 * Notifications go to admins in-app. A still-firing alert re-notifies every few
 * hours so a long outage doesn't fade into silence, but not every minute.
 */
export async function processAlerts(results: CheckResult[]): Promise<AlertSummary> {
  const now = new Date();
  const opened: string[] = [];
  const resolved: string[] = [];
  const toNotify: CheckResult[] = [];

  for (const r of results) {
    const existing = await prisma.systemAlert.findUnique({ where: { key: r.key } });

    if (!r.ok) {
      const isNew = !existing || !existing.firing;
      const stale =
        existing?.notifiedAt && now.getTime() - existing.notifiedAt.getTime() > RENOTIFY_MS;

      await prisma.systemAlert.upsert({
        where: { key: r.key },
        create: {
          key: r.key,
          severity: r.severity,
          title: r.title,
          detail: r.detail ?? "",
          firing: true,
          notifiedAt: now,
        },
        update: {
          severity: r.severity,
          title: r.title,
          detail: r.detail ?? "",
          firing: true,
          lastSeen: now,
          resolvedAt: null,
          ...(isNew || stale ? { notifiedAt: now } : {}),
          ...(isNew ? { firstSeen: now } : {}),
        },
      });

      if (isNew || stale) {
        opened.push(r.key);
        toNotify.push(r);
      }
    } else if (existing?.firing) {
      await prisma.systemAlert.update({
        where: { key: r.key },
        data: { firing: false, resolvedAt: now, lastSeen: now },
      });
      resolved.push(r.key);
      toNotify.push({ ...r, detail: "Resolved" });
    }
  }

  if (toNotify.length > 0) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const a of toNotify) {
      // Logged regardless of whether an admin account exists to receive it —
      // an alert that only lives in an in-app bell is an alert nobody sees at 3am.
      const level = a.ok ? "resolved" : a.severity;
      console.error(`[alert:${level}] ${a.key} — ${a.title}${a.detail ? `: ${a.detail}` : ""}`);
      await audit({
        action: a.ok ? "alert:resolved" : "alert:opened",
        targetType: "systemAlert",
        targetId: a.key,
        metadata: { title: a.title, detail: a.detail, severity: a.severity },
      });
      for (const admin of admins) {
        await notify(admin.id, {
          type: "SYSTEM",
          title: a.ok ? `Resolved: ${a.title}` : a.title,
          body: a.ok ? "This alert has cleared." : (a.detail ?? "Needs attention."),
          href: "/admin",
        });
      }
    }
  }

  const firing = results.filter((r) => !r.ok).length;
  return { firing, opened, resolved };
}

/**
 * Key of the row whose `lastSeen` proves the cron is still running.
 *
 * Deliberately never evaluated here: a dead cron can't report itself. Staleness
 * is judged at read time by /api/health, so an external uptime monitor polling
 * that URL is what actually catches the process dying.
 */
export const HEARTBEAT_KEY = "cron:heartbeat";
/** A heartbeat older than this means the cron is not running. */
export const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

/** One monitoring pass, for the cron. */
export async function monitor(ctx: HealthContext = {}): Promise<AlertSummary & { checks: number }> {
  const results = await runHealthChecks(ctx);
  const summary = await processAlerts(results);

  const now = new Date();
  await prisma.systemAlert.upsert({
    where: { key: HEARTBEAT_KEY },
    create: {
      key: HEARTBEAT_KEY,
      severity: "critical",
      title: "Background jobs not running",
      detail: "",
      firing: false,
      lastSeen: now,
    },
    update: { firing: false, lastSeen: now, resolvedAt: null },
  });

  return { ...summary, checks: results.length };
}

export interface HealthReport {
  ok: boolean;
  lastCronAt: number | null;
  cronStale: boolean;
  critical: { key: string; title: string; detail: string; since: number }[];
  warnings: { key: string; title: string; detail: string; since: number }[];
}

/**
 * Whole-system verdict for an external uptime monitor.
 *
 * Reads stored state only — no provider calls — so polling it every minute from
 * outside costs nothing and can't itself become the thing that breaks.
 */
export async function healthReport(): Promise<HealthReport> {
  const rows = await prisma.systemAlert.findMany({ where: { firing: true } });
  const beat = await prisma.systemAlert.findUnique({ where: { key: HEARTBEAT_KEY } });
  const lastCronAt = beat?.lastSeen.getTime() ?? null;
  const cronStale = lastCronAt === null || Date.now() - lastCronAt > HEARTBEAT_STALE_MS;

  const shape = (r: (typeof rows)[number]) => ({
    key: r.key,
    title: r.title,
    detail: r.detail,
    since: r.firstSeen.getTime(),
  });
  const critical = rows.filter((r) => r.severity === "critical").map(shape);
  const warnings = rows.filter((r) => r.severity !== "critical").map(shape);

  if (cronStale) {
    critical.unshift({
      key: HEARTBEAT_KEY,
      title: "Background jobs not running",
      detail: lastCronAt
        ? `Last pass ${Math.round((Date.now() - lastCronAt) / 60000)} minutes ago.`
        : "No pass has ever been recorded.",
      since: lastCronAt ?? Date.now(),
    });
  }

  return { ok: critical.length === 0, lastCronAt, cronStale, critical, warnings };
}

export async function listAlerts() {
  const rows = await prisma.systemAlert.findMany({
    // The heartbeat isn't an alert; it's the clock the health endpoint reads.
    where: { key: { not: HEARTBEAT_KEY } },
    orderBy: [{ firing: "desc" }, { lastSeen: "desc" }],
    take: 100,
  });
  return rows.map((r) => ({
    key: r.key,
    severity: r.severity,
    title: r.title,
    detail: r.detail,
    firing: r.firing,
    firstSeen: r.firstSeen.getTime(),
    lastSeen: r.lastSeen.getTime(),
    resolvedAt: r.resolvedAt?.getTime() ?? null,
  }));
}
