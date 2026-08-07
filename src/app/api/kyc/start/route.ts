import { sessionUserId } from "@/lib/auth";
import { startKycVerification } from "@/lib/kyc";
import { kycAutomated } from "@/lib/kyc/index";

// Begin a hosted identity verification and return the provider URL to redirect to.
export async function POST() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!kycAutomated()) {
    return Response.json({ error: "Hosted verification is not enabled." }, { status: 503 });
  }
  try {
    const { url } = await startKycVerification(userId);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
