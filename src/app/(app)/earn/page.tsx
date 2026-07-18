import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { EarnView } from "@/components/earn/EarnView";

export default async function EarnPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");
  return <EarnView />;
}
