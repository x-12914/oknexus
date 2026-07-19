import { prisma } from "@/lib/db";
import type { KycInfo } from "@/lib/admin-types";

export async function getKyc(userId: string): Promise<KycInfo> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true, kycLegalName: true, kycCountry: true, kycIdNumber: true },
  });
  return {
    status: u?.kycStatus ?? "NONE",
    legalName: u?.kycLegalName ?? null,
    country: u?.kycCountry ?? null,
    idNumber: u?.kycIdNumber ?? null,
  };
}

export interface KycSubmitInput {
  legalName: string;
  country: string;
  idNumber: string;
}

/** Submit identity details for admin review (manual KYC). */
export async function submitKyc(userId: string, input: KycSubmitInput): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
  if (u?.kycStatus === "APPROVED") throw new Error("Your identity is already verified.");
  if (!input.legalName.trim() || !input.country.trim() || !input.idNumber.trim()) {
    throw new Error("All fields are required.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      kycLegalName: input.legalName.trim().slice(0, 120),
      kycCountry: input.country.trim().slice(0, 60),
      kycIdNumber: input.idNumber.trim().slice(0, 60),
      kycStatus: "PENDING",
    },
  });
}
