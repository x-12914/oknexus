import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { readTwoFactorChallenge } from "@/lib/oauth-challenge";
import { socialProviderLabel } from "@/lib/social-auth";
import { SocialTwoFactorForm } from "@/components/auth/SocialTwoFactorForm";

export default async function SocialTwoFactorPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  // No pending challenge means someone landed here directly, or it expired.
  const challenge = await readTwoFactorChallenge();
  if (!challenge) redirect("/login");

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <SocialTwoFactorForm provider={socialProviderLabel(challenge.provider)} />
    </div>
  );
}
