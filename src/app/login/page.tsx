import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/trade/BTC-USDT");
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <AuthForm mode="login" />
    </div>
  );
}
