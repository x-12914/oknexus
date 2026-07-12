import type { KycApplicant, KycLevel, KycProvider, KycSession, KycVerdict } from "./types";

export class StubKycProvider implements KycProvider {
  readonly id = "stub";

  async startVerification(applicant: KycApplicant, _level: KycLevel): Promise<KycSession> {
    return {
      sessionId: `stub_${applicant.userId}_${Date.now()}`,
      url: "/kyc/stub",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async getStatus(_sessionId: string): Promise<KycVerdict> {
    return "approved";
  }
}
