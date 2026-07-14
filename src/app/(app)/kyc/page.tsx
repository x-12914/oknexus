import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { KycForm } from "@/components/kyc/KycForm";

export default async function KycPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="h-full overflow-y-auto">
      <KycForm />
    </div>
  );
}
