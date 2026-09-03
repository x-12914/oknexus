/**
 * basic    = name + NIN against the national register, no camera.
 * bvn      = BVN + selfie, face-matched to the bank's enrolment portrait.
 * advanced = government document + selfie.
 */
export type KycLevel = "none" | "basic" | "bvn" | "advanced";

export type KycVerdict = "pending" | "approved" | "rejected";

export interface KycApplicant {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  dob?: string;
}

export interface KycSession {
  sessionId: string;
  url: string;
  expiresAt: Date;
}

export interface KycProvider {
  readonly id: string;
  startVerification(applicant: KycApplicant, level: KycLevel): Promise<KycSession>;
  getStatus(sessionId: string): Promise<KycVerdict>;
}
