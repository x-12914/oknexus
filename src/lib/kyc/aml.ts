import "server-only";

/**
 * Sanctions / PEP screening through Didit's standalone AML API.
 *
 * Exists because Didit's workflow builder refuses an AML node unless an ID
 * document step precedes it, and both no-document routes (BVN + selfie, and
 * NIN) have none. Screening a fiat-unlocking approval is not optional for a
 * live exchange, so it happens here, on the webhook, before the approval is
 * written.
 *
 * The name screened is the one the registry returned, not the one the user
 * typed. A user cannot spell their way past a sanctions list that way.
 */
const AML_URL = process.env.DIDIT_AML_URL ?? "https://verification.didit.me/v3/aml/";
const TIMEOUT_MS = 20_000;

export interface AmlSubject {
  fullName: string;
  /** YYYY-MM-DD, when known. Raises match confidence, never required. */
  dateOfBirth?: string;
  /** ISO 3166-1 alpha-2. */
  nationality?: string;
  /** Our user id; echoed back and shown in Didit's console. */
  vendorData: string;
}

export type AmlOutcome =
  | { ok: true; status: "Approved" | "In Review" | "Declined"; score: number; hits: number; requestId: string }
  | { ok: false; reason: string };

interface AmlResponse {
  request_id?: string;
  aml?: { status?: string; total_hits?: number; score?: number };
  detail?: string;
  message?: string;
}

/**
 * Screen one person. `idempotencyKey` must be stable per verification session:
 * Didit redelivers webhooks, and each screening is billed, so a retry must
 * replay the first answer rather than buy a second one.
 */
export async function screenPerson(subject: AmlSubject, idempotencyKey: string): Promise<AmlOutcome> {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-api-key" };
  const fullName = subject.fullName.trim();
  if (!fullName) return { ok: false, reason: "no-name" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(AML_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "Idempotency-Key": idempotencyKey.slice(0, 255),
      },
      body: JSON.stringify({
        full_name: fullName,
        entity_type: "person",
        ...(subject.dateOfBirth ? { date_of_birth: subject.dateOfBirth } : {}),
        ...(subject.nationality ? { nationality: subject.nationality } : {}),
        vendor_data: subject.vendorData,
      }),
    });
    const text = await res.text();
    let data: AmlResponse;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, reason: `non-json ${res.status}` };
    }
    if (!res.ok) {
      return { ok: false, reason: `http ${res.status}: ${(data.detail ?? data.message ?? "").slice(0, 120)}` };
    }
    const status = data.aml?.status;
    if (status !== "Approved" && status !== "In Review" && status !== "Declined") {
      return { ok: false, reason: `unreadable status ${String(status)}` };
    }
    return {
      ok: true,
      status,
      score: Number(data.aml?.score ?? 0),
      hits: Number(data.aml?.total_hits ?? 0),
      requestId: String(data.request_id ?? ""),
    };
  } catch (e) {
    return { ok: false, reason: (e as Error).name === "AbortError" ? "timeout" : (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

export interface ScreenSubject {
  fullName: string;
  dateOfBirth?: string;
}

/**
 * Pull the registry-confirmed identity out of a Didit decision.
 *
 * Tolerant on purpose: the decision's `database_validation` block is an
 * object with a `validations` array in the API reference, but the webhook is
 * the same payload family and we would rather walk it than trust one shape.
 */
export function registrySubject(decision: unknown): ScreenSubject | null {
  const seen = new Set<unknown>();
  const stack: unknown[] = [(decision as { database_validation?: unknown })?.database_validation ?? decision];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    const o = cur as Record<string, unknown>;
    const src = o.source_data;
    if (src && typeof src === "object") {
      const s = src as Record<string, unknown>;
      const full =
        typeof s.full_name === "string" && s.full_name.trim()
          ? s.full_name
          : [s.first_name, s.last_name].filter((x) => typeof x === "string" && x).join(" ");
      if (full.trim()) {
        const dob = typeof s.date_of_birth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date_of_birth) ? s.date_of_birth : undefined;
        return { fullName: full.trim(), dateOfBirth: dob };
      }
    }
    for (const v of Object.values(o)) if (v && typeof v === "object") stack.push(v);
  }
  return null;
}

/**
 * The identity a document route established: the OCR block of the decision.
 * v2 calls it `id_verification`, v1 called it `kyc`. Used when there is no
 * registry lookup to prefer.
 */
export function documentSubject(decision: unknown): ScreenSubject | null {
  const d = decision as Record<string, unknown> | null;
  const block = (d?.id_verification ?? d?.kyc ?? d?.ocr) as Record<string, unknown> | undefined;
  if (!block || typeof block !== "object") return null;
  const full =
    typeof block.full_name === "string" && block.full_name.trim()
      ? block.full_name
      : [block.first_name, block.last_name].filter((x) => typeof x === "string" && x).join(" ");
  if (!full.trim()) return null;
  const dob =
    typeof block.date_of_birth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(block.date_of_birth)
      ? block.date_of_birth
      : undefined;
  return { fullName: full.trim(), dateOfBirth: dob };
}

/** Screening can be switched off in an emergency; it is on unless told otherwise. */
export function serverAmlEnabled(): boolean {
  return process.env.KYC_SERVER_AML !== "false";
}
