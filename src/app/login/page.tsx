import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { enabledSocialProviders } from "@/lib/social-auth";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <AuthForm mode="login" socialProviders={enabledSocialProviders()} errorCode={error} />
    </div>
  );
}
