import "server-only";

/**
 * Bitnob client (server-only) — fiat on/off-ramp for NGN & Africa.
 * Env: BITNOB_API_KEY (secret), BITNOB_ENV ("sandbox" | "live"), optional BITNOB_API_BASE override.
 * Auth: Authorization: Bearer <secret key>.
 */
const SANDBOX_BASE = "https://sandboxapi.bitnob.co/api/v1";
const LIVE_BASE = "https://api.bitnob.co/api/v1";

export function bitnobConfigured(): boolean {
  return Boolean(process.env.BITNOB_API_KEY);
}

export function bitnobBase(): string {
  if (process.env.BITNOB_API_BASE) return process.env.BITNOB_API_BASE.replace(/\/$/, "");
  return process.env.BITNOB_ENV === "live" ? LIVE_BASE : SANDBOX_BASE;
}

export interface BitnobResponse<T> {
  status: number;
  ok: boolean;
  data: T | null;
}

/** Low-level authenticated request. Returns the HTTP status + parsed JSON (never throws on non-2xx). */
export async function bitnobRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<BitnobResponse<T>> {
  const key = process.env.BITNOB_API_KEY;
  if (!key) throw new Error("Bitnob is not configured — set BITNOB_API_KEY.");
  const res = await fetch(`${bitnobBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    // non-JSON response
  }
  return { status: res.status, ok: res.ok, data };
}
