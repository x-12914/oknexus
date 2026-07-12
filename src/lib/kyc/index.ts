import { StubKycProvider } from "./stub-provider";
import type { KycProvider } from "./types";

let cached: KycProvider | undefined;

export function getKycProvider(): KycProvider {
  if (cached) return cached;
  const id = process.env.KYC_PROVIDER ?? "stub";
  switch (id) {
    case "stub":
    default:
      cached = new StubKycProvider();
  }
  return cached;
}

export type { KycProvider, KycApplicant, KycLevel, KycSession, KycVerdict } from "./types";
