import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WalletView } from "@/components/wallet/WalletView";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="h-full overflow-y-auto">
      <WalletView />
    </div>
  );
}
