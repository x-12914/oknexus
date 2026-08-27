import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DepositTabs } from "@/components/custody/DepositTabs";

export default async function DepositPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <DepositTabs />;
}
