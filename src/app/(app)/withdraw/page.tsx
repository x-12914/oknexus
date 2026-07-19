import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WithdrawPanel } from "@/components/custody/WithdrawPanel";

export default async function WithdrawPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="h-full overflow-y-auto">
      <WithdrawPanel />
    </div>
  );
}
