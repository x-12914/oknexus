import "server-only";
import { prisma } from "@/lib/db";

/**
 * Audit trail for privileged actions.
 *
 * RBAC answers who *may* act. It doesn't record who *did*, and after an
 * incident that is the only question worth asking. Every admin action and every
 * approval is written here.
 *
 * Best-effort by design: a failure to write the log must never roll back or
 * block the action it describes. A missing log line is bad; a withdrawal that
 * silently fails because logging broke is worse.
 */
export interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: (entry.metadata ?? undefined) as never,
        ip: entry.ip ?? null,
      },
    });
  } catch (e) {
    // Surfaced in logs so a broken audit trail is noticed, without failing the
    // caller's operation.
    console.error("[audit] failed to record", entry.action, (e as Error).message);
  }
}

export interface AuditRow {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: number;
}

export async function listAudit(limit = 100): Promise<AuditRow[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
  });
  return rows.map((r) => ({
    id: r.id,
    actorEmail: r.actorEmail,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    metadata: r.metadata,
    createdAt: r.createdAt.getTime(),
  }));
}
