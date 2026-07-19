import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DepositPanel } from "@/components/custody/DepositPanel";

export default async function DepositPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="h-full overflow-y-auto">
      <DepositPanel />
    </div>
  );
}
