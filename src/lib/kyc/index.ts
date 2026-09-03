import { StubKycProvider } from "./stub-provider";
import { DiditKycProvider, diditBasicConfigured, diditConfigured } from "./didit-provider";
import type { KycProvider } from "./types";

let cached: KycProvider | undefined;

function providerId(): string {
  // Explicit override wins; otherwise auto-select Didit when it's configured.
  return process.env.KYC_PROVIDER ?? (diditConfigured() ? "didit" : "stub");
}

export function getKycProvider(): KycProvider {
  if (cached) return cached;
  switch (providerId()) {
    case "didit":
      cached = new DiditKycProvider();
      break;
    case "stub":
    default:
      cached = new StubKycProvider();
  }
  return cached;
}

/** True when a real hosted provider (not the stub) is active — drives the UI flow. */
export function kycAutomated(): boolean {
  return providerId() !== "stub";
}

/**
 * True when the no-document route (name + NIN against the national register)
 * can be offered. Didit only: the stub approves everything, so a second route
 * there would be theatre.
 */
export function kycBasicAvailable(): boolean {
  return providerId() === "didit" && diditBasicConfigured();
}

export type { KycProvider, KycApplicant, KycLevel, KycSession, KycVerdict } from "./types";
