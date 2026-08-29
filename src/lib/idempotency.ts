import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Making a money-moving request safe to repeat.
 *
 * Retries are not hypothetical. A user double-clicks Withdraw. A phone drops
 * onto a bad connection and the browser resends. A bot's HTTP client retries a
 * timeout for a request the server actually completed. Each of those is a
 * second withdrawal unless the second attempt can be recognised as the same
 * request and answered with the FIRST one's result.
 *
 * The client supplies the key, because only the client knows which two requests
 * are the same intent. Everything the server could derive — a hash of the body,
 * a timestamp — would either collide across genuinely distinct requests (buying
 * the same amount twice on purpose) or fail to match across a retry.
 *
 * Storing the request hash alongside the key closes the other half: a key
 * replayed with different parameters is refused rather than quietly answered
 * with the previous response, which would let a changed amount return a stale
 * success.
 */

/** Keys older than this are no longer honoured, and can be swept. */
export const RETENTION_MS = 24 * 60 * 60 * 1000;

export class IdempotencyConflict extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function hashRequest(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

/** The header clients send. Optional — absent means "don't dedupe this one". */
export function idempotencyKeyFrom(req: NextRequest): string | null {
  const k = req.headers.get("idempotency-key") ?? req.headers.get("x-idempotency-key");
  if (!k) return null;
  const trimmed = k.trim();
  // Bounded so the column cannot be used as scratch storage.
  return trimmed.length >= 8 && trimmed.length <= 200 ? trimmed : null;
}

export interface Replayed {
  replayed: true;
  statusCode: number;
  body: string;
}

/**
 * Run `fn` at most once for a given (user, key).
 *
 * Returns the stored response on a replay, or runs the handler and records it.
 * When no key is supplied the handler simply runs — dedupe is opt-in, so
 * existing clients keep working unchanged.
 */
export async function withIdempotency(
  userId: string,
  key: string | null,
  endpoint: string,
  rawBody: string,
  fn: () => Promise<Response>,
): Promise<Response> {
  if (!key) return fn();

  const requestHash = hashRequest(rawBody);

  // The unique constraint decides the race. Two simultaneous retries both reach
  // here; exactly one create succeeds and the other is told a request is already
  // in flight, rather than both proceeding to move money.
  try {
    await prisma.idempotencyKey.create({
      data: { userId, key, endpoint, requestHash, status: "IN_FLIGHT" },
    });
  } catch {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!existing) throw new IdempotencyConflict("Could not process this request.", 500);

    if (existing.requestHash !== requestHash) {
      throw new IdempotencyConflict(
        "This idempotency key was already used for a different request.",
        422,
      );
    }
    if (Date.now() - existing.createdAt.getTime() > RETENTION_MS) {
      throw new IdempotencyConflict("This idempotency key has expired.", 422);
    }
    if (existing.status === "IN_FLIGHT") {
      // Deliberately not "success": the first attempt may still fail, and
      // claiming otherwise would be a lie the client acts on.
      throw new IdempotencyConflict("An identical request is still processing.", 409);
    }
    return new Response(existing.response ?? "{}", {
      status: existing.statusCode ?? 200,
      headers: { "content-type": "application/json", "idempotent-replay": "true" },
    });
  }

  let res: Response;
  try {
    res = await fn();
  } catch (e) {
    // Release the key so a genuine retry can proceed. A handler that threw did
    // not produce a response worth replaying, and holding the key would lock
    // the user out of retrying something that never happened.
    await prisma.idempotencyKey
      .delete({ where: { userId_key: { userId, key } } })
      .catch(() => {});
    throw e;
  }

  // Only successful outcomes are worth replaying. A 400 held for 24 hours would
  // pin the user to their own typo.
  const body = await res.clone().text();
  if (res.status >= 200 && res.status < 300) {
    await prisma.idempotencyKey
      .update({
        where: { userId_key: { userId, key } },
        data: { status: "COMPLETED", statusCode: res.status, response: body },
      })
      .catch(() => {});
  } else {
    await prisma.idempotencyKey
      .delete({ where: { userId_key: { userId, key } } })
      .catch(() => {});
  }

  return res;
}

/** Drop expired keys. Called from the cron. */
export async function sweepIdempotencyKeys(): Promise<{ deleted: number }> {
  const { count } = await prisma.idempotencyKey.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
  });
  return { deleted: count };
}
